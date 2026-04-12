---
name: sql-tool-agent
description: Build a curated-dataset + SQL-tool agent for a structured-data domain, following the SQL-over-MCP methodology distilled from Michael Lugassy's flight-planner post.
source_author: https://github.com/mluggy
source_post: https://www.linkedin.com/posts/mluggy_%D7%9B%D7%9E%D7%95-%D7%9E%D7%99%D7%9C%D7%99%D7%95%D7%A0%D7%99-%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99%D7%9D-%D7%92%D7%9D-%D7%90%D7%A0%D7%97%D7%A0%D7%95-%D7%9E%D7%AA%D7%9B%D7%A0%D7%A0%D7%99%D7%9D-%D7%97%D7%95%D7%A4%D7%A9%D7%95%D7%AA-ugcPost-7448843353275858944-b7d4
---

# SQL-Tool Agent Skill

## Source

Methodology extracted from a linkedin post by Michael Lugassy (mluggy) describing a curated flights dataset (3,888 airports, 59,079 routes) exposed to Claude via direct SQL rather than MCP.

- https://github.com/mluggy
- https://www.linkedin.com/posts/mluggy_%D7%9B%D7%9E%D7%95-%D7%9E%D7%99%D7%9C%D7%99%D7%95%D7%A0%D7%99-%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99%D7%9D-%D7%92%D7%9D-%D7%90%D7%A0%D7%97%D7%A0%D7%95-%D7%9E%D7%AA%D7%9B%D7%A0%D7%A0%D7%99%D7%9D-%D7%97%D7%95%D7%A4%D7%A9%D7%95%D7%AA-ugcPost-7448843353275858944-b7d4

## When to use

Structured data, read-heavy, single-user or small team, stable schema. Not for writes, multi-tool composition, or unstable schemas.

## Workflow

1. **Ingest** — enumerate authoritative sources; fetch offline; produce a reproducible manifest.
2. **Schema** — design a small relational schema with explicit join keys; denormalize where it collapses common query shapes.
3. **Load** — deterministic ETL into SQLite (or Postgres for shared access).
4. **Tool registration** — register a direct SQL-execution tool with the harness; include DDL in the system prompt. Skip MCP unless multi-client access is actually required.
5. **Acceptance** — run 5–10 fixed natural-language queries as a binary pass/fail gate.

Invoke the process:

```bash
babysitter harness:call \
  --harness claude-code \
  --process .a5c/processes/methodologies/sql-tool-agent/build-sql-tool-agent.js#process \
  --inputs .a5c/processes/methodologies/sql-tool-agent/build-sql-tool-agent-inputs.json \
  --workspace .
```
