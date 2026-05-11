import { createKrateApiController } from '../../../../../../core/src/api-controller.js';
import { createControllerUiModel } from '../../../../../../core/src/controller-ui.js';
import { orgNamespaceName } from '../../../../../../core/src/kubernetes-controller.js';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { org } = await params;
  const controller = createKrateApiController({ namespace: orgNamespaceName(org) });
  const model = createControllerUiModel(await controller.snapshot(), { organization: org });
  return Response.json({ org, reports: model.policyEngine.reports, violations: model.policyEngine.violations, degraded: model.policyEngine.degraded }, { headers: { 'Cache-Control': 'no-store' } });
}
