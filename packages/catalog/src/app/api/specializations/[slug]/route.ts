/**
 * Specialization Detail API Route
 * GET /api/specializations/[slug] - Get single specialization with its skills and agents
 */

import { getCatalogSpecializationByName } from '@a5c-ai/agent-catalog';
import { NextRequest } from 'next/server';
import {
  validateSlug,
  createSuccessResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import type { SpecializationDetail, AgentSummary, SkillSummary } from '@/lib/api/types';

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

    const specialization = getCatalogSpecializationByName(slug);
    if (!specialization) {
      return notFoundResponse('Specialization', slug);
    }

    const agents: AgentSummary[] = specialization.agents;
    const skills: SkillSummary[] = specialization.skills;

    const response: SpecializationDetail = {
      id: specialization.id,
      name: specialization.name,
      path: specialization.path,
      domainId: null,
      domainName: specialization.domainName,
      agentCount: specialization.agentCount,
      skillCount: specialization.skillCount,
      createdAt: specialization.createdAt,
      updatedAt: specialization.updatedAt,
      readmePath: specialization.readmePath,
      referencesPath: specialization.referencesPath,
      agents,
      skills,
    };

    return createSuccessResponse(response);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
