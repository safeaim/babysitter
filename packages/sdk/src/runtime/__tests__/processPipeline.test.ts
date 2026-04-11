/**
 * Tests for GAP-PROC-001: Process Chaining and Pipelines.
 */

import { describe, it, expect } from "vitest";
import {
  definePipeline,
  buildStepInputs,
  validatePipelineDefinition,
  type PipelineDefinition,
  type PipelineStepDefinition,
} from "../processPipeline";

describe("processPipeline (GAP-PROC-001)", () => {
  describe("definePipeline", () => {
    it("creates a valid PipelineDefinition", () => {
      const steps: PipelineStepDefinition[] = [
        { stepId: "step-1", processId: "process-a", importPath: "/path/a.js" },
        { stepId: "step-2", processId: "process-b", importPath: "/path/b.js" },
      ];
      const pipeline = definePipeline("my-pipeline", steps);
      expect(pipeline.pipelineId).toBe("my-pipeline");
      expect(pipeline.steps).toHaveLength(2);
      expect(pipeline.propagateOutput).toBe(true);
    });

    it("accepts propagateOutput override", () => {
      const pipeline = definePipeline("p", [
        { stepId: "s1", processId: "a", importPath: "/a.js" },
      ], { propagateOutput: false });
      expect(pipeline.propagateOutput).toBe(false);
    });
  });

  describe("validatePipelineDefinition", () => {
    it("returns valid for correct pipeline", () => {
      const pipeline = definePipeline("p", [
        { stepId: "s1", processId: "a", importPath: "/a.js" },
      ]);
      const result = validatePipelineDefinition(pipeline);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("rejects empty steps", () => {
      const pipeline: PipelineDefinition = {
        pipelineId: "p",
        steps: [],
        propagateOutput: true,
      };
      const result = validatePipelineDefinition(pipeline);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
    });

    it("rejects duplicate stepIds", () => {
      const pipeline = definePipeline("p", [
        { stepId: "s1", processId: "a", importPath: "/a.js" },
        { stepId: "s1", processId: "b", importPath: "/b.js" },
      ]);
      const result = validatePipelineDefinition(pipeline);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true);
    });

    it("rejects steps missing processId", () => {
      const pipeline = definePipeline("p", [
        { stepId: "s1", processId: "", importPath: "/a.js" },
      ]);
      const result = validatePipelineDefinition(pipeline);
      expect(result.valid).toBe(false);
    });
  });

  describe("buildStepInputs", () => {
    it("merges previous output into step inputs when propagateOutput is true", () => {
      const previousOutput = { result: "hello" };
      const inputs = buildStepInputs(previousOutput, { foo: "bar" }, true);
      expect(inputs).toEqual({ result: "hello", foo: "bar" });
    });

    it("returns only initialInputs when propagateOutput is false", () => {
      const previousOutput = { result: "hello" };
      const inputs = buildStepInputs(previousOutput, { foo: "bar" }, false);
      expect(inputs).toEqual({ foo: "bar" });
    });

    it("returns previous output when no initialInputs", () => {
      const inputs = buildStepInputs({ result: "hello" }, undefined, true);
      expect(inputs).toEqual({ result: "hello" });
    });

    it("returns empty object when both are undefined", () => {
      const inputs = buildStepInputs(undefined, undefined, true);
      expect(inputs).toEqual({});
    });

    it("previous output overwrites initialInputs for same keys", () => {
      const inputs = buildStepInputs({ key: "new" }, { key: "old" }, true);
      expect(inputs).toEqual({ key: "new" });
    });
  });
});
