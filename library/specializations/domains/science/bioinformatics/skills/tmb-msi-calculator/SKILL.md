---
name: tmb-msi-calculator
description: Tumor mutation burden and microsatellite instability calculation skill for immunotherapy biomarkers
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Edit
  - WebFetch
  - WebSearch
  - Bash
metadata:
  version: "1.0"
  category: bioinformatics
  tags:
    - clinical-genomics
    - oncology
    - tmb
    - msi
graph:
  domains: [domain:bioinformatics]
  skillAreas: [skill-area:data-analysis]
  topics: [topic:scientific-computing, topic:research-methodology]
  roles: [role:data-engineer, role:tech-lead]
---

# TMB-MSI Calculator Skill

## Purpose
Calculate tumor mutation burden and microsatellite instability for immunotherapy biomarker assessment.

## Capabilities
- TMB calculation from VCF
- MSI status determination
- Neoantigen prediction
- HLA typing integration
- Biomarker thresholds
- Clinical report generation

## Usage Guidelines
- Calculate TMB with appropriate normalization
- Determine MSI status accurately
- Predict neoantigens for immunotherapy
- Apply clinical thresholds for reporting
- Generate actionable reports
- Document methodology and thresholds

## Dependencies
- TMBcat
- MSIsensor2
- MANTIS

## Process Integration
- Tumor Molecular Profiling (tumor-molecular-profiling)
