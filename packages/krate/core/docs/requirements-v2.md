# Krate Requirements Specification v2

> Derived from implementation. Every requirement below corresponds to implemented functionality.

## 1. Functional Requirements

### FR-IDENTITY: Identity and Access Management

| ID | Requirement | Source |
|----|-------------|--------|
| FR-IDENTITY-01 | System SHALL support multi-tenant organizations with display name and namespace binding | `resource-model.js:Organization` |
| FR-IDENTITY-02 | System SHALL support user accounts with email, display name, admin flag, and linked identities | `resource-model.js:User` |
| FR-IDENTITY-03 | System SHALL support teams with membership, maintainers, and permission grants | `resource-model.js:Team` |
| FR-IDENTITY-04 | System SHALL support pending invitations with email, role, and team assignment | `resource-model.js:Invite` |
| FR-IDENTITY-05 | System SHALL map between Krate users, sign-in subjects, and external accounts | `resource-model.js:IdentityMapping` |
| FR-IDENTITY-06 | System SHALL support configurable auth providers (GitHub, OIDC/SSO) per org | `resource-model.js:AuthProvider` |
| FR-IDENTITY-07 | System SHALL support agent service accounts for K8s identity binding | `resource-model.js:AgentServiceAccount` |
| FR-IDENTITY-08 | System SHALL project managed RBAC bindings for agent identity | `resource-model.js:AgentRoleBinding` |
| FR-IDENTITY-09 | System SHALL gate secret access through explicit grants with purpose scope | `resource-model.js:AgentSecretGrant` |
| FR-IDENTITY-10 | System SHALL gate ConfigMap access through explicit grants with purpose scope | `resource-model.js:AgentConfigGrant` |

### FR-REPOSITORY: Repository Management

| ID | Requirement | Source |
|----|-------------|--------|
| FR-REPO-01 | System SHALL support repository CRUD with visibility settings | `resource-model.js:Repository` |
| FR-REPO-02 | System SHALL manage user, deploy, and automation SSH keys | `resource-model.js:SSHKey` |
| FR-REPO-03 | System SHALL manage repository collaborator and team permissions | `resource-model.js:RepositoryPermission` |
| FR-REPO-04 | System SHALL enforce branch protection rules | `resource-model.js:BranchProtection` |
| FR-REPO-05 | System SHALL enforce reference deny rules and force-push policies | `resource-model.js:RefPolicy` |
| FR-REPO-06 | System SHALL provide git object recording for repository content | `http-server.js:objects` |
| FR-REPO-07 | System SHALL support search indexing per repository | `http-server.js:search-index` |

### FR-POLICY: Policy Management

| ID | Requirement | Source |
|----|-------------|--------|
| FR-POLICY-01 | System SHALL support organization policy profiles with posture and rollout mode | `resource-model.js:PolicyProfile` |
| FR-POLICY-02 | System SHALL provide curated Kyverno policy templates with parameters | `resource-model.js:PolicyTemplate` |
| FR-POLICY-03 | System SHALL bind templates to orgs/repos with audit/enforce state | `resource-model.js:PolicyBinding` |
| FR-POLICY-04 | System SHALL support auditable exception request workflows with expiry | `resource-model.js:PolicyExceptionRequest` |

### FR-AGENT: Agent Orchestration

