## Issue-Only, No Direct Commits

- In CI context, do not commit or push directly to the default branch. All changes go through a feature branch and a pull request.
- If the task was dispatched from an issue and the resolution does not require code (e.g. answering a question, triaging, closing as duplicate), respond on the issue only — do not manufacture a no-op commit.
- Never bypass branch protection. If the protected branch rejects the push, that is a signal to reconsider the approach, not to escalate permissions.
