# clawhub/openai/symphony

- **Archetype**: Agent orchestration specification + reference implementation
- **Stars**: 14,973 (GitHub) / Discovered via ClawHub skill ecosystem (arnarsson fork)
- **Last pushed**: 2026-03-27
- **License**: Apache-2.0
- **Discovered**: 2026-04-12
- **Source**: clawhub-skills (indirect -- arnarsson/docker-essentials & git-essentials led to arnarsson/symphony fork)
- **Skills found**: 0 (specification repo, not a ClawHub skill)

## Summary

OpenAI's Symphony is a language-agnostic specification for an autonomous coding agent orchestration service. It defines a daemon that polls an issue tracker (Linear), creates isolated per-issue workspaces, and runs coding agent sessions with deterministic retry, reconciliation, and workspace lifecycle management. Includes an Elixir reference implementation.

Key architectural concepts:
- **WORKFLOW.md contract**: YAML front matter for config + Jinja-style prompt template body, version-controlled with the repo
- **5-layer architecture**: Policy -> Configuration -> Coordination -> Execution -> Integration + Observability
- **Orchestrator state machine**: Issues progress through dispatch -> running -> completed/failed/stopped with bounded concurrency, exponential backoff retry, and reconciliation on restart
- **Workspace isolation**: Per-issue filesystem workspaces with lifecycle hooks (after_create, before_remove)
- **Agent protocol**: JSON-RPC app-server mode over stdio with structured event streaming
- **2175-line SPEC.md**: Extremely detailed specification covering domain model, state transitions, error handling, logging, and recovery

## Assessment

**HIGH VALUE** -- This is the most architecturally relevant repo found in this batch. Symphony's orchestration model is philosophically aligned with babysitter's deterministic replay loop but approaches the problem from a different angle (issue-tracker-driven daemon vs event-sourced run). Key differences and learnings:

1. **WORKFLOW.md as contract**: Symphony version-controls the agent prompt + runtime config in a single repo file. Babysitter could adopt similar patterns for process definitions.
2. **Reconciliation on restart**: Symphony rebuilds in-flight state from the issue tracker on daemon restart, similar to babysitter's journal replay.
3. **Workspace isolation**: Per-issue workspace with hooks maps to babysitter's per-run directory layout.
4. **Bounded concurrency with priority dispatch**: Symphony sorts eligible issues by priority and dispatches up to max_concurrent_agents. Babysitter's parallel.all() is similar but at a different granularity.
5. **Stop-on-state-change**: Symphony stops agent runs when the issue moves to a terminal state externally, analogous to babysitter's hook-driven iteration stop.

## Extraction Priority

**P0 -- Extract immediately**

### Processes

1. **Issue-Driven Agent Orchestration** (methodologies/): A full methodology for orchestrating coding agents against issue trackers with workspace isolation, retry semantics, and reconciliation. Covers the "manage work not agents" paradigm.

2. **WORKFLOW.md Contract Pattern** (methodologies/): A methodology for defining agent behavior via version-controlled markdown contracts with structured front matter config.

3. **Agent Session Recovery** (methodologies/): Patterns for restart recovery, reconciliation of in-flight work, and deterministic replay of agent state from external sources.

### Plugin Ideas

1. **Symphony Bridge Plugin**: A babysitter plugin that polls Linear/GitHub Issues and creates babysitter runs per issue, mapping Symphony's WORKFLOW.md contract to babysitter process definitions. Would enable babysitter to operate in Symphony's "manage work" paradigm.

2. **Workspace Isolation Plugin**: Enhanced workspace lifecycle management with per-run hooks (after_create, before_remove), similar to Symphony's workspace manager.
