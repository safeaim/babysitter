---
title: agent-mux
hide_table_of_contents: true
---

<section class="amux-home__hero">

# One client, every coding agent.

<p class="amux-home__lede">
Drive Claude Code, Codex, Gemini, Cursor, OpenCode, Copilot, and more from one streaming API. Local, Docker, SSH, and Kubernetes all fit the same contract.
</p>

<div class="amux-home__actions">
  <a class="button button--primary button--lg" href="/docs/tutorials/getting-started">Open the docs</a>
  <a class="button button--secondary button--lg" href="https://github.com/a5c-ai/agent-mux">View on GitHub</a>
</div>

<ul class="amux-home__stats">
  <li><strong>11</strong><span>adapters</span></li>
  <li><strong>4</strong><span>invocation modes</span></li>
  <li><strong>1</strong><span>event model</span></li>
  <li><strong>∞</strong><span>automation surfaces</span></li>
</ul>

</section>

<section class="amux-home__grid">
  <div class="amux-home__card">
    <h2>Unified runtime</h2>
    <p>`RunOptions` and `AgentEvent` stay stable across every supported harness.</p>
  </div>
  <div class="amux-home__card">
    <h2>Sessions + hooks</h2>
    <p>List, read, resume, fork, and automate agent sessions with native or virtual hooks.</p>
  </div>
  <div class="amux-home__card">
    <h2>Deterministic tests</h2>
    <p>The mock harness gives you replayable scenarios without real binaries or keys.</p>
  </div>
  <div class="amux-home__card">
    <h2>Remote dispatch</h2>
    <p>Run the same adapter contract locally, in containers, over SSH, or in Kubernetes.</p>
  </div>
</section>

## Get started

Head to **[Getting Started](/docs/tutorials/getting-started)** to install the package and run your first agent in under a minute.

```bash
npm install -g @a5c-ai/agent-mux
amux detect
amux run claude --prompt "Hello, agent-mux"
```

## Features

- **Unified event stream** — JSONL/SSE/stream-json/ANSI are normalized to one `AgentEvent` union.
- **Sessions** — list, read, resume, fork, and watch across `~/.claude/projects`, `~/.codex/sessions`, etc.
- **Invocation modes** — `local`, `docker`, `ssh`, and `k8s` share the same adapter contract.
- **Hooks** — `amux hooks install` wires native settings or a virtual event-stream layer.
- **MCP plugins** — install/list/uninstall MCP servers across claude/codex/gemini/cursor/opencode.
- **Skills & sub-agents** — `amux skill` / `amux agent` manage file-convention definitions (`.claude/skills/`, `.codex/agents/`, …) per-project or globally.
- **Auth & install detection** — `amux doctor`, `amux detect --all --json`, `amux install`.
- **Capabilities & models** — every adapter declares capability + model metadata.
- **Cost tracking** — `cost` events + `sumCost(events)` helper.
- **Profiles** — `amux run --profile fast-claude`.
- **Mock harness** — deterministic scenarios without real binaries or keys.
- **Remote bootstrap** — `amux remote install <host> --harness claude`.

## SDK examples

```ts
import { createClient, sumCost } from '@a5c-ai/agent-mux';

const handle = createClient().run({ agent: 'claude-code', prompt: 'Refactor src/api.ts to use async/await' });

for await (const ev of handle.events()) {
  if (ev.type === 'text_delta') process.stdout.write(ev.delta);
  if (ev.type === 'cost') process.stdout.write(`\n$${ev.cost.totalUsd?.toFixed(4)}`);
}

// Later: sum cost across a stored session
const sessions = createClient().sessions('claude-code');
const [last] = await sessions.list();
const { events } = await sessions.read(last.sessionId);
console.log(sumCost(events).totalUsd);
```

## Learn more

- [Adapter pages](/docs/agents/claude) — per-agent install, auth, flags, and limits
- [Invocation Modes](/docs/invocation-modes) — docker, k8s, ssh
- [Hooks](/docs/tutorials/hooks) and [Plugins](/docs/tutorials/plugins)
- [Multi-agent dispatch](/docs/tutorials/multi-agent)
- [Sessions](/docs/tutorials/sessions) and [Remote bootstrap](/docs/tutorials/remote-bootstrap)
