---
description: Launch the babysitter observer dashboard. Installs and runs the real-time observer UI that watches babysitter runs, displaying task progress, journal events, and orchestration state in your browser.
argument-hint: [--watch-dir <dir>]
allowed-tools: Read, Grep, Write, Task, Bash
---

Run the babysitter observer dashboard:

1. Determine the watch directory — this is usually the project's container directory (the parent of the project dir), or the current working directory if not specified.
2. Launch the dashboard: `babysitter-harness observe --workspace <dir>`
3. If the harness CLI is not installed globally, run `npx -y @a5c-ai/babysitter-harness@latest observe --workspace <dir>` instead.
4. This is a blocking process — it will keep running until stopped.
5. Open the browser at the URL printed by the dashboard.
