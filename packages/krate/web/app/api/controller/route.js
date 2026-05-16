import { createControllerUiModel } from '@a5c-ai/krate-sdk';

export const dynamic = 'force-dynamic';

const CONTROLLER_TIMEOUT_MS = Number(process.env.KRATE_CONTROLLER_REQUEST_TIMEOUT_MS || 5_000);

export async function GET(request) {
  const organization = new URL(request.url).searchParams.get('org');
  const controllerUrl = process.env.KRATE_CONTROLLER_URL;
  if (!controllerUrl) {
    return Response.json(degradedControllerModel('KRATE_CONTROLLER_URL is not configured', organization), {
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  const target = new URL('/api/controller', controllerUrl);
  if (organization) target.searchParams.set('org', organization);

  try {
    const response = await fetch(target, {
      cache: 'no-store',
      signal: AbortSignal.timeout(CONTROLLER_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`controller API ${response.status}`);
    return Response.json(await response.json(), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return Response.json(degradedControllerModel(error.message, organization), {
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}

function degradedControllerModel(message, organization) {
  return createControllerUiModel({
    source: 'controller-api',
    namespace: process.env.KRATE_NAMESPACE || 'krate-system',
    kubectl: { available: false, context: null, errors: [message] },
    resources: {},
    crds: [],
    events: [],
    permissions: [],
    storage: {},
    commands: []
  }, { organization });
}
