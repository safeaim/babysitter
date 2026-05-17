# Krate SDK API Reference

> Derived from implementation. Source: `packages/krate/sdk/src/index.js`

Package: `@a5c-ai/krate-sdk`

The SDK re-exports core helpers for web and CLI consumers. All functions are pure ESM exports with zero external dependencies.

---

## 1. Resource Model

Source: `packages/krate/core/src/resource-model.js`

### Constants

```javascript
import { CONFIG_KINDS, AGGREGATED_KINDS, ALL_KINDS, RESOURCE_DEFINITIONS } from '@a5c-ai/krate-sdk';
```

| Export | Type | Description |
|--------|------|-------------|
| `CONFIG_KINDS` | `Set<string>` | Set of 44 kind names stored in etcd |
| `AGGREGATED_KINDS` | `Set<string>` | Set of 32 kind names stored in postgres |
| `ALL_KINDS` | `Set<string>` | Union of CONFIG_KINDS and AGGREGATED_KINDS (76 total) |
| `RESOURCE_DEFINITIONS` | `Object` | Frozen map of kind → `{ storage, context, plural, purpose, requiredSpec }` |

### createResource(kind, metadata, spec)

Creates a well-formed Krate resource object.

```javascript
import { createResource } from '@a5c-ai/krate-sdk';

const repo = createResource('Repository', { name: 'my-repo', namespace: 'krate-org-acme' }, {
  organizationRef: 'acme',
  visibility: 'private'
});
// Returns: { apiVersion: 'krate.a5c.ai/v1alpha1', kind: 'Repository', metadata: {...}, spec: {...} }
```

### clone(obj)

Deep clone utility for resource objects.

```javascript
import { clone } from '@a5c-ai/krate-sdk';
const copy = clone(resource);
```

### resourceToYaml(resource)

Serialize a resource object to YAML string format.

```javascript
import { resourceToYaml } from '@a5c-ai/krate-sdk';
const yaml = resourceToYaml(repo);
```

### findResourceDefinition(kind)

Look up the resource definition (plural, storage, namespace) for a given kind.

```javascript
import { findResourceDefinition } from '@a5c-ai/krate-sdk';
const def = findResourceDefinition('Repository');
// { kind: 'Repository', plural: 'repositories', namespaced: true, storage: 'etcd' }
```

---

## 2. API Controller

Source: `packages/krate/core/src/api-controller.js`

### createKrateApiController(options?)

Creates the main API controller for resource operations.

```javascript
import { createKrateApiController } from '@a5c-ai/krate-sdk';

const controller = createKrateApiController({
  namespace: 'krate-org-acme',
  resourceGateway: createKubernetesResourceGateway()  // optional
});
```

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `namespace` | `string` | Target K8s namespace |
| `resourceGateway` | `object` | Custom resource gateway (default: kubectl) |

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| `snapshot()` | `() => Promise<object>` | Full namespace resource snapshot |
| `listResource(kind)` | `(kind: string) => Promise<{ items: object[] }>` | List resources by kind |
| `getResource(kind, name)` | `(kind: string, name: string) => Promise<object>` | Get single resource |
| `applyResource(resource)` | `(resource: object) => Promise<object>` | Create or update resource |
| `deleteResource(kind, name)` | `(kind: string, name: string) => Promise<object>` | Delete resource |
| `createOrganization(spec)` | `(spec: object) => Promise<object>` | Create org with namespace |
| `createRepository(spec)` | `(spec: object) => Promise<object>` | Create repository |
| `listResourceForOrg(org, kind)` | `(org: string, kind: string) => Promise<object>` | List resources scoped to org |
| `applyResourceForOrg(org, resource)` | `(org: string, resource: object) => Promise<object>` | Apply resource scoped to org |
| `deleteResourceForOrg(org, kind, name)` | `(org: string, kind: string, name: string) => Promise<object>` | Delete scoped resource |
| `syncExternalBinding(name, data)` | `(name: string, data: object) => Promise<object>` | Trigger external sync |
| `resolveExternalConflict(options)` | `(options: object) => Promise<object>` | Resolve sync conflict |
| `approveExternalWriteIntent(options)` | `(options: object) => Promise<object>` | Approve write intent |
| `cancelExternalWriteIntent(options)` | `(options: object) => Promise<object>` | Cancel write intent |
| `processWebhookEvent(event)` | `(event: object) => Promise<object>` | Process webhook/trigger event |
| `queryAgentMemory(options)` | `(options: object) => Promise<object>` | Query agent memory |
| `approveAgentAction(input)` | `(input: object) => Promise<object>` | Approve agent action |
| `denyAgentAction(input)` | `(input: object) => Promise<object>` | Deny agent action |

