Is random behavior helpful in any situation? By definition, random actions are the most uninformed, and if any better is known should be suboptimal. Yet, the issue is more subtle. Reinforcement learning and game theory can be paradigms to reason about this.

## Reinforcement learning

Reinforcement learning is a framework to identify the appropriate actions $\left\{ a_{t}\right\}$ of an agent $\mathcal{A}$ in an environment $\mathcal{E}$ that will maximize an expected reward $\langle\mathcal{R}\left(\left\{ a_{t}\right\} ,\mathcal{E}\left(\left\{ a_{t}\right\} \right)\right)\rangle_{\mathcal{E},t}$ over time $t$ and possible environments $\mathcal{E}$. Note that in general, the actions affect the environment; $\mathcal{E}=\mathcal{E}\left(\left\{ a_{t}\right\} \right)$ and hence the reward.

Consider an endgame in soccer. The captain $\mathcal{A}$ is deciding whether to aim to the left or the right of the goal. What should the captain do?

Let's say the goalkeeper has a weak left side and will never go there. Then, the captain should always score left and will always hit the goal, $a_{t}^{\star}=L$.

Let's say the goalkeeper has a not quite so weak left side and will go there 40% of the time. Should the captain then aim right 40% of the time to cover the cases where the goalkeeper might go left?

This is a fallacy known as probability matching that human behavior has been shown to be susceptible to. If we calculate the expected reward however, we see a difference:

#### Probability matching {#probability-matching .unnumbered}

$$\begin{array}{ccccccc}
\langle R\rangle & = & 0 & \cdot & p(\text{aim }L) & \cdot & p(\text{jump }L)\\
 & + & 1 & \cdot & p(\text{aim }L) & \cdot & p(\text{jump }R)\\
 & + & 1 & \cdot & p(\text{aim }R) & \cdot & p(\text{aim }L)\\
 & + & 0 & \cdot & p(\text{aim }R) & \cdot & p(\text{aim }R)\\
 & = & 0 & \cdot & .6 & \cdot & .4\\
 & + & 1 & \cdot & .6 & \cdot & .6\\
 & + & 1 & \cdot & .4 & \cdot & .4\\
 & + & 0 & \cdot & .4 & \cdot & .6\\
 & = & 0 & + & .12 & +.12 & +0\\
 & = & 0.52.
\end{array}$$

#### Maximum reward {#maximum-reward .unnumbered}

Instead, let's always aim for the most likely side, $p(\text{aim }\text{L})=1$:\
$$\begin{array}{ccccccc}
\langle R\rangle & = & 0 & \cdot & 1 & \cdot & .4\\
 & + & 1 & \cdot & 1 & \cdot & .6\\
 & + & 1 & \cdot & 0 & \cdot & .4\\
 & + & 0 & \cdot & 0 & \cdot & .6\\
 & = & 0.6.
\end{array}$$

This reveals that probability matching is actually not the right strategy!

## Incorporating time {#incorporating-time .unnumbered}

This result is surprising! Note that we made a critical assumption: There is only a single trial, and captain and goalkeeper part and never meet again after. Let's say we have a clever goalkeeper who learns that when the captain shoots left, he will have a preference to do so afterwards (ignoring his weak leg). In that setting, the 'goalkeeper'-environment $\mathcal{E}$ now changes its response to actions, $\mathcal{E}=\mathcal{E}\left(\left\{ a_{t}\right\} \right)$. What is the optimal strategy now?

The captain now is in bad luck: Whenever he develops a preference, the goalkeeper will adapt to it in the very next trial. If he held on to this strategy, he would never score a goal again! So should he just alternate the sides he targets? The goalkeeper could counteract this with likewise just changing sides. In fact, any more complicated schedule will eventually be learned by a sufficiently clever goalkeeper and hence only give a temporary. Even more, throwing a dice every ten shoots will not change this in principle. The best we can do here is to either come up with an insanely complicated schedule that decides when to shoot left or right (a *pseudorandom* schedule). This, as the name suggests, is then indistinguishable in principle from a completely random schedule: The captain throws a dice every time and minimizes the mutual information of his policy and the action $\pi^{\star}=\text{argmin}_{\pi}\mathbb{I}\left[a_{t},a_{t+1}\right],$ where we now understand $\pi=\pi\left(\left\{ a_{t}\right\} \right)$ as a distribution over sequences of actions $a_{t}$.

So a stochastic strategy is better than being purely exploitative! (we are actually not random, we are using our knowledge about the clever gatekeeper)

## A stubborn goalkeeper {#a-stubborn-goalkeeper .unnumbered}

So is soccer then boring in the end? Again, our modelling was too simple: What happens when the goalkeeper takes some time to adapt to a change in strategy of the captain, let's say on a timescale $\tau$? A rationale for that could be a stubborn goalkeeper: Even though the captain now aimed $L$ four times, this surely was just out of random, and I should continue to respond at random! (a prior belief about the strategy of the captain). The captain might then have an advantage: He on expectation can get 2 more goals in after that point, because the goalkeeper will continue to behave randomly. So, indeed, it can be a game of psychology between the two: When the goalkeeper adheres to his beliefs, the captain might be able to leverage an advantage and exploit for a couple of trials before adapting.

## Game theory

Game theory is a mathematical framework to handle adversarial interactions as in the sketched soccer scenario. It summarizes the outcome of actions into a so called game matrix that is shown below. Here, the values indicate the reward $\mathcal{R}$ of the captain $c$ over the goalkeeper $g$ for jumping left $L$ or right $R$:

$$\begin{array}{ccc}
\mathcal{R} & c_{L} & c_{R}\\
g_{L} & 0 & 1\\
g_{R} & 1 & 0
\end{array}$$

Note that if either party where to commit to a strategy (say $L$), the other party could adjust to that by choosing $L$ likewise. That way, the captain would maximize $\mathcal{R}$, while the goalkeeper would minimize it.

The notion of a Nash equilibrium provides a solution to this dilemma: **Both agents should adopt a strategy that will have either party be off worse if they depart from it.** This is the case for the following probabilities of acting:

$$\begin{array}{ccc}
\mathcal{R} & c_{L}@.5 & c_{R}@.5\\
g_{L}@.5 & 0 & 1\\
g_{R}@.5 & 1 & 0
\end{array}$$

Where does this fit in the language of reinforcment learning above? The game-theoretic scenario assumes both the gatekeeper and environment to respond optimally, i.e., a stubborn goalkeeper is not considered. Then, we let the parties interact and come up with the most complicated schedules $\left\{ \pi_{t}\right\}$ and learning schemes $\mathcal{E}\left(\left\{ a_{t}\right\} \right)$ they can imagine. Ultimately, $\langle\mathcal{R}\left(\left\{ a_{t}\right\} ,\,\mathcal{E}\left(\left\{ a_{t}\right\} \right)\right)\rangle_{a_{t}\sim\pi_{t},\mathcal{E},t}$ will be bounded from above by $.5$, which is the best average score the captain can achieve (or the smallest loss the goalkeeper can try to prevent) in every trial.