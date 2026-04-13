# mvanhorn/last30days-skill

## Metadata
- **Full name:** mvanhorn/last30days-skill
- **Description:** AI agent skill that researches any topic across Reddit, X, YouTube, HN, Polymarket, and the web - then synthesizes a grounded summary
- **Stars:** 20,980
- **Last pushed:** 2026-04-11
- **License:** MIT
- **Topics:** ai-skill, claude-code, deep-research, reddit, research, social-media, twitter, youtube, web-search, polymarket, hackernews

## Archetype
**utility-with-skill** - Single-purpose research aggregation skill with a Python backend. Searches 13+ platforms in parallel, scores results by engagement metrics (upvotes, likes, real money), and synthesizes into grounded summaries.

## Structure
```
SKILL.md                  # Runtime skill spec (source of truth)
skills/last30days/        # Skill definition
agents/                   # Agent configurations
hooks/                    # Hook definitions
scripts/                  # Python research engine
vendor/                   # Vendored dependencies
tests/                    # Test suite
fixtures/                 # Test fixtures
```

## Extractable Value

### Processes (specializations/)

1. **multi-source-research-synthesis** - The v3 research methodology is interesting: intelligent pre-research (entity resolution before search), parallel multi-source search, engagement-weighted scoring (upvotes > editorial SEO), cross-source cluster merging (dedup same story across platforms), synthesis with source citations. This is a research methodology pattern, not just a tool. **Placement: specializations/shared/multi-source-research**

### Plugin Ideas

1. **last30days-integration** - A babysitter marketplace plugin that wraps /last30days as a research task. The pre-meeting research, competitive analysis, and trend monitoring use cases map well to babysitter orchestration tasks. The plugin would provide a `research` task type that delegates to the last30days engine. However, this is borderline since it requires the user to have last30days installed separately.

### SKIP

- The actual platform-specific API integrations (Reddit JSON, X API, YouTube transcripts) - tool-specific implementation details
- ELI5 mode - presentation concern, not methodology

## Priority Assessment
**LOW-MEDIUM** - The multi-source research synthesis methodology is conceptually interesting but the actual value is tightly coupled to the platform integrations (API keys, browser sessions). The methodology pattern (entity-resolve -> parallel-search -> engagement-score -> cluster-merge -> synthesize) could inform a generic research process, but it's thin without the platform access. Better as inspiration than a direct port.
