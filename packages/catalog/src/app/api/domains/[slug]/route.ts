/**
 * Domain Detail API Route
 * GET /api/domains/[slug] - Get single domain with its specializations
 */

import { getCatalogDomainByName } from '@a5c-ai/agent-catalog';
import { NextRequest } from 'next/server';
import {
  validateSlug,
  createSuccessResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import type { DomainDetail, SpecializationSummary } from '@/lib/api/types';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;

    // Validate slug parameter
    const validation = validateSlug(params.slug);
    if (!validation.valid) {
      return validation.error;
    }
    const slug = validation.slug;

    const domain = getCatalogDomainByName(slug);
    if (!domain) {
      return notFoundResponse('Domain', slug);
    }

    const specializations: SpecializationSummary[] = domain.specializations;

    const response: DomainDetail = {
      id: domain.id,
      name: domain.name,
      path: domain.path,
      category: domain.category,
      specializationCount: domain.specializationCount,
      agentCount: domain.agentCount,
      skillCount: domain.skillCount,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      readmePath: domain.readmePath,
      referencesPath: domain.referencesPath,
      specializations,
    };

    return createSuccessResponse(response);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
