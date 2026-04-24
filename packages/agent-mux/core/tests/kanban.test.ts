import { describe, expect, it } from 'vitest';

import {
  buildKanbanBoardSnapshot,
  buildKanbanBacklogSnapshot,
  computeKanbanProjectMetrics,
  evaluateKanbanIssueMove,
  normalizeKanbanIssue,
  type KanbanIssue,
} from '../src/kanban.js';

function makeIssue(overrides: Partial<KanbanIssue> = {}): KanbanIssue {
  return {
    id: overrides.id ?? 'issue-1',
    projectId: overrides.projectId ?? 'project-1',
    key: overrides.key ?? 'KANBAN-1',
    title: overrides.title ?? 'Issue',
    status: overrides.status ?? 'backlog',
    priority: overrides.priority ?? 'medium',
    labels: overrides.labels ?? [],
    assignees: overrides.assignees ?? [],
    dependencies: overrides.dependencies ?? [],
    acceptanceCriteria: overrides.acceptanceCriteria ?? [],
    decomposition: overrides.decomposition ?? [],
    childIssueIds: overrides.childIssueIds ?? [],
    parentIssueId: overrides.parentIssueId,
    createdAt: overrides.createdAt ?? '2026-04-24T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-04-24T00:00:00.000Z',
    dispatch: overrides.dispatch ?? {
      readiness: 'ready',
      blockedReasons: [],
      runIds: [],
      sessionIds: [],
    },
    description: overrides.description,
    summary: overrides.summary,
    source: overrides.source,
  };
}

describe('normalizeKanbanIssue', () => {
  it('marks issues with incomplete decomposition as needing decomposition', () => {
    const issue = normalizeKanbanIssue(
      {
        ...makeIssue(),
        decomposition: [
          {
            id: 'decomp-1',
            title: 'Define child issues',
            kind: 'coordination',
            status: 'todo',
          },
        ],
      },
      new Map(),
    );

    expect(issue.dispatch.readiness).toBe('needs-decomposition');
    expect(issue.dispatch.blockedReasons).toContain('decomposition incomplete');
  });

  it('marks blocked-by dependencies as blocked until the dependency is done', () => {
    const dependency = makeIssue({ id: 'dep-1', key: 'KANBAN-0', status: 'in-progress' });
    const issue = normalizeKanbanIssue(
      {
        ...makeIssue(),
        dependencies: [{ issueId: dependency.id, type: 'blocked-by' }],
      },
      new Map([[dependency.id, dependency]]),
    );

    expect(issue.dispatch.readiness).toBe('blocked');
    expect(issue.dispatch.blockedReasons).toContain('waiting on dep-1');
  });
});

describe('computeKanbanProjectMetrics', () => {
  it('counts issues by readiness and in-progress state', () => {
    const issues = [
      makeIssue({ id: 'ready', dispatch: { readiness: 'ready', blockedReasons: [], runIds: [], sessionIds: [] } }),
      makeIssue({ id: 'blocked', dispatch: { readiness: 'blocked', blockedReasons: ['x'], runIds: [], sessionIds: [] } }),
      makeIssue({ id: 'dispatched', dispatch: { readiness: 'dispatched', blockedReasons: [], runIds: ['run-1'], sessionIds: [] }, status: 'in-progress' }),
      makeIssue({ id: 'done', status: 'done', dispatch: { readiness: 'completed', blockedReasons: [], runIds: [], sessionIds: [] } }),
      makeIssue({ id: 'decomp', dispatch: { readiness: 'needs-decomposition', blockedReasons: [], runIds: [], sessionIds: [] } }),
    ];

    expect(computeKanbanProjectMetrics(issues)).toEqual({
      totalIssues: 5,
      readyIssues: 1,
      blockedIssues: 1,
      dispatchedIssues: 1,
      completedIssues: 1,
      needsDecompositionIssues: 1,
      inProgressIssues: 1,
    });
  });
});

describe('buildKanbanBacklogSnapshot', () => {
  it('hydrates project issue ids and metrics from the issue list', () => {
    const snapshot = buildKanbanBacklogSnapshot({
      generatedAt: '2026-04-24T00:00:00.000Z',
      projects: [
        {
          id: 'project-1',
          key: 'KANBAN',
          name: 'Kanban',
          issueIds: [],
          labels: [],
          assignees: [],
          statuses: [],
        },
      ],
      issues: [
        {
          ...makeIssue({
            id: 'parent',
            key: 'KANBAN-1',
            childIssueIds: ['child'],
          }),
        },
        {
          ...makeIssue({
            id: 'child',
            key: 'KANBAN-1A',
            parentIssueId: 'parent',
            status: 'done',
          }),
        },
      ],
    });

    expect(snapshot.projects[0]?.issueIds).toEqual(['parent', 'child']);
    expect(snapshot.projects[0]?.metrics.totalIssues).toBe(2);
    expect(snapshot.issues.find((issue) => issue.id === 'parent')?.dispatch.readiness).toBe(
      'ready',
    );
  });
});

