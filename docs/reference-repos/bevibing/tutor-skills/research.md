# bevibing/tutor-skills

- **Archetype**: domain-skill-pack
- **Stars**: 694
- **Last pushed**: 2026-02-28
- **License**: MIT
- **Discovered**: 2026-04-12
- **Skills found**: 2

## Summary
Claude Code skill that converts PDFs, docs, and codebases into Obsidian study vaults, then provides an interactive quiz-based tutoring system. Two skills: tutor-setup (vault creation) and tutor (interactive learning). The tutor skill tracks concept-level mastery with per-area concept files, a compact dashboard, and session-type selection. Supports multiple languages with automatic detection.

## Assessment
MEDIUM-HIGH VALUE for process extraction. The tutor skill implements a sophisticated learning loop: diagnostic assessment -> targeted drilling -> progress tracking at concept granularity. The file structure (dashboard + per-area concept files) is a clean state management pattern. The "detect language -> discover vault -> ask session type -> execute session" workflow is a well-structured multi-phase process. The concept-level tracking (attempts, correct count, status, error notes) provides a reusable assessment framework. Transferable to specializations/social-sciences-humanities/education or as a shared methodology for iterative skill assessment.

## Extraction Priority
- Medium
- Rationale: The iterative assessment + targeted practice loop is a reusable methodology pattern. The concept-level tracking with bounded growth (one file per area, grows only with unique concepts) is an elegant state management design. The two-skill architecture (setup + interactive) demonstrates good separation of concerns.

## Processes
- **Study Vault Generation Process**: Convert source material (PDF/docs/codebase) -> extract key concepts -> organize into Obsidian vault structure -> generate concept tracking files -> create dashboard. Maps to a babysitter process with tasks for each conversion step.
- **Adaptive Tutoring Process**: Discover vault -> read dashboard state -> present session options (diagnostic, review, drill weak areas, check progress) -> run quiz session -> update concept tracking -> regenerate dashboard. A stateful iterative process ideal for babysitter's event-sourced model.
- **Concept Mastery Tracking**: Per-concept state machine (untested -> attempted -> weak -> strong) with attempt history. Reusable as a shared assessment methodology.

## Plugin Ideas
- **Study Vault Generator plugin**: Install.md-driven plugin that adds a vault-generation skill for converting any source material into structured Obsidian study vaults. Configurable concept extraction depth and vault organization patterns.
- **Adaptive Assessment Framework plugin**: Generic quiz/assessment plugin with concept-level tracking, adaptive difficulty, and progress dashboards. Configurable for any domain (not just study vaults).

## Patterns
- **Two-skill architecture**: Separate setup skill (one-time vault creation) from interactive skill (ongoing tutoring). Clean lifecycle separation.
- **Bounded state growth**: Concept files grow proportionally to unique concepts, not to number of quiz attempts. Dashboard stays compact with only aggregated numbers. Prevents unbounded state accumulation.
- **Language-first detection**: Auto-detect user language from message, produce all output in detected language. Simple but effective internationalization pattern.
- **Session-type branching**: Read existing state to build context-aware options, let user choose session type. Data-driven option generation rather than static menus.
- **AskUserQuestion integration**: Mandatory user interaction points for session type selection, preventing the agent from making assumptions about learning goals.
