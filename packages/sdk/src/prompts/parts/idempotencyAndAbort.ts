import { renderTemplate, resolveTemplatePath } from '../templateRenderer';
import type { PromptContext } from '../types';

export function renderIdempotencyAndAbort(ctx: PromptContext): string {
  if (!ctx.hasIdempotencyAndAbort) return '';
  return renderTemplate(resolveTemplatePath('idempotency-and-abort.md'), ctx);
}
