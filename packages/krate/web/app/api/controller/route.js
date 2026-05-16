import { fetchControllerUiModel } from '@a5c-ai/krate-sdk';

export const dynamic = 'force-dynamic';

const CONTROLLER_TIMEOUT_MS = Number(process.env.KRATE_CONTROLLER_REQUEST_TIMEOUT_MS || 5_000);

export async function GET(request) {
  const organization = new URL(request.url).searchParams.get('org');
  const model = await fetchControllerUiModel({
    controllerUrl: process.env.KRATE_CONTROLLER_URL,
    organization,
    requestTimeoutMs: CONTROLLER_TIMEOUT_MS,
    useCache: false
  });
  return Response.json(model, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
