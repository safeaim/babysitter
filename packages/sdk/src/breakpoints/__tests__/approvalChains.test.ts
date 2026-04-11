/**
 * Tests for GAP-BRK-001: Breakpoint Approval Chains.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateApprovalChain,
  advanceChainStep,
  initChainState,
  resolveEscalationPath,
  type ApprovalChainDefinition,
  type ApprovalChainStep,
  type ApprovalChainState,
  type CompletedChainStep,
} from "../approvalChains";

function makeChain(
  steps: ApprovalChainStep[],
  overrides: Partial<ApprovalChainDefinition> = {},
): ApprovalChainDefinition {
  return {
    chainId: "test-chain",
    steps,
    ...overrides,
  };
}

function makeCompletedStep(
  stepId: string,
  approved: boolean,
): CompletedChainStep {
  return {
    stepId,
    approved,
    completedAt: "2026-01-01T00:00:00Z",
  };
}

describe("approvalChains (GAP-BRK-001)", () => {
  describe("initChainState", () => {
    it("creates state at index 0 with pending status", () => {
      const state = initChainState("my-chain");
      expect(state.chainId).toBe("my-chain");
      expect(state.currentStepIndex).toBe(0);
      expect(state.completedSteps).toEqual([]);
      expect(state.status).toBe("pending");
      expect(state.startedAt).toBeDefined();
    });
  });

  describe("advanceChainStep", () => {
    it("appends result and increments index", () => {
      const state = initChainState("c");
      const completed = makeCompletedStep("step-0", true);
      const next = advanceChainStep(state, completed);
      expect(next.currentStepIndex).toBe(1);
      expect(next.completedSteps).toHaveLength(1);
      expect(next.completedSteps[0].stepId).toBe("step-0");
    });
  });

  describe("evaluateApprovalChain", () => {
    it("single-step chain approved → status approved", () => {
      const chain = makeChain([
        { stepId: "reviewer", expert: "alice", label: "Review" },
      ]);
      const state: ApprovalChainState = {
        chainId: "test-chain",
        currentStepIndex: 1,
        completedSteps: [makeCompletedStep("reviewer", true)],
        status: "pending",
        startedAt: "2026-01-01T00:00:00Z",
      };

      const result = evaluateApprovalChain(chain, state);
      expect(result.status).toBe("approved");
      expect(result.completedSteps).toHaveLength(1);
    });

    it("two-step chain, step 0 done, step 1 pending", () => {
      const chain = makeChain([
        { stepId: "reviewer", expert: "alice", label: "Review" },
        { stepId: "approver", expert: "bob", label: "Approve" },
      ]);
      const state: ApprovalChainState = {
        chainId: "test-chain",
        currentStepIndex: 1,
        completedSteps: [makeCompletedStep("reviewer", true)],
        status: "pending",
        startedAt: "2026-01-01T00:00:00Z",
      };

      const result = evaluateApprovalChain(chain, state);
      expect(result.status).toBe("pending");
      expect(result.nextStep?.stepId).toBe("approver");
    });

    it("step rejected → status rejected immediately", () => {
      const chain = makeChain([
        { stepId: "reviewer", expert: "alice", label: "Review" },
        { stepId: "approver", expert: "bob", label: "Approve" },
      ]);
      const state: ApprovalChainState = {
        chainId: "test-chain",
        currentStepIndex: 1,
        completedSteps: [makeCompletedStep("reviewer", false)],
        status: "pending",
        startedAt: "2026-01-01T00:00:00Z",
      };

      const result = evaluateApprovalChain(chain, state);
      expect(result.status).toBe("rejected");
    });

    it("quorum met → approved", () => {
      const chain = makeChain([
        { stepId: "quorum-step", expert: ["alice", "bob", "carol"], label: "Quorum" },
      ], {
        quorum: { experts: ["alice", "bob", "carol"], required: 2, strategy: "quorum" },
      });
      const state: ApprovalChainState = {
        chainId: "test-chain",
        currentStepIndex: 1,
        completedSteps: [
          makeCompletedStep("quorum-step", true),
          makeCompletedStep("quorum-step", true),
        ],
        status: "pending",
        startedAt: "2026-01-01T00:00:00Z",
      };

      const result = evaluateApprovalChain(chain, state);
      expect(result.status).toBe("approved");
    });

    it("quorum not met → pending", () => {
      const chain = makeChain([
        { stepId: "quorum-step", expert: ["alice", "bob", "carol"], label: "Quorum" },
      ], {
        quorum: { experts: ["alice", "bob", "carol"], required: 2, strategy: "quorum" },
      });
      const state: ApprovalChainState = {
        chainId: "test-chain",
        currentStepIndex: 0,
        completedSteps: [
          makeCompletedStep("quorum-step", true),
        ],
        status: "pending",
        startedAt: "2026-01-01T00:00:00Z",
      };

      const result = evaluateApprovalChain(chain, state);
      expect(result.status).toBe("pending");
    });

    it("all steps approved → status approved with all completedSteps", () => {
      const chain = makeChain([
        { stepId: "s1", expert: "alice", label: "Step 1" },
        { stepId: "s2", expert: "bob", label: "Step 2" },
      ]);
      const state: ApprovalChainState = {
        chainId: "test-chain",
        currentStepIndex: 2,
        completedSteps: [
          makeCompletedStep("s1", true),
          makeCompletedStep("s2", true),
        ],
        status: "pending",
        startedAt: "2026-01-01T00:00:00Z",
      };

      const result = evaluateApprovalChain(chain, state);
      expect(result.status).toBe("approved");
      expect(result.completedSteps).toHaveLength(2);
    });
  });

  describe("resolveEscalationPath", () => {
    it("resolves escalateTo target step", () => {
      const chain = makeChain([
        { stepId: "reviewer", expert: "alice", label: "Review", escalateTo: "manager" },
        { stepId: "manager", expert: "bob", label: "Manager Approval" },
      ]);

      const target = resolveEscalationPath(chain, "reviewer");
      expect(target?.stepId).toBe("manager");
    });

    it("returns undefined when no escalateTo configured", () => {
      const chain = makeChain([
        { stepId: "reviewer", expert: "alice", label: "Review" },
      ]);

      const target = resolveEscalationPath(chain, "reviewer");
      expect(target).toBeUndefined();
    });

    it("returns undefined when escalateTo target not found", () => {
      const chain = makeChain([
        { stepId: "reviewer", expert: "alice", label: "Review", escalateTo: "nonexistent" },
      ]);

      const target = resolveEscalationPath(chain, "reviewer");
      expect(target).toBeUndefined();
    });
  });
});
