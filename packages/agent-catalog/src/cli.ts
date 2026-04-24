import { AGENT_CATALOG, GRAPH_DOCUMENT } from "./data";

export interface CliCatalogRow {
  agent: string;
  version: string;
  providers: string;
  hooks: string;
  capabilities: string;
}

export interface CliCatalogSummary {
  schemaVersion: string;
  graphId: string;
  totalAgents: number;
  totalCapabilities: number;
  totalModelProviders: number;
}

export function listCliRows(): CliCatalogRow[] {
  return AGENT_CATALOG.agents.map((agent) => ({
    agent: agent.displayName,
    version: agent.versionRange,
    providers: agent.providerIds.join(", "),
    hooks: agent.hookIds.join(", "),
    capabilities: agent.capabilityIds.join(", "),
  }));
}

export function getCliCatalogSummary(): CliCatalogSummary {
  return {
    schemaVersion: GRAPH_DOCUMENT.schemaVersion,
    graphId: GRAPH_DOCUMENT.graphId,
    totalAgents: AGENT_CATALOG.agents.length,
    totalCapabilities: AGENT_CATALOG.capabilities.length,
    totalModelProviders: AGENT_CATALOG.providers.length,
  };
}