---

## 3. UI Model

Source: `packages/krate/core/src/controller-ui.js`

### createControllerUiModel(snapshot, options?)

Transforms a raw controller snapshot into a structured UI model.

```javascript
import { createControllerUiModel } from '@a5c-ai/krate-sdk';

const uiModel = createControllerUiModel(await controller.snapshot(), {
  organization: 'acme'
});
```

**Returns:** Object with:
- `orgs` — Organization list with display names
- `repositories` — Repository list with metadata
- `pullRequests` — Open pull requests
- `pipelines` — Recent pipeline runs
- `issues` — Issue list
- `agents` — Agent stacks, runs, sessions
- `memory` — Memory repositories

### issueProjectRefs(issue)

Extract project references from an issue resource.

### issueRepositoryRefs(issue)

Extract repository references from an issue resource.

---

## 4. Authentication

Source: `packages/krate/core/src/auth.js`

### createAuthProviderConfig(env?)

Build auth configuration from environment variables.

```javascript
import { createAuthProviderConfig } from '@a5c-ai/krate-sdk';
const config = createAuthProviderConfig(process.env);
```

**Returns:** `{ session, delegatedIdentity, providers: { github, sso } }`

### listEnabledAuthProviders(config?)

Get array of enabled and configured providers.

```javascript
import { listEnabledAuthProviders } from '@a5c-ai/krate-sdk';
const providers = listEnabledAuthProviders(config);
// [{ id: 'github', label: 'GitHub', type: 'github', ... }]
```

### buildAuthorizationRedirect({ provider, requestUrl, state? })

Build OAuth authorization redirect URL.

```javascript
import { buildAuthorizationRedirect } from '@a5c-ai/krate-sdk';
const { url, state, redirectUri } = buildAuthorizationRedirect({
  provider: config.providers.github,
  requestUrl: 'https://krate.example.com/login'
});
```

### exchangeOAuthCodeForProfile({ provider, code, requestUrl, fetchImpl? })

Exchange OAuth authorization code for user profile.

```javascript
import { exchangeOAuthCodeForProfile } from '@a5c-ai/krate-sdk';
const profile = await exchangeOAuthCodeForProfile({
  provider: config.providers.github,
  code: 'abc123',
  requestUrl: 'https://krate.example.com/login'
});
// { provider, subject, email, displayName, username, groups, teams, admin }
```

### createSessionCookie(config, profile, options?)

Create an HMAC-signed session cookie.

```javascript
import { createSessionCookie } from '@a5c-ai/krate-sdk';
const cookie = createSessionCookie(config, profile, { secret: process.env.KRATE_SESSION_SECRET });
// "krate_session=base64url.signature; Path=/; HttpOnly; SameSite=Lax"
```

### parseSessionCookie(config, cookieValue, options?)

Parse and verify a session cookie. Returns `null` if invalid.

```javascript
import { parseSessionCookie } from '@a5c-ai/krate-sdk';
const session = parseSessionCookie(config, cookieValue, { secret });
// { provider, subject, user } or null
```

### registerLoginProfile({ controller, namespace, profile })

Register a login profile as a User and IdentityMapping.

### mapLoginProfileToKrateIdentity(profile)

Map an OAuth profile to Krate User + IdentityMapping resources.

