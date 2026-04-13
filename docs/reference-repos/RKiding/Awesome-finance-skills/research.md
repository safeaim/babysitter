# RKiding/Awesome-finance-skills

## Metadata
- **Stars:** 1,766
- **License:** Apache-2.0
- **Last pushed:** 2026-03-29
- **Topics:** agent, agent-skills, finances, fintech
- **Fork:** No

## Archetype: domain-skill-pack

A collection of finance-specific SKILL.md-based agent skills for stock analysis, news aggregation, sentiment analysis, and market prediction. Targets OpenClaw, Claude Code, Codex, and other agent frameworks.

## Structure
- `skills/` directory with 10 skills, each containing SKILL.md:
  - alphaear-news (real-time financial news from 10+ sources)
  - alphaear-stock (A-Share, HK, US stock data)
  - alphaear-sentiment (FinBERT/LLM sentiment scoring)
  - alphaear-predictor (Kronos time-series forecasting)
  - alphaear-signal-tracker (investment signal evolution)
  - alphaear-logic-visualizer (transmission chain diagrams)
  - alphaear-reporter (professional report generation)
  - alphaear-search (web search + local RAG)
  - alphaear-deepear-lite (lite demo)
  - skill-creator (meta-skill for creating skills)
- `tests/` directory
- Compatible with `npx skills add` (Vercel skills CLI)

## Extractable Value

### Processes
- **Financial analysis workflow** (specializations/business/finance/): The reporter skill describes a Plan->Write->Edit->Chart pipeline that maps well to a babysitter process for structured financial report generation.
- **Signal tracking methodology** (specializations/business/finance/): The signal-tracker pattern of tracking investment signals through strengthen/weaken/falsify states is a domain-specific state-machine process.
- **Multi-source aggregation pattern** (specializations/shared/): The news skill's approach of aggregating 10+ sources with deduplication and ranking could generalize to a "multi-source research" process.

### Plugin Ideas
- **Finance data connector plugin:** A babysitter marketplace plugin that wraps the alphaear-stock and alphaear-news APIs as task definitions, providing financial data access within babysitter processes. Install.md would configure API keys for data sources (Cailian, WSJ, Polymarket).
- **Sentiment analysis plugin:** Wraps FinBERT scoring as a babysitter task kind, useful for any process that needs sentiment-aware decision gates.

### SKIP
- Individual SKILL.md files (skill-management pattern, not babysitter-native)
- The skill-creator meta-skill (SDK-covered primitive)
