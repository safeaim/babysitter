# softaworks/agent-toolkit

- **Archetype**: mega-skill-pack
- **Stars**: 1,494
- **Last pushed**: 2026-03-05
- **License**: MIT
- **Discovered**: 2026-04-12
- **Skills found**: 42

## Summary
Curated collection of 42 skills for AI coding agents, organized as both source skills/ and built dist/plugins/ directories. Covers an exceptionally broad range: architecture (C4 diagrams), development (React, MUI, OpenAPI-to-TypeScript), DevOps (Datadog CLI), documentation (READMEs, session handoff), diagramming (Excalidraw, Draw.io, Mermaid, Marp slides), communication (professional communication, difficult conversations, feedback mastery), planning (requirements clarity, QA test planning), tooling (Jira, Perplexity, Gemini, Codex), and meta-skills (plugin-forge, skill-judge, naming-analyzer).

## Assessment
HIGH VALUE. The largest and most diverse skill collection in this batch. Several skills are directly relevant to babysitter process extraction: C4 architecture documentation provides a structured architecture design workflow with level selection, codebase analysis, and diagram generation. Plugin-forge is a meta-skill for creating Claude Code plugins with marketplace integration. The session-handoff skill addresses context transfer between sessions. The skill-judge evaluates skill quality. Notable breadth: professional soft-skills (difficult conversations, feedback mastery, professional communication) alongside technical skills. The dist/plugins/ structure shows a distribution model where each skill is also packaged as a standalone plugin.

## Extraction Priority
- High
- Rationale: 42 skills with high diversity. C4 architecture, requirements clarity, QA test planning, and session handoff are directly extractable as babysitter processes. The plugin-forge meta-skill provides useful patterns for babysitter's own plugin creation. The soft-skills collection (difficult conversations, feedback mastery) represents a novel domain not yet in babysitter's process library.

## Processes
- **C4 Architecture Documentation**: Understand scope -> assess project -> select architecture level (Context/Container/Component/Deployment/Dynamic) -> analyze codebase -> generate Mermaid C4 diagrams -> document with context. Maps directly to a multi-step babysitter process with breakpoints for scope decisions.
- **Requirements Clarity Process**: Analyze requirements for ambiguity, gaps, and contradictions -> generate clarifying questions -> document resolved requirements. A planning-phase methodology.
- **QA Test Planning Process**: Analyze codebase and requirements -> generate test plan with coverage matrix -> prioritize test scenarios. A verification methodology.
- **Plugin Creation Workflow**: Use create_plugin.py to scaffold plugin structure -> generate plugin.json manifest -> add components (commands, skills, agents, hooks) -> configure marketplace integration -> publish.
- **Session Handoff Process**: Capture current session context -> serialize key decisions and progress -> generate handoff document for next session. Context continuity methodology.

## Plugin Ideas
- **C4 Architecture plugin**: Install.md-driven plugin for generating C4 architecture documentation from codebase analysis. Includes Mermaid diagram generation and level-selection guidance.
- **Professional Communication Suite plugin**: Bundle of soft-skills (difficult conversations, feedback mastery, professional communication, writing clearly) as a babysitter marketplace plugin for non-technical workflows.
- **Plugin Forge Adapter**: Adapt the plugin-forge skill to work as a babysitter plugin creation assistant, complementing babysitter's native plugin-dev skills.
- **Skill Quality Judge plugin**: A skill evaluation plugin that scores skills on procedural depth, trigger accuracy, reference completeness, and guardrail coverage.

## Patterns
- **Dual distribution model**: Each skill exists in both skills/ (source) and dist/plugins/ (packaged plugin). Enables both direct skill usage and plugin marketplace distribution.
- **Architecture decision framework**: C4 level selection based on audience (everyone/technical/developers/DevOps) with a "Key Insight" that Context + Container are sufficient for most teams. Decision gates that prevent over-engineering.
- **Soft-skills as agent skills**: Encoding interpersonal communication patterns (difficult conversations, feedback) as structured agent instructions. Novel domain for agent skills.
- **Cross-domain skill organization**: Technical, documentation, communication, and meta skills coexisting in one collection. Demonstrates that skill collections benefit from breadth, not just depth.
