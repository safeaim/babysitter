import { createKrateApiController } from '../../../../../../../../core/src/api-controller.js';
import { orgNamespaceName } from '../../../../../../../../core/src/kubernetes-controller.js';

export const dynamic = 'force-dynamic';


export async function GET(_request, { params }) {
  const { org, kind, name } = await params;
  const controller = createKrateApiController({ namespace: orgNamespaceName(org) });
  return Response.json(await controller.getResource(kind, name), { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_request, { params }) {
  const { org, kind, name } = await params;
  const controller = createKrateApiController({ namespace: orgNamespaceName(org) });
  return Response.json(await controller.deleteResource(kind, name), { headers: { 'Cache-Control': 'no-store' } });
}
