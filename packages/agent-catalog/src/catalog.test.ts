import { describe, expect, it } from "vitest";
import {
  AGENT_CATALOG,
  getCatalogGraphDocument,
  getCatalogGraphSnapshot,
  getCatalogOntologySchema,
  getFallbackHarnessMetadata,
  getHookNameMap,
  getHooksMuxDetectionRules,
  getOntologyEvidenceManifest,
  getOntologyEvidenceSnapshot,
  getUiAgentCards,
  listOntologyNodesByKind,
  lookupHarnessImage,
  listAgentVersions,
} from "./index";

describe("agent-catalog graph-backed ontology", () => {
  it("loads YAML graph metadata and schema", () => {
    expect(getCatalogGraphDocument().graphId).toBe("graph:agent-catalog");
    expect(getCatalogOntologySchema().version).toContain("agent-catalog-v2");
    expect(getCatalogGraphSnapshot().nodes.length).toBeGreaterThan(50);
  });

  it("keeps version-scoped codex rows", () => {
    const codex = listAgentVersions().filter((agent) => agent.agentId === "codex");
    expect(codex).toHaveLength(2);
    expect(codex.map((agent) => agent.versionRange)).toContain(">=0.119.0");
  });

  it("exposes shared fallback metadata for sdk consumers", () => {
    const metadata = getFallbackHarnessMetadata("claude-code");
    expect(metadata).toBeDefined();
    expect(metadata!.adapterName).toBe("claude");
    expect(metadata!.capabilities.supportsMCP).toBe(true);
    expect(getFallbackHarnessMetadata("babysitter-agent")).toBeUndefined();
  });

  it("exposes hooks-mux detection rules from discovery-signal nodes", () => {
    const rules = getHooksMuxDetectionRules();
    expect(rules.find((rule) => rule.adapter === "codex" && rule.confidence === "medium")).toBeDefined();
  });

  it("exposes plugin hook-name mappings from hook-mapping nodes", () => {
    const hookMap = getHookNameMap();
    expect(hookMap.SessionStart.codex).toBe("SessionStart");
    expect(hookMap.AfterAgent.gemini).toBe("AfterAgent");
  });

  it("exposes UI cards and harness images from graph-derived wrappers", () => {
    expect(getUiAgentCards().length).toBe(AGENT_CATALOG.agents.length);
    expect(getUiAgentCards()[0].filePath).toContain("graph/nodes/agents/versions.yaml");
    expect(lookupHarnessImage("codex")?.image).toContain("codex");
  });

  it("keeps provider catalog scoped to model providers rather than harness vendors", () => {
    const providerIds = AGENT_CATALOG.providers.map((provider) => provider.providerId);
    expect(providerIds).not.toContain("cursor");
    expect(providerIds).not.toContain("a5c-ai");
    expect(providerIds).not.toContain("opencode");
    expect(providerIds).not.toContain("openclaw");
    expect(providerIds).toContain("openai");
  });

  it("includes richer schema node kinds for packages, ci, claims, and runtime semantics", () => {
    expect(listOntologyNodesByKind("PackageSurface").length).toBeGreaterThan(3);
    expect(listOntologyNodesByKind("CiSurface").length).toBeGreaterThan(0);
    expect(listOntologyNodesByKind("Claim").length).toBeGreaterThan(5);
    expect(listOntologyNodesByKind("SessionSemantics").length).toBeGreaterThan(3);
  });

  it("loads the sharded ontology evidence export through its manifest", () => {
    const manifest = getOntologyEvidenceManifest();
    const evidence = getOntologyEvidenceSnapshot();

    expect(manifest.shards.length).toBeGreaterThan(3);
    expect(manifest.shards.every((shard) => shard.entryCount > 0)).toBe(true);
    expect(evidence.evidenceSources).toHaveLength(listOntologyNodesByKind("EvidenceSource").length);
    expect(evidence.claims).toHaveLength(listOntologyNodesByKind("Claim").length);
  });

  it("includes babysitter-agent as a distinct non-harness runtime agent and records richer Claude web evidence", () => {
    const babysitterAgent = listAgentVersions().find((agent) => agent.agentId === "babysitter-agent");
    expect(babysitterAgent).toBeDefined();
    expect(babysitterAgent!.transportIds).toContain("terminal-cli");
    expect(babysitterAgent!.modalityIds).toContain("mcp");

    const evidenceIds = new Set(getOntologyEvidenceSnapshot().evidenceSources.map((entry) => entry.evidenceId));
    expect(evidenceIds.has("web-anthropic-claude-code-auto-mode")).toBe(true);
    expect(evidenceIds.has("web-anthropic-claude-code-sandboxing")).toBe(true);
    expect(evidenceIds.has("web-claude-code-hooks")).toBe(true);
    expect(evidenceIds.has("web-claude-code-mcp")).toBe(true);

    const graph = getCatalogGraphSnapshot();
    const runtimeHooks = graph.nodes.find((node) => node.id === "capabilitySupport:claude:ge-0-0-0:runtime-hooks");
    const toolApproval = graph.nodes.find((node) => node.id === "capabilitySupport:claude:ge-0-0-0:tool-approval");
    const sessionResume = graph.nodes.find((node) => node.id === "capabilitySupport:claude:ge-0-0-0:session-resume");

    expect(runtimeHooks?.evidenceRefs).toContain("web-claude-code-hooks");
    expect(toolApproval?.evidenceRefs).toContain("web-claude-code-permission-modes");
    expect(sessionResume?.evidenceRefs).toContain("web-claude-code-checkpointing");
  });

  it("records capability-specific external evidence for other agent vendors as well", () => {
    const evidenceIds = new Set(getOntologyEvidenceSnapshot().evidenceSources.map((entry) => entry.evidenceId));
    expect(evidenceIds.has("web-codex-hooks")).toBe(true);
    expect(evidenceIds.has("web-gemini-cli-session-management")).toBe(true);
    expect(evidenceIds.has("web-github-copilot-cli-hooks")).toBe(true);
    expect(evidenceIds.has("web-cursor-hooks")).toBe(true);
    expect(evidenceIds.has("web-opencode-plugins")).toBe(true);
    expect(evidenceIds.has("web-omp-session-resume")).toBe(true);

    const graph = getCatalogGraphSnapshot();
    const codexHooks = graph.nodes.find((node) => node.id === "capabilitySupport:codex:ge-0-119-0:runtime-hooks");
    const geminiResume = graph.nodes.find((node) => node.id === "capabilitySupport:gemini:ge-0-0-0:session-resume");
    const copilotMcp = graph.nodes.find((node) => node.id === "capabilitySupport:copilot:ge-0-0-0:mcp");
    const cursorHooks = graph.nodes.find((node) => node.id === "capabilitySupport:cursor:ge-0-0-0:runtime-hooks");
    const opencodeHooks = graph.nodes.find((node) => node.id === "capabilitySupport:opencode:ge-0-0-0:runtime-hooks");
    const ompResume = graph.nodes.find((node) => node.id === "capabilitySupport:omp:ge-0-0-0:session-resume");

    expect(codexHooks?.evidenceRefs).toContain("web-codex-hooks");
    expect(geminiResume?.evidenceRefs).toContain("web-gemini-cli-session-management");
    expect(copilotMcp?.evidenceRefs).toContain("web-github-copilot-cli-mcp");
    expect(cursorHooks?.evidenceRefs).toContain("web-cursor-hooks");
    expect(opencodeHooks?.evidenceRefs).toContain("web-opencode-plugins");
    expect(ompResume?.evidenceRefs).toContain("web-omp-session-resume");
  });
});
