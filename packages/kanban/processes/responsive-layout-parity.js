/**
 * @process kanban/responsive-layout-parity
 * @description Package-local responsive parity proof process for board, issue, workspace, preview, and settings surfaces with no shell subtasks and no breakpoints.
 * @inputs { feature: string, packageRoot: string, requiredSurfaces: string[], viewportMatrix: string[], constrainedStates: string[], proofArtifacts?: string[] }
 * @outputs { success: boolean, parityContract: object, adversarialVerification: object, metadata: object }
 */

function unique(values) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.length > 0)));
}

export async function process(inputs, ctx) {
  const requiredSurfaces = unique(inputs.requiredSurfaces ?? []);
  const viewportMatrix = unique(inputs.viewportMatrix ?? []);
  const constrainedStates = unique(inputs.constrainedStates ?? []);
  const proofArtifacts = unique(inputs.proofArtifacts ?? []);
  const requiredProofAreas = [
    "board/list mobile parity",
    "workspace constrained fallback",
    "preview viewport correctness",
    "settings and dialog small-screen behavior",
    "navigation and shortcuts usability",
  ];
  const missingAreas = requiredProofAreas.filter(
    (area) => !proofArtifacts.some((artifact) => artifact.toLowerCase().includes(area.split(" ")[0])),
  );

  return {
    success:
      requiredSurfaces.length >= 5 &&
      viewportMatrix.length >= 3 &&
      constrainedStates.length >= 3 &&
      missingAreas.length === 0,
    parityContract: {
      feature: inputs.feature,
      packageRoot: inputs.packageRoot,
      requiredSurfaces,
      viewportMatrix,
      constrainedStates,
      desktopOnlyParityAccepted: false,
    },
    adversarialVerification: {
      proofArtifacts,
      requiredProofAreas,
      missingAreas,
    },
    metadata: {
      processId: "kanban/responsive-layout-parity",
      timestamp: ctx.now(),
      shellTasks: 0,
      breakpoints: 0,
    },
  };
}
