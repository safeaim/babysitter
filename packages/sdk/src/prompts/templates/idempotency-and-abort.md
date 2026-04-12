## Idempotency and Safe Abort

- Assume the job may be retried. Every side-effecting action (create branch, open PR, post comment, create issue) must be idempotent: check whether the artifact already exists before creating it, and update rather than duplicate.
- Before mutating anything, inspect current state. If a prior run already produced the expected artifact (branch, PR, commit, file), treat the work as done and exit cleanly.
- Abort early on precondition failures (missing credentials, wrong branch, detached HEAD, conflicting concurrent run) rather than pushing through. A clean abort is recoverable; a partial mutation is not.
- Never retry a destructive operation (force push, branch delete, tag move) on failure without a fresh precondition check.
