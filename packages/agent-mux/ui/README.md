# @a5c-ai/agent-mux-ui

Shared client, store, hooks, protocol types, and cross-surface UI primitives for `agent-mux`.

## Install

```bash
npm install @a5c-ai/agent-mux-ui react react-dom react-native react-native-web
```

## Usage

```ts
import {
  GatewayClient,
  GatewayProvider,
  useSession,
} from "@a5c-ai/agent-mux-ui";
```

The public surface currently includes:

- gateway protocol types plus `GatewayClient`
- gateway store creation and selectors
- React hooks for agents, sessions, runs, hook requests, connection state, and cost totals
- shared primitives and higher-level screens used by browser and React Native surfaces
- themed exports plus the `./gateway` and `./protocol` subpath exports

## Validation

```bash
npm run build --workspace=@a5c-ai/agent-mux-ui
npm run test --workspace=@a5c-ai/agent-mux-ui
npm run verify:metadata
npm pack --json --dry-run --workspace=@a5c-ai/agent-mux-ui
```

## Release Expectations

`@a5c-ai/agent-mux-ui` is a public shared package. Keep this README aligned with the exported client/store/hooks surface and keep `package.json#files` limited to built artifacts plus package docs.
