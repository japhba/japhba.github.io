# Do auto-regressive models bite their own tail? The value of Gedankenexperiments

Autoregressive models use their output to arrive at predictions. In machine learning, this amounts to training on the output, i.e. generated data. Their existence justifies this apparent conundrum, there seems to be a benefit.

Or is there? The data processing inequality asserts that no pipeline, however deep, can arrive at new information. How can this be reconciled?

## The autoregressor

Consider a stream of data samples, $\bm{x}_{\leq t}=\left(x_{1},\ldots,x_{t}\right)$, for example elements of a time series, or images of cats. The autoregressor then is a model $p$ that generates the next output, $$\hat{x}_{t+1}\sim p\left(\bm{x}_{\leq t}\right),$$

where we denote model-generated outputs with a hat $\hat{x}$. The model now becomes autoregressive if part of its input is its output.

## The data-processing inequality

The data-processing inequality posits that for any processing pipeline $Y=f(X)$, the pipeline cannot increase the information that the input contains about the source, $$\mathbb{I}\left[Z=f(Y);X\right]\leq\mathbb{I}\left[Y;X\right]\quad\forall\,f.$$

Now, the autoregressor suggests that such a pipeline does exist: Namely, let's consider a ground truth distribution that we want to model, $p^{*}$. Ideally, the model should be as close as possible to $p^{*}$, that is the loss $\mathbb{I}\left[\hat{p};p^{*}\right]$ should be minimized. However, there is only a finite amount of samples from $p^{*}$ available to fit $\hat{p}.$ Can we hence use autoregressive feedback to define a sequence of predictors $$X\rightarrow\hat{p}^{(1)}\sim X^{(1)}\rightarrow\hat{p}^{(2)}\sim X^{(2)}\rightarrow\ldots\rightarrow\hat{p}^{(n)}\sim X^{(n)}$$

such that $\mathbb{I}\left[X;X^{(n)}\right]\geq\mathbb{I}\left[X;X^{(1)}\right]$?

## Real World

Imagination, hallucination or dreaming are basically autoregressive: Decoupled from a finite data sample, the brain ponders what it remembers, hopefully arriving at a better model. Even more clearly, closing your eyes and giving things a good thought can definitely improve your actions.

Another expression of this is \[prove\]

$$\hat{p}(y|x,YX)=\langle\hat{p}(y|x,\hat{Y}\hat{X},YX)\rangle_{\hat{Y},\hat{X}\sim\hat{p}(y|x,YX)}.$$

I.e., sampling from your existing model on average does not improve the model.

So what is it good for?

## Reasoning

So far, we have adopted a puristic Bayesian inference view. However, in practice information needs not only to be present, but *be made accesible*. This helps to reconcile it with our everyday intuition of pondering indeed being helpful for action.

The idea is that sampling from even a premature model will help with exploration: Maybe you'll get an idea that helps you downstream.
