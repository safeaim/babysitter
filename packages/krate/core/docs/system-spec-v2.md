# Krate System Specification v2

> Derived from implementation. Source: `packages/krate/core/src/`

## 1. Resource Taxonomy

All 76 resource kinds from `RESOURCE_DEFINITIONS` in `packages/krate/core/src/resource-model.js`:

### CONFIG Kinds (etcd storage — 44 kinds)

| Kind | Context | Plural | Purpose | RequiredSpec |
|------|---------|--------|---------|--------------|
| Organization | identity | organizations | Krate organization identity in the platform namespace | displayName, namespaceName |
| OrgNamespaceBinding | identity | orgnamespacebindings | Binding from org to tenant namespace | organizationRef, namespace |
| User | identity | users | Human account profile, sign-in state, admin flag | organizationRef, displayName, email |
| Team | identity | teams | Team membership, maintainers, permission grants | organizationRef, displayName |
| Invite | identity | invites | Pending user invitation with expiry | organizationRef, email, role |
| IdentityMapping | identity | identitymappings | Mapping between Krate users and external subjects | organizationRef, user, provider, subject |
| AuthProvider | identity | authproviders | Sign-in provider configuration | organizationRef, type |
| Repository | data-plane | repositories | Repository identity, visibility, hosting integration | organizationRef, visibility |
| SSHKey | data-plane | sshkeys | User/deploy/automation SSH keys | organizationRef, scope, key |
| RepositoryPermission | data-plane | repositorypermissions | Repository collaborators and teams | organizationRef, repository, subject, permission |
| WebhookSubscription | hooks-events | webhooksubscriptions | Endpoint, event filters, signing, delivery mode | organizationRef, url, events |
| RefPolicy | data-plane | refpolicies | Reference deny rules, force-push policy | organizationRef |
| BranchProtection | control-plane | branchprotections | Protected ref rules | organizationRef, refs |
| PolicyProfile | policy | policyprofiles | Org policy posture, default templates | organizationRef, displayName, mode |
| PolicyTemplate | policy | policytemplates | Kyverno policy template metadata | displayName, targetKinds, kyverno |
| PolicyBinding | policy | policybindings | Template binding with audit/enforce state | organizationRef, templateRef, mode |
| PolicyExceptionRequest | policy | policyexceptionrequests | Temporary PolicyException request | organizationRef, policyRef, justification, expiresAt |
| View | web-ui | views | Saved triage/dashboard view | organizationRef, selector |
| Selector | web-ui | selectors | Reusable label/query selector | organizationRef |
| RunnerPool | runners-ci | runnerpools | Runner capacity, warm/max replicas, cache | organizationRef, warmReplicas, maxReplicas |
| AgentStack | agents | agentstacks | Reusable agent definition with full config | organizationRef, baseAgent, adapter, runtimeIdentity |
| AgentSubagent | agents | agentsubagents | Named child-agent definition | organizationRef, rolePrompt, taskKinds |
| AgentToolProfile | agents | agenttoolprofiles | Native tool policy for filesystem/network/shell | organizationRef, filesystemPolicy, approvalPolicyByTool |
| AgentMcpServer | agents | agentmcpservers | Managed MCP endpoint with transport/health | organizationRef, transport, scope |
| AgentSkill | agents | agentskills | Reusable runbook/procedure bundle | organizationRef, format, sourceRef |
| AgentTriggerRule | agents | agenttriggerrules | Event-to-stack routing | organizationRef, sources, agentStack, taskKind |
| AgentContextLabel | agents | agentcontextlabels | Reviewed prompt fragment | organizationRef, promptFragment, allowedSources |
| KrateWorkspacePolicy | agents | krateworkspacepolicies | Workspace provisioning/cleanup policies | organizationRef, mode, retentionPolicy |
| AgentServiceAccount | identity | agentserviceaccounts | K8s ServiceAccount wrapper for agent identity | organizationRef, namespace, serviceAccountName |
| AgentRoleBinding | identity | agentrolebindings | Managed RBAC projection for agent identity | organizationRef, subject, roleRef, scope |
| AgentSecretGrant | identity | agentsecretgrants | Permission to access Secret keys | organizationRef, subject, secretRef, purpose |
| AgentConfigGrant | identity | agentconfiggrants | Permission to access ConfigMap keys | organizationRef, subject, configMapRef, purpose |
| AgentAdapter | agents | agentadapters | Agent adapter with transport/capabilities | organizationRef, adapterType, transport |
| AgentTransportBinding | agents | agenttransportbindings | Adapter connection configuration | organizationRef, adapterRef, endpoint, protocol |
| AgentProviderConfig | agents | agentproviderconfigs | Model provider configuration | organizationRef, provider, authType |
| KrateProject | agents | krateprojects | Org project grouping issues/repos | organizationRef, displayName |
| AgentGatewayConfig | agents | agentgatewayconfigs | Agent Mux gateway connection settings | organizationRef, gatewayUrl |
| AgentMemoryRepository | agents | agentmemoryrepositories | Git repo pointer for shared agent memory | organizationRef, repositoryRef, defaultBranch, layoutProfile |
| AgentMemorySource | agents | agentmemorysources | Read policy for memory paths/kinds | organizationRef, repositoryRef, appliesTo, include |
| AgentMemoryOntology | agents | agentmemoryontologies | Ontology policy with fields/edges/vocabulary | organizationRef, memoryRepository, ontologyPath |
| AgentMemoryAssociation | agents | agentmemoryassociations | Bridge linking memory to Krate resources | organizationRef, memoryRef, targetRef, relationship |
| KrateWorkspace | workspaces | krateworkspaces | Volume-backed git workspace with PVC lifecycle | organizationRef, repository, volumeSpec |
| ExternalBackendProvider | external-backends | externalbackendproviders | External provider registration | organizationRef, providerType, endpoint |
| ExternalBackendBinding | external-backends | externalbackendbindings | Provider binding to org | organizationRef, providerRef, credentialRef |
| ExternalBackendSyncPolicy | external-backends | externalbackendsyncpolicies | Sync interval, conflict resolution | organizationRef, providerRef, syncInterval |
| ExternalProviderCapabilityManifest | external-backends | externalprovidercapabilitymanifests | Discovered provider capabilities | organizationRef, providerRef, capabilities |

