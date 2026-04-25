/**
 * @process kanban/issue-workspace-linking-parity
 * @description Spec-driven implementation process for issue-to-workspace linking parity with multi-workspace association coverage, no shell subtasks, and no breakpoints.
 * @inputs { feature: string, packageRoot: string, references: string[], adversarialChecks: string[] }
 * @outputs { success: boolean, plan: object, tests: object, implementation: object, verification: object, completeness: object, adversarialReview: object }
 */

import { defineTask } from "@a5c-ai/babysitter-sdk";

import { completenessGateTask } from "../../../library/processes/shared/completeness-gate.js";

const scopeTask = defineTask("scope-issue-workspace-linking", (args, taskCtx) => ({
  kind: "agent",
  title: `Scope issue/workspace linking parity for ${args.feature}`,
  agent: {
    name: "general-purpose",
    prompt: {
      role: "Senior product engineer mapping parity requirements into executable acceptance criteria",
      task: "Translate issue-to-workspace parity requirements into concrete functional and verification expectations.",
      context: {
        feature: args.feature,
        packageRoot: args.packageRoot,
        references: args.references,
        adversarialChecks: args.adversarialChecks,
      },
      instructions: [
        `Read the referenced process guides: ${JSON.stringify(args.references)}.`,
        `Read the current implementation under "${args.packageRoot}".`,
        "Make create-from-issue, link-existing-workspace, multi-workspace rendering, empty/loading/error/recovery states, and issue/workspace navigation explicit in the acceptance criteria.",
        "Call out the data model expectations for multiple linked workspaces and stale/missing workspace behavior.",
        "Return JSON with acceptanceCriteria, filesToInspect, and risks.",
      ],
      outputFormat: "JSON",
    },
    outputSchema: {
      type: "object",
      required: ["acceptanceCriteria", "filesToInspect", "risks"],
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const testDesignTask = defineTask("design-issue-workspace-adversarial-tests", (args, taskCtx) => ({
  kind: "agent",
  title: `Design issue/workspace adversarial tests for ${args.feature}`,
  agent: {
    name: "general-purpose",
    prompt: {
      role: "Senior QA engineer specializing in state-heavy parity regressions",
      task: "Design the smallest high-signal test plan for issue/workspace linking parity.",
      context: {
        feature: args.feature,
        acceptanceCriteria: args.acceptanceCriteria,
        adversarialChecks: args.adversarialChecks,
      },
      instructions: [
        "Cover duplicate linking, missing workspace targets, stale links, multiple workspace attachments, and both navigation directions between issue and workspace surfaces.",
        "Prefer existing package-local test patterns and fixtures.",
        "Call out the expected failure mode for each adversarial check.",
        "Return JSON with unitTests, integrationChecks, and expectedFailureModes.",
      ],
      outputFormat: "JSON",
    },
    outputSchema: {
      type: "object",
      required: ["unitTests", "integrationChecks", "expectedFailureModes"],
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const implementTask = defineTask("implement-issue-workspace-linking", (args, taskCtx) => ({
  kind: "agent",
  title: `Implement issue/workspace linking parity for ${args.feature}`,
  agent: {
    name: "general-purpose",
    prompt: {
      role: "Senior TypeScript engineer implementing issue and workspace association parity",
      task: "Implement the issue/workspace linking surface and its shared data behavior.",
      context: {
        feature: args.feature,
        packageRoot: args.packageRoot,
        acceptanceCriteria: args.acceptanceCriteria,
        testPlan: args.testPlan,
      },
      instructions: [
        `Work only inside "${args.packageRoot}" unless a dependent shared type requires an explicit update.`,
        "Preserve multiple workspace associations per issue.",
        "Reject duplicate links and surface missing or stale workspace states for recovery.",
        "Ensure issue-panel and workspace-shell navigation outcomes are both implemented and testable.",
        "Return JSON with filesModified, behaviorsImplemented, and unresolvedRisks.",
      ],
      outputFormat: "JSON",
    },
    outputSchema: {
      type: "object",
      required: ["filesModified", "behaviorsImplemented", "unresolvedRisks"],
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const verificationTask = defineTask("verify-issue-workspace-linking", (args, taskCtx) => ({
  kind: "agent",
  title: `Verify issue/workspace linking parity for ${args.feature}`,
  agent: {
    name: "general-purpose",
    prompt: {
      role: "Adversarial QA reviewer validating issue/workspace association behavior",
      task: "Verify the implementation against the parity contract and requested adversarial checks.",
      context: {
        feature: args.feature,
        acceptanceCriteria: args.acceptanceCriteria,
        implementation: args.implementation,
        adversarialChecks: args.adversarialChecks,
      },
      instructions: [
        "Use the exact adversarial check ids from the input when reporting coveredChecks and remainingGaps.",
        'Also report navigation coverage using ids "issue-panel-navigation" and "workspace-shell-navigation".',
        "Explicitly validate duplicate linking rejection, missing workspace targets, stale link recovery, and multiple workspace attachment behavior.",
        "Return JSON with verdict, passes, coveredChecks, and remainingGaps.",
      ],
      outputFormat: "JSON",
    },
    outputSchema: {
      type: "object",
      required: ["verdict", "passes", "coveredChecks", "remainingGaps"],
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

export async function process(inputs, ctx) {
  const scope = await ctx.task(scopeTask, {
    feature: inputs.feature,
    packageRoot: inputs.packageRoot,
    references: inputs.references ?? [],
    adversarialChecks: inputs.adversarialChecks ?? [],
  });

  const testPlan = await ctx.task(testDesignTask, {
    feature: inputs.feature,
    acceptanceCriteria: scope.acceptanceCriteria,
    adversarialChecks: inputs.adversarialChecks ?? [],
  });

  const implementation = await ctx.task(implementTask, {
    feature: inputs.feature,
    packageRoot: inputs.packageRoot,
    acceptanceCriteria: scope.acceptanceCriteria,
    testPlan,
  });

  const verification = await ctx.task(verificationTask, {
    feature: inputs.feature,
    acceptanceCriteria: scope.acceptanceCriteria,
    implementation,
    adversarialChecks: inputs.adversarialChecks ?? [],
  });

  const requiredChecks = [
    ...(inputs.adversarialChecks ?? []),
    "issue-panel-navigation",
    "workspace-shell-navigation",
  ];
  const coveredChecks = new Set(verification.coveredChecks ?? []);
  const completeness = await ctx.task(completenessGateTask, {
    identifiedIssues: requiredChecks.map((id) => ({
      id,
      description: `Parity check ${id}`,
      severity: "high",
    })),
    resolutions: Object.fromEntries(
      requiredChecks.map((id) => [
        id,
        {
          status: coveredChecks.has(id) ? "addressed" : "unaddressed",
          justification: coveredChecks.has(id)
            ? `Covered during verification for ${inputs.feature}.`
            : `Verification did not confirm ${id}.`,
        },
      ]),
    ),
  });

  return {
    success: Boolean(verification.passes) && Boolean(completeness.allAddressed),
    plan: scope,
    tests: testPlan,
    implementation,
    verification,
    completeness,
    adversarialReview: {
      requestedChecks: requiredChecks,
      coveredChecks: verification.coveredChecks ?? [],
      remainingGaps: verification.remainingGaps ?? [],
    },
    metadata: {
      processId: "kanban/issue-workspace-linking-parity",
      timestamp: ctx.now(),
      shellTasks: 0,
      breakpoints: 0,
    },
  };
}
