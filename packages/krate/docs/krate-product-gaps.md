# Krate Product Gaps

Last updated: 2026-05-30

## Current Staging Health

| Component | Status | Impact |
|-----------|--------|--------|
| Kubernetes | Connected | CRD operations work |
| Gitea | Error | No real git backend — repos, PRs, code browser are CRD shells without git content |
| Agent Mux Gateway | Not configured | Agent dispatch creates K8s Job manifests but they never execute |

## 1. No End-to-End Testing

The product has 300 unit/structural tests and 1,678 core tests, but **zero end-to-end tests that verify real user flows against a running instance**. Most tests read files from disk and assert patterns — they don't start the server, navigate pages, or submit forms.

What this means:
- We don't know if pages actually render without errors in a browser
- We don't know if form submissions actually create resources on staging
- We don't know if navigation flows (stack → dispatch → run → session) work in production
- API routes are tested for structure but never called with real HTTP requests
- The 300 "passing tests" verify code patterns, not product functionality

What's needed:
- Playwright tests against staging (`https://krate-staging.a5c.ai`)
- Smoke tests: can a user log in, see the dashboard, create a stack, dispatch a run?
- CRUD tests: create/edit/delete for each resource type against real API
- Flow tests: complete user journeys from start to finish

## 2. Assistant Not Functional

The built-in assistant (chat and playground) returns:

> Assistant API key not configured. Set ANTHROPIC_API_KEY or KRATE_ASSISTANT_API_KEY.

The code correctly calls `callModel()` from krate-sdk which uses the Anthropic API, but the staging deployment doesn't have the API key configured. This means:
- Assistant chat is non-functional
- Inference playground is non-functional
- Virtual model hook testing is impossible
- Cost tracking has no data to track

Fix: Configure `ANTHROPIC_API_KEY` in the staging deployment environment.

## 3. Gitea Backend Not Connected

Gitea shows "Error" on staging health. Without Gitea:
- Repository code browser shows placeholder file trees, not real git content
- Clone URLs are templates (`<repository-service>/repo.git`), not real endpoints
- Pull request list renders from CRD data but can't pull actual diffs
- Branch operations don't work
- Webhook deliveries have no real forge to deliver to

Fix: Deploy Gitea and configure `GITEA_URL` + `GITEA_TOKEN` in staging.

## 4. Agent Mux Gateway Not Configured

Without the gateway:
- Agent dispatch creates `AgentDispatchRun` CRD resources but no K8s Job is submitted
- Sessions are never created (they're created by running agents)
- Transcripts are empty (no agent runs = no messages)
- The entire agent orchestration flow is inert — you can configure stacks and rules, but nothing ever runs

Fix: Deploy the agent-mux gateway and configure `KRATE_AGENT_MUX_URL`.

## 5. Controllers That Plan But Don't Apply

Several core controllers validate inputs and return plan/intent objects, but never persist changes to Kubernetes:

| Controller | What it does | What it doesn't do |
|------------|-------------|-------------------|
| Approval controller | Tracks decisions in-memory Maps | Doesn't persist AgentApproval CRs; state lost on restart |
| Write-back controller | Creates intent objects for branch push / PR merge | Doesn't execute the intents — no actual git operations |
| External sync controller | Detects resource changes between local and external | Watermarks and tombstones are in-memory Maps, lost on restart |
| External write controller | Creates write intent objects | Doesn't execute writes to external providers |
| External conflict controller | Detects field divergence | Resolution strategies don't apply changes |
| Kubernetes reconciliation | Computes reconciliation plans | Doesn't execute plans via applyResource/deleteResource |

## 6. Health Checks Are Stubs

The adapter health check returns `{ status: 'unknown', reason: 'not-implemented' }`. No actual HTTP/TCP probes are performed against configured backends. The health page shows "Connected"/"Error" based on whether env vars are set, not whether the services are actually reachable and healthy.

## 7. No Real Authentication Flow

Session cookies use HMAC-SHA256 signing and work correctly in code, but:
- There's no real login page that authenticates against an identity provider
- The session is created programmatically, not through user-facing OAuth/OIDC
- On staging, users may be auto-authenticated or unable to authenticate at all
- No password reset, MFA, or session management UI

## 8. SSE Events Are Process-Scoped

The SSE endpoint now emits real events when resources are created/updated/deleted, but:
- Events are emitted via an in-process event bus — they don't survive server restarts
- Multiple server replicas would each have their own event bus with no cross-replica sync
- The JSONL ring buffer persists 1,000 events to disk but isn't replicated
- No Redis/NATS/Kafka backing for durable event streaming

## Priority Order

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| P0 | Configure ANTHROPIC_API_KEY on staging | 5 min | Unblocks assistant, playground, cost tracking |
| P0 | Fix Gitea connection on staging | 1 hour | Unblocks real git operations, code browser, PRs |
| P0 | Deploy agent-mux gateway | 1 day | Unblocks agent dispatch, sessions, transcripts |
| P1 | Add Playwright E2E tests against staging | 2-3 days | Proves the product actually works end-to-end |
| P1 | Wire controllers to persist (approval, sync, writeback) | 3-5 days | Makes state durable across restarts |
| P2 | Real health probes (TCP/HTTP to backends) | 1 day | Health page shows actual status |
| P2 | Durable event bus (Redis pub/sub or similar) | 2 days | SSE works across replicas and restarts |
| P3 | Real auth flow (OIDC/OAuth against Gitea) | 3 days | Production-grade authentication |