### AGGREGATED Kinds (postgres storage — 32 kinds)

| Kind | Context | Plural | Purpose | RequiredSpec |
|------|---------|--------|---------|--------------|
| PullRequest | control-plane | pullrequests | Review unit with source/target refs | organizationRef, repository, title |
| Issue | control-plane | issues | Project-scoped work item | organizationRef, title |
| Review | control-plane | reviews | Approval/comment for a PR | organizationRef, pullRequest |
| Pipeline | runners-ci | pipelines | CI pipeline run state | organizationRef, repository, ref |
| Job | runners-ci | jobs | Executable CI step | organizationRef, pipeline, step |
| WebhookDelivery | hooks-events | webhookdeliveries | Outbound webhook delivery attempt | organizationRef, subscription, eventType, signature |
| AgentDispatchRun | agents | agentdispatchruns | Logical agent run with queue/status/cost | organizationRef, repository, sourceRefs, agentStack, taskKind |
| AgentDispatchAttempt | agents | agentdispatchattempts | Concrete execution attempt | organizationRef, agentDispatchRun, attemptReason, agentStackSnapshot |
| AgentSession | agents | agentsessions | Agent Mux session projection | organizationRef, agentMuxSessionId, dispatchRun |
| AgentContextBundle | agents | agentcontextbundles | Immutable prompt/context snapshot | organizationRef, dispatchRun, digest, sources |
| KrateArtifact | agents | krateartifacts | Durable agent output | organizationRef, dispatchRun, kind, digest |
| AgentApproval | agents | agentapprovals | Human gate for actions | organizationRef, dispatchRun, action, requestedBy |
| AgentTriggerExecution | agents | agenttriggerexecutions | Trigger evaluation record | organizationRef, triggerRule, sourceEvent, decision |
| AgentCapabilityRequirement | agents | agentcapabilityrequirements | Computed dependency record | organizationRef, ownerRef, requiredRoles |
| WorkItemSessionLink | agents | workitemsessionlinks | Issue/PR to session association | organizationRef, workItemRef, agentSession |
| WorkItemWorkspaceLink | agents | workitemworkspacelinks | Issue/PR to workspace association | organizationRef, workItemRef, workspace |
| AgentSessionTranscript | agents | agentsessiontranscripts | Chat transcript with cost | organizationRef, sessionRef, messages |
| AgentSessionAttachment | agents | agentsessionattachments | File attached to session | organizationRef, sessionRef, sourceType, digest |
| KrateWorkspaceRuntime | agents | krateworkspaceruntimes | Workspace runtime state | organizationRef, workspaceRef, status |
| AgentMemorySnapshot | agents | agentmemorysnapshots | Dispatch-time memory pin | organizationRef, memoryRepository, requestedRef, resolvedCommit |
| AgentMemoryQuery | agents | agentmemoryqueries | Retrieval record with results | organizationRef, snapshotRef, requester, query |
| AgentMemoryUpdate | agents | agentmemoryupdates | Proposed memory mutation | organizationRef, memoryRepository, sourceRun, changes |
| AgentRunMemoryImport | agents | agentrunmemoryimports | Import run metadata into memory | organizationRef, memoryRepository, source, include |
| ExternalWebhookDelivery | external-backends | externalwebhookdeliveries | Inbound webhook from external | organizationRef, providerRef, eventType, payload |
| ExternalSyncEvent | external-backends | externalsyncevents | Sync event record | organizationRef, providerRef, eventKind, resourceRef |
| ExternalSyncState | external-backends | externalsyncstates | Current sync phase/status | organizationRef, providerRef, resourceRef, phase |
| ExternalWriteIntent | external-backends | externalwriteintents | Queued write-back intent | organizationRef, providerRef, resourceRef, operation |
| ExternalSyncConflict | external-backends | externalsyncconflicts | Detected conflict with diff | organizationRef, providerRef, resourceRef, conflictKind |
| ExternalObjectLink | external-backends | externalobjectlinks | Mapping between local and external | organizationRef, providerRef, externalId, localRef |