### profileFromDelegatedHeaders(headers, config?, options?)

Extract user profile from proxy delegation headers.

### createInviteResource(spec)

Create an Invite resource for user onboarding.

### createTeamResource(spec)

Create a Team resource.

---

## 5. Agent Controllers

### createAgentStackController()

Source: `packages/krate/core/src/agent-stack-controller.js`

Stack readiness reconciliation with capability resolution and MCP health checks.

```javascript
import { createAgentStackController } from '@a5c-ai/krate-sdk';
const stackCtrl = createAgentStackController();
```

**Methods:**
- `reconcileStack(stack, resources)` — Resolve capabilities, compute readiness
- `performMcpHealthCheck(url)` — HTTP health check (3s timeout)

### createAgentDispatchController(options?)

Source: `packages/krate/core/src/agent-dispatch-controller.js`

Manual dispatch orchestration with permission gating.

```javascript
import { createAgentDispatchController } from '@a5c-ai/krate-sdk';
const dispatchCtrl = createAgentDispatchController();
```

**Methods:**
- `createManualDispatch({ repository, ref, agentStack, taskKind, actor, namespace, organizationRef, resources })` — Create dispatch run

### createAgentWorkspaceController()

Source: `packages/krate/core/src/agent-workspace-controller.js`

Volume-backed git workspace provisioning.

**Methods:**
- `createWorkspace({ name, organizationRef, repository, volumeSpec, branch, namespace })` — Create workspace with PVC
- `generateCloneSpec(workspace)` — Git clone commands
- `generateCheckoutSpec(workspace, ref)` — Checkout commands
- `generateMountSpec(workspace)` — Volume mount configuration
- `findReusableWorkspace(repository, branch, workspaces)` — Find existing workspace
- `recordRunInHistory(workspace, runId)` — Track run association

### createAgentApprovalController()

Source: `packages/krate/core/src/agent-approval-controller.js`

Approval workflow management.

**Methods:**
- `createApproval(options)` — Create pending approval
- `approveAction(approval, decidedBy, reason)` — Approve
- `denyAction(approval, decidedBy, reason)` — Deny

### createAgentTriggerController()

Source: `packages/krate/core/src/agent-trigger-controller.js`

Event-to-stack routing.

```javascript
import { createAgentTriggerController, validateTriggerRule } from '@a5c-ai/krate-sdk';
```

**Methods:**
- `evaluateTrigger(event, rules, resources)` — Match event to rules
- `createExecutionRecord(rule, event, decision)` — Record evaluation

**Exported utilities:**
- `validateCronExpression(expr)` — Validate cron syntax
- `calculateNextRun(expr, now)` — Next cron execution time
- `validateWebhookTrigger(source)` — Validate webhook source config
- `validateCommentTrigger(source)` — Validate comment trigger
- `validateLabelTrigger(source)` — Validate label trigger
- `getTriggerSourceType(source)` — Determine source type
- `validateTriggerRule(rule)` — Full rule validation

### createAgentMemoryController()

Source: `packages/krate/core/src/agent-memory-controller.js`

Memory CRUD and time travel.

**Methods:**
- `createMemorySnapshot(options)` — Create dispatch-time memory pin
- `resolveTimeTravel(options)` — Resolve commit reference

### createAgentAdapterController()

Source: `packages/krate/core/src/agent-adapter-controller.js`

```javascript
import { createAgentAdapterController, validateAgentAdapter } from '@a5c-ai/krate-sdk';
```

### createAgentTransportBindingController()

Source: `packages/krate/core/src/agent-transport-binding-controller.js`

```javascript
import { createAgentTransportBindingController, validateAgentTransportBinding } from '@a5c-ai/krate-sdk';
```

### createAgentProviderConfigController()

Source: `packages/krate/core/src/agent-provider-config-controller.js`

```javascript
import { createAgentProviderConfigController, validateAgentProviderConfig } from '@a5c-ai/krate-sdk';
```

### createAgentProjectController()

Source: `packages/krate/core/src/agent-project-controller.js`

