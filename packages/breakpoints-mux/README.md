# @a5c-ai/breakpoints-mux

Breakpoint routing library, MCP server, and CLI for responder-driven review flows.

## Install

```bash
npm install @a5c-ai/breakpoints-mux
```

CLI usage:

```bash
npx @a5c-ai/breakpoints-mux breakpoints-mux --help
```

This package ships the built runtime in `dist/` and this package README for npm auditability.

## CLI Surface

The `breakpoints-mux` CLI currently exposes:

- `ask` to submit a breakpoint with inline or file-backed context
- `responders list|show` to inspect responder profiles
- `breakpoints pending|answer|status|poll` to work pending queues and answer state
- `responder-loop` for polling integration
- `auth login|logout|status|server *|token *|keygen|key-push|keys` for saved auth and signing keys
- `server start` to run the MCP server over stdio

## API Surface

```ts
import {
  createBackend,
  createBreakpointMcpServer,
  BreakpointMuxInteractionProvider,
} from "@a5c-ai/breakpoints-mux";
```

The package exports:

- core schemas and types for breakpoints, routing, responders, and server config
- backend factory helpers plus git-native, GitHub issues, and server backends
- proven-signing helpers for key generation, signing, rotation, and verification
- MCP server entrypoints and harness integration helpers
- config resolution helpers and client classes

## Validation

```bash
npm run build --workspace=@a5c-ai/breakpoints-mux
npm run typecheck --workspace=@a5c-ai/breakpoints-mux
npm run test --workspace=@a5c-ai/breakpoints-mux
npm run verify:metadata
npm pack --json --dry-run --workspace=@a5c-ai/breakpoints-mux
```

## Release Expectations

`@a5c-ai/breakpoints-mux` is part of the central npm release pipeline. Keep this README aligned with the exported CLI/API surface and keep `package.json#files` limited to what the tarball is expected to ship.
