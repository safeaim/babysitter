import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getUiAgentOntologyList } from '@a5c-ai/agent-catalog';
import { GET } from './route';
import type { ApiResponse } from '@/lib/api/types';

function sortValue(agent: ReturnType<typeof getUiAgentOntologyList>[number], sort: string | undefined): string {
  switch (sort) {
    case 'versionRange':
      return agent.versionRange;
    case 'provider':
      return agent.providers[0]?.displayName ?? '';
    case 'capability':
      return agent.capabilities[0]?.label ?? '';
    default:
      return agent.name;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function findProviderWithCoverage() {
  const counts = new Map<string, number>();
  for (const agent of getUiAgentOntologyList()) {
    for (const provider of agent.providers) {
      counts.set(provider.providerId, (counts.get(provider.providerId) ?? 0) + 1);
    }
  }

  const winner = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  if (!winner) {
    throw new Error('Expected at least one provider-backed agent in the ontology list.');
  }
  return winner;
}

describe('GET /api/agents contract', () => {
  it('returns the same provider-filtered, paginated ontology list exposed by agent-catalog', async () => {
    const provider = findProviderWithCoverage();
    const allAgents = getUiAgentOntologyList();
    const filtered = allAgents.filter((agent) =>
      agent.providers.some((entry) => entry.providerId === provider || entry.displayName === provider),
    );

    expect(filtered.length).toBeGreaterThan(0);

    const limit = Math.min(2, filtered.length);
    const offset = filtered.length > limit ? 1 : 0;
    const request = new NextRequest(
      `http://localhost/api/agents?provider=${encodeURIComponent(provider)}&sort=versionRange&order=asc&limit=${limit}&offset=${offset}`,
    );

    const response = await GET(request);
    const body = await readJson<ApiResponse<typeof filtered>>(response);
    const expected = [...filtered]
      .sort((left, right) =>
        sortValue(left, 'versionRange').localeCompare(sortValue(right, 'versionRange'), undefined, {
          sensitivity: 'base',
        }),
      )
      .slice(offset, offset + limit);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: expected,
      meta: {
        total: filtered.length,
        limit,
        offset,
        hasMore: offset + expected.length < filtered.length,
      },
    });
  });

  it('sorts by graph-derived capability labels for the API projection', async () => {
    const allAgents = getUiAgentOntologyList();
    const request = new NextRequest('http://localhost/api/agents?sort=capability&order=desc&limit=5');

    const response = await GET(request);
    const body = await readJson<ApiResponse<typeof allAgents>>(response);
    const expected = [...allAgents]
      .sort((left, right) =>
        sortValue(right, 'capability').localeCompare(sortValue(left, 'capability'), undefined, {
          sensitivity: 'base',
        }),
      )
      .slice(0, 5);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(expected);
    expect(body.data?.every((agent) => Array.isArray(agent.capabilities))).toBe(true);
  });
});
