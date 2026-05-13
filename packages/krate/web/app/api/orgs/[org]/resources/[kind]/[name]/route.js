import { createKrateApiController, orgNamespaceName } from '@a5c-ai/krate-sdk';

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
