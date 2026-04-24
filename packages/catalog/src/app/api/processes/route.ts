/**
 * Processes API Route
 * GET /api/processes - List processes with filtering
 */

import { listCatalogProcesses } from '@a5c-ai/agent-catalog';
import { NextRequest } from 'next/server';
import {
  parseListQueryParams,
  createPaginatedResponse,
  internalErrorResponse,
} from '@/lib/api/utils';
import type { ProcessListItem } from '@/lib/api/types';

function sortValueFor(process: ProcessListItem, sort: string | undefined): string {
  switch (sort) {
    case 'createdAt':
      return process.createdAt;
    case 'updatedAt':
      return process.updatedAt;
    case 'category':
      return process.category ?? '';
    default:
      return process.processId;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const { limit = 20, offset = 0, sort, order } = parseListQueryParams(searchParams);
    const category = searchParams.get('category');

    let processes: ProcessListItem[] = listCatalogProcesses().map((process) => ({
      id: process.id,
      processId: process.processId,
      description: process.description,
      category: process.category,
      filePath: process.filePath,
      taskCount: process.tasks.length,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
    }));

    if (category) {
      processes = processes.filter((process) => process.category === category);
    }

    const sortKey = sort === 'createdAt' || sort === 'updatedAt' || sort === 'category'
      ? sort
      : sort === 'id'
        ? 'id'
        : 'processId';
    const direction = order === 'desc' ? -1 : 1;
    processes.sort((left, right) => {
      if (sortKey === 'id') {
        return (left.id - right.id) * direction;
      }
      const leftValue = sortValueFor(left, sortKey).toLowerCase();
      const rightValue = sortValueFor(right, sortKey).toLowerCase();
      return leftValue.localeCompare(rightValue) * direction;
    });

    const total = processes.length;
    return createPaginatedResponse(processes.slice(offset, offset + limit), total, limit, offset);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
