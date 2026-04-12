import { describe, it, expect } from 'vitest';
import { createClaudeCodeContext } from '../context';
import { renderPriorityLadder } from '../parts/priorityLadder';
import { renderRootCauseGuardrail } from '../parts/rootCauseGuardrail';

describe('always-on prompt parts', () => {
  it('renderPriorityLadder renders by default', () => {
    const out = renderPriorityLadder(createClaudeCodeContext());
    expect(out).toMatch(/Priority Ladder/);
    expect(out).toMatch(/User's explicit instructions/);
  });

  it('renderPriorityLadder returns empty when flag explicitly false', () => {
    const out = renderPriorityLadder(
      createClaudeCodeContext({ hasPriorityLadder: false }),
    );
    expect(out).toBe('');
  });

  it('renderRootCauseGuardrail renders by default', () => {
    const out = renderRootCauseGuardrail(createClaudeCodeContext());
    expect(out).toMatch(/Root Cause/);
    expect(out).toMatch(/guardrail/i);
  });

  it('renderRootCauseGuardrail returns empty when flag explicitly false', () => {
    const out = renderRootCauseGuardrail(
      createClaudeCodeContext({ hasRootCauseGuardrail: false }),
    );
    expect(out).toBe('');
  });
});
