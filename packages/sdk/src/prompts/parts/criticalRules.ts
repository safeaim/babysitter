import { renderTemplate, resolveTemplatePath } from '../templateRenderer';
import type { PromptContext } from '../types';

/**
 * Renders the Critical Rules section, parameterized by harness context.
 * All content lives in the critical-rules.md template.
 */
export function renderCriticalRules(ctx: PromptContext): string {
  const codexSessionIdRule = ctx.harness === 'codex'
    ? `CRITICAL RULE: Do not fabricate a session ID. The ${ctx.harnessLabel} adapter resolves\nthe session ID **PID-marker-first**: the session-start hook writes an\nauthoritative PID-scoped session marker, and the adapter reads that before\nfalling back to \`CODEX_THREAD_ID\`/\`CODEX_SESSION_ID\` or \`BABYSITTER_SESSION_ID\`.\nDo not assume env vars are reliably auto-injected -- they may be stale (inherited\nfrom an ancestor shell) or missing. For CI pipelines that deliberately export\n\`BABYSITTER_SESSION_ID\`, set \`BABYSITTER_TRUST_ENV_SESSION=1\` as an explicit\nescape hatch to re-enable env-var-first resolution.`
    : '';

  return renderTemplate(resolveTemplatePath('critical-rules.md'), ctx, {
    codexSessionIdRule,
  });
}
