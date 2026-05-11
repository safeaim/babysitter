import type { AtlasRecord } from "@a5c-ai/atlas";
import type { AtlasGraphLike } from "@/lib/server/atlas-local";
import type {
  ServiceTowerDomain,
  ServiceTowerFloor,
  ServiceTowerRecord,
  ServiceTowerRoom,
  ServiceTowerService,
  ServiceTowerStat,
  ServiceTowerViewData,
} from "./types";

type ServiceTowerOptions = {
  id?: unknown;
  title?: unknown;
  subtitle?: unknown;
  eyebrow?: unknown;
  ctaLabel?: unknown;
  floors?: unknown;
  domains?: unknown;
};

type ServiceTowerFloorConfig = {
  id?: unknown;
  label?: unknown;
  subtitle?: unknown;
  rooms?: unknown;
  query?: unknown;
};

type ServiceTowerRoomConfig = {
  id?: unknown;
  label?: unknown;
  eyebrow?: unknown;
  kind?: unknown;
  color?: unknown;
  summary?: unknown;
  metricLabel?: unknown;
  query?: unknown;
};

type ServiceTowerQuery = {
  kind?: unknown;
  cluster?: unknown;
  ids?: unknown;
  search?: unknown;
  limit?: unknown;
};

const DEFAULT_COLORS = ["#D4A84B", "#C98A3E", "#C03A2B", "#3F8A77", "#8C5C7E", "#5D74B8"];

const DEFAULT_FLOORS: ServiceTowerFloorConfig[] = [
  {
    id: "catalog-base",
    label: "CATALOG BASE",
    subtitle: "Schema, claims, sources, and page records",
    rooms: [
      { id: "node-kinds", label: "Node kinds", query: { kind: "MetaNodeKind", limit: 6 }, color: "#D4A84B" },
      { id: "claims", label: "Claims", query: { kind: "Claim", limit: 6 }, color: "#C98A3E" },
      { id: "evidence", label: "Evidence", query: { kind: "EvidenceSource", limit: 6 }, color: "#3F8A77" },
      { id: "pages", label: "Wiki pages", query: { kind: "Page", limit: 6 }, color: "#8C5C7E" },
    ],
  },
  {
    id: "agent-stack",
    label: "AGENT STACK",
    subtitle: "Layered agentic systems and implementation surfaces",
    rooms: [
      { id: "layers", label: "Stack layers", query: { kind: "Layer", limit: 8 }, color: "#D4A84B" },
      { id: "products", label: "Agent products", query: { kind: "AgentProduct", limit: 8 }, color: "#C98A3E" },
      { id: "runtime", label: "Runtime impls", query: { kind: "AgentRuntimeImpl", limit: 8 }, color: "#C03A2B" },
      { id: "ui", label: "UI impls", query: { kind: "AgentUIImpl", limit: 8 }, color: "#3F8A77" },
    ],
  },
  {
    id: "operations",
    label: "OPERATIONS",
    subtitle: "Workflows, roles, capabilities, and tooling",
    rooms: [
      { id: "workflows", label: "Workflows", query: { kind: "Workflow", limit: 8 }, color: "#C98A3E" },
      { id: "roles", label: "Roles", query: { kind: "Role", limit: 8 }, color: "#8C5C7E" },
      { id: "capabilities", label: "Capabilities", query: { kind: "Capability", limit: 8 }, color: "#D4A84B" },
      { id: "tools", label: "Tools", query: { kind: "Tool", limit: 8 }, color: "#3F8A77" },
    ],
  },
];

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function arrayValue<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? value as T[] : fallback;
}

function displayName(graph: AtlasGraphLike, record: AtlasRecord | undefined): string {
  return graph.getDisplayName(record) || record?.id || "Unknown";
}

function summary(record: AtlasRecord | undefined): string {
  if (!record) return "Missing graph record.";
  for (const key of ["summary", "description", "scope", "article", "title"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.replace(/\s+/g, " ").slice(0, 180);
    }
  }
  return `${record._kind} record from ${record._cluster}.`;
}

function recordToTowerRecord(graph: AtlasGraphLike, record: AtlasRecord | undefined, fallbackId: string): ServiceTowerRecord {
  const id = record?.id ?? fallbackId;
  return {
    id,
    label: displayName(graph, record),
    kind: record?._kind ?? "Missing",
    href: `/n/${encodeURIComponent(id)}`,
    summary: summary(record),
  };
}

