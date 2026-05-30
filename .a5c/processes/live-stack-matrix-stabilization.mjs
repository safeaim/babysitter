import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * @process processes/live-stack/live-stack-matrix-stabilization
 * @description Stabilize the live-stack test matrix — collect failures, investigate root causes,
 *   fix code, dispatch parallel tests, update wiki and issues, repeat until convergence.
 * @trigger manual
 * @inputs { repo: string, wikiPath: string }
 * @outputs { passCount: number, failCount: number, blockedCount: number, fixesLanded: number }
 */

export async function process(inputs, ctx) {
  const state = await ctx.task(assessMatrixTask, { repo: inputs.repo, wikiPath: inputs.wikiPath });

  const harvest = await ctx.task(harvestAndTriageTask, { repo: inputs.repo, state });

  const fixes = await ctx.task(fixAndBuildTask, { repo: inputs.repo, harvest });

  const dispatches = await ctx.task(parallelDispatchTask, { repo: inputs.repo, harvest, fixes });

  const results = await ctx.task(collectAndVerifyTask, { repo: inputs.repo, dispatches });

  const wiki = await ctx.task(updateAllTask, { repo: inputs.repo, wikiPath: inputs.wikiPath, results, state, harvest });

  return {
    passCount: wiki.passCount,
    failCount: wiki.failCount,
    blockedCount: wiki.blockedCount,
    fixesLanded: fixes.count,
  };
}

const assessMatrixTask = defineTask('assess-matrix', async (args) => ({
  kind: 'node',
  title: 'Assess current matrix state from wiki + CI',
  labels: ['gardening', 'assess'],
  io: {
    instruction: `Assess the live-stack test matrix state.

1. Pull the wiki: cd ${args.wikiPath} && git pull
2. Read QA-Evidence.md — count PASS, FAIL, blocked (by issue), pending (---) cells
3. List open live-stack issues: gh issue list --state open --label live-stack --json number,title,labels
4. Check recent CI runs: gh run list --workflow=live-stack.yml --limit=15 --json databaseId,status,conclusion
5. For completed runs, harvest all SUCCESS and FAILURE job names
6. Identify the top 5 blockers by cell count and determine which are code-fixable vs external

Return { passCount, failCount, blockedCount, pendingCount, topBlockers: [{issue, cells, fixable}], newResults: [{agent, model, os, mode, result, runId}] }.`,
  },
}));

const harvestAndTriageTask = defineTask('harvest-and-triage', async (args) => ({
  kind: 'node',
  title: 'Harvest failures, download artifacts, triage root causes',
  labels: ['gardening', 'triage'],
  io: {
    instruction: `For the top 5 failure patterns, download artifacts and investigate.

For each failure:
1. Download the artifact: gh run download {runId} -n "{artifactName}" -D /tmp/failure-{runId}
2. Read verification-report.md — check which verification steps passed/failed:
   - install-check: did the agent install?
   - proxy-communication: did the proxy receive requests?
   - model-response: did the model produce output?
   - file-creation: was the expected file created?
3. Read agent-output.txt for error messages
4. Read plugin-command-transcript.json for spawn args and stderr

Classify each failure:
- **code-fixable**: launch.ts, atlas graph, workflow, translations
- **config**: needs CI secrets or env vars
- **upstream**: needs external party action
- **model-behavior**: prompt engineering needed
- **platform**: OS-specific limitation (e.g. prompt_toolkit on Windows)

For code-fixable issues, identify the SPECIFIC file and change needed.

Return { failures: [{pattern, category, file, change, impact, evidence}], fixableCount: number }.`,
  },
}));

const fixAndBuildTask = defineTask('fix-and-build', async (args) => ({
  kind: 'node',
  title: 'Implement code fixes, build, commit, push',
  labels: ['gardening', 'fix'],
  io: {
    instruction: `Implement fixes for all code-fixable issues (sorted by impact).

For each fix:
1. Read the current code in the identified file
2. Make the minimal change to fix the issue
3. Build: npm run build --workspace=<affected-package>
4. If build fails, fix the build error
5. Commit with descriptive message referencing the issue
6. File new GitHub issues for non-code-fixable problems:
   gh issue create --title "..." --body "..." --label live-stack

After all fixes: git push origin staging

Rules:
- Never write fallbacks
- Keep changes minimal
- One commit per fix
- Build must pass before pushing

Return { count: number, commits: [{sha, message, impact}], issuesFiled: number }.`,
  },
}));

const parallelDispatchTask = defineTask('parallel-dispatch', async (args) => ({
  kind: 'node',
  title: 'Dispatch tests in parallel across all OS',
  labels: ['gardening', 'dispatch'],
  io: {
    instruction: `Dispatch live-stack tests in PARALLEL to maximize throughput.

Strategy:
1. For each fix, dispatch the specific agent/model/mode that was broken
2. For blocked cells with recently-closed issues, dispatch verification
3. For pending (---) cells, dispatch to fill coverage gaps
4. Group by OS and send one dispatch per OS with multiple matrix entries

Dispatch format:
gh workflow run live-stack.yml --ref staging -f os=<os> -f 'matrix=[{"agent":"...","model":"...","mode":"...","install":"...","live":true},...]'

Agent names: claude, codex, pi, gemini, hermes, opencode, copilot, cursor, omni
Model names: foundry-gpt55, foundry-gpt54mini, google-gemini31, anthropic-sonnet46, foundry-deepseek
Modes: ni, bridged-interactive, interactive, bridged-hooks
Install: vanilla, bp

Send ALL dispatches at once — don't wait between them.

Return { dispatched: number, runs: [{os, count}] }.`,
  },
}));

const collectAndVerifyTask = defineTask('collect-and-verify', async (args) => ({
  kind: 'node',
  title: 'Poll for results and verify fixes',
  labels: ['gardening', 'verify'],
  io: {
    instruction: `Poll for dispatched test results (max 20 minutes).

Every 60 seconds:
1. Check run status: gh run list --workflow=live-stack.yml --limit=10 --json databaseId,status,conclusion
2. For completed runs, extract job results
3. For failures, download artifacts and read verification reports

Collect:
- New PASS cells (to update wiki)
- Confirmed FAIL cells (to update wiki with evidence)
- Fixes verified (to close issues)
- Fixes not working (to keep issues open with new findings)

Return { passes: [{agent, model, os, mode, runId}], failures: [{agent, model, os, mode, runId, reason}], verified: number, stillBroken: number }.`,
  },
}));

const updateAllTask = defineTask('update-all', async (args) => ({
  kind: 'node',
  title: 'Update wiki, issues, and report',
  labels: ['gardening', 'update'],
  io: {
    instruction: `Update everything with the collected results.

1. **Wiki**: Pull, update cells, commit, push
   - PASS results: change FAIL/blocked/--- to [PASS](run URL)
   - New FAIL results without issue: add blocked [#NNN](...) — [FAIL](...)
   - Recount all cells

2. **Issues**: Update open live-stack issues
   - Close verified fixes: gh issue close {number} --reason completed
   - Update partial fixes with progress comment
   - File new issues for new failure patterns

3. **Report**: Print summary to stdout:
   - Cells flipped this iteration
   - Current PASS/FAIL/blocked counts
   - Top remaining blockers
   - Next steps

cd ${args.wikiPath} && git pull && git add -A && git commit -m "Gardening: ..." && git push

Return { passCount, failCount, blockedCount, cellsFlipped, issuesClosed, issuesCreated }.`,
  },
}));
