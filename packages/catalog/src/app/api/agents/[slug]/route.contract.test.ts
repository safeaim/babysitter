import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getUiAgentOntologyEntry, getUiAgentOntologyList } from '@a5c-ai/agent-catalog';
import { GET } from './route';
import type { ApiResponse } from '@/lib/api/types';

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function findRichAgentSlug(): string {
  const richAgent = getUiAgentOntologyList().find(
    (agent) =>
      agent.capabilities.length > 0 &&
      agent.providers.length > 0 &&
      agent.transports.length > 0 &&
      agent.modalities.length > 0,
  );

  if (!richAgent) {
    throw new Error('Expected at least one graph-backed agent projection with populated relationships.');
  }

  return richAgent.slug;
}

describe('GET /api/agents/[slug] contract', () => {
  it('returns the exact graph-derived detail projection for a known slug', async () => {
    const slug = findRichAgentSlug();
    const expected = getUiAgentOntologyEntry(slug);
    const request = new NextRequest(`http://localhost/api/agents/${slug}`);

    const response = await GET(request, { params: Promise.resolve({ slug }) });
    const body = await readJson<ApiResponse<NonNullable<typeof expected>>>(response);

    expect(expected).toBeDefined();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: expected,
    });
  });

  it('returns a 404 when the graph has no matching agent slug', async () => {
    const slug = 'missing-agent-slug';
    const request = new NextRequest(`http://localhost/api/agents/${slug}`);

    const response = await GET(request, { params: Promise.resolve({ slug }) });
    const body = await readJson<ApiResponse<never>>(response);

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Agent with identifier '${slug}' not found`,
      },
    });
  });

  it('rejects blank slug input before consulting agent-catalog', async () => {
    const response = await GET(new NextRequest('http://localhost/api/agents/%20%20%20'), {
      params: Promise.resolve({ slug: '   ' }),
    });
    const body = await readJson<ApiResponse<never>>(response);

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid or missing slug parameter',
      },
    });
  });
});