| ID | Requirement | Source |
|----|-------------|--------|
| FR-AGENT-01 | System SHALL define reusable agent stacks with model, prompt, tools, MCP, skills | `resource-model.js:AgentStack` |
| FR-AGENT-02 | System SHALL support named child-agent definitions with role/task scoping | `resource-model.js:AgentSubagent` |
| FR-AGENT-03 | System SHALL define tool profiles with filesystem/network/shell policies | `resource-model.js:AgentToolProfile` |
| FR-AGENT-04 | System SHALL manage MCP server endpoints with transport and health checks | `resource-model.js:AgentMcpServer` |
| FR-AGENT-05 | System SHALL support reusable skill bundles with prompt fragments | `resource-model.js:AgentSkill` |
| FR-AGENT-06 | System SHALL route events to agent stacks via trigger rules | `resource-model.js:AgentTriggerRule` |
| FR-AGENT-07 | System SHALL provide reviewed prompt fragments with provenance | `resource-model.js:AgentContextLabel` |
| FR-AGENT-08 | System SHALL create dispatch runs with queue, status, workspace, cost tracking | `resource-model.js:AgentDispatchRun` |
| FR-AGENT-09 | System SHALL track execution attempts with reason and stack snapshot | `resource-model.js:AgentDispatchAttempt` |
| FR-AGENT-10 | System SHALL project Agent Mux sessions with lifecycle state | `resource-model.js:AgentSession` |
| FR-AGENT-11 | System SHALL create immutable context bundles with digest and provenance | `resource-model.js:AgentContextBundle` |
| FR-AGENT-12 | System SHALL store durable agent outputs with kind and retention | `resource-model.js:KrateArtifact` |
| FR-AGENT-13 | System SHALL gate agent actions through human approval workflows | `resource-model.js:AgentApproval` |
| FR-AGENT-14 | System SHALL support adapter definitions with transport/capabilities | `resource-model.js:AgentAdapter` |
| FR-AGENT-15 | System SHALL configure transport bindings with endpoint/protocol/auth | `resource-model.js:AgentTransportBinding` |
| FR-AGENT-16 | System SHALL configure model providers with API base and rate limits | `resource-model.js:AgentProviderConfig` |
| FR-AGENT-17 | System SHALL group issues and repositories into projects with kanban | `resource-model.js:KrateProject` |
| FR-AGENT-18 | System SHALL configure gateway connections with URL and feature flags | `resource-model.js:AgentGatewayConfig` |
| FR-AGENT-19 | System SHALL record session transcripts with message nodes and cost | `resource-model.js:AgentSessionTranscript` |
| FR-AGENT-20 | System SHALL perform permission review before dispatch | `agent-dispatch-controller.js` |
| FR-AGENT-21 | System SHALL provision workspaces during dispatch | `agent-dispatch-controller.js` |
| FR-AGENT-22 | System SHALL perform MCP health checks with 3s timeout | `agent-stack-controller.js` |

### FR-MEMORY: Agent Memory

| ID | Requirement | Source |
|----|-------------|--------|
| FR-MEM-01 | System SHALL point to Git repositories for shared agent memory | `resource-model.js:AgentMemoryRepository` |
| FR-MEM-02 | System SHALL define read policies per repository/team/stack/trigger | `resource-model.js:AgentMemorySource` |
| FR-MEM-03 | System SHALL enforce ontology with required fields and vocabulary | `resource-model.js:AgentMemoryOntology` |
| FR-MEM-04 | System SHALL create immutable memory snapshots at dispatch time | `resource-model.js:AgentMemorySnapshot` |
| FR-MEM-05 | System SHALL execute graph traversal queries with depth/kind filtering | `agent-memory-query.js:queryGraph` |
| FR-MEM-06 | System SHALL execute full-text grep queries with context extraction | `agent-memory-query.js:queryGrep` |
| FR-MEM-07 | System SHALL support combined graph+grep queries | `agent-memory-query.js:queryMemory` |
| FR-MEM-08 | System SHALL track proposed memory mutations with validation | `resource-model.js:AgentMemoryUpdate` |
| FR-MEM-09 | System SHALL import run metadata into memory with redaction | `resource-model.js:AgentRunMemoryImport` |
| FR-MEM-10 | System SHALL bridge memory content to Krate resources | `resource-model.js:AgentMemoryAssociation` |

### FR-EXTERNAL: External Backend Integration

| ID | Requirement | Source |
|----|-------------|--------|
| FR-EXT-01 | System SHALL register external providers with type/endpoint/auth | `resource-model.js:ExternalBackendProvider` |
| FR-EXT-02 | System SHALL bind providers to orgs with credentials | `resource-model.js:ExternalBackendBinding` |
| FR-EXT-03 | System SHALL configure sync intervals and conflict resolution | `resource-model.js:ExternalBackendSyncPolicy` |
| FR-EXT-04 | System SHALL discover provider capabilities automatically | `resource-model.js:ExternalProviderCapabilityManifest` |
| FR-EXT-05 | System SHALL verify inbound webhooks with HMAC-SHA256 | `external/webhook-controller.js` |
| FR-EXT-06 | System SHALL deduplicate webhook deliveries by ID | `external/webhook-controller.js` |
| FR-EXT-07 | System SHALL track sync events with ordering metadata | `resource-model.js:ExternalSyncEvent` |
| FR-EXT-08 | System SHALL maintain current sync phase and error state | `resource-model.js:ExternalSyncState` |
| FR-EXT-09 | System SHALL queue write-back intents with approval state | `resource-model.js:ExternalWriteIntent` |
| FR-EXT-10 | System SHALL detect conflicts with diff and resolution outcome | `resource-model.js:ExternalSyncConflict` |
| FR-EXT-11 | System SHALL maintain stable local-to-external object mappings | `resource-model.js:ExternalObjectLink` |
| FR-EXT-12 | System SHALL provide GitHub adapter (auth, git-forge, issues, CI) | `external/github/` |

