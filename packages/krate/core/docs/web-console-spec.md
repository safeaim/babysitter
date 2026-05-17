# Krate Web Console Specification

> Derived from implementation. Source: `packages/krate/web/`

## 1. Page Inventory

Framework: Next.js 16 + React 19 (App Router)
Base path: `packages/krate/web/app/`

### Top-Level Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `page.jsx` | Landing/home page |
| `/login` | `login/page.jsx` | Authentication login |
| `/logout` | `logout/page.jsx` | Session logout |
| `/orgs` | `orgs/page.jsx` | Organization list |
| `/people` | `people/page.jsx` | People directory |

### Organization Dashboard

| Route | File | Purpose |
|-------|------|---------|
| `/orgs/[org]` | `orgs/[org]/page.jsx` | Org dashboard overview |
| `/orgs/[org]/profile` | `orgs/[org]/profile/page.jsx` | User profile |
| `/orgs/[org]/people` | `orgs/[org]/people/page.jsx` | Org members |
| `/orgs/[org]/inbox` | `orgs/[org]/inbox/page.jsx` | Notification inbox |
| `/orgs/[org]/insights` | `orgs/[org]/insights/page.jsx` | Analytics and insights |

### Ship (Repositories & Code)

| Route | File | Purpose |
|-------|------|---------|
| `/orgs/[org]/repositories` | `orgs/[org]/repositories/page.jsx` | Repository list |
| `/orgs/[org]/repositories/[repo]/code` | `repositories/[repo]/code/page.jsx` | Code browser |
| `/orgs/[org]/repositories/[repo]/pull-requests` | `repositories/[repo]/pull-requests/page.jsx` | PR list |
| `/orgs/[org]/repositories/[repo]/issues` | `repositories/[repo]/issues/page.jsx` | Issue list |
| `/orgs/[org]/repositories/[repo]/issues/[issue]` | `repositories/[repo]/issues/[issue]/page.jsx` | Issue detail |
| `/orgs/[org]/repositories/[repo]/hooks` | `repositories/[repo]/hooks/page.jsx` | Webhook config |
| `/orgs/[org]/repositories/[repo]/runs` | `repositories/[repo]/runs/page.jsx` | Repo agent runs |
| `/orgs/[org]/repositories/[repo]/settings` | `repositories/[repo]/settings/page.jsx` | Repo settings |
| `/orgs/[org]/runs` | `orgs/[org]/runs/page.jsx` | All runs overview |

### Manage (Access & Policy)

| Route | File | Purpose |
|-------|------|---------|
| `/orgs/[org]/access/permissions` | `access/permissions/page.jsx` | Permission management |
| `/orgs/[org]/access/ssh-keys` | `access/ssh-keys/page.jsx` | SSH key management |
| `/orgs/[org]/access/branch-protection` | `access/branch-protection/page.jsx` | Branch rules |
| `/orgs/[org]/settings` | `orgs/[org]/settings/page.jsx` | Org settings |
| `/orgs/[org]/settings/secrets` | `settings/secrets/page.jsx` | Secret management |
| `/orgs/[org]/hooks-events` | `orgs/[org]/hooks-events/page.jsx` | Webhook events |
| `/orgs/[org]/deployments` | `orgs/[org]/deployments/page.jsx` | Deployments |
| `/orgs/[org]/runners-ci` | `orgs/[org]/runners-ci/page.jsx` | Runner pools & CI |

### Agents

