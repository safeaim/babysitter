import { renderTemplate, resolveTemplatePath } from '../templateRenderer';
import type { PromptContext } from '../types';

export function renderIssueOnlyNoDirectCommits(ctx: PromptContext): string {
  if (!ctx.hasIssueOnlyNoDirectCommits) return '';
  return renderTemplate(resolveTemplatePath('issue-only-no-direct-commits.md'), ctx);
}
