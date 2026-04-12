## Local Development Relaxations

Running outside CI, on a developer's machine, some CI-strict rules relax:

- Experimental branches and scratch commits are fine. You do not need to polish every local commit message — they will be squashed or amended before pushing.
- Temporary console logging, ad-hoc scripts in a sandbox directory, and in-flight refactors across files are acceptable while iterating.
- Still: do not commit secrets, do not push to shared branches without the usual review, and do not disable tests locally to work around a failure you intend to fix.
- Before pushing, tighten up: run lint and tests, squash fixup commits, and rewrite any commit message that would look sloppy in the PR's history.
