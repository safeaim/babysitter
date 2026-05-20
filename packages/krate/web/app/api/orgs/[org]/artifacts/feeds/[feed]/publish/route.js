import { createKrateApiController, orgNamespaceName, clearSnapshotCache } from '@a5c-ai/krate-sdk';
import { withAuth } from '../../../../../../../lib/api-auth.js';
import { errorResponse } from '../../../../../../../lib/api-errors.js';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request, { params }) => {
  const { org, feed } = await params;
  const namespace = orgNamespaceName(org);
  const controller = createKrateApiController({ namespace });
  try {
    const input = await request.json();
    const resource = {
      apiVersion: 'krate.a5c.ai/v1alpha1',
      kind: 'ArtifactVersion',
      metadata: {
        name: `${feed}-${input.name || 'pkg'}-${(input.version || 'latest').replace(/\./g, '-')}`,
        namespace,
        labels: {
          'krate.a5c.ai/feed': feed,
        },
      },
      spec: {
        organizationRef: org,
        feedRef: feed,
        name: input.name,
        version: input.version,
        digest: input.digest || '',
        size: input.size || 0,
        publishedBy: input.publishedBy || 'unknown',
        metadata: input.metadata || {},
      },
    };
    const result = await controller.applyResource(resource);
    clearSnapshotCache();
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error.message, error.message?.includes('not found') ? 404 : 500);
  }
});
