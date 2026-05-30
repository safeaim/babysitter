import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * @process processes/live-stack/live-stack-matrix-stabilization
 * @description Stabilize the live-stack test matrix toward 100% PASS.
 *   Each iteration: assess → fix what's fixable → dispatch tests → collect results → update wiki.
 *   Converges when no more progress is possible (all fixable issues resolved, remaining are external).
 * @trigger manual
 * @inputs { repo: string, wikiPath: string }
 * @outputs { passCount: number, totalCount: number, fixedThisRun: number, externalBlockers: number }
 */

export async function process(inputs, ctx) {
  // Phase 1: Assess current state
  const state = await ctx.task(assessTask, { repo: inputs.repo, wikiPath: inputs.wikiPath });

  // Phase 2: Fix everything that's code-fixable
  const fixes = await ctx.task(fixAllTask, { repo: inputs.repo, wikiPath: inputs.wikiPath, state });

  // Phase 3: Dispatch tests for all non-PASS cells
  const dispatches = await ctx.task(dispatchAllTask, { repo: inputs.repo, fixes, state });

  // Phase 4: Wait for results and collect them
  const results = await ctx.task(collectAllTask, { repo: inputs.repo, dispatches });

  // Phase 5: Update wiki with all results
  const wiki = await ctx.task(updateWikiTask, { repo: inputs.repo, wikiPath: inputs.wikiPath, results });

  // Phase 6: Update issues — close fixed, file new
  const issues = await ctx.task(updateIssuesTask, { repo: inputs.repo, results, wiki });

  // Phase 7: Final assessment — report convergence state
  const final = await ctx.task(finalAssessTask, { repo: inputs.repo, wikiPath: inputs.wikiPath, wiki, issues });

  return {
    passCount: final.passCount,
    totalCount: final.totalCount,
    fixedThisRun: final.cellsFlipped,
    externalBlockers: final.externalBlockerCount,
  };
}

const assessTask = defineTask('assess', async (args) => ({
  kind: 'node',
  title: 'Assess matrix — full inventory of every cell',
  labels: ['gardening', 'assess'],
  io: {
    instruction: `Full assessment of the live-stack test matrix.

1. Pull wiki: cd ${args.wikiPath} && git pull
2. Read QA-Evidence.md — count every cell type:
   - PASS cells (with run links)
   - FAIL cells (bare, no blocking issue)
   - Blocked cells (with issue references) — group by issue number
   - Pending cells (showing ---)
3. For each blocking issue, check current state:
   gh issue view {number} --json state,title
   Categorize: open vs closed, code-fixable vs external
4. List recent completed CI runs with results not yet in wiki:
   gh run list --workflow=live-stack.yml --limit=20 --json databaseId,status,conclusion
   For each completed run, get SUCCESS job names
5. Compute: how many cells CAN be flipped to PASS with available results?

Return {
  passCount: number, totalCount: number,
  blockedByIssue: [{issue, cells, state, category}],
  unharvested: [{agent, model, os, mode, runId}],
  closedIssueBlockedCells: number
}.`,
  },
}));

const fixAllTask = defineTask('fix-all', async (args) => ({
  kind: 'node',
  title: 'Fix every code-fixable blocker',
  labels: ['gardening', 'fix'],
  io: {
    instruction: `Fix ALL code-fixable blockers. Sorted by cell impact.

For each open live-stack issue that blocks cells:
1. Read the issue + comments for latest investigation
2. Check if there's a code fix available:
   - Launch code changes (packages/agent-mux/launch/src/launch.ts)
   - Atlas graph changes (packages/atlas/graph/)
   - Workflow changes (.github/workflows/live-stack.yml)
   - Translation changes (packages/agent-mux/adapters/src/translations/)
   - Test runner changes (packages/agent-mux/cli/tests/live-stack/)
3. If fixable: implement, build (npm run build --workspace=...), commit, push
4. If needs CI secret: document exactly what secret and where to add it
5. If upstream: document the upstream dependency and workaround attempts

Also harvest unharvested results:
- For cells with PASS results in CI but not yet in wiki, note them for the update step

Return { fixesLanded: number, commits: string[], secretsNeeded: [{name, description}], upstream: [{issue, dependency}] }.`,
  },
}));

