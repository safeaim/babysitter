import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * @process processes/live-stack/live-stack-matrix-stabilization
 * @description Stabilize the live-stack test matrix to 100% PASS. No blocked cells excused —
 *   every blocker must be investigated, fixed, and verified. Iterate until ALL cells show PASS.
 * @trigger manual
 * @inputs { repo: string, wikiPath: string }
 * @outputs { passCount: number, totalCount: number, complete: boolean }
 */

export async function process(inputs, ctx) {
  const state = await ctx.task(assessMatrixTask, { repo: inputs.repo, wikiPath: inputs.wikiPath });

  if (state.passCount === state.totalCount) {
    return { passCount: state.passCount, totalCount: state.totalCount, complete: true };
  }

  const harvest = await ctx.task(harvestAndTriageTask, { repo: inputs.repo, state });
  const fixes = await ctx.task(fixBlockersTask, { repo: inputs.repo, harvest, state });
  const dispatches = await ctx.task(parallelDispatchTask, { repo: inputs.repo, harvest, fixes, state });
  const results = await ctx.task(collectResultsTask, { repo: inputs.repo, dispatches });
  const wiki = await ctx.task(gardenWikiTask, { repo: inputs.repo, wikiPath: inputs.wikiPath, results, state });
  const issues = await ctx.task(gardenIssuesTask, { repo: inputs.repo, results, harvest, wiki });

  if (wiki.passCount !== wiki.totalCount) {
    throw new Error(`NOT COMPLETE: ${wiki.passCount}/${wiki.totalCount} cells passing (${wiki.totalCount - wiki.passCount} remaining). Process cannot complete until ALL cells show PASS.`);
  }

  return { passCount: wiki.passCount, totalCount: wiki.totalCount, complete: true };
}

const assessMatrixTask = defineTask('assess-matrix', async (args) => ({
  kind: 'node',
  title: 'Assess matrix — count every cell, no excuses',
  labels: ['gardening', 'assess'],
  io: {
    instruction: `Assess the live-stack test matrix with ZERO tolerance for blocked cells.

1. Pull wiki: cd ${args.wikiPath} && git pull
2. Read QA-Evidence.md — count EVERY cell:
   - PASS: cells with [PASS](...)
   - FAIL: cells with [FAIL](...) without blocked prefix
   - BLOCKED: cells with "blocked [#NNN]" — these are NOT acceptable, they must be fixed
   - PENDING: cells showing "---"
3. For each blocked issue, check if the issue is still open or was closed:
   gh issue view {number} --json state
4. List open live-stack issues with their cell counts
5. Check recent CI runs for unharvested results

Every blocked cell is a problem to solve, not an excuse to skip.

Return {
  passCount: number,
  failCount: number,
  blockedCount: number,
  pendingCount: number,
  totalCount: number,
  blockersByIssue: [{issue: number, cells: number, title: string, state: string, fixable: string}],
  closedBlockers: [{issue: number, cells: number}],
  newResults: [{agent, model, os, mode, result, runId}]
}.`,
  },
}));

const harvestAndTriageTask = defineTask('harvest-and-triage', async (args) => ({
  kind: 'node',
  title: 'Harvest failures, triage EVERY blocker — none excused',
  labels: ['gardening', 'triage'],
  io: {
    instruction: `Investigate EVERY blocker. The goal is 100% PASS — no cell left behind.

For each blocking issue (sorted by cell count, highest first):

1. Read the issue: gh issue view {number} --json title,body,comments,state
2. If the issue is CLOSED, dispatch verification tests immediately
3. If the issue is OPEN, investigate the root cause:
   - Download a failure artifact and read verification-report.md
   - Identify what exactly fails: install? proxy? model response? file creation?
   - Determine the fix: code change, config, env var, or workaround

4. For issues previously marked "external/upstream":
   - Challenge that assumption — is there REALLY no code-level workaround?
   - Can we route through the proxy differently?
   - Can we use a different auth method?
   - Can we write a config file the agent reads?
   - Can we use CLI flags instead of env vars?
   - Can we change the test scenario to work around the limitation?

5. For "model behavior" issues (#563, #487):
   - Can we improve the prompt?
   - Can we increase max-turns?
   - Can we simplify the test scenario?
   - Can we retry flaky tests?

Classify each blocker as:
- **fix-now**: code change ready to implement
- **fix-config**: needs CI secret or env var (specify exactly what)
- **fix-prompt**: needs prompt/scenario improvement
- **fix-retry**: flaky test, just needs re-dispatch
- **genuinely-blocked**: explain WHY there is absolutely no workaround

Return { blockers: [{issue, cells, category, action, file, change}], fixNowCount: number, retryCount: number }.`,
  },
}));

