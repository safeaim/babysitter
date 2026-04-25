# transport-mux

`transport-mux` is an internal-only placeholder seam for the future JS transport/proxy runtime. The workspace keeps launcher-facing runtime modules here so `agent-mux` can integrate against a stable package boundary, but this package is not the active runtime or release owner yet and should not be treated as a publishable npm artifact.

## Current status

This workspace currently carries source, tests, and package entrypoints that local workspace consumers import during development. While that seam is useful for local integration, the package remains private and its metadata intentionally does not describe a shippable npm artifact surface.

## Intended seam

The control-plane shape is:

1. `packages/agent-mux/cli/src/commands/launch.ts` decides whether a proxy is needed.
2. `packages/agent-mux/core/src/provider-resolver.ts` resolves canonical provider config.
3. `packages/agent-mux/adapters/src/translate-for-harness.ts` chooses the harness-facing protocol contract.
4. `packages/transport-mux` is the package seam where that future runtime can converge once cutover work is complete.

Historical references still exist under `packages/agent-mux/amux-proxy`, and those legacy assets remain the clearer operational reference until this package is explicitly promoted out of placeholder status.

## What this package means right now

- it is a private workspace package, not a published npm deliverable
- `src/config.ts`, `src/server.ts`, `src/runtime.ts`, and `src/types.ts` provide a local seam for workspace build/test coverage
- package entrypoints and the `amux-proxy` bin exist for workspace-local development, not as a committed external artifact policy
- the docs capture the protocol/provider split and the remaining cutover boundary

## Operator checks

Use these workspace gates when changing the placeholder seam or its migration docs:

```bash
npm run build --workspace=@a5c-ai/transport-mux
npm run test --workspace=@a5c-ai/transport-mux
npm run scorecard:migration --workspace=@a5c-ai/transport-mux
```

Passing those commands proves the internal seam still compiles, its runtime tests still pass, and the migration scorecard still sees metadata and docs that match the private-placeholder policy.

## Current document set

- [Architecture](./architecture.md): intended protocol/provider boundaries and route contract
- [Migration](./migration.md): placeholder policy, cutover prerequisites, and archived legacy references
