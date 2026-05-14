// API Controller
export { createKrateApiController, KRATE_API_CONTROLLER_BOUNDARY } from '../../core/src/api-controller.js';

// Controller Client (browser/server data fetching)
export { fetchControllerUiModel } from '../../core/src/controller-client.js';
export { clearSnapshotCache } from '../../core/src/snapshot-cache.js';

// Controller UI Model
export { createControllerUiModel } from '../../core/src/controller-ui.js';

// Authentication
export {
  createAuthProviderConfig,
  listEnabledAuthProviders,
  buildAuthorizationRedirect,
  exchangeOAuthCodeForProfile,
  parseSessionCookie,
  createSessionCookie,
  registerLoginProfile,
  mapLoginProfileToKrateIdentity,
  profileFromDelegatedHeaders,
  createInviteResource,
  createTeamResource
} from '../../core/src/auth.js';

// Identity Policy
export { mapOidcIdentity } from '../../core/src/identity-policy.js';

// Resource Model
export {
  createResource,
  CONFIG_KINDS,
  AGGREGATED_KINDS,
  clone,
  resourceToYaml
} from '../../core/src/resource-model.js';

// Resource Definition Lookup (from kubernetes-controller)
export { findResourceDefinition } from '../../core/src/kubernetes-controller.js';

// Org Scoping
export { orgNamespaceName, normalizeOrgSlug } from '../../core/src/org-scoping.js';

// Atlas Graph Client
export {
  fetchAtlasRecordsByKinds,
  searchAtlasGraph,
  STACK_LAYERS,
  COMPOSITION_FACETS,
  ALL_LAYER_DEFS
} from './atlas-graph-client.js';

// External Controllers
export { createSyncController } from '../../core/src/external/sync-controller.js';
export { createWebhookController } from '../../core/src/external/webhook-controller.js';
export { createWriteController } from '../../core/src/external/write-controller.js';
export { createConflictController } from '../../core/src/external/conflict-controller.js';

// External Provider Registry & Factory
export {
  createDefaultProviderRegistry,
  createExternalBackendProvider
} from '../../core/src/external/provider-resource-factory.js';

// Event Bus
export { createEventBus, globalEventBus } from '../../core/src/event-bus.js';
