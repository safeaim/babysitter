import { createControllerUiModel } from './controller-ui.js';
import { createKrateApiController } from './api-controller.js';
import { createKubernetesResourceGateway } from './kubernetes-resource-gateway.js';

export async function fetchControllerUiModel({ controllerUrl = process.env.KRATE_CONTROLLER_URL, fetchImpl = globalThis.fetch, controller = createKrateApiController({ resourceGateway: createKubernetesResourceGateway() }), organization = process.env.KRATE_ORG || null } = {}) {
  if (controllerUrl) {
    try {
      const target = new URL('/api/controller', controllerUrl);
      if (organization) target.searchParams.set('org', organization);
      const response = await fetchImpl(target, { cache: 'no-store' });
      if (!response.ok) throw new Error(`controller API ${response.status}`);
      return response.json();
    } catch (error) {
      return fallbackControllerModel(controller, error, organization);
    }
  }
  return fallbackControllerModel(controller, null, organization);
}

async function fallbackControllerModel(controller, connectionError = null, organization = null) {
  try {
    const model = createControllerUiModel(await controller.snapshot(), { organization });
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
