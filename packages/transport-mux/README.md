# transport-mux

`transport-mux` is the JS/Node replacement direction for the current Python/LiteLLM-based `amux-proxy`.

The package name stays `transport-mux` for compatibility, but the design should be described in terms of **protocols** and **providers**:

- a **protocol layer** speaks the harness-facing wire contract
- a **provider layer** knows how to authenticate, discover endpoints, normalize model names, and call the upstream backend

Those are not the same concern, and the package should not blur them again.

## Compatibility contract

The replacement keeps the external `amux-proxy` boundary stable:

- keep the `amux-proxy` command name
- keep the `AMUX_PROXY_*` environment variables
- keep the harness-facing HTTP endpoints already used by Claude, Codex, Gemini, and adjacent launcher flows
- keep `amux launch --with-proxy-if-needed` as the control-plane entrypoint

## Two-layer model

### 1. Protocol layer

The protocol layer is selected by `AMUX_PROXY_EXPOSED_TRANSPORT`. It owns:

- inbound route mounting
- request authentication at the proxy boundary
- parsing protocol-specific request bodies and headers
- rendering protocol-specific non-streaming responses
- rendering protocol-specific streaming frames and terminal events
- mapping normalized failures back into protocol-native error shapes

Current protocol ids already covered by tests/specs:

- `anthropic`
- `openai-chat`
- `openai-responses`
- `google`
- `passthrough`
- `bedrock-converse`
- `vertex-native`
- `azure-foundry`

### 2. Provider layer

The provider layer is selected by `AMUX_PROXY_TARGET_PROVIDER` plus the resolved provider config coming from `agent-mux`. It owns:

- upstream auth injection
- endpoint and path discovery
- provider-specific base URL rules
- model id normalization and alias handling
- provider-native request mapping
- provider-native stream parsing
- model listing
- token counting, or explicit fallback behavior when a provider cannot count tokens natively

Representative provider ids already used by the package docs/tests:

- `openai`
- `anthropic`
- `google`
- `bedrock`
- `vertex`
- `foundry`

## Why the split matters

Examples of responsibilities that belong to the provider layer, not the protocol layer:

- Bedrock region handling
- Vertex project/location path construction
- Azure/Foundry deployment path selection
- API key vs IAM vs ADC auth
- deciding whether `/converse`, `:generateContent`, or an OpenAI-compatible upstream path is the correct target

Examples of responsibilities that belong to the protocol layer, not the provider layer:

- accepting `x-api-key` or `Authorization: Bearer ...` from harnesses
- decoding Anthropic message content blocks
- shaping OpenAI Chat or Responses payloads
- emitting Google `candidates` responses
- preserving protocol-specific finish reasons and event framing

## Context-sensitive seam

The two layers still need each other:

- the protocol layer needs provider capability metadata to decide what features can be passed through, downgraded, or rejected
- the provider layer needs protocol hints so it can preserve semantics the harness expects, especially for tool calls, streaming, and reasoning-style deltas

The seam should therefore be a **normalized completion contract plus capability exchange**, not raw protocol payload forwarding.

## Runtime path

The live control-plane path in this repo is:

1. `babysitter/packages/agent-mux/cli/src/commands/launch.ts`
   decides whether a proxy is needed and spawns `amux-proxy`
2. `babysitter/packages/agent-mux/core/src/provider-resolver.ts`
   resolves canonical provider configuration from CLI, profile, and env inputs
3. `babysitter/packages/agent-mux/adapters/src/translate-for-harness.ts`
   chooses the harness-facing protocol contract
4. `transport-mux`
   accepts the exposed protocol, normalizes the request, executes the provider call, and renders the response back in the exposed protocol

## Implementation details already pinned by this package

Even though `src/` is still mostly skeletal, the package contract is already concrete in `package.json` and the test suite.

### Package/runtime facts

- npm package: `@a5c-ai/transport-mux`
- installed binary: `amux-proxy`
- runtime: Node `>=20.9.0`
- HTTP framework dependency: `hono`

### Config contract

The tests already pin a config API centered on:

- `createProxyConfig(...)`
- `readProxyConfigFromEnv()`
- `validateProxyConfig(...)`

Behavior already captured by tests:

- required core fields are `targetProvider`, `targetModel`, and `exposedTransport`
- default host is `127.0.0.1`
- default port is `0` for an ephemeral bind
- default `stream` is `true`
- invalid transports must fail validation

### Server contract

The tests already pin a server API centered on:

- `createTransportMuxApp({ config, completionEngine? })`
- `startProxyServer(config)` returning a running server with `url` and `stop()`

Model discovery behavior already pinned by tests:

- `GET /v1/models` returns an OpenAI-style `data` array
- `data[0].id` is expected to match the configured `targetModel`

Routes already pinned by tests:

| Exposed protocol | Inbound route |
|---|---|
| shared | `GET /health` |
| shared | `GET /v1/models` |
| shared | `POST /v1/count_tokens` |
| `anthropic` | `POST /v1/messages` |
| `openai-chat` | `POST /v1/chat/completions` |
| `openai-responses` | `POST /v1/responses` |
| `google` | `POST /v1beta/models/*` |
| `passthrough` | `/passthrough/*` |
| `bedrock-converse` | `POST /converse` |
| `vertex-native` | `POST /v1/projects/.../publishers/.../models/...:generateContent` |
| `azure-foundry` | `POST /models/chat/completions` |

### Auth behavior

The transport-facing auth behavior is already pinned by tests:

- protocol endpoints require auth
- `x-api-key` is accepted
- `Authorization: Bearer ...` is accepted
- missing or wrong auth returns `401`
- `GET /health` is readable without auth
- `GET /v1/models` is readable without auth

### Completion seam

The tests also pin a normalized completion seam through `CompletionEngine`:

- request shape includes at least `model` and normalized `messages`
- result shape includes `id`, `model`, `role`, `text`, `finishReason`, and `usage`
- transport tests validate protocol rendering from that normalized result rather than from provider-native payloads

That seam is the right place for the protocol/provider split.

## Current test-backed examples

- Anthropic protocol normalizes `messages` and returns a `message` response object.
- OpenAI Chat returns `object: "chat.completion"`.
- OpenAI Responses returns `object: "response"` and `status: "completed"`.
- Google returns `candidates` with `usageMetadata.totalTokenCount`.
- Bedrock Converse returns `output.message` and `stopReason`.
- Vertex native returns `candidates[*].finishReason = "STOP"`.
- Passthrough forwards the upstream request directly when auth is valid.

## Document set

- [Architecture](./architecture.md): protocol/provider boundaries, normalized seam, route contract, and implementation shape
- [Migration](./migration.md): staged move from the old transport-centric design to the protocol/provider model, with test-backed cutover criteria
