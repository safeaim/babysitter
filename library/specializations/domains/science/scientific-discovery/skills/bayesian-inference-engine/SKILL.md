---
name: bayesian-inference-engine
description: Bayesian probabilistic reasoning for prior specification, posterior computation, and belief updating
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
metadata:
  specialization: scientific-discovery
  domain: science
  category: hypothesis-reasoning
  phase: 6
graph:
  domains: [domain:scientific-discovery]
  skillAreas: [skill-area:data-analysis]
  topics: [topic:research-methodology, topic:scientific-computing]
  roles: [role:tech-lead, role:data-engineer]
---

# Bayesian Inference Engine

## Purpose

Provides Bayesian probabilistic reasoning capabilities for prior specification, posterior computation, and sequential belief updating.

## Capabilities

- Prior elicitation support
- MCMC sampling (NUTS, HMC)
- Variational inference
- Model comparison (Bayes factors, LOO-CV)
- Posterior predictive checking
- Sequential belief updating

## Usage Guidelines

1. **Prior Selection**: Choose appropriate, defensible priors
2. **Sampling**: Use efficient MCMC algorithms
3. **Diagnostics**: Check convergence and mixing
4. **Model Comparison**: Use appropriate comparison criteria

## Tools/Libraries

- PyMC
- Stan (PyStan)
- ArviZ
- NumPyro
