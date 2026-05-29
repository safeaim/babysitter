// ---------------------------------------------------------------------------
// Barrel index — organized re-exports from the flat component directory.
// Files are NOT moved; this provides a grouped import surface.
// ---------------------------------------------------------------------------

// ── Agents ──────────────────────────────────────────────────────────────────
export { SessionShell } from './session-shell.jsx';
export { SessionCost } from './session-cost.jsx';
export { SessionDetailTabs } from './session-tabs.jsx';
export { DispatchButton } from './dispatch-button.jsx';
export { ManualDispatchButton, RunActions } from './run-actions.jsx';
export { StackBuilder } from './stack-builder.jsx';
export { GraphStackBuilder } from './stack-builder-graph.jsx';
export { StackActions } from './stack-actions.jsx';
export { StackEditForm } from './stack-edit-form.jsx';
export { TriggerRuleForm } from './trigger-rule-form.jsx';
export { EnableDisableToggle, DeleteRuleButton } from './rule-actions.jsx';
export { ApprovalDecisionButtons } from './approval-actions.jsx';
export { ApprovalModeToggle } from './approval-mode-toggle.jsx';
export { LiveUpdates } from './live-updates.jsx';
export { AgentSettingsForm } from './agent-settings-form.jsx';

// ── Workspaces ──────────────────────────────────────────────────────────────
export { WorkspacePanel } from './workspace-panel.jsx';
export { AssociationsSection } from './workspace-associations.jsx';
export { CodespaceSection } from './workspace-codespace.jsx';
export { RunHistorySection } from './workspace-run-history.jsx';

// ── Memory ──────────────────────────────────────────────────────────────────
export { MemorySearchForm } from './memory-search-form.jsx';
export { MemoryOntologyEditor } from './memory-ontology-editor.jsx';
export { MemoryImportReview } from './memory-import-review.jsx';

// ── Issues & Kanban ─────────────────────────────────────────────────────────
export { IssueCreateForm, IssueEditor } from './issue-editor.jsx';
export { IssueList } from './issue-list.jsx';
export { EnhancedKanbanBoard } from './kanban-enhanced.jsx';
export { InteractiveKanbanBoard } from './kanban-interactive.jsx';
export { KanbanCard } from './kanban-card.jsx';
export { KanbanColumn } from './kanban-column.jsx';
export { KanbanFilters } from './kanban-filters.jsx';

// ── Repositories ────────────────────────────────────────────────────────────
export { RepoCodeBrowser } from './repo-code-browser.jsx';
export { RepoRuns } from './repo-runs.jsx';
export { PullRequestList } from './pull-request-list.jsx';
export { CodeEditor, LiveWatchPanel } from './code-editor.jsx';

// ── Inference / ML ──────────────────────────────────────────────────────────
export { InferenceServiceManager } from './inference-service-manager.jsx';
export { ServiceCard, CreateServiceForm, ServiceDetailPanel } from './inference-service-list.jsx';
export { RuntimeCard, CreateRuntimeForm } from './inference-runtime-list.jsx';
export { InferencePlayground } from './inference-playground.jsx';
export { UnifiedModelCatalogSection, CuratedModelCatalog } from './curated-model-catalog.jsx';
export { RouteTypeBadge, ProviderBadge, CatalogStatusPill, ModelRouteCard, CreateModelRouteForm } from './model-route-manager.jsx';
export { VirtualModelCard, CollapsibleSection, CreateVirtualModelForm } from './virtual-model-manager.jsx';
export {
  relativeTime, FORMAT_COLORS, DEFAULT_PAYLOADS, getDefaultPayload, getServiceStatus, statusColor,
  cardStyle, btnStyle, btnOutlineStyle, inputStyle, labelStyle, badgeStyle, overlayStyle, panelStyle,
  FrameworkBadge, StatusBadge, CopyButton,
  ROUTE_TYPE_COLORS, PROVIDER_COLORS, CATEGORY_COLORS, FALLBACK_PROVIDERS,
} from './inference-helpers.jsx';

// ── Resources & CRUD ────────────────────────────────────────────────────────
export { RepositoryManager, DeploymentManager, ResourceApplyPanel, UserManagementPanel } from './resource-actions.jsx';
export { ResourceActions, InlineCreateForm } from './resource-crud-actions.jsx';
export { Pagination } from './pagination.jsx';

// ── External Providers ──────────────────────────────────────────────────────
export { ExternalProviderList } from './external-provider-list.jsx';
export { ExternalProviderWizard } from './external-provider-wizard.jsx';
export { ExternalSyncDashboard } from './external-sync-dashboard.jsx';
export { ExternalConflictResolver } from './external-conflict-resolver.jsx';

// ── Deployments & CI ────────────────────────────────────────────────────────
export { DeploymentPipeline } from './deployment-pipeline.jsx';
export { RunnerPoolManager } from './runner-pool-manager.jsx';
export { WebhookManager } from './webhook-manager.jsx';

// ── Settings ────────────────────────────────────────────────────────────────
export { GatewaySection } from './settings-gateway.jsx';
export { ProvidersSection } from './settings-providers.jsx';
export { AdaptersSection } from './settings-adapters.jsx';
export { RbacSection } from './settings-rbac.jsx';
export { SecretManager } from './secret-manager.jsx';
export { AppSettingsForm } from './app-settings.jsx';
export { UserProfileForm } from './user-profile.jsx';

// ── Observability ───────────────────────────────────────────────────────────
export { ActivityFeed } from './activity-feed.jsx';
export { HealthMonitor } from './health-monitor.jsx';
export { ToolCallInspector, ToolCallList } from './tool-inspector.jsx';
export { ApiExplorer } from './api-explorer.jsx';

// ── Assistant ───────────────────────────────────────────────────────────────
export { AssistantChat } from './assistant-chat.jsx';
export { AssistantGenerate } from './assistant-generate.jsx';
export { AssistantTabs } from './assistant-tabs.jsx';

// ── Artifacts ───────────────────────────────────────────────────────────────
export { ArtifactRegistryManager } from './artifact-registry.jsx';

// ── Shell / Chrome ──────────────────────────────────────────────────────────
export { KrateLoadingView, KrateControllerRecovery, KRATE_LOADING_MESSAGES } from './krate-loading.jsx';
export { ThemeRuntime, readStoredTheme, resolveKrateTheme, applyTheme, storeTheme, THEME_STORAGE_KEY, THEME_CHANGED_EVENT } from './theme-runtime.jsx';
export { MobileNavToggle } from './mobile-nav-toggle.jsx';
export { NotificationBell } from './notification-bell.jsx';
export { KeyboardShortcuts } from './keyboard-shortcuts.jsx';
export { CommandPalette, CommandPaletteWrapper } from './command-palette.jsx';
export { GlobalSearch } from './global-search.jsx';
export { ConfirmDialog } from './confirm-dialog.jsx';