---

## 2. API Surface

All HTTP routes from `packages/krate/core/src/http-server.js`:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Health check |
| GET | `/api/controller` | No | Full controller UI model (optional `?org=`) |
| GET | `/api/orgs` | No | List organizations |
| POST | `/api/orgs` | Yes | Create organization |
| GET | `/api/orgs/:org/resources` | No | List resources by kind (`?kind=`) |
| POST | `/api/orgs/:org/resources` | Yes | Apply (create/update) resource |
| GET | `/api/orgs/:org/resources/:kind/:name` | No | Get single resource |
| DELETE | `/api/orgs/:org/resources/:kind/:name` | Yes | Delete resource |
| GET | `/api/orgs/:org/repositories` | No | List repositories |
| POST | `/api/orgs/:org/repositories` | Yes | Create repository |
| GET | `/api/orgs/:org/repositories/:name` | No | Get repository |
| DELETE | `/api/orgs/:org/repositories/:name` | Yes | Delete repository |
| GET | `/api/orgs/:org/snapshot` | No | Org runtime snapshot |
| POST | `/api/orgs/:org/snapshot` | Yes | Import snapshot |
| GET | `/api/orgs/:org/runtime-resources/:kind` | No | List runtime resources by kind |
| POST | `/api/orgs/:org/repositories/:repo/objects` | Yes | Record git object |
| POST | `/api/orgs/:org/repositories/:repo/search-index` | Yes | Enqueue search index |
| POST | `/api/orgs/:org/pullrequests` | Yes | Create pull request |
| POST | `/api/orgs/:org/pullrequests/:pr/reviews` | Yes | Add review |
| POST | `/api/orgs/:org/pullrequests/:pr/checks/complete` | Yes | Complete pipeline check |
| POST | `/api/orgs/:org/pullrequests/:pr/merge` | Yes | Merge pull request |
| POST | `/api/orgs/:org/agents/approvals/:name/decide` | Yes | Approve/deny agent action |
| POST | `/api/orgs/:org/agents/webhooks/ingest` | Yes | Ingest webhook event |
| POST | `/api/orgs/:org/agents/events/pipeline-failure` | Yes | Pipeline failure event |
| POST | `/api/orgs/:org/agents/events/comment` | Yes | Comment event |
| POST | `/api/orgs/:org/agents/events/label` | Yes | Label event |
| POST | `/api/orgs/:org/agents/triggers/process` | Yes | Process trigger |
| POST | `/api/orgs/:org/agents/memory/query` | Yes | Query agent memory |
| GET | `/api/orgs/:org/secrets` | No | List secrets |
| POST | `/api/orgs/:org/secrets` | Yes | Create secret |
| DELETE | `/api/orgs/:org/secrets/:name` | Yes | Delete secret |
| GET | `/api/orgs/:org/secret-grants` | No | List secret grants |
| POST | `/api/orgs/:org/secret-grants` | Yes | Create secret grant |
| POST | `/api/orgs/:org/external/sync` | Yes | Trigger external sync |
| POST | `/api/orgs/:org/external/conflicts/:name/resolve` | Yes | Resolve sync conflict |
| POST | `/api/orgs/:org/external/write-intents/:name/approve` | Yes | Approve write intent |
| POST | `/api/orgs/:org/external/write-intents/:name/cancel` | Yes | Cancel write intent |
| GET | `/api/orgs/:org/agents/events/stream` | No | SSE event stream |

---

## 3. Controller Boundaries

