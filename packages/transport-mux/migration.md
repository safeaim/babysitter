# transport-mux migration

## Goal

Replace the old Python `amux-proxy` implementation with a JS package without changing how `amux launch` or the harnesses consume the proxy.

This migration is not just a language port. It is also a design correction:

- stop treating protocol and provider as one layer
- make the protocol/provider seam explicit
- preserve the externally stable proxy contract while improving internal clarity

## Current state in this repo

`transport-mux` is currently a contract-first package:

- `package.json` already defines the published package and `amux-proxy` bin
- tests already pin routes, config defaults, auth behavior, and several protocol response shapes
- `src/` is still mostly skeletal

That means the migration baseline is not “rewrite Python feature-for-feature from memory”.
It is:

1. preserve the externally visible contract
2. preserve the already-pinned JS test contract
3. implement the missing protocol/provider layers behind that contract

## Compatibility target

The migration must preserve:

- binary name: `amux-proxy`
- env contract: `AMUX_PROXY_*`
- launcher integration in `babysitter/packages/agent-mux/cli/src/commands/launch.ts`
- existing harness-facing endpoint shapes
- unauthenticated `GET /health` and `GET /v1/models`
- proxy token auth via either `x-api-key` or bearer auth on protocol endpoints

The migration must change:

- implementation language from Python to Node.js
- package location to `babysitter/packages/transport-mux`
- internal structure from transport-centric to protocol/provider-centric
- provider execution from LiteLLM glue to explicit provider adapters or provider-specific forwarding paths

## Migration principles

### 1. Preserve the stable outside

Do not break harness and launcher expectations while improving internals.

### 2. Make the seam explicit early

Do not build protocol handlers that also own auth discovery, endpoint paths, or model alias rules.

### 3. Let tests define truth

Where tests already pin behavior, the implementation follows them.

### 4. Prefer capability negotiation over hidden fallback

If a provider cannot support a feature, the behavior should be explicit and test-covered.

## Staged order

### Stage 1: freeze the contract that already exists

Use the current package tests as the minimum acceptance surface.

Already pinned:

- config defaults: `host=127.0.0.1`, `port=0`, `stream=true`
- required config fields: `targetProvider`, `targetModel`, `exposedTransport`
- route mounting for all currently documented protocols
- proxy-boundary auth rules
- real listener startup via `startProxyServer(...)`

Before deeper implementation, add or tighten any missing characterization tests for:

- `/v1/models` response structure
- `/v1/count_tokens` success and failure behavior
- protocol-specific streaming transcripts
- protocol-specific error rendering

### Stage 2: formalize the shared seam

Implement the files and types that the tests are already written against:

- `src/config.ts`
- `src/server.ts`
- `src/types.ts`

Minimum deliverables:

- `createProxyConfig(...)`
- `readProxyConfigFromEnv()`
- `validateProxyConfig(...)`
- `createTransportMuxApp(...)`
- `startProxyServer(...)`
- normalized completion request/result types
- shared proxy error type

This stage should not yet bury provider logic in protocol modules.

### Stage 3: split protocol codecs from provider adapters

Create separate module trees:

- `src/protocols/*`
- `src/providers/*`

Priority protocol codecs based on existing tests:

1. `anthropic`
2. `openai-chat`
3. `openai-responses`
4. `google`
5. `passthrough`
6. `bedrock-converse`
7. `vertex-native`
8. `azure-foundry`

Priority provider adapters based on current docs and launcher usage:

1. `openai`
2. `anthropic`
3. `google`
4. `bedrock`
5. `vertex`
6. `foundry`

### Stage 4: add capability negotiation

Introduce provider capability reporting before feature-complete implementations grow.

Needed immediately for:

- tools
- streaming
- token counting
- reasoning/thinking blocks
- system prompt handling
- structured output/response schema support

The protocol layer should query provider capabilities before attempting loss-prone conversions.

### Stage 5: land shared provider resolution behavior

Do not invent a second provider taxonomy inside `transport-mux`.

Reuse the canonical provider ids and config semantics already coming from:

