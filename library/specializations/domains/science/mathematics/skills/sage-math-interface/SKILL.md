---
name: sage-math-interface
description: SageMath for comprehensive mathematical computation
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
  category: symbolic-computation
  phase: 6
graph:
  domains: [domain:mathematics]
  skillAreas: [skill-area:data-analysis]
  topics: [topic:formal-methods, topic:algorithm-design]
  roles: [role:tech-lead, role:data-engineer]
---

# SageMath Interface

## Purpose

Provides interface with SageMath for comprehensive mathematical computation spanning algebra, number theory, geometry, and more.

## Capabilities

- Unified interface to multiple CAS systems
- Number theory computations
- Algebraic geometry calculations
- Combinatorics and graph theory
- Cryptographic functions
- Notebook interface generation

## Usage Guidelines

1. **Python Syntax**: Use Python-based SageMath conventions
2. **Backend Selection**: Choose appropriate computational backend
3. **Number Theory**: Use built-in number theoretic functions
4. **Algebraic Structures**: Work with rings, fields, groups

## Tools/Libraries

- SageMath
- GAP
- Singular
- PARI/GP
