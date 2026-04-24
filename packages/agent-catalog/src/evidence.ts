import fs from "node:fs";
import path from "node:path";
import type {
  GraphNode,
  OntologyEvidenceExport,
  OntologyEvidenceManifest,
  OntologyEvidenceShard,
  OntologyEvidenceShardDescriptor,
} from "./models";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function packageRoot(): string {
  return path.resolve(__dirname, "..");
}

function evidenceRoot(): string {
  return path.join(packageRoot(), "evidence", "ontology-evidence");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function manifestPath(): string {
  return path.join(evidenceRoot(), "manifest.json");
}

function loadManifest(): OntologyEvidenceManifest {
  return readJson<OntologyEvidenceManifest>(manifestPath());
}

function loadShard<TEntry extends GraphNode>(descriptor: OntologyEvidenceShardDescriptor): OntologyEvidenceShard<TEntry> {
  return readJson<OntologyEvidenceShard<TEntry>>(path.join(evidenceRoot(), descriptor.relativePath));
}

export function getOntologyEvidenceManifest(): OntologyEvidenceManifest {
  return clone(loadManifest());
}

export function getOntologyEvidenceSnapshot(): OntologyEvidenceExport {
  const manifest = loadManifest();
  const evidenceSources = manifest.shards
    .filter((descriptor) => descriptor.entryKind === "evidence-sources")
    .flatMap((descriptor) => loadShard<GraphNode>(descriptor).entries);
  const claims = manifest.shards
    .filter((descriptor) => descriptor.entryKind === "claims")
    .flatMap((descriptor) => loadShard<GraphNode>(descriptor).entries);

  return {
    generatedAt: manifest.generatedAt,
    manifest: clone(manifest),
    evidenceSources,
    claims,
  };
}
