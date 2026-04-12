/**
 * @process processes/shared/local-dev/feedback-loop-optimizer
 * @description Audits the repo's feedback loop across five independent layers in parallel
 *   (pre-commit hygiene, CI workflows, coverage, monitoring/tracing, alerting/on-call),
 *   ranks gaps, then opens one small (1-3h) decoupled GitHub issue per gap (batched,
 *   dedup-against-existing). Never commits code — issues and PR comments only.
 * @inputs { repo?: string, focusLayers?: string[] }
 * @outputs { success, gapsFound, issuesOpened }
 *
 * Source: https://raw.githubusercontent.com/a5c-ai/registry/main/prompts/development/feedback-loop-optimizer-agent.prompt.md
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

const DEFAULT_LAYERS = [
  {
    id: 'pre-commit',
    description: 'Pre-commit & hygiene: language-specific hooks (ruff/black for Python, eslint/prettier for JS/TS, go fmt, etc.), trailing-whitespace/EOF, EditorConfig consistency, lint-staged. Detect stack before suggesting specifics.',
  },
  {
    id: 'ci-workflows',
    description: 'CI workflow completeness: distinct parallel jobs for lint, type-check, test, coverage, build. Recommend scripts under scripts/ — never edit .github/workflows/ directly, only propose via issue.',
  },
  {
    id: 'coverage',
    description: 'Coverage reporting: pytest-cov, nyc/istanbul, go -cover, with thresholds wired into CI. Prefer local reporting or free hosted (Codecov OSS tier, Coveralls).',
  },
  {
    id: 'monitoring',
    description: 'Monitoring/tracing/logging: OpenTelemetry, Prometheus, Grafana, Loki, Tempo. Alternatives: self-hosted Sentry, Healthchecks.io.',
  },
  {
    id: 'alerting-oncall',
    description: 'Alerting & on-call: Alertmanager, Grafana OnCall, Healthchecks.io. Runbooks, paging escalation, SLO definitions.',
  },
];

const auditLayerTask = defineTask(
  'feedback-loop-optimizer.audit-layer',
  async ({ layer, repo }, ctx) => {
    return ctx.agent({
      title: `Audit feedback-loop layer: ${layer.id}`,
      prompt: [
        'You are the feedback-loop-optimizer-agent auditing ONE layer.',
        `Layer: ${layer.id}`,
        `Scope: ${layer.description}`,
        'Detect language/tooling choices before suggesting specifics. Honour existing conventions.',
        'Do NOT propose destructive migrations without a replacement plan.',
        `Repo: ${repo ?? '(current workspace)'}`,
        'Return JSON: { gaps: Array<{ title, body, severity: "high"|"medium"|"low", areaTag: string }> }.',
      ].join('\n'),
    });
  },
  { kind: 'agent', title: 'Audit feedback-loop layer', labels: ['a5c', 'feedback-loop-optimizer'] },
);

const rankGapsTask = defineTask(
  'feedback-loop-optimizer.rank-gaps',
  async ({ gaps }, ctx) => {
    return ctx.agent({
      title: `Rank ${gaps.length} gap(s) by impact/effort`,
      prompt: [
        'Rank each gap by impact (high/medium/low) vs effort (1-3h is the target size).',
        'Drop gaps that are >3h unless trivially decomposable. Merge near-duplicates.',
        `Gaps: ${JSON.stringify(gaps, null, 2)}`,
        'Return JSON: { ranked: Array<{ title, body, severity, areaTag, effortHours }> }.',
      ].join('\n'),
    });
  },
  { kind: 'agent', title: 'Rank feedback-loop gaps', labels: ['a5c', 'feedback-loop-optimizer'] },
);

const openIssueTask = defineTask(
  'feedback-loop-optimizer.open-issue',
  async ({ gap }, ctx) => {
    return ctx.agent({
      title: `Open decoupled issue: ${gap.title}`,
      prompt: [
        'Before opening, search existing open issues for a matching one; if found, comment/link instead.',
        'Required labels: "feedback-loop-optimizer" plus areaTag (testing|ci|lint|coverage|monitoring|alerting|pre-commit).',
        'Never commit code — issues and PR comments only (gh CLI).',
        `Gap: ${JSON.stringify(gap, null, 2)}`,
        'Return JSON: { opened?: string, dedupedTo?: string }.',
      ].join('\n'),
    });
  },
  { kind: 'agent', title: 'Open decoupled feedback-loop issue', labels: ['a5c', 'feedback-loop-optimizer'] },
);

export async function process(inputs, ctx) {
  const { repo, focusLayers } = inputs ?? {};
  const layers = Array.isArray(focusLayers) && focusLayers.length
    ? DEFAULT_LAYERS.filter((l) => focusLayers.includes(l.id))
    : DEFAULT_LAYERS;

  // Audit all layers in parallel.
  const audits = await ctx.parallel.map(layers, (layer) => ctx.task(auditLayerTask, { layer, repo }));
  const gaps = audits.flatMap((a) => (Array.isArray(a?.gaps) ? a.gaps : []));

  if (gaps.length === 0) {
    return { success: true, gapsFound: 0, issuesOpened: [] };
  }

  const ranked = await ctx.task(rankGapsTask, { gaps });
  const rankedList = Array.isArray(ranked?.ranked) ? ranked.ranked : [];

  // Batched issue creation — one gap per task, in parallel, dedup happens inside each.
  const results = await ctx.parallel.map(rankedList, (gap) => ctx.task(openIssueTask, { gap }));
  const issuesOpened = results.map((r) => r?.opened).filter(Boolean);

  return { success: true, gapsFound: rankedList.length, issuesOpened };
}
