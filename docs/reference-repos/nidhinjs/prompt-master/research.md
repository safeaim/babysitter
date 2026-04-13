# nidhinjs/prompt-master

## Metadata
- **Stars:** 4,992
- **License:** MIT
- **Last pushed:** 2026-03-31
- **Description:** A Claude skill that writes the accurate prompts for any AI tool. Zero tokens or credits wasted. Full context and memory retention.

## Archetype: Specialization Process (prompt-engineering domain)

## Structure
- `SKILL.md` — Complete prompt engineering skill with tool-routing logic
- `references/` — `templates.md` and `patterns.md` for category-specific templates

## Extractable Value

### As a Babysitter Process: `specializations/shared/prompt-engineering`
The SKILL.md contains a well-structured prompt engineering methodology:

1. **9-dimension intent extraction framework** — Task, Target tool, Output format, Constraints, Input, Context, Audience, Success criteria, Examples. Each dimension marked as critical/conditional.
2. **Tool-specific routing logic** — Detailed prompting guidance for 16+ tools/models:
   - Claude (4.x), ChatGPT/GPT-5.x, o3/o4-mini reasoning models, Gemini 2.x/3, Qwen 2.5/3, Ollama, Llama/Mistral, DeepSeek-R1, MiniMax M2.7/M2.5, Claude Code, Antigravity, Cursor/Windsurf, Cline, GitHub Copilot
3. **Anti-pattern enforcement** — Hard rules against techniques that cause fabrication in single-prompt execution (Mixture of Experts, Tree of Thought, Graph of Thought, etc.)
4. **Model-specific constraints** — e.g., "NEVER add CoT to reasoning-native models", "Claude Opus 4.x over-engineers by default"

### Key Differentiators
- The tool-routing approach is unique — maps target tool to specific prompting strategy
- Anti-fabrication rules are concrete and actionable (not vague "be careful" advice)
- The 9-dimension intent extraction is a reusable analysis framework
- Output format is strictly enforced: copyable prompt block + target + optimization note

### Process Mapping
Would map well to a babysitter process with:
- Breakpoint for tool identification when ambiguous
- Task for intent extraction across 9 dimensions
- Tool-routing logic as branching in the process
- Output formatting as final stage

## Classification Rationale
Cross-domain (works for any AI tool/model), so fits in `specializations/shared/`. The tool-routing logic and anti-fabrication rules are unique contributions not found in the current process library.
