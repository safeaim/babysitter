---
name: stan-bayesian-modeling
description: Stan probabilistic programming for Bayesian inference
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
metadata:
  specialization: mathematics
  domain: science
  category: statistical-computing
  phase: 6
graph:
  domains: [domain:mathematics]
  skillAreas: [skill-area:data-analysis]
  topics: [topic:formal-methods, topic:algorithm-design]
  roles: [role:tech-lead, role:data-engineer]
---

# Stan Bayesian Modeling

## Purpose

Provides Stan probabilistic programming capabilities for Bayesian inference and statistical modeling.

## Capabilities

- Stan model specification
- MCMC sampling (NUTS, HMC)
- Variational inference
- Prior predictive checks
- Posterior predictive checks
- Model comparison (LOO-CV, WAIC)

## Usage Guidelines

1. **Model Specification**: Write Stan code with clear blocks
2. **Prior Selection**: Choose appropriate, weakly informative priors
3. **Diagnostics**: Check Rhat, ESS, and divergences
4. **Model Comparison**: Use LOO-CV for model selection

## Tools/Libraries

- Stan
- CmdStan
- RStan
- PyStan
