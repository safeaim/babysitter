# transport-mux migration backlog

## Current status

`packages/transport-mux` is still a private workspace package and placeholder seam. `amux launch` can import it for local integration work, but this package does not yet own publish, release, or externally installable runtime truth.

## Why this file exists

This file records the placeholder policy, the remaining historical references, and the conditions that must be true before this package can claim runtime or release ownership.

## Current artifact policy

- `@a5c-ai/transport-mux` stays `private: true` while this workspace is a placeholder seam.
- Package entrypoints may continue to support workspace-local build/test flows, but publish-only metadata such as `files`, `publishConfig`, and `prepack` must stay absent until cutover is real.
- Docs must describe this package as internal-only and future-facing, not as the active release artifact.
- Referenced packaged artifacts must exist locally or be removed from package metadata.

## Package verification gates

Run these commands when editing this workspace:

```bash
npm run build --workspace=@a5c-ai/transport-mux
npm run test --workspace=@a5c-ai/transport-mux
npm run scorecard:migration --workspace=@a5c-ai/transport-mux
```

Those checks verify the placeholder seam honestly:

- `build` and `test` validate the local TypeScript seam used by workspace consumers.
- `scorecard:migration` ties that result back to private-package metadata, doc honesty, and archived legacy references.

Historical archive: legacy Python tests under `packages/agent-mux/amux-proxy/tests` remain available as reference material for the still-active historical runtime path.

## Migration scorecard

The package is aligned only when every row below stays green.

| Surface | Current validation truth | Green means | Current status |
| --- | --- | --- | --- |
| Private package policy | `packages/transport-mux/package.json` plus `npm run scorecard:migration`. | The package is clearly internal-only and omits publish-only metadata. | Green: package metadata says private placeholder, not publishable artifact. |
| Workspace seam health | `npm run build` and `npm run test` under `@a5c-ai/transport-mux`. | Local consumers can still build against the seam without implying publication readiness. | Green: the placeholder seam still compiles and tests cleanly. |
| Launcher/runtime seam | `packages/agent-mux/cli/src/commands/launch.ts` and `packages/transport-mux/src/index.ts`. | The launcher can import the local seam while docs still avoid claiming release ownership. | Green: workspace integration uses the seam without promoting it to publish truth. |
| Docs honesty | `packages/transport-mux/README.md`, `packages/transport-mux/architecture.md`, and this file. | Operators can tell, from package docs alone, that `transport-mux` is internal-only today and future-facing. | Green: docs describe one placeholder seam and one future cutover path. |
| Historical references | `packages/agent-mux/amux-proxy/tests` and related legacy assets. | Legacy references remain inspectable without being misrepresented as packaged artifacts of this workspace. | Green: historical assets stay explicit and packaging claims stay local and honest. |

The scorecard exists to keep the convergence explicit: if any future change reintroduces publish-ready metadata or starts claiming active ownership before cutover, this document should go red again.

## Publication and cutover prerequisites

The cutover is not complete. Keep the assertions below true until it is.

### 1. The package stays honest about being private

- `packages/transport-mux/package.json` remains `private: true`.
- package metadata does not advertise packable artifacts that are not present locally.
- release automation should not rely on this package metadata as though cutover has already happened.

### 2. Docs describe the placeholder seam honestly

- `packages/transport-mux/README.md` describes this workspace as an internal-only placeholder seam.
- `packages/transport-mux/architecture.md` remains the design reference for the future runtime convergence work.
- this file records the placeholder policy and the scorecard assertions that must stay true.

### 3. Launcher/runtime integration stays local

- `packages/agent-mux/cli/src/commands/launch.ts` resolves into the runtime surface exported by this package.
- `packages/agent-mux/core/src/provider-resolver.ts` and `packages/agent-mux/adapters/src/translate-for-harness.ts` stay aligned with that runtime.
- operators are not asked to infer that local integration automatically means publish or release ownership.

### 4. Promotion requires an explicit policy change

- publish-ready metadata should only return when the package is intentionally promoted out of placeholder status.
- any future `files`, `publishConfig`, `prepack`, or release-owner doc language should land in the same change as that promotion.
- promotion should satisfy missing artifact requirements, including any package-local `LICENSE` references.

### 5. Legacy surfaces stay explicit while cutover is pending

- legacy `amux-proxy` package/container surfaces are either kept as the clearer operational reference or explicitly marked historical.
- operators are not asked to infer that the container, package, and launcher truth already converged here when they have not.

## Historical references that remain

- legacy Python tests remain under `packages/agent-mux/amux-proxy/tests` as historical reference material.
- archived workflow files remain under `packages/agent-mux/meta/github/workflows` so prior release history is still inspectable.
- architecture notes still describe how the old split worked so future refactors can explain the migration path.

## Done criteria

Treat this migration item as complete only while the package stays private, the package docs and metadata remain aligned, missing packaged-artifact references stay removed or satisfied, and legacy references remain explicit.

## Main risk

The failure mode is still operational drift: package metadata, launcher docs, and future cutover plans silently describing different artifact policies. This document exists to keep those surfaces honest.
