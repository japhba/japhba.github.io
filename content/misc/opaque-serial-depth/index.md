---
title: Opaque serial depth
draft: false
subtitle: How much can a transformer reason without saying anything?
summary: Opaque serial depth is the longest computation a model can run without passing through an interpretable step like a chain-of-thought token. A transformer's is O(L log T) — linear in layers, only logarithmic in context. Add recurrence along the sequence and it becomes O(L + T). Notes on Brown-Cohen, Lindner & Shah (2026).
date: 2026-06-08
---

Chain-of-thought monitoring rests on a bet: if a model has to do a lot of step-by-step
work, some of that work has to show up in the tokens it writes. Rohin Shah puts the
intuition on the [80,000 Hours podcast](https://80000hours.org/podcast/episodes/rohin-shah-google-deepmind-agi-safety/)
as transformers being *wide but shallow*. A forward pass does an enormous amount of
parallel work, but only a limited number of sequential steps. Longer chains of reasoning
have to be written out, where we can read them.

[Brown-Cohen, Lindner & Shah (2026)](https://arxiv.org/abs/2603.09786) make this precise.
They define **opaque serial depth** as the length of the longest computation a model can do
without interpretable intermediate steps.

## Depth as circuit depth

The paper borrows its notion of depth from complexity theory. Write the network as a
circuit whose gates are either an associative binary operation (add, multiply, max) or a
piecewise-analytic function of one number. The depth is the longest input-to-output path,
minimised over all polynomial-size circuits that compute the same function. So a sum over
$n$ inputs costs $\log_2 n$, not 1, because it is a binary tree of additions. A ReLU
costs 1. Because it is defined on the *function*, the measure sidesteps questions like
whether a LayerNorm counts as its own layer.

To make the depth *opaque*, you mark some nodes as interpretable: the input tokens, the
output tokens, and any chain-of-thought tokens. Then you only measure paths between
interpretable nodes. Every sampled token resets the clock. Finding the minimal circuit is
intractable, so in practice you exhibit *some* circuit and get an upper bound.

## Up is linear, right is logarithmic

![Residual stream as a grid, layers up and positions across. (a) Standard attention: every edge goes up one layer, so the longest opaque path is bounded by the number of layers. (b) Adding attention within a layer lets the path also step right at the same layer, zig-zagging to length about L+T.](opaque_serial_depth.png)

Picture the residual stream $h^\ell_t$ as a grid, with layer $\ell$ going up and position
$t$ going across. An opaque path can only move **up** (to the next layer) or **right**
(to a later position). Moving down would need a later layer to feed an earlier one, and
in a transformer the only way to do that is to emit a token, which is interpretable.

In a standard transformer, every edge also goes *up*. Attention at layer $\ell+1$ reads
layer $\ell$ at earlier positions, so any step to the right costs a layer too (panel a). A
path therefore has at most $L$ steps. Each step is a layer made of position-wise work of
depth $O(\log D)$, plus the attention sums over up to $T$ positions, which cost
$O(\log T)$. That gives

$$
\text{opaque depth}_{\text{Transformer}} = O\big(L\,(\log T + \log D)\big).
$$

It is linear in depth and only *logarithmic* in context length, so a longer context buys
very little extra serial computation.

This is what forces the computation into the open. Say a task needs a chain of dependent
steps longer than one forward pass can hold, roughly more than $L$ layers' worth. Within a
single pass there is no way to continue it, because every opaque path runs out when it
reaches the top layer. The only edge in the grid that leads back to the bottom goes through
the output: sample a token, append it, and read it again at layer 0 in the next pass. So
**in the left architecture, any computation whose serial depth exceeds $\sim L$ must pass
through emitted tokens: part of the intermediate state has to be exposed in the output,
in some form.** "In some form" matters. The tokens can be paraphrased, compressed or even
steganographic, so being exposed doesn't guarantee being readable. What the argument does
guarantee is that the state has to travel through a channel we can see. There is no hidden
back-channel to carry it instead. For Gemma 3, the paper's hand-computed upper bounds
at maximum context range from about 4,500 (1B) to 11,700 (27B) circuit steps. Their
automated JAX calculator lands about 28% above those numbers.

Now let information move *right within a layer*, so that position $t$ at layer $\ell$ can
read position $t-1$ at the same layer. The paper does this with RNN blocks. The orange
arcs in panel (b) are an attention version of the same idea. A path can now take up to $L$
steps up *and* $T$ steps right, and it zig-zags across the grid:

$$
\text{opaque depth}_{\text{RNN}} = O\big((L + T)\log D\big).
$$

This time the depth is linear in context length. That makes it an architecture-level
argument for caution: recurrence lets a model do long serial reasoning in its activations
instead of writing it down.

## Further along the same axis

The paper runs the same analysis on other architectures:

- **Continuous (latent) chain of thought.** If the fed-back hidden states don't count as
  interpretable, the forward passes compose. The depth becomes $O(L\,T_{\text{cot}}(\log T + \log D))$.
  Opaque paths can now also go *down*.
- **Persistent black-box memory.** If a model can read, process and write back opaque
  memory across queries, the depth is unbounded.
- **Text diffusion.** If each denoising step's tokens count as interpretable, the depth is
  that of a single network pass.
- **Mixture-of-Experts.** A toy MoE model (11B active parameters) came out well below
  Gemma 3 12B in the automated calculator. The paper reads this as *suggestive* that MoE
  lowers opaque depth relative to dense models.

The bounds are only as good as the choice of which nodes count as interpretable. The
paper is candid that this is a judgment call.

---

*[arXiv:2603.09786](https://arxiv.org/abs/2603.09786)
· [code (google-deepmind/serial_depth)](https://github.com/google-deepmind/serial_depth)
· [Rohin Shah on 80,000 Hours](https://80000hours.org/podcast/episodes/rohin-shah-google-deepmind-agi-safety/)
· figure [PDF](opaque_serial_depth.pdf) / [TikZ](opaque_serial_depth.tex).
Panel (b) uses same-layer attention as a stand-in for the paper's RNN blocks. The
$\sim L$ and $\sim L+T$ labels count layer and position steps and leave out the log factors.*