```javascript
import { createAgentProjectController, validateAgentProject } from '@a5c-ai/krate-sdk';
```

### createAgentGatewayConfigController()

Source: `packages/krate/core/src/agent-gateway-config-controller.js`

```javascript
import { createAgentGatewayConfigController, validateAgentGatewayConfig } from '@a5c-ai/krate-sdk';
```

### createAgentSessionTranscriptController()

Source: `packages/krate/core/src/agent-session-transcript-controller.js`

```javascript
import { createAgentSessionTranscriptController, validateAgentSessionTranscript } from '@a5c-ai/krate-sdk';
```

### createAgentSubagentController()

Source: `packages/krate/core/src/agent-subagent-controller.js`

```javascript
import { createAgentSubagentController } from '@a5c-ai/krate-sdk';
```

### createAgentWritebackController()

Source: `packages/krate/core/src/agent-writeback-controller.js`

```javascript
import { createAgentWritebackController } from '@a5c-ai/krate-sdk';
```

---

## 6. Memory System

Source: `packages/krate/core/src/agent-memory-query.js`

### queryGraph({ records, edges, query, kinds?, depth? })

Execute a graph query over memory records.

```javascript
import { queryGraph } from '@a5c-ai/krate-sdk';

const result = queryGraph({
  records: [{ id: 'n1', nodeKind: 'concept', attributes: { title: 'Agent Design' }, edges: [] }],
  edges: [{ source: 'n1', target: 'n2', kind: 'related-to' }],
  query: 'agent',
  kinds: ['concept'],
  depth: 2
});
// { matches: [...], totalMatches: number }
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `records` | `Array<{ id, nodeKind, attributes, edges }>` | Yes | Graph records |
| `edges` | `Array<{ source, target, kind }>` | No | Flat edges (supplements per-record edges) |
| `query` | `string` | Yes | Search text (non-empty) |
| `kinds` | `string[]` | No | nodeKind filter (empty = no filter) |
| `depth` | `number` | No | Edge-follow depth (default: 1) |

### queryGrep({ documents, query, contextLines? })

Execute full-text grep over documents.

```javascript
import { queryGrep } from '@a5c-ai/krate-sdk';

const result = queryGrep({
  documents: [{ id: 'doc1', content: 'Agent memory stores knowledge...' }],
  query: 'knowledge',
  contextLines: 2
});
// { matches: [...], totalMatches: number }
```

### queryMemory({ records, documents, edges, query, mode, kinds?, depth?, contextLines? })

Combined graph + grep query.

```javascript
import { queryMemory } from '@a5c-ai/krate-sdk';

