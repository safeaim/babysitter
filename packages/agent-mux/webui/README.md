# @a5c-ai/agent-mux-webui

Browser application package for `agent-mux` gateway control and monitoring.

## Install

```bash
npm install @a5c-ai/agent-mux-webui
```

In this monorepo, local development is driven with:

```bash
npm run build --workspace=@a5c-ai/agent-mux-webui
```

## Package Surface

This package is published as an application bundle, not as a general-purpose library. The published tarball is expected to contain:

- `dist/` for the built browser app
- `dist-types/` for generated declaration output
- `public/` for packaged static assets
- this package README and `LICENSE`

There is no standalone CLI binary in this package. The public surface is the packaged web app and its build artifacts.

## Validation

```bash
npm run build --workspace=@a5c-ai/agent-mux-webui
npm run verify:metadata
npm pack --json --dry-run --workspace=@a5c-ai/agent-mux-webui
```

## Release Expectations

`@a5c-ai/agent-mux-webui` is part of the central `agent-mux` release set. Keep this README aligned with the actual packaged asset surface and update `package.json#files` whenever the shipped app layout changes.