| Route | File | Purpose |
|-------|------|---------|
| `/orgs/[org]/agents` | `agents/page.jsx` | Agent overview |
| `/orgs/[org]/agents/stacks` | `agents/stacks/page.jsx` | Stack list |
| `/orgs/[org]/agents/stacks/new` | `agents/stacks/new/page.jsx` | Create stack |
| `/orgs/[org]/agents/stacks/[name]` | `agents/stacks/[name]/page.jsx` | Stack detail |
| `/orgs/[org]/agents/runs` | `agents/runs/page.jsx` | Dispatch run list |
| `/orgs/[org]/agents/runs/[runId]` | `agents/runs/[runId]/page.jsx` | Run detail |
| `/orgs/[org]/agents/sessions` | `agents/sessions/page.jsx` | Session list |
| `/orgs/[org]/agents/sessions/[sessionId]` | `agents/sessions/[sessionId]/page.jsx` | Session detail |
| `/orgs/[org]/agents/rules` | `agents/rules/page.jsx` | Trigger rule list |
| `/orgs/[org]/agents/rules/new` | `agents/rules/new/page.jsx` | Create trigger rule |
| `/orgs/[org]/agents/rules/[ruleName]` | `agents/rules/[ruleName]/page.jsx` | Rule detail |
| `/orgs/[org]/agents/approvals` | `agents/approvals/page.jsx` | Approval queue |
| `/orgs/[org]/agents/workspaces` | `agents/workspaces/page.jsx` | Workspace list |
| `/orgs/[org]/agents/workspaces/[workspaceId]` | `agents/workspaces/[workspaceId]/page.jsx` | Workspace detail |
| `/orgs/[org]/agents/settings` | `agents/settings/page.jsx` | Agent settings |
| `/orgs/[org]/agents/projects` | `agents/projects/page.jsx` | Project list |
| `/orgs/[org]/agents/projects/[projectId]` | `agents/projects/[projectId]/page.jsx` | Project detail |
| `/orgs/[org]/agents/projects/[projectId]/issues` | `projects/[projectId]/issues/page.jsx` | Project issues |
| `/orgs/[org]/agents/projects/[projectId]/issues/[issue]` | `projects/[projectId]/issues/[issue]/page.jsx` | Project issue detail |
| `/orgs/[org]/agents/memory` | `agents/memory/page.jsx` | Memory overview |
| `/orgs/[org]/agents/memory/search` | `agents/memory/search/page.jsx` | Memory search |
| `/orgs/[org]/agents/memory/ontology` | `agents/memory/ontology/page.jsx` | Ontology editor |
| `/orgs/[org]/agents/memory/imports` | `agents/memory/imports/page.jsx` | Import list |
| `/orgs/[org]/agents/memory/imports/[importId]` | `agents/memory/imports/[importId]/page.jsx` | Import detail |

### External

| Route | File | Purpose |
|-------|------|---------|
| `/orgs/[org]/external` | `orgs/[org]/external/page.jsx` | External overview |
| `/orgs/[org]/external/providers/new` | `external/providers/new/page.jsx` | Add provider |
| `/orgs/[org]/external/sync` | `external/sync/page.jsx` | Sync dashboard |
| `/orgs/[org]/external/conflicts` | `external/conflicts/page.jsx` | Conflict list |

### Observe & Tools

| Route | File | Purpose |
|-------|------|---------|
| `/orgs/[org]/api-docs` | `orgs/[org]/api-docs/page.jsx` | API documentation |
| `/orgs/[org]/controller-api` | `orgs/[org]/controller-api/page.jsx` | Controller API explorer |
| `/orgs/[org]/advanced-plans` | `orgs/[org]/advanced-plans/page.jsx` | Advanced plans |
| `/orgs/[org]/operations-install` | `orgs/[org]/operations-install/page.jsx` | Operations install guide |

**Total: 57 pages**

---

## 2. Component Library

Source: `packages/krate/web/app/components/`

