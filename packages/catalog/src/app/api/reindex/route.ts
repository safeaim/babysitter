/**
 * Reindex API Route
 * POST /api/reindex - Refresh the in-memory discovery snapshot
 */

import { refreshCatalogDiscoverySnapshot } from '@a5c-ai/agent-catalog';
import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import type { ReindexResponse } from '@/lib/api/types';

export async function POST(request: NextRequest) {
  try {
    try {
      await request.json();
    } catch {
      // Ignore body; the graph-backed discovery layer only needs a cache refresh.
    }

    const startedAt = Date.now();
    const snapshot = refreshCatalogDiscoverySnapshot();
    const duration = Date.now() - startedAt;

    const response: ReindexResponse = {
      success: true,
      statistics: {
        domainsIndexed: snapshot.counts.domains,
        specializationsIndexed: snapshot.counts.specializations,
        agentsIndexed: snapshot.counts.agents,
        skillsIndexed: snapshot.counts.skills,
        processesIndexed: snapshot.counts.processes,
        filesProcessed:
          snapshot.counts.agents +
          snapshot.counts.skills +
          snapshot.counts.processes,
        errors: 0,
        duration,
      },
      errors: [],
    };

    return createSuccessResponse(response);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    return POST(request);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
