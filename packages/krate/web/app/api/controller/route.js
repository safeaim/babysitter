import { createControllerUiModel } from '../../../../core/src/controller-ui.js';
import { createKrateApiController } from '../../../../core/src/api-controller.js';

export const dynamic = 'force-dynamic';

const controller = createKrateApiController();

export async function GET(request) {
  const organization = new URL(request.url).searchParams.get('org');
  return Response.json(createControllerUiModel(await controller.snapshot(), { organization }), {
    headers: { 'Cache-Control': 'no-store' }
  });
}
