import { renderTemplate, resolveTemplatePath } from '../templateRenderer';
import type { PromptContext } from '../types';

export function renderScheduledReportFormat(ctx: PromptContext): string {
  if (!ctx.hasScheduledReportFormat) return '';
  return renderTemplate(resolveTemplatePath('scheduled-report-format.md'), ctx);
}