| Component | File | Purpose |
|-----------|------|---------|
| ActivityFeed | `activity-feed.jsx` | Real-time activity stream with time-grouped entries |
| AgentSettingsForm | `agent-settings-form.jsx` | Agent configuration form (adapters, providers, gateway) |
| ApiExplorer | `api-explorer.jsx` | Interactive API testing interface |
| AppSettings | `app-settings.jsx` | Application-level settings panel |
| ApprovalActions | `approval-actions.jsx` | Approve/deny action buttons for agent gates |
| ApprovalModeToggle | `approval-mode-toggle.jsx` | Toggle between approval modes |
| CodeEditor | `code-editor.jsx` | Syntax-highlighted code editor |
| CommandPalette | `command-palette.jsx` | Global command palette (Cmd+K) with search |
| DeploymentPipeline | `deployment-pipeline.jsx` | Visual pipeline progress display |
| DispatchButton | `dispatch-button.jsx` | One-click agent dispatch trigger |
| ExternalConflictResolver | `external-conflict-resolver.jsx` | Side-by-side conflict resolution UI |
| ExternalProviderList | `external-provider-list.jsx` | Provider listing with status indicators |
| ExternalProviderWizard | `external-provider-wizard.jsx` | Multi-step provider setup wizard |
| ExternalSyncDashboard | `external-sync-dashboard.jsx` | Sync status overview with metrics |
| GlobalSearch | `global-search.jsx` | Full-text search across all resources |
| HealthMonitor | `health-monitor.jsx` | System health indicators and status |
| IssueEditor | `issue-editor.jsx` | Rich issue create/edit form |
| IssueList | `issue-list.jsx` | Filterable issue list view |
| KanbanCard | `kanban-card.jsx` | Draggable card for kanban board |
| KanbanColumn | `kanban-column.jsx` | Drop target column for kanban |
| KanbanEnhanced | `kanban-enhanced.jsx` | Full kanban board with drag-drop |
| KanbanFilters | `kanban-filters.jsx` | Filter bar for kanban views |
| KanbanInteractive | `kanban-interactive.jsx` | Interactive kanban with real-time updates |
| KeyboardShortcuts | `keyboard-shortcuts.jsx` | Keyboard shortcut overlay/help |
| KrateLoading | `krate-loading.jsx` | Branded loading spinner |
| LiveUpdates | `live-updates.jsx` | SSE-powered live data refresh |
| MemoryImportReview | `memory-import-review.jsx` | Review and approve memory imports |
| MemoryOntologyEditor | `memory-ontology-editor.jsx` | Visual ontology editor |
| MemorySearchForm | `memory-search-form.jsx` | Graph/grep query builder |
| NotificationBell | `notification-bell.jsx` | Bell icon with unread count badge |
| PullRequestList | `pull-request-list.jsx` | PR list with status indicators |
| RepoCodeBrowser | `repo-code-browser.jsx` | File tree + content viewer |
| RepoRuns | `repo-runs.jsx` | Repository-scoped run list |
| ResourceActions | `resource-actions.jsx` | Edit/delete/view action menu |
| ResourceCrudActions | `resource-crud-actions.jsx` | Full CRUD operation buttons |
| RuleActions | `rule-actions.jsx` | Trigger rule action buttons |
| RunActions | `run-actions.jsx` | Dispatch run action buttons |
| RunnerPoolManager | `runner-pool-manager.jsx` | Pool sizing and configuration |
| SecretManager | `secret-manager.jsx` | Secret CRUD with masked values |
| SessionCost | `session-cost.jsx` | Token/cost display for sessions |
| SessionShell | `session-shell.jsx` | Terminal-style session viewer |
| SessionTabs | `session-tabs.jsx` | Tabbed session detail view |
| SettingsAdapters | `settings-adapters.jsx` | Adapter configuration panel |
| SettingsGateway | `settings-gateway.jsx` | Gateway configuration panel |
| SettingsProviders | `settings-providers.jsx` | Provider configuration panel |
| StackActions | `stack-actions.jsx` | Stack management action buttons |
| StackBuilder | `stack-builder.jsx` | Visual agent stack builder |
| StackBuilderGraph | `stack-builder-graph.jsx` | Graph visualization for stack composition |
| ThemeRuntime | `theme-runtime.jsx` | Dark/light theme toggle and persistence |
| ToolInspector | `tool-inspector.jsx` | MCP tool inspection panel |
| TriggerRuleForm | `trigger-rule-form.jsx` | Trigger rule creation/edit form |
| UserProfile | `user-profile.jsx` | User profile display and edit |
| WebhookManager | `webhook-manager.jsx` | Webhook subscription management |
| WorkspaceAssociations | `workspace-associations.jsx` | Work item link management |
| WorkspaceCodespace | `workspace-codespace.jsx` | Live codespace interface |
| WorkspacePanel | `workspace-panel.jsx` | Workspace overview panel |
| WorkspaceRunHistory | `workspace-run-history.jsx` | Historical runs for workspace |

**Total: 56 components**

---

## 3. Navigation Architecture

### Navigation Groups

| Group | Icon | Pages |
|-------|------|-------|
| **Ship** | Code | Repositories, Pull Requests, Issues, Code |
| **Manage** | Settings | Permissions, SSH Keys, Branch Protection, Settings, Deployments, Runners |
| **Agents** | Bot | Stacks, Runs, Sessions, Rules, Approvals, Workspaces, Projects, Memory |
| **Observe** | Eye | Hooks & Events, Insights, Inbox, Health |
| **External** | Link | Providers, Sync, Conflicts |

### Command Palette (Cmd+K)

Source: `command-palette.jsx`

- Global keyboard shortcut: `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux)
- Full-text search across all resources
- Quick navigation to any page
- Recent items history

### Keyboard Shortcuts

Source: `keyboard-shortcuts.jsx`

- Navigation shortcuts for major sections
- Action shortcuts (new, edit, delete)
- Modal shortcuts (close, confirm)
- `?` to show shortcut overlay

---

## 4. UI Patterns

### PageFrame Layout

Standard page layout with:
- Sidebar navigation (collapsible)
- Header with org selector, search, notification bell
- Main content area
- Breadcrumb navigation

### EmptyState

Used when a resource list has no items:
- Illustration/icon
- Title and description
- Primary CTA button (e.g., "Create Stack")
- Secondary action link

### StatusPill

Tone-based status indicators:

| Tone | Color | Used For |
|------|-------|----------|
| success | Green | Running, Healthy, Approved |
| warning | Amber | Pending, Degraded |
| error | Red | Failed, Denied, Conflict |
| info | Blue | In Progress, Syncing |
| neutral | Gray | Unknown, Inactive |

### InlineCreateForm

Quick resource creation without navigating away:
- Collapsible form below list header
- Minimal required fields
- Auto-focus on first field
- Cancel/Create buttons

### ResourceActions

Contextual action menu per resource:
- View (navigate to detail)
- Edit (inline or modal)
- Delete (with confirmation dialog)
- Custom actions per resource kind

---

## 5. Data Flow

### Fetch Pipeline

```
Page Component
    → loadKrateUi() / fetchControllerUiModel()
        → HTTP GET /api/controller?org=<org>
            → createControllerUiModel(snapshot, { organization })
                → Stale-while-revalidate cache (30s)
    → Render with data
