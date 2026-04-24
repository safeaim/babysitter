import { NextResponse } from 'next/server';

import type { KanbanWorkflowState } from '../../../../../agent-mux/core/src/kanban.js';

import { AppError, normalizeError } from '@/lib/error-handler';
import { ensureInitialized } from '@/lib/server-init';
import { BacklogQueryService } from '@/lib/services/backlog-query-service';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = { 'Cache-Control': 'no-cache, no-store' };

const service = new BacklogQueryService();

function isWorkflowState(value: unknown): value is KanbanWorkflowState {
  return value === 'todo' || value === 'in-progress' || value === 'review' || value === 'done';
}

export async function GET() {
  try {
    await ensureInitialized();
    const overview = await service.getOverview();
    return NextResponse.json(overview, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    const normalized = normalizeError(error);
    return NextResponse.json(
      { error: normalized.message, code: normalized.code },
      { status: normalized.status },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action !== 'move-issue') {
      throw new AppError('Unsupported backlog action.', 'BAD_REQUEST', 400);
    }

    if (typeof body.issueId !== 'string' || !isWorkflowState(body.toState)) {
      throw new AppError('issueId and toState are required.', 'BAD_REQUEST', 400);
    }

    const overview = await service.moveIssue({
      issueId: body.issueId,
      toState: body.toState,
    });
    return NextResponse.json(overview, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    const normalized = normalizeError(error);
    return NextResponse.json(
      { error: normalized.message, code: normalized.code },
      { status: normalized.status },
    );
  }
}
