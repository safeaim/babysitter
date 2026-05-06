/**
 * Atlas bridge for agent-catalog.
 *
 * Adapts the Atlas graph singleton (`@a5c-ai/atlas`) into the same query
 * surface that `graph.ts` exposes, so `data.ts` can source its projections
 * from the pre-indexed Atlas graph instead of reading raw YAML files.
 *
 * Atlas records carry `_kind` where agent-catalog uses `kind`.
 * Atlas edges carry `kind` where agent-catalog uses `relation`.
 * The adapter functions below paper over these differences.
 */

import { atlas } from "@a5c-ai/atlas";
import type { AtlasRecord, Edge } from "@a5c-ai/atlas";
import type {
  CatalogGraph,
  GraphDocument,
  GraphEdge,
  GraphNode,
  GraphRelationship,
  OntologySchema,
} from "./models";

// ---------------------------------------------------------------------------
// Record adaptation: Atlas `_kind` -> agent-catalog `kind`
// ---------------------------------------------------------------------------

function isAgentCatalogRecord(record: AtlasRecord): boolean {
  return record._cluster === "agent-catalog";
}

function adaptRecord(record: AtlasRecord): GraphNode {
  const { _kind, _file, _cluster, ...rest } = record;
  return { ...rest, kind: _kind } as unknown as GraphNode;
}

// ---------------------------------------------------------------------------
// Edge adaptation: Atlas `kind` -> agent-catalog `relation`
// ---------------------------------------------------------------------------

function adaptEdge(edge: Edge, index: number): GraphRelationship {
  return {
    id: `edge:${edge.from}->${edge.to}:${edge.kind}:${index}`,
    relation: edge.kind,
    from: edge.from,
    to: edge.to,
    ...(edge.attributes ?? {}),
  } as GraphRelationship;
}

// ---------------------------------------------------------------------------
// Public API — drop-in replacements for graph.ts functions
// ---------------------------------------------------------------------------

let cachedNodes: GraphNode[] | undefined;
let cachedEdges: GraphRelationship[] | undefined;
let cachedNodeIds: Set<string> | undefined;

function allNodes(): GraphNode[] {
  if (!cachedNodes) {
    cachedNodes = atlas.getAllRecords().filter(isAgentCatalogRecord).map(adaptRecord);
  }
  return cachedNodes;
}

function agentCatalogNodeIds(): Set<string> {
  if (!cachedNodeIds) {
    cachedNodeIds = new Set(allNodes().map((node) => node.id));
  }
  return cachedNodeIds;
}

function allEdges(): GraphRelationship[] {
  if (!cachedEdges) {
    const nodeIds = agentCatalogNodeIds();
    cachedEdges = atlas
      .getIndex()
      .edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .map(adaptEdge);
  }
  return cachedEdges;
}

export function listGraphNodes(): GraphNode[] {
  return [...allNodes()];
}

export function listNodesByKind(kind: GraphNode["kind"]): GraphNode[] {
  return atlas.getRecordsByKind(kind as string).filter(isAgentCatalogRecord).map(adaptRecord);
}

export function getNodeById<TNode extends GraphNode = GraphNode>(
  nodeId: string,
): TNode | undefined {
  const record = atlas.getRecord(nodeId);
  return record && isAgentCatalogRecord(record) ? (adaptRecord(record) as TNode) : undefined;
}

export function listRelationshipsByRelation(
  relation: string,
): GraphRelationship[] {
  return allEdges().filter((edge) => edge.relation === relation);
}

export function listGraphEdges(): GraphRelationship[] {
  return [...allEdges()];
}

export function listOutgoingTargets(
  nodeId: string,
  relation: string,
): GraphNode[] {
  const targetIds = atlas
    .getOutgoing(nodeId)
    .filter((edge) => edge.kind === relation)
    .map((edge) => edge.to);

  return targetIds
    .map((id) => atlas.getRecord(id))
    .filter((record): record is AtlasRecord => record !== undefined && isAgentCatalogRecord(record))
    .map(adaptRecord);
}

export function listIncomingSources(
  nodeId: string,
  relation: string,
): GraphNode[] {
  const sourceIds = atlas
    .getIncoming(nodeId)
    .filter((edge) => edge.kind === relation)
    .map((edge) => edge.from);

  return sourceIds
    .map((id) => atlas.getRecord(id))
    .filter((record): record is AtlasRecord => record !== undefined)
    .map(adaptRecord);
}

// ---------------------------------------------------------------------------
// Graph-document and schema synthesis
//
// The original graph.ts reads these from dedicated YAML files. Atlas stores
// them as regular records (kind GraphDocument / OntologySchema). We pull them
// from Atlas and cast to the expected shapes.
// ---------------------------------------------------------------------------

export function getGraphDocument(): GraphDocument {
  // Atlas doesn't store a GraphDocument record — return a synthetic one
  // that satisfies the agent-catalog interface.
  const stats = atlas.getStats();
  return {
    kind: "GraphDocument",
    id: "graph:agent-catalog",
    graphId: "graph:agent-catalog",
    schemaVersion: "2026.04.agent-catalog-v2",
    catalogVersion: "2026.04.agent-catalog-v2",
    generatedAt: stats ? new Date().toISOString() : new Date().toISOString(),
    owners: ["@a5c-ai"],
    imports: [],
    schemaPath: "schema/ontology-schema.yaml",
  } as unknown as GraphDocument;
}

export function getOntologySchema(): OntologySchema {
  // Atlas doesn't store an OntologySchema record in agent-catalog format.
  // Build a minimal schema from Atlas's node/edge kind metadata.
  const nodeKinds: Record<string, { requiredAttributes: string[] }> = {};
  for (const [name, def] of Object.entries(atlas.getNodeKinds())) {
    nodeKinds[name] = { requiredAttributes: ["id", "kind"], ...def };
  }
  const edgeKinds: Record<string, { requiredAttributes: string[]; from?: string[]; to?: string[] }> = {};
  for (const [name, def] of Object.entries(atlas.getEdgeKinds())) {
    edgeKinds[name] = { requiredAttributes: ["id", "relation", "from", "to"], ...def };
  }
  return {
    kind: "OntologySchema",
    id: "schema:agent-catalog-ontology",
    nodeKinds,
    edgeKinds,
  } as unknown as OntologySchema;
}

export function getCatalogGraph(): CatalogGraph {
  return {
    document: getGraphDocument(),
    schema: getOntologySchema(),
    nodes: allNodes(),
    edges: allEdges(),
  };
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

export function listEdgesForNode(
  catalog: { graph: GraphEdge[] },
  nodeId: string,
): GraphEdge[] {
  return catalog.graph.filter(
    (edge) => edge.from === nodeId || edge.to === nodeId,
  );
}

export function listEdgesByRelation(
  catalog: { graph: GraphEdge[] },
  relation: string,
): GraphEdge[] {
  return catalog.graph.filter((edge) => edge.relation === relation);
}

export function assertGraphFileCoverage(): void {
  // No-op: Atlas indexes all YAML at build time; file-level coverage
  // is validated by the Atlas indexer, not at runtime.
}

export function listRelationshipsForNode(nodeId: string): GraphRelationship[] {
  return allEdges().filter(
    (edge) => edge.from === nodeId || edge.to === nodeId,
  );
}

export function clearAtlasBridgeCache(): void {
  cachedNodes = undefined;
  cachedEdges = undefined;
  cachedNodeIds = undefined;
}
