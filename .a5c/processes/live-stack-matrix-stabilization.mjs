import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * @process processes/live-stack/live-stack-matrix-stabilization
 * @description Stabilize the live-stack test matrix to 100% PASS. Loops internally:
 *   assess → triage → fix → dispatch → collect → update wiki → update issues → re-assess.
 *   Only completes when every cell shows PASS.
 * @trigger manual
 * @inputs { repo: string, wikiPath: string, maxIterations: number }
 * @outputs { passCount: number, totalCount: number, iterations: number }
 */

export async function process(inputs, ctx) {
  const maxIter = inputs.maxIterations ?? 10;
  let iteration = 0;
  let lastPassCount = 0;

  while (iteration < maxIter) {
    iteration++;

    const state = await ctx.task(assessMatrixTask, {
      repo: inputs.repo,
      wikiPath: inputs.wikiPath,
      iteration,
    });

    if (state.passCount === state.totalCount) {
      return { passCount: state.passCount, totalCount: state.totalCount, iterations: iteration };
    }

    if (state.passCount === lastPassCount && iteration > 1) {
      // No progress since last iteration — need different approach
      const stuck = await ctx.task(unstickTask, {
        repo: inputs.repo,
        state,
        iteration,
      });
    }
    lastPassCount = state.passCount;

    const harvest = await ctx.task(harvestAndTriageTask, { repo: inputs.repo, state, iteration });
    const fixes = await ctx.task(fixAndDispatchTask, { repo: inputs.repo, wikiPath: inputs.wikiPath, harvest, state, iteration });
    const results = await ctx.task(collectAndUpdateTask, { repo: inputs.repo, wikiPath: inputs.wikiPath, fixes, state, iteration });
  }

  // Max iterations reached without 100% — throw to prevent false completion
  throw new Error(`Max iterations (${maxIter}) reached. Last state: ${lastPassCount}/${975} PASS. Process needs more iterations or external actions.`);
}

const assessMatrixTask = defineTask('assess-matrix', async (args) => ({
  kind: 'node',
  title: `[Iter ${args.iteration}] Assess matrix state`,
  labels: ['gardening', 'assess'],
  io: {
    instruction: `Iteration ${args.iteration}: Assess the live-stack test matrix.

1. Pull wiki: cd ${args.wikiPath} && git pull
2. Count PASS, FAIL, blocked, pending cells
3. Check which blocking issues are now closed
4. Harvest any un-collected CI results from recent runs

Return { passCount, totalCount, blockedCount, pendingCount, closedBlockerCells, newPassesAvailable }.`,
  },
}));

const unstickTask = defineTask('unstick', async (args) => ({
  kind: 'node',
  title: `[Iter ${args.iteration}] Unstick — no progress, try different approach`,
  labels: ['gardening', 'unstick'],
  io: {
    instruction: `No progress since last iteration (still ${args.state.passCount}/${args.state.totalCount}).

Try a DIFFERENT approach for each top blocker:
1. If previous fix didn't work, investigate WHY and try something else
2. If tests weren't dispatched, dispatch them now
3. If tests were dispatched but not collected, collect results
4. If external action is needed, document exactly what and who needs to do it
5. Consider: can the test scenario be simplified to work around the blocker?
6. Consider: can the blocked agent be tested with a different model/mode?

Return { newApproaches: [{issue, previousAttempt, newApproach}], actionsNeeded: [{action, owner}] }.`,
  },
}));

const harvestAndTriageTask = defineTask('harvest-triage', async (args) => ({
  kind: 'node',
  title: `[Iter ${args.iteration}] Harvest failures + triage blockers`,
  labels: ['gardening', 'triage'],
  io: {
    instruction: `Iteration ${args.iteration}: Harvest and triage.

1. Check all recent completed CI runs for new results
2. For each blocker, determine the most impactful fix available NOW
3. Challenge "external" assumptions — is there really no code workaround?
4. Prioritize by: cells impacted × fixability

Return { fixable: [{issue, cells, action}], dispatches: [{agent, model, os, mode}], blockedExternal: number }.`,
  },
}));

const fixAndDispatchTask = defineTask('fix-dispatch', async (args) => ({
  kind: 'node',
  title: `[Iter ${args.iteration}] Fix code + dispatch tests in parallel`,
  labels: ['gardening', 'fix', 'dispatch'],
  io: {
    instruction: `Iteration ${args.iteration}: Implement fixes AND dispatch tests simultaneously.

1. For each fixable blocker: implement the code change, build, commit
2. For closed-issue blocked cells: dispatch verification tests
3. For retry candidates: re-dispatch the tests
4. Push all commits to staging
5. Dispatch ALL tests in parallel (don't wait between dispatches)

Return { fixesLanded: number, testsDispatched: number }.`,
  },
}));

const collectAndUpdateTask = defineTask('collect-update', async (args) => ({
  kind: 'node',
  title: `[Iter ${args.iteration}] Collect results + update wiki + update issues`,
  labels: ['gardening', 'collect', 'wiki', 'issues'],
  io: {
    instruction: `Iteration ${args.iteration}: Collect, update wiki, update issues.

1. Wait up to 15 minutes for dispatched tests to complete
2. Harvest all PASS/FAIL results
3. Update wiki: flip PASS cells, mark new FAILs with issues
4. Close verified issues, update partial fixes, file new issues
5. Count final state: PASS, FAIL, blocked, pending

cd ${args.wikiPath} && git pull && ... && git add -A && git commit && git push

Return { passCount, totalCount, cellsFlipped, issuesClosed }.`,
  },
}));