const fixBlockersTask = defineTask('fix-blockers', async (args) => ({
  kind: 'node',
  title: 'Fix every fixable blocker — code, config, prompts',
  labels: ['gardening', 'fix'],
  io: {
    instruction: `Implement fixes for ALL fixable blockers. Don't stop at "easy" fixes.

For each fix-now blocker (sorted by cell impact):
1. Read the affected code
2. Implement the fix
3. Build: npm run build --workspace=<package>
4. Commit with descriptive message
5. Push to staging

For fix-prompt blockers:
1. Read the current test prompt in primary-live-runner.ts
2. Identify why the model doesn't follow instructions
3. Improve the prompt clarity, add explicit file-write instructions
4. Build and commit

For fix-config blockers:
1. Add missing env vars to .github/workflows/live-stack.yml
2. Document what secrets need to be added to repo settings
3. Commit workflow changes

For fix-retry blockers:
1. Note which agent/model/os/mode combos to re-dispatch
2. These will be handled in the dispatch step

Rules: never write fallbacks, keep changes minimal, build must pass.

Return { fixesLanded: number, promptsImproved: number, configsUpdated: number, retriesToDispatch: [{agent, model, os, mode}] }.`,
  },
}));

const parallelDispatchTask = defineTask('parallel-dispatch', async (args) => ({
  kind: 'node',
  title: 'Dispatch ALL pending/blocked/retry tests in parallel',
  labels: ['gardening', 'dispatch'],
  io: {
    instruction: `Dispatch tests for EVERY non-PASS cell. Be aggressive — dispatch everything.

1. For each fix landed: dispatch the affected agent/model/os/mode
2. For each closed blocker: dispatch all cells that were blocked by it
3. For each retry candidate: dispatch the flaky combo
4. For pending (---) cells: dispatch to fill coverage
5. For blocked cells where fix-config was applied: dispatch to verify

Group by OS and send parallel dispatches:
gh workflow run live-stack.yml --ref staging -f os=<os> -f 'matrix=[...]'

Matrix format: {"agent":"...","model":"...","mode":"...","install":"...","live":true}
Agent names: claude, codex, pi, gemini, hermes, opencode, copilot, cursor, omni
Model names: foundry-gpt55, foundry-gpt54mini, google-gemini31, anthropic-sonnet46, foundry-deepseek

Send ALL dispatches at once. Don't wait between them.

Return { dispatched: number, cellsCovered: number }.`,
  },
}));

const collectResultsTask = defineTask('collect-results', async (args) => ({
  kind: 'node',
  title: 'Poll for results — wait up to 20 minutes',
  labels: ['gardening', 'collect'],
  io: {
    instruction: `Poll for test results. Wait up to 20 minutes for dispatched tests.

Every 60 seconds:
1. gh run list --workflow=live-stack.yml --limit=15 --json databaseId,status,conclusion
2. For completed runs, extract SUCCESS/FAILURE job names
3. For failures, download top 3 artifacts to understand why

Collect all results into:
- passes: cells that should flip to PASS in wiki
- failures: cells that still fail (with reason)
- flaky: cells that sometimes pass, sometimes fail

Return { passes: [{agent, model, os, mode, runId}], failures: [{agent, model, os, mode, runId, reason}], totalPasses: number, totalFailures: number }.`,
  },
}));

const gardenWikiTask = defineTask('garden-wiki', async (args) => ({
  kind: 'node',
  title: 'Garden the wiki — update every cell with evidence',
  labels: ['gardening', 'wiki'],
  io: {
    instruction: `Update the QA Evidence wiki with ALL collected results.

1. cd ${args.wikiPath} && git pull

2. For each new PASS:
   - Find the section/model/agent/OS cell
   - Update from FAIL/blocked/--- to [PASS](run URL)
   - If the cell was blocked by an issue, the issue may now be closeable

3. For cells blocked by CLOSED issues that still show blocked:
   - If we have a PASS result: update to PASS
   - If we have a FAIL result: update the blocked reference to a new/current issue
   - If no test was run: change to --- (pending) for next iteration

4. Remove stale blocked references — if an issue was closed and the cell should work,
   don't leave it as blocked

5. Ensure EVERY cell has a status (no empty cells)

6. Recount: PASS, FAIL, blocked, pending

7. git add -A && git commit -m "Gardening: X cells flipped to PASS (Y/Z total)" && git push

Return { passCount: number, failCount: number, blockedCount: number, pendingCount: number, totalCount: number, cellsFlipped: number }.`,
  },
}));

const gardenIssuesTask = defineTask('garden-issues', async (args) => ({
  kind: 'node',
  title: 'Garden issues — close verified, update stale, file new',
  labels: ['gardening', 'issues'],
  io: {
    instruction: `Garden all live-stack GitHub issues.

1. **Close verified issues**: For each blocker where ALL blocked cells now show PASS:
   - Post verification comment with run links
   - gh issue close {number} --reason completed

2. **Update partial fixes**: For blockers where SOME cells flipped:
   - Post progress comment: "X of Y cells now PASS, Z still failing"
   - Update issue body/labels if needed

3. **Challenge stale issues**: For issues open >7 days with no progress:
   - Re-investigate: is the root cause still valid?
   - Can we try a different approach?
   - Post a comment with updated investigation

4. **File new issues**: For new failure patterns not covered by existing issues:
   - gh issue create --title "..." --body "..." --label live-stack
   - Include failure evidence, affected cells, and suggested fix

5. **Update issue labels**: Add/remove labels based on current state:
   - ready-for-dev if investigation is complete
   - priority labels based on cell count impact

Return { closed: number, updated: number, created: number, challenged: number }.`,
  },
}));
