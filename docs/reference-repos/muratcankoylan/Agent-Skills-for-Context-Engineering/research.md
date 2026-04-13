# muratcankoylan/Agent-Skills-for-Context-Engineering

- **Archetype**: mega-skill-pack
- **Stars**: 14,978
- **Last pushed**: 2026-04-12
- **License**: MIT
- **Discovered**: 2026-04-12
- **Source**: gh-search (keyword: "agent skill")
- **Skills found**: 19+

## Summary
Comprehensive collection of agent skills for context engineering, multi-agent architectures, and production agent systems. Organized into skills (context-fundamentals, context-compression, context-degradation, context-optimization, evaluation, advanced-evaluation, tool-design, hosted-agents, memory-systems, bdi-mental-states, filesystem-context, multi-agent-patterns, project-development) plus examples (book-sft-pipeline, digital-brain-skill, interleaved-thinking). Also includes a skill template.

## Assessment
HIGH VALUE. This is a methodology-rich collection covering agent system design patterns that overlap significantly with babysitter's architectural concerns. Key extractable content:
- Context degradation patterns (lost-in-middle, U-shaped attention, context poisoning)
- Multi-agent coordination patterns (supervisor, swarm, hierarchical)
- Memory system design (vector RAG, knowledge graphs, filesystem-as-memory)
- Context compression strategies (tokens-per-task optimization)
- BDI mental states for agents (belief-desire-intention architecture)
- Evaluation frameworks for agent systems
- The book-SFT-pipeline example has a staged idempotent architecture pattern

## Extraction Priority
HIGH -- Multiple skills map directly to babysitter process methodology areas:
- context-compression -> methodologies/ (complements babysitter's compression layer)
- multi-agent-patterns -> methodologies/ (orchestration patterns)
- evaluation + advanced-evaluation -> methodologies/ (quality assessment)
- memory-systems -> specializations/shared/ (cross-domain pattern)
- project-development -> methodologies/ (task-model fit analysis)

## Processes
1. **context-optimization-workflow** -- Systematic context window optimization: compaction, observation masking, prefix caching, strategic partitioning
2. **agent-evaluation-framework** -- Multi-dimensional agent evaluation: factual accuracy, completeness, tool efficiency, process quality
3. **multi-agent-architecture-design** -- Pattern selection for multi-agent systems (supervisor vs swarm vs hierarchical)
4. **memory-system-design** -- Choose and implement agent memory architecture (scratchpad -> temporal knowledge graph spectrum)
5. **book-sft-pipeline** -- Staged idempotent pipeline: acquire -> prepare -> process -> parse -> render
6. **digital-brain-skill** -- Personal knowledge management with agents (contacts, content, weekly reviews)

## Plugin Ideas
- **context-engineering-advisor plugin**: Babysitter plugin that analyzes process definitions for context engineering anti-patterns and suggests optimizations

## Implicit Procedural Knowledge
- Filesystem-as-memory pattern: using ls/glob/grep/read_file for targeted context discovery outperforms semantic search for structural queries
- Context isolation as the primary reason for sub-agents (not role simulation)
- Token-per-task as the correct optimization target (not tokens-per-request)
- Warm sandbox pools and predictive warming for hosted agent infrastructure
- Tool consolidation principle: prefer single comprehensive tools over multiple narrow ones
