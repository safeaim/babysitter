const fs = require("fs");
const path = require("path");
const { parse } = require("yaml");

function readYaml(filePath) {
  return parse(fs.readFileSync(filePath, "utf8"));
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array.`);
  }
  return value;
}

function ensureRequiredFields(subject, required, label) {
  for (const field of required) {
    if (!(field in subject)) {
      throw new Error(`Missing required ${label} field "${field}".`);
    }
  }
}

function listYamlFilesRecursively(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return targetPath.endsWith(".yaml") ? [targetPath] : [];
  }

  return fs
    .readdirSync(targetPath, { withFileTypes: true })
    .flatMap((entry) => listYamlFilesRecursively(path.join(targetPath, entry.name)))
    .sort((left, right) => left.localeCompare(right));
}

function main() {
  const rootDir = path.resolve(__dirname, "..");
  const graphDir = path.join(rootDir, "graph");
  const graphDocument = readYaml(path.join(graphDir, "agent-catalog.graph.yaml"));
  const schema = readYaml(path.join(graphDir, graphDocument.schemaPath));

  ensureRequiredFields(graphDocument, schema.nodeKinds.GraphDocument.requiredAttributes, "GraphDocument");
  ensureRequiredFields(schema, schema.nodeKinds.OntologySchema.requiredAttributes, "OntologySchema");

  const nodes = [];
  const edges = [];
  for (const importPath of ensureArray(graphDocument.imports, "GraphDocument.imports")) {
    const resolvedPath = path.join(graphDir, importPath);
    const yamlFiles = listYamlFilesRecursively(resolvedPath);
    if (yamlFiles.length === 0) {
      throw new Error(`Graph import ${importPath} does not contain any YAML files.`);
    }
    for (const yamlFile of yamlFiles) {
      const doc = readYaml(yamlFile);
      if (doc.kind === "NodeDocument") {
        nodes.push(...ensureArray(doc.nodes, `${yamlFile}.nodes`));
      } else if (doc.kind === "EdgeDocument") {
        edges.push(...ensureArray(doc.edges, `${yamlFile}.edges`));
      } else {
        throw new Error(`Unsupported graph document kind "${doc.kind}" in ${yamlFile}.`);
      }
    }
  }

  const nodeIds = new Set([graphDocument.id, schema.id]);
  const nodeKinds = new Map([
    [graphDocument.id, "GraphDocument"],
    [schema.id, "OntologySchema"],
  ]);

  for (const node of nodes) {
    const nodeRule = schema.nodeKinds[node.kind];
    if (!nodeRule) {
      throw new Error(`Unknown node kind "${node.kind}" for ${node.id}.`);
    }
    ensureRequiredFields(node, nodeRule.requiredAttributes, `node ${node.id}`);
    nodeIds.add(node.id);
    nodeKinds.set(node.id, node.kind);
  }

  for (const edge of edges) {
    const edgeRule = schema.edgeKinds[edge.relation];
    if (!edgeRule) {
      throw new Error(`Unknown edge relation "${edge.relation}" for ${edge.id}.`);
    }
    ensureRequiredFields(edge, edgeRule.requiredAttributes, `edge ${edge.id}`);
    if (!nodeIds.has(edge.from)) {
      throw new Error(`Edge ${edge.id} references missing source ${edge.from}.`);
    }
    if (!nodeIds.has(edge.to)) {
      throw new Error(`Edge ${edge.id} references missing target ${edge.to}.`);
    }
    if (edgeRule.from && !edgeRule.from.includes(nodeKinds.get(edge.from))) {
      throw new Error(`Edge ${edge.id} has invalid source kind ${nodeKinds.get(edge.from)} for relation ${edge.relation}.`);
    }
    if (edgeRule.to && !edgeRule.to.includes(nodeKinds.get(edge.to))) {
      throw new Error(`Edge ${edge.id} has invalid target kind ${nodeKinds.get(edge.to)} for relation ${edge.relation}.`);
    }
  }

  console.log(
    JSON.stringify(
      {
        graphId: graphDocument.graphId,
        schemaVersion: graphDocument.schemaVersion,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
      null,
      2,
    ),
  );
}

main();