const result = queryMemory({
  records,
  documents,
  edges,
  query: 'agent design',
  mode: 'graph-and-grep',  // 'graph-only' | 'grep-only' | 'graph-and-grep'
  kinds: [],
  depth: 1,
  contextLines: 3
});
```

### Memory Import Utilities

Source: `packages/krate/core/src/agent-memory-import.js`

```javascript
import {
  parseJournalForImport,
  createMemorySnapshot,
  validateMemoryImport,
  validateMemorySnapshot,
  validateOntology,
  getOntologyNodeKinds,
  getOntologyEdgeKinds
} from '@a5c-ai/krate-sdk';
```

| Function | Description |
|----------|-------------|
| `parseJournalForImport(journal)` | Parse babysitter run journal for importable data |
| `createMemorySnapshot(options)` | Create an AgentMemorySnapshot resource |
| `validateMemoryImport(importResource)` | Validate an AgentRunMemoryImport |
| `validateMemorySnapshot(snapshot)` | Validate an AgentMemorySnapshot |
| `validateOntology(ontology)` | Validate an AgentMemoryOntology |
| `getOntologyNodeKinds(ontology)` | Extract valid node kinds from ontology |
| `getOntologyEdgeKinds(ontology)` | Extract valid edge kinds from ontology |

---

## 7. External Backend Controllers

### createWebhookController(options?)

Source: `packages/krate/core/src/external/webhook-controller.js`

```javascript
import { createWebhookController } from '@a5c-ai/krate-sdk';
const webhookCtrl = createWebhookController({ secret: 'webhook-secret' });
```

**Methods:**
- `verifySignature(body, signature)` — HMAC-SHA256 verification → `{ valid, reason }`
- `createDelivery(event)` — Create delivery record with dedup
- `subscribe(handler)` — Subscribe to delivery events
- `getDelivery(id)` — Get delivery by ID
- `listDeliveries()` — List all deliveries

### createSyncController()

Source: `packages/krate/core/src/external/sync-controller.js`

```javascript
import { createSyncController } from '@a5c-ai/krate-sdk';
const syncCtrl = createSyncController();
```

**Methods:**
- `processSync(event)` — Process sync event, update state
- `getSyncState(provider, resource)` — Get current sync state
- `listSyncEvents(options)` — List events with filtering

### createWriteController()

Source: `packages/krate/core/src/external/write-controller.js`

```javascript
import { createWriteController } from '@a5c-ai/krate-sdk';
const writeCtrl = createWriteController();
```

**Methods:**
- `createWriteIntent(options)` — Queue write-back intent
- `approveIntent(name, approvedBy)` — Approve for execution
- `cancelIntent(name, cancelledBy)` — Cancel intent
- `listIntents(options)` — List pending intents

### createConflictController()

Source: `packages/krate/core/src/external/conflict-controller.js`

```javascript
import { createConflictController } from '@a5c-ai/krate-sdk';
const conflictCtrl = createConflictController();
```

**Methods:**
- `detectConflict(local, external)` — Compare and detect conflicts
- `resolveConflict(name, strategy, resolvedValue)` — Resolve with strategy
- `listConflicts(options)` — List unresolved conflicts

### createDefaultProviderRegistry()

Source: `packages/krate/core/src/external/provider-resource-factory.js`

```javascript
import { createDefaultProviderRegistry, createExternalBackendProvider } from '@a5c-ai/krate-sdk';
const registry = createDefaultProviderRegistry();
```

---

## 8. Event System

Source: `packages/krate/core/src/event-bus.js`

### globalEventBus

Singleton event bus instance.

```javascript
import { globalEventBus } from '@a5c-ai/krate-sdk';

globalEventBus.subscribe((event) => {
  console.log('Event:', event.type, event.kind, event.name);
});

globalEventBus.emit({ type: 'resource-change', kind: 'Repository', name: 'my-repo', operation: 'apply' });
```

### createEventBus()

Create a new isolated event bus.

```javascript
import { createEventBus } from '@a5c-ai/krate-sdk';
const bus = createEventBus();
```

**Methods:**
| Method | Signature | Description |
|--------|-----------|-------------|
| `subscribe(fn)` | `(fn: (event) => void) => void` | Add listener |
| `unsubscribe(fn)` | `(fn: Function) => void` | Remove listener |
| `emit(event)` | `(event: object) => void` | Broadcast to all |
| `emitResourceChange(kind, name, operation)` | `(kind, name, op) => void` | Emit resource-change event |

---

## 9. Audit

Source: `packages/krate/core/src/audit-controller.js`

### createAuditController()

```javascript
import { createAuditController } from '@a5c-ai/krate-sdk';
const audit = createAuditController();
```

**Methods:**
- `record(event)` — Record an audit event
- `query(options)` — Query events by org, action, time range, pagination

### createEventPoller(options)

Polling mechanism for audit event consumption.

---

## 10. Async Utilities

Source: `packages/krate/core/src/async-controller.js`

### createEventBatcher(handler, options?)

Batch events with size and time-based flushing.

```javascript
import { createEventBatcher } from '@a5c-ai/krate-sdk';

const batcher = createEventBatcher(async (events) => {
  await saveAll(events);
}, { maxBatchSize: 50, flushIntervalMs: 1000 });