const dispatchAllTask = defineTask('dispatch-all', async (args) => ({
  kind: 'node',
  title: 'Dispatch tests for ALL non-PASS cells in parallel',
  labels: ['gardening', 'dispatch'],
  io: {
    instruction: `Dispatch live-stack tests for every non-PASS cell. Be aggressive.

1. For cells blocked by CLOSED issues: dispatch verification tests
2. For cells blocked by issues with recent fixes: dispatch to verify
3. For pending (---) cells: dispatch to fill coverage
4. For cells where fixes were just landed: dispatch to verify

Group by OS and dispatch ALL in parallel:
gh workflow run live-stack.yml --ref staging -f os=<os> -f 'matrix=[...]'

Matrix entry format: {"agent":"...","model":"...","mode":"...","install":"...","live":true}

Dispatch everything at once — don't wait between dispatches.

Return { dispatched: number, cellsCovered: number }.`,
  },
}));

const collectAllTask = defineTask('collect-all', async (args) => ({
  kind: 'node',
  title: 'Collect ALL test results (wait up to 20 min)',
  labels: ['gardening', 'collect'],
  io: {
    instruction: `Wait for dispatched tests and collect ALL results.

Poll every 60 seconds for up to 20 minutes:
1. gh run list --workflow=live-stack.yml --limit=15 --json databaseId,status,conclusion
2. For completed runs, extract PASS/FAIL:
   gh api repos/{repo}/actions/runs/{id}/jobs --jq '...'
3. For top failures, download artifacts to understand why

Return {
  passes: [{agent, model, os, mode, runId}],
  failures: [{agent, model, os, mode, runId, reason}],
  timedOut: number
}.`,
  },
}));

const updateWikiTask = defineTask('update-wiki', async (args) => ({
  kind: 'node',
  title: 'Update wiki with ALL new results',
  labels: ['gardening', 'wiki'],
  io: {
    instruction: `Update QA Evidence wiki with every new result.

1. cd ${args.wikiPath} && git pull
2. For each new PASS: update cell from FAIL/blocked/--- to [PASS](run URL)
3. For each new FAIL without issue: create issue and mark blocked
4. For cells blocked by closed issues with no new test: mark as --- (pending)
5. Remove stale blocked references to closed issues
6. Recount: PASS, FAIL, blocked, pending, total
7. git add -A && git commit -m "Gardening: N cells flipped" && git push

Return { passCount, totalCount, cellsFlipped, blockedCount }.`,
  },
}));

const updateIssuesTask = defineTask('update-issues', async (args) => ({
  kind: 'node',
  title: 'Update issues — close verified, file new',
  labels: ['gardening', 'issues'],
  io: {
    instruction: `Garden all live-stack GitHub issues.

1. Close issues where ALL blocked cells now show PASS
2. Update issues with partial progress
3. File new issues for new failure patterns
4. Add ready-for-dev label to investigated issues

Return { closed: number, updated: number, created: number }.`,
  },
}));

const finalAssessTask = defineTask('final-assess', async (args) => ({
  kind: 'node',
  title: 'Final assessment — report what changed and what remains',
  labels: ['gardening', 'report'],
  io: {
    instruction: `Final assessment after this gardening iteration.

1. Pull wiki and recount: cd ${args.wikiPath} && git pull
2. Count final PASS, FAIL, blocked, pending
3. Compare to starting state — how many cells flipped?
4. List remaining blockers by category:
   - Code-fixable (needs another iteration)
   - Needs CI secrets (list exactly which)
   - Needs billing top-up (which provider)
   - Upstream blocked (which agent/dependency)
5. Print a clear summary to stdout

Return {
  passCount: number, totalCount: number,
  cellsFlipped: number,
  externalBlockerCount: number,
  remainingBlockers: [{category, cells, action}]
}.`,
  },
}));
