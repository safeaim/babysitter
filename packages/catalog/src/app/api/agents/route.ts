/**
 * Agents API Route
 * GET /api/agents - List agents with filtering
 */

import { getUiAgentCards } from '@a5c-ai/agent-catalog';
import { NextRequest } from 'next/server';
import {
  parseListQueryParams,
  createPaginatedResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import type { AgentListItem } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const { limit = 20, offset = 0, sort, order } = parseListQueryParams(searchParams);
    const specialization = searchParams.get('specialization');
    const domain = searchParams.get('domain');
    const expertise = searchParams.get('expertise');

    let agents: AgentListItem[] = getUiAgentCards().map((agent) => ({
      id: Number(agent.id),
      name: agent.name,
      description: agent.description,
      filePath: agent.filePath,
      directory: agent.directory,
      role: agent.versionRange,
      expertise: agent.capabilities,
      specializationId: null,
      specializationName: agent.transportLabels[0] ?? null,
      domainId: null,
      domainName: agent.providerNames[0] ?? null,
      createdAt: "2026-04-23T00:00:00.000Z",
      updatedAt: "2026-04-23T00:00:00.000Z",
    }));

    if (specialization) {
      agents = agents.filter((agent) => agent.specializationName === specialization);
    }

    if (domain) {
      agents = agents.filter((agent) => agent.domainName === domain);
    }

    if (expertise) {
      agents = agents.filter((agent) => agent.expertise.includes(expertise));
    }

    const sortKey = sort === "createdAt" || sort === "updatedAt" ? sort : sort === "role" ? "role" : "name";
    agents.sort((left, right) => {
      const direction = order === "desc" ? -1 : 1;
      const leftValue = `${left[sortKey] ?? ""}`.toLowerCase();
      const rightValue = `${right[sortKey] ?? ""}`.toLowerCase();
      return leftValue.localeCompare(rightValue) * direction;
    });

    const total = agents.length;
    agents = agents.slice(offset, offset + limit).map((agent, index) => ({
      ...agent,
      id: offset + index + 1,
    }));

    return createPaginatedResponse(agents, total, limit, offset);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
