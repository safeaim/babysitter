import { createKrateApiController, orgNamespaceName } from '@a5c-ai/krate-sdk';

export const dynamic = 'force-dynamic';


export async function GET(_request, { params }) {
  const { org } = await params;
  const controller = createKrateApiController({ namespace: orgNamespaceName(org) });
  return Response.json(await controller.listResource('Repository'), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request, { params }) {
  const { org } = await params;
  const controller = createKrateApiController({ namespace: orgNamespaceName(org) });
  const input = await request.json();
  return Response.json(await controller.createRepository({ ...input, organizationRef: org }), { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
