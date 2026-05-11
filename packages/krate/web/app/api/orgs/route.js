import { createControllerUiModel } from '../../../../core/src/controller-ui.js';
import { createKrateApiController } from '../../../../core/src/api-controller.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const controller = createKrateApiController();
  const model = createControllerUiModel(await controller.snapshot());
  return Response.json({ organizations: model.orgs }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  const controller = createKrateApiController();
  const input = await request.json();
  return Response.json(await controller.createOrganization(input), { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
