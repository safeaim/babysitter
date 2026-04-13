# clawhub/paperclipai/paperclip

- **Archetype**: Multi-agent business orchestration platform
- **Stars**: 52,218 (GitHub) / Discovered via ClawHub skill author NicholasSpisak (fork)
- **Last pushed**: 2026-04-12
- **License**: MIT
- **Discovered**: 2026-04-12
- **Source**: clawhub-skills (indirect -- NicholasSpisak/clawddocs ClawHub skill led to paperclip fork)
- **Skills found**: 4 skill directories (paperclip, paperclip-create-agent, paperclip-create-plugin, para-memory-files)

## Summary

Paperclip is a Node.js server + React UI that orchestrates a team of AI agents to run a business. "If OpenClaw is an employee, Paperclip is the company." Key features:

- **Multi-agent orchestration**: Org charts, budgets, governance, goal alignment, agent coordination
- **Multi-harness adapters**: claude-local, codex-local, cursor-local, gemini-local, openclaw-gateway, opencode-local, pi-local
- **Dashboard UI**: Task management interface for monitoring agent work and costs
- **Plugin system**: packages/plugins with adapter-utils
- **MCP server**: packages/mcp-server
- **Database layer**: packages/db
- **TypeScript monorepo**: pnpm workspaces, vitest, shared packages

Architecture: Server orchestrates multiple AI agents (each running in their own harness CLI -- Claude Code, Codex, Cursor, etc.) against business goals broken into tasks. Agents are assigned roles (CEO, CTO, engineer, designer, marketer) with budgets and governance rules.

"Clipmart" (coming soon) = downloadable company templates with pre-built org structures, agent configs, and skills.

## Assessment

**HIGH VALUE** -- Paperclip's architecture is remarkably parallel to babysitter's. Both are TypeScript monorepos that orchestrate AI agents across multiple harness CLIs. Key architectural parallels and differences:

1. **Multi-harness adapter pattern**: Paperclip's packages/adapters/ mirrors babysitter's harness/ directory. Both have adapters for claude-code, codex, cursor, gemini, opencode, pi. This validates babysitter's architectural choices.

2. **Goal-to-task decomposition**: Paperclip breaks business goals into agent-assignable tasks, similar to babysitter's process -> task decomposition. However, Paperclip adds org-level concepts (roles, budgets, governance).

3. **Dashboard UI**: Paperclip's React dashboard is comparable to babysitter's observer dashboard but oriented toward business metrics rather than run journaling.

4. **Plugin system**: Both have plugin architectures, though Paperclip's is less formalized than babysitter's marketplace model.

5. **MCP server**: Both expose MCP servers for integration.

6. **Key difference -- scope**: Babysitter is a deterministic, event-sourced orchestration engine for single-process runs. Paperclip is a higher-level business orchestrator that could theoretically USE babysitter as its execution engine for individual agent tasks.

## Extraction Priority

**P0 -- Study architecture patterns immediately**

### Processes

1. **Goal-to-Agent Decomposition** (methodologies/): A methodology for decomposing high-level business goals into role-assigned agent tasks with budget constraints, governance gates, and progress tracking. Maps to a babysitter process with breakpoint gates for budget/governance review.

2. **Multi-Agent Role Assignment** (methodologies/): Patterns for assigning specialized roles (technical, creative, analytical) to different agents/harnesses based on task requirements and agent capabilities.

### Plugin Ideas

1. **Paperclip Bridge Plugin**: Enable babysitter runs to be triggered and monitored from a Paperclip instance, positioning babysitter as the deterministic execution engine within Paperclip's business orchestration layer.

2. **Budget-Aware Orchestration Plugin**: Token/cost budget tracking per-run and per-process, with breakpoint gates when budget thresholds are approached. Inspired by Paperclip's budget governance.

3. **Org-Chart Process Plugin**: Define process hierarchies where parent processes delegate to child processes with different harnesses, similar to Paperclip's CEO -> CTO -> Engineer delegation model.
