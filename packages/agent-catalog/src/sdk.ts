import {
  AGENT_CATALOG,
  FALLBACK_METADATA,
  GRAPH_DOCUMENT,
  HARNESS_IMAGES,
  HOOKS,
  HOOKS_MUX_DETECTION_RULES,
  HOST_METADATA_FIELDS,
  HOST_SIGNAL_MAP,
  ONTOLOGY_SCHEMA,
} from "./data";
import { getCatalogGraph, listGraphNodes, listRelationshipsByRelation } from "./graph";
import type {
  AgentCatalog,
  AgentVersion,
  CatalogGraph,
  GraphNode,
  HarnessFallbackMetadata,
  HarnessImageEntry,
  HookDescriptor,
  HooksMuxDetectionRule,
  HostMetadataField,
  OntologySchema,
  UiAgentCard,
} from "./models";

const HARNESS_ALIASES: Record<string, string> = {
  claude: "claude-code",
  "claude-code": "claude-code",
  codex: "codex",
  cursor: "cursor",
  gemini: "gemini-cli",
  "gemini-cli": "gemini-cli",
  copilot: "github-copilot",
  "github-copilot": "github-copilot",
  omp: "oh-my-pi",
  "oh-my-pi": "oh-my-pi",
  opencode: "opencode",
  openclaw: "openclaw",
  pi: "pi",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function providerNamesById(): Map<string, string> {
  return new Map(AGENT_CATALOG.providers.map((provider) => [provider.providerId, provider.displayName]));
}

function transportLabelsById(): Map<string, string> {
  return new Map(AGENT_CATALOG.transports.map((transport) => [transport.transportId, transport.label]));
}

function capabilityLabelsById(): Map<string, string> {
  return new Map(AGENT_CATALOG.capabilities.map((capability) => [capability.capabilityId, capability.label]));
}

function hookNamesById(): Map<string, string> {
  return new Map(AGENT_CATALOG.hooks.map((hook) => [hook.hookId, hook.canonicalName]));
}

export function getCatalogGraphSnapshot(): CatalogGraph {
  return clone(getCatalogGraph());
}

export function getCatalogGraphDocument() {
  return clone(GRAPH_DOCUMENT);
}

export function getCatalogOntologySchema(): OntologySchema {
  return clone(ONTOLOGY_SCHEMA);
}

export function getAgentCatalog(): AgentCatalog {
  return clone(AGENT_CATALOG);
}

export function listAgentVersions(): AgentVersion[] {
  return clone(AGENT_CATALOG.agents);
}

export function getAgentVersions(agentIdOrAlias: string): AgentVersion[] {
  const normalized = agentIdOrAlias.toLowerCase();
  return AGENT_CATALOG.agents.filter(
    (agent) =>
      agent.agentId === normalized ||
      agent.aliases.includes(normalized) ||
      agent.displayName.toLowerCase() === normalized,
  );
}

export function listOntologyNodesByKind(kind: GraphNode["kind"]): GraphNode[] {
  return clone(listGraphNodes().filter((node) => node.kind === kind));
}

export function listOntologyRelations(relation: string) {
  return clone(listRelationshipsByRelation(relation));
}

export function getFallbackHarnessMetadata(harnessName: string): HarnessFallbackMetadata | undefined {
  const key = HARNESS_ALIASES[harnessName] ?? harnessName;
  const metadata = FALLBACK_METADATA[key];
  return metadata ? clone(metadata) : undefined;
}

export function listFallbackHarnessMetadata(): Record<string, HarnessFallbackMetadata> {
  return clone(FALLBACK_METADATA);
}

export function getHostSignalMap(): Record<string, string[]> {
  return clone(HOST_SIGNAL_MAP);
}

export function getHostMetadataFields(): Record<string, HostMetadataField[]> {
  return clone(HOST_METADATA_FIELDS);
}

export function getHooksMuxDetectionRules(): HooksMuxDetectionRule[] {
  return clone(HOOKS_MUX_DETECTION_RULES);
}

export function getHarnessImages(): HarnessImageEntry[] {
  return clone(HARNESS_IMAGES);
}

export function lookupHarnessImage(harness: string): HarnessImageEntry | undefined {
  return HARNESS_IMAGES.find((entry) => entry.harness === harness);
}

export function listPluginTargets(): string[] {
  return Array.from(new Set(AGENT_CATALOG.agents.flatMap((agent) => agent.pluginTargetIds))).sort();
}

export function getHookCatalog(): HookDescriptor[] {
  return clone(HOOKS);
}

export function getHookNameMap(): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};
  for (const hook of HOOKS) {
    map[hook.canonicalName] = { ...hook.targetNames };
  }
  return map;
}

export function getUiAgentCards(): UiAgentCard[] {
  const providers = providerNamesById();
  const transports = transportLabelsById();
  const capabilities = capabilityLabelsById();
  const hooks = hookNamesById();

  return AGENT_CATALOG.agents.map((agent, index) => ({
    id: `${index + 1}`,
    name: agent.displayName,
    versionRange: agent.versionRange,
    description: agent.summary,
    providerNames: agent.providerIds.map((providerId) => providers.get(providerId) ?? providerId),
    transportLabels: agent.transportIds.map((transportId) => transports.get(transportId) ?? transportId),
    capabilities: agent.capabilityIds.map((capabilityId) => capabilities.get(capabilityId) ?? capabilityId),
    hookNames: agent.hookIds.map((hookId) => hooks.get(hookId) ?? hookId),
    filePath: "packages/agent-catalog/graph/nodes/agents/versions.yaml",
    directory: "packages/agent-catalog/graph",
    metadata: {
      agentId: agent.agentId,
      aliases: agent.aliases,
      pluginTargets: agent.pluginTargetIds,
      modalities: agent.modalityIds,
      evidenceIds: agent.evidenceIds,
      schemaVersion: GRAPH_DOCUMENT.schemaVersion,
    },
  }));
}
