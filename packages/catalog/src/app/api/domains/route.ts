/**
 * Domains API Route
 * GET /api/domains - List domains with hierarchy information
 */

import { listCatalogDomains } from '@a5c-ai/agent-catalog';
import { NextRequest } from 'next/server';
import {
  parseListQueryParams,
  createPaginatedResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import type { DomainListItem } from '@/lib/api/types';

function sortValueFor(domain: DomainListItem, sort: string | undefined): string {
  switch (sort) {
    case 'category':
      return domain.category ?? '';
    case 'createdAt':
      return domain.createdAt;
    case 'updatedAt':
      return domain.updatedAt;
    default:
      return domain.name;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const { limit = 50, offset = 0, sort, order } = parseListQueryParams(searchParams);
    const category = searchParams.get('category');

    let domains: DomainListItem[] = listCatalogDomains().map((domain) => ({
      id: domain.id,
      name: domain.name,
      path: domain.path,
      category: domain.category,
      specializationCount: domain.specializationCount,
      agentCount: domain.agentCount,
      skillCount: domain.skillCount,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    }));

    if (category) {
      domains = domains.filter((domain) => domain.category === category);
    }

    const sortKey = sort === 'category' || sort === 'createdAt' || sort === 'updatedAt'
      ? sort
      : 'name';
    const direction = order === 'desc' ? -1 : 1;
    domains.sort((left, right) => {
      const leftValue = sortValueFor(left, sortKey).toLowerCase();
      const rightValue = sortValueFor(right, sortKey).toLowerCase();
      return leftValue.localeCompare(rightValue) * direction;
    });

    const total = domains.length;
    return createPaginatedResponse(domains.slice(offset, offset + limit), total, limit, offset);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