function queryRecords(graph: AtlasGraphLike, queryValue: unknown, fallbackLimit = 8): AtlasRecord[] {
  const query = objectValue(queryValue) as ServiceTowerQuery | null;
  if (!query) return [];

  const ids = Array.isArray(query.ids) ? query.ids.filter((id): id is string => typeof id === "string") : [];
  if (ids.length) {
    return ids.map((id) => graph.getRecord(id)).filter((record): record is AtlasRecord => Boolean(record));
  }

  const limit = Math.max(1, Math.min(24, numberValue(query.limit, fallbackLimit)));
  const kind = typeof query.kind === "string" ? query.kind : undefined;
  const cluster = typeof query.cluster === "string" ? query.cluster : undefined;
  const search = typeof query.search === "string" ? query.search : "";

  if (search.trim()) {
    return graph.searchRecords(search, { kind, cluster, limit }).map((hit) => hit.record);
  }

  return graph
    .getAllRecords()
    .filter((record) => (!kind || record._kind === kind) && (!cluster || record._cluster === cluster))
    .sort((a, b) => displayName(graph, a).localeCompare(displayName(graph, b)) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function roomServices(graph: AtlasGraphLike, records: AtlasRecord[], roomLabel: string): ServiceTowerService[] {
  return records.slice(0, 4).map((record, index) => {
    const outgoing = graph.getOutgoing(record.id).slice(0, 3);
    const incoming = graph.getIncoming(record.id).slice(0, 3);
    return {
      code: `${roomLabel.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase() || "AT"}-${String(index + 1).padStart(2, "0")}`,
      name: displayName(graph, record),
      summary: summary(record),
      kpis: [
        `${outgoing.length} outgoing links`,
        `${incoming.length} incoming links`,
        `${record._kind} · ${record._cluster}`,
      ],
      refs: outgoing.concat(incoming).slice(0, 4).map((edge) => {
        const adjacent = edge.from === record.id ? edge.to : edge.from;
        return recordToTowerRecord(graph, graph.getRecord(adjacent), adjacent);
      }),
    };
  });
}

function buildRoom(graph: AtlasGraphLike, roomValue: unknown, roomIndex: number): ServiceTowerRoom {
  const room = objectValue(roomValue) as ServiceTowerRoomConfig | null ?? {};
  const records = queryRecords(graph, room.query, 8);
  const label = stringValue(room.label, `Room ${roomIndex + 1}`);
  const kind = stringValue(room.kind, records[0]?._kind ?? "Atlas records");
  const color = stringValue(room.color, DEFAULT_COLORS[roomIndex % DEFAULT_COLORS.length]);
  const leadRecord = records[0];
  return {
    id: stringValue(room.id, label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `room-${roomIndex + 1}`),
    label,
    eyebrow: stringValue(room.eyebrow, kind),
    kind,
    color,
    summary: stringValue(room.summary, leadRecord ? summary(leadRecord) : `A graph-backed room for ${label}.`),
    metricLabel: stringValue(room.metricLabel, "Records"),
    metricValue: records.length,
    records: records.slice(0, 10).map((record) => recordToTowerRecord(graph, record, record.id)),
    services: roomServices(graph, records, label),
  };
}

function buildFloor(graph: AtlasGraphLike, floorValue: unknown, floorIndex: number): ServiceTowerFloor {
  const floor = objectValue(floorValue) as ServiceTowerFloorConfig | null ?? {};
  const rooms = arrayValue<unknown>(floor.rooms, []);
  const fallbackRooms = rooms.length ? rooms : queryRecords(graph, floor.query, 16).slice(0, 4).map((record, index) => ({
    id: record.id,
    label: displayName(graph, record),
    kind: record._kind,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    query: { ids: [record.id] },
  }));
  const label = stringValue(floor.label, `Floor ${floorIndex + 1}`);
  return {
    id: stringValue(floor.id, label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `floor-${floorIndex + 1}`),
    label,
    subtitle: stringValue(floor.subtitle, "Graph-backed records grouped as rooms."),
    rooms: fallbackRooms.slice(0, 4).map((room, index) => buildRoom(graph, room, index)),
  };
}

function buildDomains(options: ServiceTowerOptions, floors: ServiceTowerFloor[]): ServiceTowerDomain[] {
  const configured = arrayValue<unknown>(options.domains, [])
    .map((item, index) => {
      const domain = objectValue(item);
      if (!domain) return null;
      return {
        id: stringValue(domain.id, `domain-${index + 1}`),
        label: stringValue(domain.label, `Domain ${index + 1}`),
        color: stringValue(domain.color, DEFAULT_COLORS[index % DEFAULT_COLORS.length]),
      };
    })
    .filter((item): item is ServiceTowerDomain => Boolean(item));
  if (configured.length) return configured;

  const seen = new Map<string, ServiceTowerDomain>();
  for (const room of floors.flatMap((floor) => floor.rooms)) {
    if (!seen.has(room.kind)) seen.set(room.kind, { id: room.kind, label: room.kind, color: room.color });
  }
  return Array.from(seen.values()).slice(0, 6);
}

function buildStats(floors: ServiceTowerFloor[]): ServiceTowerStat[] {
  const rooms = floors.flatMap((floor) => floor.rooms);
  const records = new Set(rooms.flatMap((room) => room.records.map((record) => record.id)));
  const services = rooms.reduce((total, room) => total + room.services.length, 0);
  return [
    { label: "Floors", value: floors.length },
    { label: "Rooms", value: rooms.length },
    { label: "Records", value: records.size },
    { label: "Service lines", value: services },
  ];
}

export function buildServiceTowerView(graph: AtlasGraphLike, rawOptions: unknown): ServiceTowerViewData {
  const options = objectValue(rawOptions) as ServiceTowerOptions | null ?? {};
  const floorConfigs = arrayValue<unknown>(options.floors, DEFAULT_FLOORS);
  const floors = floorConfigs.slice(0, 5).map((floor, index) => buildFloor(graph, floor, index));
  return {
    id: stringValue(options.id, "atlas-service-tower"),
    title: stringValue(options.title, "Atlas Service Tower"),
    subtitle: stringValue(options.subtitle, "Walk the graph as a stacked service building."),
    eyebrow: stringValue(options.eyebrow, "Reusable graph view"),
    ctaLabel: stringValue(options.ctaLabel, "Open graph explorer"),
    floors,
    domains: buildDomains(options, floors),
    stats: buildStats(floors),
  };
}
