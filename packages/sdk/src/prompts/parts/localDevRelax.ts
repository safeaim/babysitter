import { renderTemplate, resolveTemplatePath } from '../templateRenderer';
import type { PromptContext } from '../types';

export function renderLocalDevRelax(ctx: PromptContext): string {
  if (!ctx.hasLocalDevRelax) return '';
  return renderTemplate(resolveTemplatePath('local-dev-relax.md'), ctx);
}