### FR-CI: Continuous Integration

| ID | Requirement | Source |
|----|-------------|--------|
| FR-CI-01 | System SHALL track pipeline runs with state and resume point | `resource-model.js:Pipeline` |
| FR-CI-02 | System SHALL define executable job steps with isolation | `resource-model.js:Job` |
| FR-CI-03 | System SHALL manage runner pools with warm/max replicas | `resource-model.js:RunnerPool` |

### FR-HOOKS: Webhook Management

| ID | Requirement | Source |
|----|-------------|--------|
| FR-HOOKS-01 | System SHALL support webhook subscriptions with URL, events, signing | `resource-model.js:WebhookSubscription` |
| FR-HOOKS-02 | System SHALL record durable outbound delivery attempts | `resource-model.js:WebhookDelivery` |

### FR-WEB: Web UI

| ID | Requirement | Source |
|----|-------------|--------|
| FR-WEB-01 | System SHALL support saved triage and dashboard views | `resource-model.js:View` |
| FR-WEB-02 | System SHALL support reusable label/query selectors | `resource-model.js:Selector` |

---

## 2. Non-Functional Requirements

### NFR-PERF: Performance

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-PERF-01 | System SHALL cache snapshots with stale-while-revalidate (30s TTL) | `snapshot-cache.js` |
| NFR-PERF-02 | System SHALL support per-org cache entries for independent revalidation | `snapshot-cache.js` |
| NFR-PERF-03 | System SHALL execute kubectl operations asynchronously | `kubernetes-controller-async.js` |
| NFR-PERF-04 | System SHALL batch events with configurable size (50) and interval (1000ms) | `async-controller.js:createEventBatcher` |
| NFR-PERF-05 | System SHALL retry operations with exponential backoff | `async-controller.js:createRetryPolicy` |
| NFR-PERF-06 | System SHALL deliver events via ordered async queue | `async-controller.js:createDeliveryQueue` |
| NFR-PERF-07 | System SHALL checkpoint long-running operations for resumption | `async-controller.js:createCheckpointer` |
| NFR-PERF-08 | System SHALL stream events via SSE with 30s heartbeat keepalive | `http-server.js:sseMatch` |

### NFR-SEC: Security

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-SEC-01 | System SHALL sign session cookies with HMAC-SHA256 | `auth.js:createSessionCookie` |
| NFR-SEC-02 | System SHALL use timing-safe comparison for signatures | `auth.js:timingSafeEqual` |
| NFR-SEC-03 | System SHALL require auth on all mutating API routes | `http-server.js` |
| NFR-SEC-04 | System SHALL reject unsigned cookies when secret is configured | `auth.js:parseSessionCookie` |
| NFR-SEC-05 | System SHALL verify webhook signatures with HMAC-SHA256 | `external/webhook-controller.js` |
| NFR-SEC-06 | System SHALL set HttpOnly and SameSite=Lax on session cookies | `auth.js:createSessionCookie` |
| NFR-SEC-07 | System SHALL enforce org namespace isolation for all resources | `http-server.js:scopeResource` |
| NFR-SEC-08 | System SHALL use RBAC ClusterRole for CRD access | `kubernetes-controller.js` |

### NFR-A11Y: Accessibility

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-A11Y-01 | Web console SHALL provide aria-label attributes on interactive elements | `packages/krate/web/` |
| NFR-A11Y-02 | Web console SHALL support keyboard navigation | `keyboard-shortcuts.jsx` |
| NFR-A11Y-03 | Web console SHALL provide command palette (Cmd+K) for quick access | `command-palette.jsx` |

### NFR-RESPONSIVE: Responsiveness

| ID | Requirement | Source |
|----|-------------|--------|
| NFR-RESP-01 | Web console SHALL adapt layout for mobile viewports | `packages/krate/web/` CSS |
| NFR-RESP-02 | Web console SHALL provide dark/light theme with system preference | `theme-runtime.jsx` |

---

## 3. Integration Requirements

### INT-K8S: Kubernetes