describe('evaluateKanbanIssueMove', () => {
  it('blocks moves into in-progress when the target column would exceed WIP', () => {
    const issueA = makeIssue({ id: 'a', key: 'KANBAN-1', status: 'in-progress' });
    const issueB = makeIssue({ id: 'b', key: 'KANBAN-2', status: 'in-progress' });
    const candidate = makeIssue({ id: 'c', key: 'KANBAN-3', status: 'ready' });
    const snapshot = buildKanbanBacklogSnapshot({
      projects: [
        {
          id: 'project-1',
          key: 'KANBAN',
          name: 'Kanban',
          issueIds: [],
          labels: [],
          assignees: [],
          statuses: [
            { id: 'backlog', name: 'Backlog', kind: 'backlog' },
            { id: 'ready', name: 'Ready', kind: 'backlog' },
            { id: 'in-progress', name: 'In Progress', kind: 'active', wipLimit: 2 },
            { id: 'review', name: 'Review', kind: 'active', wipLimit: 2 },
            { id: 'done', name: 'Done', kind: 'done' },
          ],
        },
      ],
      issues: [issueA, issueB, candidate],
    });

    const evaluation = evaluateKanbanIssueMove({
      project: snapshot.projects[0]!,
      issues: snapshot.issues,
      issueId: candidate.id,
      toState: 'in-progress',
    });

    expect(evaluation.allowed).toBe(false);
    expect(evaluation.signals.some((signal) => signal.hookId === 'wip-limit')).toBe(true);
  });

  it('blocks moves to done when acceptance criteria remain open', () => {
    const snapshot = buildKanbanBacklogSnapshot({
      projects: [
        {
          id: 'project-1',
          key: 'KANBAN',
          name: 'Kanban',
          issueIds: [],
          labels: [],
          assignees: [],
          statuses: [],
        },
      ],
      issues: [
        makeIssue({
          id: 'review-1',
          key: 'KANBAN-9',
          status: 'review',
          acceptanceCriteria: [
            {
              id: 'ac-1',
              title: 'Ship it',
              satisfied: false,
            },
          ],
        }),
      ],
    });

    const evaluation = evaluateKanbanIssueMove({
      project: snapshot.projects[0]!,
      issues: snapshot.issues,
      issueId: 'review-1',
      toState: 'done',
    });

    expect(evaluation.allowed).toBe(false);
    expect(evaluation.signals.some((signal) => signal.hookId === 'acceptance-complete')).toBe(
      true,
    );
  });
});

describe('buildKanbanBoardSnapshot', () => {
  it('groups issues into workflow columns and swimlanes', () => {
    const snapshot = buildKanbanBacklogSnapshot({
      generatedAt: '2026-04-24T00:00:00.000Z',
      projects: [
        {
          id: 'project-1',
          key: 'KANBAN',
          name: 'Kanban',
          issueIds: [],
          labels: [],
          assignees: [],
          statuses: [],
        },
      ],
      issues: [
        makeIssue({ id: 'todo-1', key: 'KANBAN-1', status: 'ready', priority: 'medium' }),
        makeIssue({ id: 'doing-1', key: 'KANBAN-2', status: 'in-progress', priority: 'high' }),
        makeIssue({
          id: 'blocked-1',
          key: 'KANBAN-3',
          status: 'blocked',
          dispatch: { readiness: 'blocked', blockedReasons: ['waiting'], runIds: [], sessionIds: [] },
        }),
      ],
    });

    const board = buildKanbanBoardSnapshot(snapshot);
    const projectBoard = board.projects[0]!;

    expect(projectBoard.columns.find((column) => column.id === 'todo')?.issueCount).toBe(1);
    expect(projectBoard.columns.find((column) => column.id === 'in-progress')?.issueCount).toBe(2);
    expect(projectBoard.swimlanes.find((lane) => lane.id === 'expedite')?.issueIds).toContain(
      'doing-1',
    );
    expect(projectBoard.swimlanes.find((lane) => lane.id === 'blocked')?.issueIds).toContain(
      'blocked-1',
    );
  });
});