- `babysitter/packages/agent-mux/core/src/provider-resolver.ts`
- `babysitter/packages/agent-mux/adapters/src/translate-for-harness.ts`

The provider layer should accept resolved config and then own only provider-runtime concerns:

- auth materialization
- endpoint/path resolution
- request mapping
- provider-native stream parsing

### Stage 6: cut launcher/runtime over

When protocol/provider implementations are ready:

- keep `launch.ts` behavior stable
- point launcher flows at the JS `amux-proxy` binary
- keep env injection unchanged
- verify that startup, health checks, and shutdown behavior remain stable

### Stage 7: remove Python assumptions in docs and packaging

Complete the migration only after all references to Python-specific runtime truth are updated:

- package docs
- publish workflow
- CI setup
- install instructions
- container entrypoints

## Implementation details to preserve during migration

### Server surface

Routes already required:

| Route | Purpose |
|---|---|
| `GET /health` | readiness/liveness for launcher |
| `GET /v1/models` | lightweight model discovery |
| `POST /v1/count_tokens` | token counting surface |
| `POST /v1/messages` | Anthropic protocol |
| `POST /v1/chat/completions` | OpenAI Chat protocol |
| `POST /v1/responses` | OpenAI Responses protocol |
| `POST /v1beta/models/*` | Google protocol |
| `/passthrough/*` | provider-native forwarding |
| `POST /converse` | Bedrock native protocol |
| `POST /v1/projects/.../publishers/.../models/...:generateContent` | Vertex native protocol |
| `POST /models/chat/completions` | Azure Foundry protocol |

### Auth surface

Behavior already pinned:

- protocol endpoints require proxy token auth
- `x-api-key` is valid
- `Authorization: Bearer ...` is valid
- missing/incorrect token returns `401`
- `/health` and `/v1/models` stay open

### Runtime API

Behavior already pinned:

- in-memory app creation through `createTransportMuxApp(...)`
- live listener startup through `startProxyServer(...)`
- returned server handle exposes `url`
- returned server handle exposes `stop()`

### E2E forwarding baseline

The current e2e test already establishes a baseline roundtrip:

- start a mock upstream
- start a live proxy on an ephemeral port
- call the exposed OpenAI Chat route
- verify that the upstream path is hit and the response comes back intact

That test should continue to pass throughout the migration.

## Recommended work breakdown

### Protocol track

- implement decode/encode logic per protocol
- add transcript tests for streaming
- add protocol-native error tests
- keep route registration isolated per protocol module

### Provider track

- implement auth and endpoint resolution per provider
- centralize model alias normalization
- add `listModels` and `countTokens` behavior
- expose capability descriptors

### Integration track

- wire protocol codec + provider adapter via normalized request/result types
- verify launcher env contract
- verify `amux-proxy` bin startup and shutdown behavior

These tracks can progress in parallel as long as the shared seam is defined first.

## Done criteria

The migration is complete only when all of the following are true:

- the JS package satisfies the current route/auth/config/e2e tests
- protocol modules do not own provider auth/discovery logic
- provider modules do not own protocol request parsing/response framing logic
- launcher integration still works with the stable `AMUX_PROXY_*` contract
- docs describe the JS package as the runtime truth
- Python-specific packaging and runtime assumptions are removed or explicitly marked historical

## Main risks

### Protocol/provider re-entanglement

Risk:
the code is moved to JS, but protocol handlers still secretly own provider auth/path logic.

Mitigation:
enforce separate module trees and capability-driven interfaces early.

### Contract drift

Risk:
the implementation matches the new design docs but not the currently pinned route/auth behavior.

Mitigation:
keep the existing tests green during every stage and add characterization before refactors.

### Streaming regressions

Risk:
non-streaming works, but harness incremental output or tool-call framing breaks.

Mitigation:
add protocol-specific stream transcript tests before declaring parity.

### False provider generalization

Risk:
all providers are treated as “OpenAI-compatible enough”, which breaks Bedrock/Vertex/Foundry nuances.

Mitigation:
provider adapters must own auth, endpoint discovery, and provider-native path construction explicitly.
