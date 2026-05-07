---
name: cosmosis-parameter-estimator
description: CosmoSIS cosmological parameter estimation skill for MCMC sampling and likelihood analysis
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
metadata:
  specialization: physics
  domain: science
  category: cosmology
  phase: 6
graph:
  domains: [domain:physics]
  skillAreas: [skill-area:data-analysis]
  topics: [topic:scientific-computing, topic:research-methodology]
  roles: [role:tech-lead, role:data-engineer]
---

# CosmoSIS Parameter Estimator

## Purpose

Provides expert guidance on CosmoSIS for cosmological parameter estimation, including modular likelihood construction and MCMC sampling.

## Capabilities

- Modular likelihood construction
- Multiple sampler support (emcee, multinest, polychord)
- Prior specification
- Chain analysis and diagnostics
- Plotting and visualization
- Pipeline construction

## Usage Guidelines

1. **Pipeline Setup**: Configure modular analysis pipeline
2. **Likelihoods**: Build likelihood functions from data
3. **Priors**: Specify parameter priors
4. **Sampling**: Run MCMC with appropriate sampler
5. **Analysis**: Analyze chains and compute posteriors

## Tools/Libraries

- CosmoSIS
- emcee
- GetDist
