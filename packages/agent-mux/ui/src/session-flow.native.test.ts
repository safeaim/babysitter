import { describe, expect, it } from 'vitest';

import { buildNativeAgentFlowLane } from './session-flow.js';

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
