import { createKrateApiController } from '../../../../../../../core/src/api-controller.js';
import { orgNamespaceName } from '../../../../../../../core/src/kubernetes-controller.js';

export const dynamic = 'force-dynamic';


export async function GET(_request, { params }) {
  const { org, name } = await params;
  const controller = createKrateApiController({ namespace: orgNamespaceName(org) });
  return Response.json(await controller.getResource('Repository', name), { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_request, { params }) {
  const { org, name } = await params;
  const controller = createKrateApiController({ namespace: orgNamespaceName(org) });
  return Response.json(await controller.deleteResource('Repository', name), { headers: { 'Cache-Control': 'no-store' } });
}
