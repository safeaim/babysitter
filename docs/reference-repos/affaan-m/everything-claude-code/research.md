# affaan-m/everything-claude-code

## Metadata
- **Stars:** 152,433
- **License:** MIT
- **Last pushed:** 2026-04-12
- **Description:** The agent harness performance optimization system. Skills, instincts, memory, security, and research-first development for Claude Code, Codex, Opencode, Cursor and beyond.

## Archetype: Aggregator / Ecosystem (massive skills library)

## Structure
- `skills/` — 181 skill directories spanning many domains
- `agents/` — Agent definitions (38 agents per README)
- `hooks/` — Hook implementations
- `rules/` — Language-specific rule sets (common, typescript, python, golang, java, php, perl, kotlin, c++, rust)
- `commands/` — 72 legacy command shims
- `plugins/` — Plugin integrations
- `contexts/` — Context files
- `ecc2/` — Rust control-plane prototype (alpha)
- `.claude-plugin/`, `.codex-plugin/`, `.cursor/`, `.gemini/`, `.opencode/` — Multi-harness support
- `research/` — Research-first development
- `mcp-configs/` — MCP server configurations
- `schemas/` — Schema definitions

## Extractable Value

### Skills with Process Potential (cherry-pick, not bulk import)
From 181 skills, notable clusters that map to babysitter specializations:

**DevOps/Infrastructure:**
- `docker-patterns`, `deployment-patterns`, `database-migrations`, `postgres-patterns`

**Security:**
- `security-scan` (AgentShield integration), `security-review`, `security-bounty-hunter`, `hipaa-compliance`, `healthcare-phi-compliance`, `defi-amm-security`, `llm-trading-agent-security`

**Testing Methodologies:**
- `tdd-workflow`, `e2e-testing`, `verification-loop`, `ai-regression-testing`, `eval-harness`
- Language-specific testing: `golang-testing`, `python-testing`, `rust-testing`, `cpp-testing`, `csharp-testing`, `kotlin-testing`

**Domain Specializations:**
- Healthcare: `healthcare-cdss-patterns`, `healthcare-emr-patterns`, `healthcare-eval-harness`
- Finance: `finance-billing-ops`, `evm-token-decimals`, `defi-amm-security`
- Logistics: `logistics-exception-management`, `returns-reverse-logistics`, `customs-trade-compliance`, `energy-procurement`, `inventory-demand-planning`
- Legal/Compliance: `hipaa-compliance`, `visa-doc-translate`

**Agent/AI Meta-skills:**
- `autonomous-loops`, `continuous-learning-v2`, `iterative-retrieval`, `context-budget`, `token-budget-advisor`, `cost-aware-llm-pipeline`

**Content/Media:**
- `manim-video`, `remotion-video-creation`, `frontend-slides`, `article-writing`, `content-engine`

### Methodological Patterns Worth Extracting
1. **Verification loop pattern** — Checkpoint vs continuous evals with pass@k metrics
2. **Continuous learning** — Auto-extract patterns from sessions into reusable skills
3. **Santa method** — Unknown, worth investigating
4. **Research-ops** — Research-first development workflow
5. **Hook profile system** — `ECC_HOOK_PROFILE=minimal|standard|strict` for runtime gating

### Plugin Idea: Selective Skill Import
The selective install architecture (`install-plan.js` / `install-apply.js`) with manifest-driven pipeline and state tracking is a pattern worth studying for babysitter's plugin system.

### What to SKIP
- `ecc2/` Rust control-plane — Competing orchestration, not assimilable
- Memory/session infrastructure — SDK-covered primitives
- Cross-harness management — Covered by babysitter harness adapters
- Skill management/discovery — SDK-covered primitives
- Observer/dashboard — Babysitter has its own

## Classification Rationale
This is primarily an aggregator. Individual skills should be cherry-picked based on domain value, not bulk-imported. The sheer volume (181 skills, 38 agents) means quality varies. Focus on domain specializations that don't exist in the babysitter process library yet (healthcare, logistics/supply-chain, finance/DeFi). The meta-patterns (verification loops, continuous learning, hook profiles) are more interesting than individual skills.
