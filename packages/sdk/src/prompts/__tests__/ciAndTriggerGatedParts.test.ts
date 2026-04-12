import { describe, it, expect } from 'vitest';
import { createClaudeCodeContext } from '../context';
import * as parts from '../parts';

const gatedParts: Array<{
  render: (ctx: ReturnType<typeof createClaudeCodeContext>) => string;
  flag: string;
  match: RegExp;
}> = [
  { render: parts.renderIdempotencyAndAbort, flag: 'hasIdempotencyAndAbort', match: /Idempotency and Safe Abort/ },
  { render: parts.renderIssueOnlyNoDirectCommits, flag: 'hasIssueOnlyNoDirectCommits', match: /Issue-Only, No Direct Commits/ },
  { render: parts.renderPrCommentFormat, flag: 'hasPrCommentFormat', match: /PR Comment Format/ },
  { render: parts.renderSixDimensionReview, flag: 'hasSixDimensionReview', match: /Six-Dimension Code Review/ },
  { render: parts.renderScheduledReportFormat, flag: 'hasScheduledReportFormat', match: /Scheduled Run Report Format/ },
  { render: parts.renderLocalDevRelax, flag: 'hasLocalDevRelax', match: /Local Development Relaxations/ },
];

describe('CI + trigger-gated prompt parts', () => {
  for (const { render, flag, match } of gatedParts) {
    it(`${flag} returns empty by default`, () => {
      expect(render(createClaudeCodeContext())).toBe('');
    });
    it(`${flag} renders when flag enabled`, () => {
      const out = render(createClaudeCodeContext({ [flag]: true }));
      expect(out).toMatch(match);
    });
  }
});
