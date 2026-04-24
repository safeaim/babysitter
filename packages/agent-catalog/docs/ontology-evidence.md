# Agent Catalog Graph

`packages/agent-catalog/graph` is the source of truth for the shared agent ontology.

## Layout

- `agent-catalog.graph.yaml`
  - root graph document entrypoint used by validators and wrappers; imports can point at YAML files or directories
- `schema/ontology-schema.yaml`
  - allowed node kinds, edge kinds, and required attributes
- `nodes/agents`, `nodes/providers`
  - product/version splits instead of single mixed node files
- `nodes/capabilities`, `nodes/hooks-and-plugins`, `nodes/runtime-semantics`
  - large conceptual areas split into stable subdocuments
- `nodes/processes-and-packages`, `nodes/evidence`
  - process/package/CI and evidence/claim surfaces split into smaller docs
- `edges/relations`
  - relation-family documents such as identity, runtime, capabilities, hooks/plugins, provenance, and evolution

## Modeled concepts

- product/version splits for agents, model providers, and models
- transport protocols vs transport runtimes
- capabilities vs capability-support records
- hook surfaces vs hook mappings
- plugin targets vs plugin artifacts
- discovery signals, session semantics, lifecycle semantics, paths, process descriptors, package surfaces, CI surfaces, claims, and evidence sources

## Evidence policy

- repo-backed claims come from SDK fallback metadata, hooks-mux discovery, agent-mux host detection, agent-plugins-mux targets, transport-mux protocol/provider docs, and existing catalog/process surfaces
- web-backed claims are limited to first-party vendor docs already referenced by the graph evidence nodes
- `packages/agent-catalog/evidence/ontology-evidence/` is a derived directory export of evidence-source and claim nodes for easier external consumption
- `manifest.json` lists the shard files; SDK consumers can assemble them through `getOntologyEvidenceSnapshot()`
- the shard files are grouped into small batches by evidence domain so the derived export does not regress back into a single monolith
