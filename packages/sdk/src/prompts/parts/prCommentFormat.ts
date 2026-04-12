import { renderTemplate, resolveTemplatePath } from '../templateRenderer';
import type { PromptContext } from '../types';

export function renderPrCommentFormat(ctx: PromptContext): string {
  if (!ctx.hasPrCommentFormat) return '';
  return renderTemplate(resolveTemplatePath('pr-comment-format.md'), ctx);
}
