# nicobailon/visual-explainer

- **Archetype**: utility-with-skill
- **Stars**: 7,484
- **Last pushed**: 2026-03-29
- **License**: MIT
- **Discovered**: 2026-04-12
- **Source**: gh-search (keyword: "agent skill")
- **Skills found**: 1 (SKILL.md content not retrievable at scan time)

## Summary
Agent skill that generates rich HTML pages or slide decks for diagrams, diff reviews, plan audits, data tables, and project recaps. Produces visual artifacts from structured data.

## Assessment
MEDIUM VALUE. The visualization generation procedure is a useful cross-domain capability. The specific output types (diff reviews, plan audits, project recaps) align well with babysitter's orchestration needs -- particularly plan audits and project recap visualization.

## Extraction Priority
MEDIUM -- Plan audit visualization and project recap generation are useful for babysitter observability and retrospection workflows.

## Processes
1. **visual-artifact-generation** -- Transform structured data into rich HTML visualization (diagrams, tables, slides)
2. **plan-audit-visualization** -- Generate visual plan audit reports
3. **diff-review-presentation** -- Create visual diff review artifacts

## Plugin Ideas
- **visual-reports plugin**: Babysitter plugin that generates HTML reports from run data, journal events, and retrospection results

## Implicit Procedural Knowledge
- HTML-as-artifact pattern: generating self-contained HTML pages as deliverables
- Multi-format output (page vs slide deck) from same structured input
