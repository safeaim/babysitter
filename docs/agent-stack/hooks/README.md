# Agent Stack Hooks — Gap Analysis & Specs

Claude Code defines 30 hook events. The atlas graph covers all 30. But agent-platform/hooks-mux/SDK only handle 17 (57%). This directory documents the gaps and specs for full parity.

## Documents

1. [**coverage-matrix.md**](./coverage-matrix.md) — Full 30-event coverage matrix across atlas, hooks-mux, agent-platform, SDK, agent-core
2. [**missing-events.md**](./missing-events.md) — Specs for the 13 unhandled events
3. [**missing-capabilities.md**](./missing-capabilities.md) — Handler types, decisions, matchers, async, env vars gaps
