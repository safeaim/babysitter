# Orchestra-Research/AI-Research-SKILLs

## Metadata
- **Stars**: 6,637
- **License**: MIT
- **Last pushed**: 2026-04-10
- **Topics**: ai, ai-research, claude, claude-code, claude-skills, codex, gemini, skills, vllm
- **Fork**: No

## Overview
Comprehensive open-source library of 87 AI research skills organized into 22 categories covering the full AI research lifecycle — from idea to paper. Includes an `autoresearch` orchestration skill that uses a two-loop architecture (inner experiment loop + outer synthesis loop) to run autonomous research projects.

## Architecture
- 22 numbered skill categories (model-architecture, tokenization, fine-tuning, interpretability, data-processing, post-training, safety, distributed-training, infrastructure, optimization, evaluation, inference, mlops, agents, rag, prompt-engineering, observability, multimodal, emerging-techniques, paper-writing, ideation)
- Each skill follows SKILL.md format with YAML frontmatter, references/, scripts/, templates/
- Claude Code plugin marketplace with `marketplace.json`
- NPM installer: `npx @orchestra-research/ai-research-skills`

## Extractable Value

### Process: specializations/science/ai-research-orchestration
The `autoresearch` SKILL.md contains a complete two-loop research orchestration methodology:
1. Bootstrap: scope question, literature survey, form hypotheses
2. Inner loop: pick hypothesis, experiment, measure, record, learn
3. Outer loop: review results, find patterns, update findings, new hypotheses
4. Finalize: write paper, presentation, archive

Includes workspace structure template (research-state.yaml, experiments/, paper/), agent continuity patterns, and routing to domain skills. This is a full generic research methodology suitable for `specializations/science/autonomous-ai-research`.

### Process: specializations/science/ml-paper-writing
The `research-paper-writing` skill (also found in hermes-agent, attributed to Orchestra Research) provides a complete 7-phase pipeline for ML paper writing targeting NeurIPS/ICML/ICLR/ACL/AAAI/COLM. Includes experiment design, monitoring, statistical analysis, iterative drafting, self-review, and submission prep.

### Plugin idea: ai-research-skills
The marketplace already has a `marketplace.json` with plugin structure. Could be assimilated as a babysitter marketplace plugin providing AI research domain skills. However, these are tool/framework-specific skills (vLLM, DeepSpeed, etc.), not babysitter processes — they'd need to be wrapped as process definitions.

## Classification
- **Archetype**: Domain skill library with orchestration layer
- **Primary value**: Two processes extractable — autonomous research orchestration and ML paper writing pipeline
- **Process placement**: `specializations/science/autonomous-ai-research` and `specializations/science/ml-paper-writing`