Each controller declares an explicit boundary object. Source: respective controller files.

| Controller | File | Role | Owns | Delegates To | Must Not Own |
|-----------|------|------|------|--------------|--------------|
| KubernetesResourceClient | `kubernetes-controller.js` | Workspace API, access checks | command execution, API discovery, access checks, watch streams | — | HTTP routes, Next.js pages, forge DTO, business workflows |
| KrateKubernetesReconciler | `kubernetes-controller.js` | Resource reconciliation | Repository status, identity projection, hosting intent, policy sync, degraded conditions | kubernetes-resource-gateway, git-data-plane | HTTP routes, web pages, API DTO, browser behavior |
| AgentStackController | `agent-stack-controller.js` | Stack readiness reconciliation | capability resolution, conditions, readiness, MCP health | agent-permission-review, resource-model | secret values, dispatch execution, Agent Mux sessions |
| AgentDispatchController | `agent-dispatch-controller.js` | Manual dispatch orchestration | dispatch creation, attempt lifecycle, session binding, workspace provisioning | agent-permission-review, agent-stack, agent-context-bundles, agent-mux-client, agent-memory, agent-approval, agent-workspace | secret values, UI rendering |
| AgentWorkspaceController | `agent-workspace-controller.js` | Volume-backed workspace provisioning | workspace creation, PVC generation, git specs, mount specs, reuse, codespace, associations, run history | resource-model | git execution, K8s API, secrets |
| AgentMemoryQuery | `agent-memory-query.js` | In-memory graph/grep query | graph traversal, nodeKind filtering, edge following, scoring, grep, context extraction | (none) | persistence, HTTP, K8s, secrets |
| WebhookController | `external/webhook-controller.js` | Inbound webhook delivery | HMAC validation, delivery records, dedup, event queue | sync-controller | resource persistence, ownership |
| SyncController | `external/sync-controller.js` | External sync orchestration | sync events, state transitions, watermarks | conflict-controller | webhook ingestion, write execution |
| ConflictController | `external/conflict-controller.js` | Conflict detection/resolution | conflict records, resolution strategies, diff computation | — | sync execution, write-back |
| WriteController | `external/write-controller.js` | Write intent management | intent creation, approval, execution queue | — | sync, conflict detection |
| AuditController | `audit-controller.js` | Audit event recording | event capture, query, time-range filtering | — | business logic, auth |
| RunnerController | `runner-controller.js` | Runner pool management | pool sizing, pod spec, capacity tracking | — | job execution |
| NotificationController | `notification-controller.js` | Notification delivery | notification creation, delivery, read status | — | business decisions |

---

## 4. Event System

Source: `packages/krate/core/src/event-bus.js`, `notification-controller.js`, `audit-controller.js`

### 4.1 Event Bus

```javascript
const bus = createEventBus();
bus.subscribe(listener);     // Register listener
bus.emit(event);             // Broadcast to all
bus.emitResourceChange(kind, name, operation);  // Convenience
```

Global singleton: `globalEventBus`

### 4.2 SSE Streaming

Route: `GET /api/orgs/:org/agents/events/stream`

- Content-Type: `text/event-stream`
- Initial connection message: `{"type":"connected"}`
- Heartbeat every 30 seconds: `{"type":"heartbeat"}`
- Resource change events forwarded from globalEventBus
- Connection cleanup on client disconnect

### 4.3 Notification Controller

Manages notification lifecycle:
- Create notifications with type, title, body, target
- Mark as read/unread
- List with filtering by read status
- Auto-expiry based on age

### 4.4 Audit Controller

Records audit events with:
- Action (create, update, delete, login, dispatch)
- Actor (user, system, agent)
- Resource reference
- Timestamp
- Query by org, action, time range, with pagination

---

## 5. Workspace Lifecycle

Source: `packages/krate/core/src/agent-workspace-controller.js`

### 5.1 Provisioning Flow

1. **Create workspace** — Generate `KrateWorkspace` resource with PVC spec
2. **PVC manifest** — StorageClass, capacity (default 10Gi), access modes (ReadWriteOnce)
3. **Git clone spec** — Commands to clone repository into workspace volume
4. **Checkout spec** — Branch/ref checkout commands
5. **Runner mount spec** — Volume mount configuration for runner pods

### 5.2 Workspace Reuse

Workspaces can be reused across dispatch runs:
- Match by repository + branch
- Update workspace status to reflect new session binding
- Track run history per workspace

### 5.3 Codespace Management

- Live workspace runtime state (`KrateWorkspaceRuntime`)
- Process status, environment variables, preview URLs
- Session shell access via web console

---

## 6. Runner System