| ID | Requirement | Source |
|----|-------------|--------|
| INT-K8S-01 | System SHALL store CONFIG resources as Kubernetes CRDs | `kubernetes-controller.js` |
| INT-K8S-02 | System SHALL use kubectl for resource operations | `kubernetes-controller.js:spawn` |
| INT-K8S-03 | System SHALL define 75 CRDs under `krate.a5c.ai/v1alpha1` | `kubernetes-controller.js:KRATE_RESOURCES` |
| INT-K8S-04 | System SHALL scope resources to org namespaces (`krate-org-{org}`) | `org-scoping.js:orgNamespaceName` |
| INT-K8S-05 | System SHALL manage PersistentVolumeClaims for workspaces | `agent-workspace-controller.js` |
| INT-K8S-06 | System SHALL use `x-kubernetes-preserve-unknown-fields` for extensibility | CRD definitions |

### INT-GITEA: Gitea Integration

| ID | Requirement | Source |
|----|-------------|--------|
| INT-GITEA-01 | System SHALL use Gitea for repository hosting | `gitea-service.js` |
| INT-GITEA-02 | System SHALL access Gitea tree/blob/branch APIs | `gitea-backend.js` |
| INT-GITEA-03 | System SHALL sync SSH keys with Gitea repositories | `gitea-service.js` |

### INT-ATLAS: Atlas Graph

| ID | Requirement | Source |
|----|-------------|--------|
| INT-ATLAS-01 | SDK SHALL provide Atlas graph search client | `sdk/src/atlas-graph-client.js` |
| INT-ATLAS-02 | SDK SHALL expose stack layers and composition facets | `sdk/src/atlas-graph-client.js:STACK_LAYERS, COMPOSITION_FACETS` |
| INT-ATLAS-03 | Web console SHALL provide Atlas search API route | `web/app/api/atlas/search/route.js` |

### INT-GITHUB: GitHub Integration

| ID | Requirement | Source |
|----|-------------|--------|
| INT-GH-01 | System SHALL support GitHub as OAuth sign-in provider | `auth.js:github` |
| INT-GH-02 | System SHALL ingest GitHub webhooks with signature verification | `external/webhook-controller.js` |
| INT-GH-03 | System SHALL provide GitHub adapter for git-forge operations | `external/github/git-forge.js` |
| INT-GH-04 | System SHALL provide GitHub adapter for issue tracking | `external/github/issue-tracking.js` |
| INT-GH-05 | System SHALL provide GitHub adapter for CI/CD operations | `external/github/cicd.js` |
| INT-GH-06 | System SHALL handle GitHub App authentication | `external/github/auth.js` |

---

## 4. Deployment Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| DEP-HELM-01 | System SHALL deploy via Helm chart | Helm chart directory |
| DEP-HELM-02 | Helm chart SHALL manage CRD lifecycle | Chart templates |
| DEP-HELM-03 | Helm chart SHALL create org namespace on install | Chart templates |
| DEP-DOCKER-01 | System SHALL use multi-stage Docker builds | Dockerfile |
| DEP-DOCKER-02 | Deployment SHALL run multi-container pods (api, controllers, web, webhook-worker) | Helm values |
| DEP-AKS-01 | System SHALL deploy to Azure Kubernetes Service | Deployment docs |
| DEP-AKS-02 | System SHALL use Azure Container Registry for images | Deployment docs |
| DEP-CERT-01 | System SHALL use cert-manager for TLS certificates | Ingress annotations |
| DEP-INGRESS-01 | System SHALL use nginx ingress controller for HTTP routing | Ingress resource |

---

## 5. Testing Requirements

| ID | Requirement | Coverage | Source |
|----|-------------|----------|--------|
| TEST-CORE-01 | Core package SHALL have 1259 unit+integration tests | `node:test` | `packages/krate/core/package.json` |
| TEST-SDK-01 | SDK package SHALL have 73 export and integration tests | `node:test` | `packages/krate/sdk/tests/` |
| TEST-CLI-01 | CLI package SHALL have 51 command and MCP protocol tests | `node:test` | `packages/krate/cli/tests/` |
| TEST-E2E-01 | Core SHALL have 3 end-to-end validation tests | `npm run e2e` | `packages/krate/core/package.json` |
| TEST-SMOKE-01 | Core SHALL have 21 MVP smoke assertions | `npm run smoke` | `packages/krate/core/package.json` |
| TEST-WEB-01 | Web console SHALL have build validation tests | `npm run build` | `packages/krate/web/package.json` |
