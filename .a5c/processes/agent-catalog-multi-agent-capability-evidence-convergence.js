/**
 * @process .a5c/processes/agent-catalog-multi-agent-capability-evidence-convergence
 * @description Converge multi-agent capability evidence using only agent tasks.
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

export async function process(inputs, ctx) {
  const {
    workspaceRoot = '.',
    specPath = '.a5c/processes/specs/agent-catalog-multi-agent-capability-evidence-convergence-request.md',
    maxRefinementPasses = 2,
  } = inputs;

  const [spec, currentState] = await ctx.parallel.all([
    () => ctx.task(readSpecTask, { workspaceRoot, specPath }),
    () => ctx.task(inspectCurrentStateTask, { workspaceRoot }),
  ]);

  const plan = await ctx.task(planTask, {
    requestSpec: spec.requestSpec,
    currentState: currentState.snapshot,
  });

  let implementation = await ctx.task(implementTask, {
    workspaceRoot,
    requestSpec: spec.requestSpec,
    plan,
  });

  let verification = await ctx.task(verifyTask, {
    workspaceRoot,
    requestSpec: spec.requestSpec,
    plan,
  });

  let review = await ctx.task(reviewTask, {
    requestSpec: spec.requestSpec,
    plan,
    verification,
  });

  let refinementAttempt = 1;
  while ((verification.success !== true || review.approved !== true) && refinementAttempt <= maxRefinementPasses) {
    implementation = await ctx.task(refineTask, {
      workspaceRoot,
      requestSpec: spec.requestSpec,
      plan,
      verification,
      review,
      refinementAttempt,
    });

    verification = await ctx.task(verifyTask, {
      workspaceRoot,
      requestSpec: spec.requestSpec,
      plan,
    });

    review = await ctx.task(reviewTask, {
      requestSpec: spec.requestSpec,
      plan,
      verification,
    });

    refinementAttempt += 1;
  }

  return {
    success: verification.success === true && review.approved === true,
    plan,
    implementation,
    verification,
    review,
    metadata: {
      processId: '.a5c/processes/agent-catalog-multi-agent-capability-evidence-convergence',
      timestamp: ctx.now(),
    },
  };
}

export const readSpecTask = defineTask('agent-catalog-multi-agent-evidence/read-spec', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Read the multi-agent evidence convergence request spec',
  agent: {
    name: 'agent-catalog-multi-agent-evidence-spec-reader',
    prompt: {
      role: 'staff engineer preparing a graph-evidence convergence run',
      task: 'Read the request spec from the repository and return it verbatim in structured form.',
      instructions: [
        `Open and read ${args.specPath}.`,
        'Return JSON only with requestSpec (string) and constraints (string[]).',
      ],
      outputFormat: 'JSON with requestSpec (string) and constraints (string[])',
    },
    outputSchema: {
      type: 'object',
      required: ['requestSpec', 'constraints'],
      properties: {
        requestSpec: { type: 'string' },
        constraints: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
  },
  labels: ['agent-catalog', 'evidence', 'spec', 'agent'],
}));

export const inspectCurrentStateTask = defineTask('agent-catalog-multi-agent-evidence/inspect-state', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Inspect current multi-agent evidence state',
  agent: {
    name: 'agent-catalog-multi-agent-evidence-inspector',
    prompt: {
      role: 'staff engineer auditing ontology state before convergence',
      task: 'Inspect the current graph state for Codex, Gemini CLI, Copilot, Cursor, OpenCode, and OMP evidence coverage.',
      instructions: [
        `Work inside ${args.workspaceRoot}.`,
        'Read the support and provenance files for codex, gemini, copilot, cursor, opencode, and omp.',
        'Read the evidence node shards under packages/agent-catalog/graph/nodes/evidence.',
        'Summarize the current broad evidence bundles, missing capability-specific claims, and any files that should be added or rewritten.',
        'Return JSON only with snapshot (string), supportFiles (string[]), provenanceFiles (string[]), and gaps (string[]).',
      ],
      outputFormat: 'JSON with snapshot (string), supportFiles (string[]), provenanceFiles (string[]), and gaps (string[])',
    },
    outputSchema: {
      type: 'object',
      required: ['snapshot', 'supportFiles', 'provenanceFiles', 'gaps'],
      properties: {
        snapshot: { type: 'string' },
        supportFiles: { type: 'array', items: { type: 'string' } },
        provenanceFiles: { type: 'array', items: { type: 'string' } },
        gaps: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
  },
  labels: ['agent-catalog', 'evidence', 'analysis', 'agent'],
}));

export const planTask = defineTask('agent-catalog-multi-agent-evidence/plan', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Plan multi-agent capability evidence convergence',
  agent: {
    name: 'agent-catalog-multi-agent-evidence-planner',
    prompt: {
      role: 'staff engineer planning ontology evidence convergence',
      task: 'Plan the graph changes needed so each agent capability row has an appropriately narrow evidence basis.',
      context: {
        currentState: args.currentState,
      },
      instructions: [
        'SPEC (verbatim, do not paraphrase):',
        '---',
        args.requestSpec,
        '---',
        'Focus on Codex, Gemini CLI, GitHub Copilot, Cursor, OpenCode, and OMP.',
        'Recommend evidence shard files, capability-row rewrites, provenance rewrites, tests, and verification commands.',
        'Return JSON only with summary, evidenceFiles, graphFiles, testFiles, and verificationCommands.',
      ],
      outputFormat: 'JSON with summary (string), evidenceFiles (string[]), graphFiles (string[]), testFiles (string[]), and verificationCommands (string[])',
    },
    outputSchema: {
      type: 'object',
      required: ['summary', 'evidenceFiles', 'graphFiles', 'testFiles', 'verificationCommands'],
      properties: {
        summary: { type: 'string' },
        evidenceFiles: { type: 'array', items: { type: 'string' } },
        graphFiles: { type: 'array', items: { type: 'string' } },
        testFiles: { type: 'array', items: { type: 'string' } },
        verificationCommands: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
  },
  labels: ['agent-catalog', 'evidence', 'planning', 'agent'],
}));

export const implementTask = defineTask('agent-catalog-multi-agent-evidence/implement', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Implement multi-agent capability evidence convergence',
  agent: {
    name: 'agent-catalog-multi-agent-evidence-implementer',
    prompt: {
      role: 'staff engineer implementing graph-backed evidence corrections',
      task: 'Implement the planned graph and test changes for multi-agent capability evidence convergence.',
      context: {
        plan: args.plan,
      },
      instructions: [
        'SPEC (verbatim, do not paraphrase):',
        '---',
        args.requestSpec,
        '---',
        `Work inside ${args.workspaceRoot}.`,
        'Keep YAML graph data as the source of truth.',
        'Prefer focused shard files and avoid growing a single monolithic evidence file.',
        'Do not introduce any shell-kind tasks into Babysitter process definitions.',
        'Return JSON only with filesChanged, createdFiles, removedFiles, and residualRisks.',
      ],
      outputFormat: 'JSON with filesChanged (string[]), createdFiles (string[]), removedFiles (string[]), residualRisks (string[])',
    },
    outputSchema: {
      type: 'object',
      required: ['filesChanged', 'createdFiles', 'removedFiles', 'residualRisks'],
      properties: {
        filesChanged: { type: 'array', items: { type: 'string' } },
        createdFiles: { type: 'array', items: { type: 'string' } },
        removedFiles: { type: 'array', items: { type: 'string' } },
        residualRisks: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
  },
  labels: ['agent-catalog', 'evidence', 'implementation', 'agent'],
}));

export const verifyTask = defineTask('agent-catalog-multi-agent-evidence/verify', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Verify multi-agent capability evidence convergence',
  agent: {
    name: 'agent-catalog-multi-agent-evidence-verifier',
    prompt: {
      role: 'staff engineer verifying graph integrity and package health',
      task: 'Verify the graph export, build, tests, and version checks after the multi-agent evidence changes.',
      context: {
        plan: args.plan,
      },
      instructions: [
        'SPEC (verbatim, do not paraphrase):',
        '---',
        args.requestSpec,
        '---',
        `Work inside ${args.workspaceRoot}.`,
        'Run the verification commands needed for agent-catalog health, including evidence generation, build, test, and version checks.',
        'Return JSON only with success (boolean), commands (string[]), summary (string), and failures (string[]).',
      ],
      outputFormat: 'JSON with success (boolean), commands (string[]), summary (string), and failures (string[])',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'commands', 'summary', 'failures'],
      properties: {
        success: { type: 'boolean' },
        commands: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
        failures: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
  },
  labels: ['agent-catalog', 'evidence', 'verification', 'agent'],
}));

export const reviewTask = defineTask('agent-catalog-multi-agent-evidence/review', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Review multi-agent capability evidence convergence',
  agent: {
    name: 'agent-catalog-multi-agent-evidence-reviewer',
    prompt: {
      role: 'strict reviewer validating ontology evidence discipline',
      task: 'Review whether the multi-agent evidence convergence is now capability-specific, vendor-backed where available, and still faithful to the local ontology.',
      context: {
        plan: args.plan,
        verification: args.verification,
      },
      instructions: [
        'SPEC (verbatim, do not paraphrase):',
        '---',
        args.requestSpec,
        '---',
        'Focus on whether support rows and provenance rows now match, whether the new process avoids shell tasks, and whether any agent still overclaims unsupported inherent capabilities.',
        'Return JSON only with approved (boolean), findings (string[]), and followUps (string[]).',
      ],
      outputFormat: 'JSON with approved (boolean), findings (string[]), and followUps (string[])',
    },
    outputSchema: {
      type: 'object',
      required: ['approved', 'findings', 'followUps'],
      properties: {
        approved: { type: 'boolean' },
        findings: { type: 'array', items: { type: 'string' } },
        followUps: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
  },
  labels: ['agent-catalog', 'evidence', 'review', 'agent'],
}));

export const refineTask = defineTask('agent-catalog-multi-agent-evidence/refine', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Refine multi-agent capability evidence convergence',
  agent: {
    name: 'agent-catalog-multi-agent-evidence-refiner',
    prompt: {
      role: 'staff engineer closing evidence and verification gaps',
      task: 'Refine the implementation based on verification failures or review findings.',
      context: {
        plan: args.plan,
        verification: args.verification,
        review: args.review,
      },
      instructions: [
        'SPEC (verbatim, do not paraphrase):',
        '---',
        args.requestSpec,
        '---',
        `Work inside ${args.workspaceRoot}.`,
        `This is refinement attempt ${args.refinementAttempt}.`,
        'Address only the remaining evidence-discipline or verification issues.',
        'Return JSON only with filesChanged, residualRisks, and addressedFindings.',
      ],
      outputFormat: 'JSON with filesChanged (string[]), residualRisks (string[]), and addressedFindings (string[])',
    },
    outputSchema: {
      type: 'object',
      required: ['filesChanged', 'residualRisks', 'addressedFindings'],
      properties: {
        filesChanged: { type: 'array', items: { type: 'string' } },
        residualRisks: { type: 'array', items: { type: 'string' } },
        addressedFindings: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`,
  },
  labels: ['agent-catalog', 'evidence', 'refinement', 'agent'],
}));
