---
title: DMFT in a nutshell
subtitle: Dynamical mean-field theory is a sophisticated tool from statistical physics that has been developed in the context of spin glasses. It is however also useful in a variety of other cases. In this post, we will step through the main notions of mathematical machinery to see how this procedure goes. 

# Summary for listings and search engines
summary: Systems that undergo a noisy environment show fluctuating behavior. The assumption that those perturbations are finite allows the prediction of the typical state of the system. Surprisingly, our expectations change qualitatively if we allow for fluctuations of finite size. 

# Link this post with a project;MM
projects: []

# Date published
date: '2022-11-10T22:00:00Z'

# Date updated
lastmod: '2022-11-10T22:00:00Z'

# Is this an unpublished draft?
draft: false

# Show this page in the Featured widget?
featured: false

# Featured image
# Place an image named `featured.jpg/png` in this page's folder and customize its options here.
#image:
#  caption: 'Image credit: [**Unsplash**](https://unsplash.com/photos/CpkOjOcXdUY)'
#  focal_point: ''
#  placement: 2
#  preview_only: false

authors:
  - admin

tags:
  - Physics
  - Statistics
---


## Overview
A common problem in statistical phyics is the calculation of so-called observables. These quantities contain special, aggregated information about a system with many constituents. For example, pressure is a particular observable for a system of gas particles confined in a box. This gives useful information on its physical properties and sweps the details, such as the position of every single atom in the box, under the rug. 

These observables are expressed as averages over the *statistics* of the system, as we have only approximate (probabilistic) knowledge of its state. Unfortunately, evaluating these averages requires formal access to every possible realization of the system that could be realized and is hence a member of the ensemble corresponding to the probability distribution. DMFT is concerned with coming up with an efficient technique of approximating these averages. 

## A toy problem
Instead of considering a complex system, let's consider a more trivial case. Consider a random variable $x$ which follows the probability distribution 
$$ p(x)=e^{S_0(x)+S_V(x)}. $$

Suppose we are interested in the observable
$$ O = \langle O(x) \rangle = \langle x^2 \rangle. $$

Evaluation of this integral is hard in general. In particular, if $x\in \mathbb R^N$, numerical methods might become infeasible, too. Moreover, often one would like to use analytical continuations (for example in the Replica Trick), which is only possible with closed form solutions. 

To address this, DMFT now proceeds in two steps: **Decoupling** and the **saddle-point approximation**. 

### Decoupling
This step is also known as the Hubbard-Stratonovich transform. Despite its impressive name, it is simply an identity for solving Gaussian integrals, 
$$ \frac{1}{\sqrt{2 \pi \sigma^2}} \int dx e^{-x^2/{2\sigma^2}+bx} = e^{b^2 \sigma^2}, $$ 
but applied in reverse.  

$$ \int dx df \,e^{S_0(x) + f}\,\delta(f-f(x)). $$

Next, we raise the $\delta$-constraint to the exponent by the magic identity $\delta(y)=\int d\tilde y\, e^{i\tilde y y}$. This gives
$$ \int dx df d\tilde f \,e^{S_0(x) + f + \tilde f(f-f(x))}. $$

We can now separate the $x$-independent part of the integral
$$ 
\begin{aligned}
\int df d\tilde f \:e^{f + \tilde f f} \: &\underbrace{\int dx \,e^{S_0(x) - \tilde f f(x)}}_{Z_{\text{eff}}} \\
\int df d\tilde f \:e^{f + \tilde f f} \: & e^{\ln Z_{\text{eff}}} \\
\end{aligned}. 
$$

### Saddle-point approximation
We can now hope that the outer integral is well approximated at

Our problem above hence takes shape
$$ \begin{aligned} \int dx  x^2 e^{-x^2+x^4} = \frac{1}{\sqrt{2 \pi}} \int dx  dz  x^2 e^{-x^2} e^{-z^2/2 + x^2 z}. \end{aligned}$$
Crucially, we have gotten rid of the quartic term $x^4$ in the exponent. However, as there appears to be No Free Lunch, this has come at the cost of and additional integral $\int dz$. 

### Saddle-point approximation
To proceed, we will have to resort to a form of approximation. This will come about as evaluating the integrand at its stationary point, i.e. 
$$ \int dy p(y) f(y) \approx f(y^*), \quad y^*=\text{arg stat}_y f(y). $$

For our case, we need to decide which integral to approximate. For the $dz$ integral, this would again lead to a quartic and hence intractable integral. Instead, we demand
$$ \frac{d}{dx} e^{-x^2} e^{-z(z/2 + x^2)} \overset{!}{=} 0. $$
This gives
$$ x^*(z) = -2/3 x^2. $$

Finally, we can plug this result into the integral and get
$$ O = \frac{1}{\sqrt{2 \pi}} \int dx  x^2 e^{-x^2} e^{-z^2/2 + x^2 z}
