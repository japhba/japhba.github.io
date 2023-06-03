Outline

-   define **learning**: given some input-output training set, generalize to new inputs based on inferred priors. This is, in its general definition, independent of any parametric substrate!

-   Formal definition: Let $f=\mathcal{T}\left[\emptyset,\left(X,Y\right)\right]$ be a learned function on $\left(X,Y\right)$ from scratch, where $\mathcal{T}:\left(X,Y\right)\mapsto f$ is a "training" operator that turns data $\left(X,Y\right)$ into functions $f$. While it can be defined purely abstractly, it is highly dependent on the inductive bias of the model $\mathcal{M}$ . Notably, in the ML setting, this includes architecture and the optimization procedure, where the latter is influenced by algorithm (ADAM, SGD,\...) and hyperparameters (learning rate). $$\mathcal{T}=\mathcal{T}_{\text{model}\,\mathcal{M}}\overset{\text{e.g.}}{=}\mathcal{T}_{\left(\text{CNN},\,\text{ADAM\,@}\text{lr}=.01\,N_{\text{epoch}}=42\right)}.$$

-   **meta-learning** is being referred to as learning to learn.

    -   finding good parameters that control the learning process

    -   learn a function by optimizing $\Omega$ $$f_{\Omega}:\:(\text{model}=\text{(architecture},\text{hyperparameters)},\text{task})\mapsto\text{performance}$$ as opposed to learning a function by optimizing $\theta$ on $(x,y)\in\text{task}$ $$f_{\theta}:x\mapsto y$$

    -   where in either case we are only provided with a finite **training set** of examples from which we generalize

-   **transfer learning/few-shot learning/continual learning/fine-tuning**: use the learned repr to **efficiently incorporate new information**

    -   definition. A continual learning paradigm $\tilde{\mathcal{T}}$ that results in $\tilde{f}=\tilde{\mathcal{T}}[f,X^{+}]$ is successful if for new "fine-tuning" training data $\left(X^{+},Y^{+}\right)$, it holds $$\mathcal{T}\left[f,\left(X^{+},Y^{+}\right)\right]=\tilde{\mathcal{T}}\left[\emptyset,\left(X,X^{+},Y,Y^{+}\right)\right]$$

        -   Probabilistic models such as GPs fulfil this by definition. It is a notion of consistency.

        -   Note: overfitting prevents this, by definition

        -   few shot learning does not require a parameter change, it can happen in the activity only! -\> chatGPT

            -   give the demonstration

-   **Generalization**

    -   generalization is about finding the right inductive bias, i.e. the question of choosing the right $\mathcal{T}$

    -   in this sense, learning how to interpret unexpected input by accounting for its possibility in the inductive bias enables one to deal well with unseen data, $$\mathcal{T}\left[f,\left(X,Y\right)\right](x^{*})=f^{\star}(x^{*})$$

    -   even on esoteric $x^{*}$.

    -   ChatGPT can also do this.
