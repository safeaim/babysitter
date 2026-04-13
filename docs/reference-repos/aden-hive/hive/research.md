# aden-hive/hive

- **URL**: https://github.com/aden-hive/hive
- **Stars**: 10,177
- **License**: Apache-2.0
- **Last pushed**: 2026-04-11
- **Description**: Multi-Agent Harness for Production AI

## Overview

Hive is a production multi-agent harness (Python) by Aden (YC). A "queen" coding agent generates agent graphs from natural language goals; the harness then executes them with state isolation, checkpoint-based crash recovery, cost enforcement, and real-time observability. Self-improving: when agents fail, the framework captures failure data, evolves the graph through the coding agent, and redeploys automatically.

## Architecture Highlights

- **Graph executor** with `GraphSpec`, `NodeSpec`, `EdgeSpec` -- nodes are LLM-driven phases with typed DataBuffer I/O
- **Checkpoint-based crash recovery** (`CheckpointStore`, `CheckpointConfig`) -- nodes can resume from last checkpoint
- **Conversation-aware judge** (`conversation_judge.py`) -- Level 2 quality evaluation: after a node sets its output keys (Level 0), an LLM evaluates whether the conversation actually met `success_criteria`; returns ACCEPT or RETRY with feedback
- **GCU nodes** -- browser automation nodes with canonical system prompt and MCP tool auto-inclusion
- **Event bus runtime** with execution streams, triggers, webhook server
- **Skills system** with discovery, catalog, registry, validator, trust, installer -- default skills include task-decomposition, error-recovery, quality-monitor, batch-ledger, context-preservation, note-taking
- **HITL (human-in-the-loop)** pausing at nodes with session state for resume
- **Execution quality tracking** -- clean/degraded/failed, retry counts, node visit tracking for feedback loops

## Default Skills (Extractable Patterns)

### task-decomposition
Before complex tasks: decompose into numbered subtasks, estimate effort (small/medium/large), execute in order marking completion, budget by impact when iterations run low, verify all subtasks before declaring done.

### error-recovery
When tool calls fail: diagnose (transient vs structural), decide (retry once for transient, fix for structural-fixable, record and move on for unfixable), adapt (stop using tool after N failures, find alternative).

### quality-monitor
Every N iterations: self-assess on-task, thorough, non-repetitive, consistent, complete. If degrading: write to quality log, re-read working notes, change approach. If acceptable: brief note.

### context-preservation
Working notes protocol for maintaining context across iterations.

### batch-ledger
Tracking batch operations with ledger for completeness verification.

## Extractable Value for Babysitter

### Processes (specializations/shared/)
1. **Conversation-aware phase validation** -- the Level 2 judge pattern (LLM evaluates whether a phase's goal was genuinely accomplished, not just that output keys were set) maps to a quality-convergence methodology enhancement
2. **Self-healing graph evolution** -- failure capture + automatic graph modification through coding agent -- maps to an iterative-convergence specialization
3. **Execution quality degradation tracking** -- clean/degraded/failed classification with retry budgets

### Plugin Ideas
1. **Checkpoint recovery plugin** -- checkpoint-based crash recovery for babysitter runs, allowing mid-run resume from last known-good state (beyond journal replay)
2. **Conversation judge plugin** -- LLM-based phase completion validation that goes beyond output key checks to evaluate whether work quality meets criteria

## Classification

- **Archetype**: Production multi-agent harness with self-improvement
- **Primary value**: The default skills (task-decomposition, error-recovery, quality-monitor) are directly assimilable as process methodology enhancements. The conversation-aware judge pattern is a novel quality-gate concept.
- **Skip**: Core harness runtime (SDK-covered), graph execution engine (different paradigm), multi-model coordination
