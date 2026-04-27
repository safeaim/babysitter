# @a5c-ai/breakpoints-mux

Breakpoint routing library, MCP server, and CLI for responder-driven review flows.

## Install

```bash
npm install @a5c-ai/breakpoints-mux
```

## CLI

The published executable is `breakpoints-mux`.

```bash
npx @a5c-ai/breakpoints-mux --help
npx @a5c-ai/breakpoints-mux responders list
npx @a5c-ai/breakpoints-mux server start
```

If the package is already installed in your workspace, use the bin directly:

```bash
breakpoints-mux --help
```

Current CLI commands:

- `breakpoints-mux ask`
- `breakpoints-mux responders list`
- `breakpoints-mux responders show <responderId>`
- `breakpoints-mux breakpoints pending --responder <responderId>`
- `breakpoints-mux breakpoints answer <breakpointId> --answer <text> --responder <responderId> [--confidence <0-100>]`
- `breakpoints-mux breakpoints status <breakpointId>`
- `breakpoints-mux breakpoints poll <breakpointId> [--timeout <seconds>] [--interval <seconds>]`
- `breakpoints-mux responder-loop --responder <responderId> [--interval <seconds>] [--once]`
- `breakpoints-mux server start`
- `breakpoints-mux auth login|logout|status|server set|server clear|token set|token clear|keygen|key-push|keys`

## MCP Tools

The MCP server currently registers these tools:

- `ask_breakpoint`
- `check_breakpoint_status`
- `list_breakpoints`
- `answer_breakpoint`
- `verify_breakpoint_answer`
- `list_responders`
- `claim_breakpoint`
- `poll_breakpoints`

## Package Exports

Published subpath exports:

- `.`
- `./backends`
- `./proven`
- `./mcp`
- `./harness`
- `./auth`
- `./config`

Example:

```ts
import {
  createBackend,
  createBreakpointMcpServer,
  BreakpointMuxInteractionProvider,
} from "@a5c-ai/breakpoints-mux";
```

## Published Package Contents

The npm tarball is intentionally limited to:

- `dist/`
- `responder/`
- `README.md`

`docs/`, `skills/`, and `specs/` are repository source docs and are not published files.

## Validation

```bash
npm run build --workspace=@a5c-ai/breakpoints-mux
npm run typecheck --workspace=@a5c-ai/breakpoints-mux
npm run test:packaged-surface-parity --workspace=@a5c-ai/breakpoints-mux
npm pack --json --dry-run --workspace=@a5c-ai/breakpoints-mux
```

Keep this README aligned with the exported CLI, MCP, and package topology surfaced by `packages/breakpoints-mux/`.
