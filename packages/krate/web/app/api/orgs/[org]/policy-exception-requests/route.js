import { createKrateApiController, createControllerUiModel, orgNamespaceName } from '@a5c-ai/krate-sdk';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { org } = await params;
  const controller = createKrateApiController({ namespace: orgNamespaceName(org) });
  const model = createControllerUiModel(await controller.snapshot(), { organization: org });
  return Response.json({ org, items: model.policyEngine.exceptionRequests }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request, { params }) {
  const { org } = await params;
  const namespace = orgNamespaceName(org);
  const controller = createKrateApiController({ namespace });
  const input = await request.json();
  const name = input.name || `exception-${Date.now()}`;
  const resource = {
    apiVersion: 'krate.a5c.ai/v1alpha1',
    kind: 'PolicyExceptionRequest',
    metadata: { name, namespace, labels: { 'krate.a5c.ai/org': org, 'krate.a5c.ai/surface': input.surface || 'policy' } },
    spec: {
      organizationRef: org,
      policyRef: input.policyRef || {},
      ruleNames: input.ruleNames || [],
      resourceRef: input.resourceRef || {},
      repository: input.repository,
      pullRequest: input.pullRequest,
      pipeline: input.pipeline,
      job: input.job,
      requestedBy: input.requestedBy || 'current-user',
      justification: input.justification,
      expiresAt: input.expiresAt,
      riskAcceptance: input.riskAcceptance || ''
    },
    status: { phase: 'Requested' }
  };
  return Response.json(await controller.applyResource(resource), { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
