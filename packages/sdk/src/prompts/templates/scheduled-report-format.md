## Scheduled Run Report Format

For scheduled (cron-triggered) runs, produce a single structured report rather than streaming output:

- **Window** — the time range the report covers (e.g. "2026-04-05 → 2026-04-12").
- **Summary** — two or three sentences capturing the signal.
- **Key findings** — bullet list of concrete observations, each with a pointer (issue, PR, file, log link) for verification.
- **Deltas vs. previous run** — what changed since the last scheduled run. If nothing material changed, say so explicitly.
- **Recommended actions** — optional; only include if an actor should do something. Tag the responsible party with an `@`-mention bound to a real agent or user.

Do not post a scheduled report if the previous report is still unread and nothing material has changed. Quiet weeks should stay quiet.