Source: `packages/krate/core/src/runner-controller.js`, `runners-ci.js`

### 6.1 Pool Management

`RunnerPool` defines:
- `warmReplicas` — Pre-provisioned ready runners
- `maxReplicas` — Maximum capacity
- Cache policy for workspace data
- Trust boundary for execution isolation

### 6.2 Pod Spec Generation

Runner pods include:
- Workspace PVC volume mount
- Service account binding (`AgentServiceAccount`)
- Resource limits and requests
- Network policy annotations

### 6.3 Job Scheduling

`Pipeline` → `Job` hierarchy:
- Pipeline tracks overall state, steps, and resume point
- Job represents a single executable step
- Trust tier determines isolation level

---

## 7. External Sync Pipeline

Source: `packages/krate/core/src/external/`

### 7.1 Full Pipeline Flow

```
Webhook Ingest → HMAC Verify → Dedup → Normalize → Sync Event → State Update → Conflict Check → Write Intent
```

### 7.2 Step Details

| Step | Controller | Action |
|------|-----------|--------|
| 1. Ingest | WebhookController | Receive POST, extract signature header |
| 2. HMAC Verify | WebhookController | `sha256=` prefix comparison, timing-safe |
| 3. Dedup | WebhookController | Check deliveryId against store |
| 4. Normalize | WebhookController | Create `ExternalWebhookDelivery` record |
| 5. Sync Event | SyncController | Create `ExternalSyncEvent`, update watermark |
| 6. State Update | SyncController | Update `ExternalSyncState` phase |
| 7. Conflict Check | ConflictController | Compare local vs external, create `ExternalSyncConflict` if diverged |
| 8. Write Intent | WriteController | Queue `ExternalWriteIntent` if write-back needed |

### 7.3 Conflict Resolution Strategies

- `local-wins` — Keep local version
- `remote-wins` — Accept external version
- `manual` — Create conflict record for human resolution
- `merge` — Attempt field-level merge

---

## 8. MCP Protocol

Source: `packages/krate/cli/src/mcp-server.js`

### 8.1 Tools (14)

| Tool | Description | Required Inputs |
|------|-------------|-----------------|
| `krate_list_resources` | List resources of a given kind | `kind` |
| `krate_get_resource` | Get single resource | `kind`, `name` |
| `krate_apply_resource` | Create or update resource | `resource` (object) |
| `krate_delete_resource` | Delete a resource | `kind`, `name` |
| `krate_snapshot` | Full org runtime snapshot | (none) |
| `krate_search` | Search resources by query | `query` |
| `krate_list_stacks` | List agent stacks | (none) |
| `krate_create_stack` | Create AgentStack | `name`, `org` |
| `krate_dispatch_agent` | Dispatch an agent run | `stackRef` |
| `krate_list_secrets` | List AgentSecretGrant resources | `org` (optional) |
| `krate_create_secret` | Create AgentSecretGrant | `name`, `org`, `agentRef`, `secretRef` |
| `krate_sync_external` | Trigger external sync | `bindingName`, `kind`, `localName` |
| `krate_resolve_conflict` | Resolve sync conflict | `conflictName`, `strategy` |
| `krate_audit_query` | Query audit events | (all optional: org, action, since, until, limit, offset) |

### 8.2 Prompts (3)

| Prompt | Description |
|--------|-------------|
| `krate_workspace_setup` | Guide for setting up a new krate workspace |
| `krate_stack_config` | Help configuring an agent stack |
| `krate_troubleshoot` | Diagnose common krate issues |

### 8.3 Resources (2)

| URI | Name | MIME Type |
|-----|------|-----------|
| `krate://snapshot` | Workspace Snapshot | application/json |
| `krate://stacks` | Agent Stacks | application/json |

---

## 9. CLI Commands

Source: `packages/krate/cli/src/index.js`, `packages/krate/core/CLAUDE.md`

| Command | Description | Key Options |
|---------|-------------|-------------|
| `krate serve` | Start HTTP API server | `--port 3080` |
| `krate mcp` | Start MCP server over stdio | — |
| `krate status` | Show workspace status | `--org`, `--json` |
| `krate stacks` | List agent stacks | `--org`, `--json` |
| `krate dispatch` | Dispatch an agent run | `--stack`, `--repo`, `--ref` |
| `krate apply` | Apply resource from file | `--file`, `--org` |
| `krate get` | Get resource by kind/name | `kind`, `name`, `--org` |
| `krate list` | List resources by kind | `kind`, `--org`, `--json` |
| `krate delete` | Delete resource | `kind`, `name`, `--org` |
| `krate version` | Show CLI version | — |
