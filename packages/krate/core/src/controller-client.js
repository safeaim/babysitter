import { createControllerUiModel } from './controller-ui.js';
import { createKrateApiController } from './api-controller.js';
import { createKubernetesResourceGateway } from './kubernetes-resource-gateway.js';
import { clearSnapshotCache, staleWhileRevalidate } from './snapshot-cache.js';
import { getControllerSnapshotAsync } from './kubernetes-controller-async.js';

export { clearSnapshotCache };

const CONTROLLER_REQUEST_TIMEOUT_MS = Number(process.env.KRATE_CONTROLLER_REQUEST_TIMEOUT_MS || 5_000);

export async function fetchControllerUiModel({ controllerUrl = process.env.KRATE_CONTROLLER_URL, fetchImpl = globalThis.fetch, controller = createKrateApiController({ resourceGateway: createKubernetesResourceGateway() }), organization = process.env.KRATE_ORG || null, localFallback = true, requestTimeoutMs = CONTROLLER_REQUEST_TIMEOUT_MS, useCache = true, swrOptions = {} } = {}) {
  const revalidateFn = async () => {
    if (controllerUrl) {
      try {
        const target = new URL('/api/controller', controllerUrl);
        if (organization) target.searchParams.set('org', organization);
        const signal = requestTimeoutMs > 0 && globalThis.AbortSignal?.timeout ? AbortSignal.timeout(requestTimeoutMs) : undefined;
        const response = await fetchImpl(target, { cache: 'no-store', ...(signal ? { signal } : {}) });
        if (!response.ok) throw new Error(`controller API ${response.status}`);
        const remoteModel = await response.json();
        if (localFallback && shouldFallbackFromRemoteModel(remoteModel)) {
          return fallbackControllerModel(controller, new Error(remoteControllerError(remoteModel) || 'controller returned degraded empty data'), organization);
        }
        return remoteModel;
      } catch (error) {
        if (localFallback) return fallbackControllerModel(controller, error, organization);
        return unavailableControllerModel(error.message, organization);
      }
    }
    if (!localFallback) return unavailableControllerModel('KRATE_CONTROLLER_URL is not configured', organization);
    return fallbackControllerModel(controller, null, organization);
  };

  if (!useCache) return revalidateFn();
  return staleWhileRevalidate(organization, revalidateFn, swrOptions);
}

async function fallbackControllerModel(controller, connectionError = null, organization = null) {
  try {
    const snapshot = await controller.snapshot().catch(() => getControllerSnapshotAsync());
    const model = createControllerUiModel(snapshot, { organization });
    if (connectionError) model.controller.connection.errors = [connectionError.message, ...(model.controller.connection.errors || [])];
    return model;
  } catch (error) {
    return createControllerUiModel({
      source: 'kubernetes',
      namespace: process.env.KRATE_NAMESPACE || 'krate-system',
      kubectl: { available: false, context: null, errors: [connectionError?.message, error.message].filter(Boolean) },
      resources: {},
      crds: [],
      events: [],
      permissions: [],
      storage: {},
      commands: []
    }, { organization });
  }
}

function shouldFallbackFromRemoteModel(model) {
  if (!model || model.status !== 'degraded') return false;
  const hasLiveConnection = Boolean(model.controller?.connection?.available || model.controller?.apiService);
  if (hasLiveConnection) return false;
  const resourceCount = Number(model.metrics?.resources || 0);
  const hasResourceItems = Array.isArray(model.resources) && model.resources.some((resource) => Number(resource?.count || 0) > 0 || resource?.items?.length);
  const hasDashboardItems = Number(model.views?.dashboard?.repositories?.length || 0) > 0;
  const errors = model.controller?.connection?.errors || [];
  return resourceCount === 0 && !hasResourceItems && !hasDashboardItems && errors.length > 0;
}

function remoteControllerError(model) {
  return (model?.controller?.connection?.errors || []).filter(Boolean).join('; ');
}

function unavailableControllerModel(messages, organization = null) {
  const errors = Array.isArray(messages) ? messages : [messages];
  return createControllerUiModel({
    source: 'kubernetes',
    namespace: process.env.KRATE_NAMESPACE || 'krate-system',
    kubectl: { available: false, context: null, errors: errors.filter(Boolean) },
    resources: {},
    crds: [],
    events: [],
    permissions: [],
    storage: {},
    commands: []
  }, { organization });
}
