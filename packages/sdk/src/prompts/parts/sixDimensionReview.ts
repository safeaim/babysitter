import { renderTemplate, resolveTemplatePath } from '../templateRenderer';
import type { PromptContext } from '../types';

export function renderSixDimensionReview(ctx: PromptContext): string {
  if (!ctx.hasSixDimensionReview) return '';
  return renderTemplate(resolveTemplatePath('six-dimension-review.md'), ctx);
}