batcher.push(event);
await batcher.flush();
batcher.stop();
```

**Options:** `{ maxBatchSize: 50, flushIntervalMs: 1000 }`
**Returns:** `{ push(event), flush(), stop() }`

### createRetryPolicy(options?)

Retry operations with exponential backoff and jitter.

```javascript
import { createRetryPolicy } from '@a5c-ai/krate-sdk';
const retry = createRetryPolicy({ maxRetries: 3, baseDelayMs: 100 });
```

### createDeliveryQueue(options?)

Ordered async delivery queue with error isolation.

```javascript
import { createDeliveryQueue } from '@a5c-ai/krate-sdk';
const queue = createDeliveryQueue({ concurrency: 5 });
```

### createCheckpointer(options?)

Checkpoint and resume for long-running operations.

```javascript
import { createCheckpointer } from '@a5c-ai/krate-sdk';
const cp = createCheckpointer({ storageKey: 'sync-progress' });
```

---

## 11. Other Utilities

### Runner Controller

Source: `packages/krate/core/src/runner-controller.js`

```javascript
import { createRunnerController } from '@a5c-ai/krate-sdk';
const runners = createRunnerController();
```

### Notification Controller

Source: `packages/krate/core/src/notification-controller.js`

```javascript
import { createNotificationController } from '@a5c-ai/krate-sdk';
const notifications = createNotificationController();
```

### Org Scoping

Source: `packages/krate/core/src/org-scoping.js`

```javascript
import { orgNamespaceName, normalizeOrgSlug } from '@a5c-ai/krate-sdk';

orgNamespaceName('acme');      // 'krate-org-acme'
normalizeOrgSlug('Acme Inc');  // 'acme-inc'
```

### Permission Review

Source: `packages/krate/core/src/agent-permission-review.js`

```javascript
import { createPermissionReviewer } from '@a5c-ai/krate-sdk';
const reviewer = createPermissionReviewer();
const result = reviewer.reviewPermissions({ repository, ref, actor, agentStack, resources });
```

### Secret/Config Grant Management

Source: `packages/krate/core/src/agent-secret-config-grant-controller.js`

```javascript
import {
  createAgentSecretGrantController,
  createAgentConfigGrantController,
  validateAgentSecretGrant,
  validateAgentConfigGrant,
  listGrantsForAgent,
  revokeGrant
} from '@a5c-ai/krate-sdk';
```

### Gitea Service

Source: `packages/krate/core/src/gitea-service.js`

```javascript
import { createGiteaService } from '@a5c-ai/krate-sdk';
const gitea = createGiteaService({ baseUrl: 'http://gitea:3000', token: '...' });
```

### Atlas Graph Client

Source: `packages/krate/sdk/src/atlas-graph-client.js`

```javascript
import { fetchAtlasRecordsByKinds, searchAtlasGraph, STACK_LAYERS, COMPOSITION_FACETS, ALL_LAYER_DEFS } from '@a5c-ai/krate-sdk';
```

| Export | Description |
|--------|-------------|
| `fetchAtlasRecordsByKinds(kinds, options)` | Fetch graph records by node kinds |
| `searchAtlasGraph(query, options)` | Full-text search across Atlas graph |
| `STACK_LAYERS` | Stack layer definitions |
| `COMPOSITION_FACETS` | Composition facet catalog |
| `ALL_LAYER_DEFS` | All layer definition objects |

### Controller Client

Source: `packages/krate/core/src/controller-client.js`

```javascript
import { fetchControllerUiModel } from '@a5c-ai/krate-sdk';
const uiModel = await fetchControllerUiModel({ baseUrl: 'http://localhost:3080', org: 'acme' });
```

### Snapshot Cache

Source: `packages/krate/core/src/snapshot-cache.js`

```javascript
import { clearSnapshotCache } from '@a5c-ai/krate-sdk';
clearSnapshotCache();  // Invalidate all cached data
```

### Identity Policy

Source: `packages/krate/core/src/identity-policy.js`

```javascript
import { mapOidcIdentity } from '@a5c-ai/krate-sdk';
```
