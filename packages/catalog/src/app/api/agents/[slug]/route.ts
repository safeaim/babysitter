/**
 * Agent Detail API Route
 * GET /api/agents/[slug] - Get single agent by name
 */

import { getUiAgentCards } from '@a5c-ai/agent-catalog';
import { NextRequest } from 'next/server';
import {
  validateSlug,
  createSuccessResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import type { AgentDetail } from '@/lib/api/types';

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

    const card = getUiAgentCards().find((agent) => agent.name === slug);

    if (!card) {
      return notFoundResponse('Agent', slug);
    }

    const content = [
      `# ${card.name}`,
      ``,
      `${card.description}`,
      ``,
      `- Version range: \`${card.versionRange}\``,
      `- Providers: ${card.providerNames.join(', ')}`,
      `- Transports: ${card.transportLabels.join(', ')}`,
      `- Hooks: ${card.hookNames.join(', ') || 'None'}`,
      `- Capabilities: ${card.capabilities.join(', ')}`,
      ``,
      `Source: \`${card.filePath}\``,
    ].join('\n');

    // Transform to API response format
    const agent: AgentDetail = {
      id: Number(card.id),
      name: card.name,
      description: card.description,
      filePath: card.filePath,
      directory: card.directory,
      role: card.versionRange,
      expertise: card.capabilities,
      specializationId: null,
      specializationName: card.transportLabels[0] ?? null,
      domainId: null,
      domainName: card.providerNames[0] ?? null,
      createdAt: "2026-04-23T00:00:00.000Z",
      updatedAt: "2026-04-23T00:00:00.000Z",
      content,
      frontmatter: {
        ...card.metadata,
        providerNames: card.providerNames,
        transportLabels: card.transportLabels,
        hookNames: card.hookNames,
      },
    };

    return createSuccessResponse(agent);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
