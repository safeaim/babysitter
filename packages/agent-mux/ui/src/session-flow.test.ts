import { describe, expect, it } from 'vitest';

import {
  accumulateEventCost,
  buildNativeAgentFlowLane,
  buildSessionFlowModel,
} from './session-flow.js';

describe('buildSessionFlowModel', () => {
  it('projects lanes, transcript, timeline, and file attention from live events', () => {
    const runs = [
      {
        runId: 'run-1',
        agent: 'codex',
        status: 'completed',
        startedAt: 1_000,
      },
    ];

    const eventBuffers = {
      'run-1': {
        events: [
          { type: 'session_start', timestamp: 1_000 },
          { type: 'user_message', text: 'Ship the feature', timestamp: 1_050 },
          { type: 'thinking_delta', delta: 'Need a plan', timestamp: 1_100 },
          { type: 'thinking_stop', thinking: 'Need a plan before editing', timestamp: 1_200 },
          { type: 'text_delta', delta: 'Working on it', timestamp: 1_250 },
          { type: 'message_stop', text: 'Working on it now', timestamp: 1_350 },
          { type: 'tool_call_ready', toolCallId: 'tool-1', toolName: 'Read', input: { path: 'src/app.tsx' }, timestamp: 1_400 },
          { type: 'tool_result', toolCallId: 'tool-1', toolName: 'Read', output: { ok: true }, timestamp: 1_550 },
          { type: 'subagent_spawn', agentName: 'reviewer', prompt: 'Audit the patch', timestamp: 1_600 },
          { type: 'file_patch', path: 'src/app.tsx', diff: '@@', timestamp: 1_650 },
          { type: 'cost', cost: { totalUsd: 0.42, inputTokens: 10, outputTokens: 20 }, timestamp: 1_700 },
        ],
      },
    };

    const model = buildSessionFlowModel(runs, eventBuffers);

    expect(model.lanes).toHaveLength(1);
    expect(model.summary.totalUsd).toBe(0.42);
    expect(model.lanes[0]?.toolCount).toBe(1);
    expect(model.lanes[0]?.segments.map((segment) => segment.kind)).toEqual([
      'lifecycle',
      'user',
      'thinking',
      'assistant',
      'tool',
      'branch',
      'system',
    ]);
    expect(model.transcript.map((node) => node.kind)).toEqual([
      'user',
      'thinking',
      'assistant',
      'tool',
      'branch',
      'system',
    ]);
    expect(model.files[0]).toMatchObject({
      path: 'src/app.tsx',
      touches: 2,
      reads: 1,
      writes: 1,
    });
    expect(model.timeline).toHaveLength(7);
  });

  it('keeps pending tools visible as running segments', () => {
    const model = buildSessionFlowModel(
      [{ runId: 'run-2', agent: 'claude', status: 'running', startedAt: 100 }],
      {
        'run-2': {
          events: [
            { type: 'tool_call_ready', toolCallId: 'pending-tool', toolName: 'Write', input: { path: 'src/index.ts' }, timestamp: 150 },
          ],
        },
      },
    );

    expect(model.summary.pendingTools).toBe(1);
    expect(model.lanes[0]?.segments[0]).toMatchObject({
      kind: 'tool',
      status: 'running',
      title: 'Write',
    });
  });
});

describe('accumulateEventCost', () => {
  it('aggregates cost records across multiple runs', () => {
    const totals = accumulateEventCost(
      ['run-1', 'run-2'],
      {
        'run-1': { events: [{ type: 'cost', cost: { totalUsd: 0.25, inputTokens: 10 } }] },
        'run-2': { events: [{ type: 'cost', cost: { totalUsd: 0.5, outputTokens: 12 } }] },
      },
    );

    expect(totals).toMatchObject({
      totalUsd: 0.75,
      inputTokens: 10,
      outputTokens: 12,
    });
  });
});

describe('buildNativeAgentFlowLane', () => {
  it('creates a fallback lane from native session messages', () => {
    const lane = buildNativeAgentFlowLane(
      'session-1',
      [
        { role: 'user', content: 'Hello' },
        { thinking: 'Reasoning' },
        { role: 'assistant', content: 'Done' },
      ],
      'claude',
      'inactive',
    );

    expect(lane).not.toBeNull();
    expect(lane?.segments.map((segment) => segment.kind)).toEqual([
      'user',
      'thinking',
      'assistant',
    ]);
  });
});