```

Source: `packages/krate/core/src/controller-client.js`, `controller-ui.js`

### Controller UI Model

`createControllerUiModel(snapshot, options)` produces:
- `orgs` — Organization list
- `repositories` — Repository list with stats
- `pullRequests` — Open PRs with review status
- `pipelines` — Recent pipeline runs
- `agents` — Stacks, runs, sessions
- `memory` — Memory repositories and queries

### API Proxy Routes

Source: `packages/krate/web/app/api/`

| Route | Target |
|-------|--------|
| `/api/orgs` | Krate API `/api/orgs` |
| `/api/orgs/[org]/repositories` | Resource CRUD |
| `/api/auth/[provider]` | OAuth redirect |
| `/api/auth/callback/[provider]` | OAuth callback |
| `/api/auth/logout` | Session destruction |
| `/api/auth/delegated` | Delegated identity |
| `/api/atlas/search` | Atlas graph search |
| `/api/git-proxy` | Gitea tree/blob proxy |
| `/api/watch/[...resource]` | SSE watch endpoint |

---

## 6. Dark Mode

Source: `theme-runtime.jsx`

### Implementation

- CSS custom properties (variables) for all colors
- Two theme sets: `light` and `dark`
- Applied via `data-theme` attribute on `<html>`

### Persistence

- User preference stored in `localStorage` key `krate-theme`
- Initial value: system preference via `prefers-color-scheme` media query
- Toggle available in header/settings

### System Preference Detection

```javascript
window.matchMedia('(prefers-color-scheme: dark)').matches
```

Listens for changes and auto-updates when no explicit preference set.

---

## 7. Authentication Flow

### Login Flow

```
User → /login page
    → Select provider (GitHub / SSO)
    → Redirect to /api/auth/[provider]
    → OAuth authorization URL
    → Provider callback → /api/auth/callback/[provider]
    → Exchange code for profile
    → Create session cookie (HMAC-signed)
    → Redirect to /orgs/[org]
```

### Session Validation

- Cookie `krate_session` parsed on each request
- HMAC signature verified with `KRATE_SESSION_SECRET`
- Invalid/expired sessions redirect to `/login`

### Protected Routes

All mutating operations check session validity. Read operations are generally unprotected for API simplicity (auth enforced at Krate API level).

### Logout

```
User → /logout
    → /api/auth/logout
    → Clear cookie (Max-Age=0)
    → Redirect to /login
```

---

## 8. Real-time Updates

### SSE LiveUpdates Component

Source: `live-updates.jsx`

- Connects to `/api/orgs/:org/agents/events/stream`
- Receives JSON events via Server-Sent Events
- Auto-reconnects on disconnection
- Processes event types: `connected`, `heartbeat`, `resource-change`

### Notification Bell

Source: `notification-bell.jsx`

- Badge showing unread notification count
- Dropdown panel with recent notifications
- Mark as read on click
- Links to relevant resource pages

### Activity Feed

Source: `activity-feed.jsx`

- Time-grouped activity entries
- Resource change events (create, update, delete)
- Agent dispatch and completion events
- Filterable by resource kind

### Health Monitor

Source: `health-monitor.jsx`

- System component status indicators
- MCP server health checks
- Kubernetes connection status
- SSE connection health

---

## 9. Form Patterns

### Validation

- Required field indicators (asterisk)
- Format validation (email, URL, name patterns)
- Custom validators per resource kind
- Cross-field validation (e.g., date ranges)

### Error Display

- Inline field errors below inputs
- Toast notifications for operation failures
- Error boundary component for unhandled errors (`error.jsx`)

### Success Feedback

- Auto-dismiss success toast (3-5 seconds)
- Optimistic updates on create/edit
- Resource list auto-refresh after mutation

### Loading States

- `KrateLoading` spinner component
- Skeleton loading for lists
- Disabled buttons during submission
- Progress indicators for long operations

### Multi-Step Forms

- Stack builder (`stack-builder.jsx`) — multi-step agent configuration
- Provider wizard (`external-provider-wizard.jsx`) — guided provider setup
- Trigger rule form (`trigger-rule-form.jsx`) — conditional rule builder
