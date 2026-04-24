/**
 * Specializations API Route
 * GET /api/specializations - List specializations with optional domain filter
 */

import { listCatalogSpecializations } from '@a5c-ai/agent-catalog';
import { NextRequest } from 'next/server';
import {
  parseListQueryParams,
  createPaginatedResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import type { SpecializationListItem } from '@/lib/api/types';

function sortValueFor(specialization: SpecializationListItem, sort: string | undefined): string {
  switch (sort) {
    case 'createdAt':
      return specialization.createdAt;
    case 'updatedAt':
      return specialization.updatedAt;
    case 'domainName':
      return specialization.domainName ?? '';
    default:
      return specialization.name;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const { limit = 50, offset = 0, sort, order } = parseListQueryParams(searchParams);
    const domain = searchParams.get('domain');

    let specializations: SpecializationListItem[] = listCatalogSpecializations().map((specialization) => ({
      id: specialization.id,
      name: specialization.name,
      path: specialization.path,
      domainId: null,
      domainName: specialization.domainName,
      agentCount: specialization.agentCount,
      skillCount: specialization.skillCount,
      createdAt: specialization.createdAt,
      updatedAt: specialization.updatedAt,
    }));

    if (domain) {
      specializations = specializations.filter((specialization) => specialization.domainName === domain);
    }

    const sortKey = sort === 'createdAt' || sort === 'updatedAt'
      ? sort
      : sort === 'domain'
        ? 'domainName'
        : 'name';
    const direction = order === 'desc' ? -1 : 1;
    specializations.sort((left, right) => {
      const leftValue = sortValueFor(left, sortKey).toLowerCase();
      const rightValue = sortValueFor(right, sortKey).toLowerCase();
      return leftValue.localeCompare(rightValue) * direction;
    });

    const total = specializations.length;
    return createPaginatedResponse(specializations.slice(offset, offset + limit), total, limit, offset);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
