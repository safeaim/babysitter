import { createKrateApiController } from '../../../../../../core/src/api-controller.js';
import { orgNamespaceName } from '../../../../../../core/src/kubernetes-controller.js';

export const dynamic = 'force-dynamic';


export async function GET(request, { params }) {
  const { org } = await params;
  const namespace = orgNamespaceName(org);
  const controller = createKrateApiController({ namespace });
  const kind = new URL(request.url).searchParams.get('kind') || 'Repository';
  return Response.json(await controller.listResource(kind), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request, { params }) {
  const { org } = await params;
  const namespace = orgNamespaceName(org);
  const controller = createKrateApiController({ namespace });
  const resource = await request.json();
  const scoped = {
    ...resource,
    metadata: { ...(resource.metadata || {}), namespace: namespace, labels: { ...(resource.metadata?.labels || {}), 'krate.a5c.ai/org': org, 'krate.a5c.ai/namespace': namespace } },
    spec: { ...(resource.spec || {}), organizationRef: org }
  };
  return Response.json(await controller.applyResource(scoped), { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
