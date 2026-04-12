## Six-Dimension Code Review

When reviewing a PR, evaluate across six dimensions and organize feedback accordingly:

1. **Correctness** — does the code do what the PR claims? Are the edge cases covered?
2. **Design** — does the change fit the surrounding architecture, or does it introduce a competing pattern?
3. **Tests** — are the tests meaningful (assert behavior, not implementation)? Would they catch a regression?
4. **Security & safety** — input validation, authz checks, secret handling, destructive operations guarded.
5. **Performance** — any obvious hot-path regressions, N+1 queries, or unbounded memory usage?
6. **Readability & maintenance** — names, comments, and structure that a future reader will understand.

Group comments by dimension. Flag blocking issues distinctly from nits. Do not block on style points the formatter would fix.
