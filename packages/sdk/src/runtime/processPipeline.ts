/**
 * GAP-PROC-001: Process Chaining and Pipelines.
 *
 * Chain multiple processes into pipelines where output of one becomes
 * input of the next. Pipeline definition, validation, and input propagation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineStepDefinition {
  stepId: string;
  processId: string;
  importPath: string;
  exportName?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface PipelineDefinition {
  pipelineId: string;
  steps: PipelineStepDefinition[];
  propagateOutput: boolean;
}

export interface PipelineStepResult {
  stepId: string;
  runId: string;
  runDir: string;
  output: unknown;
  status: "completed" | "failed";
}

export interface PipelineResult {
  pipelineId: string;
  steps: PipelineStepResult[];
  finalOutput: unknown;
  status: "completed" | "failed";
}

export interface PipelineValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a pipeline definition from steps.
 */
export function definePipeline(
  pipelineId: string,
  steps: PipelineStepDefinition[],
  options?: { propagateOutput?: boolean },
): PipelineDefinition {
  return {
    pipelineId,
    steps,
    propagateOutput: options?.propagateOutput ?? true,
  };
}

/**
 * Validate a pipeline definition.
 */
export function validatePipelineDefinition(
  pipeline: PipelineDefinition,
): PipelineValidationResult {
  const errors: string[] = [];

  if (pipeline.steps.length === 0) {
    errors.push("Pipeline steps cannot be empty");
  }

  const stepIds = new Set<string>();
  for (const step of pipeline.steps) {
    if (stepIds.has(step.stepId)) {
      errors.push(`Duplicate stepId: ${step.stepId} (duplicate)`);
    }
    stepIds.add(step.stepId);

    if (!step.processId) {
      errors.push(`Step ${step.stepId}: processId is required`);
    }

    if (!step.importPath) {
      errors.push(`Step ${step.stepId}: importPath is required`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build inputs for a pipeline step by merging previous output
 * with initial inputs.
 */
export function buildStepInputs(
  previousOutput: unknown,
  initialInputs: unknown,
  propagateOutput: boolean,
): Record<string, unknown> {
  if (!propagateOutput) {
    return (initialInputs as Record<string, unknown>) ?? {};
  }

  const base = (initialInputs as Record<string, unknown>) ?? {};
  const output = (previousOutput as Record<string, unknown>) ?? {};

  return { ...base, ...output };
}
