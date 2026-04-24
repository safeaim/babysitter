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

function ensureNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string.`);
  }
}

function ensureIsoDate(value, label) {
  ensureNonEmptyString(value, label);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`Expected ${label} to be an ISO-8601 timestamp.`);
  }
}

function ensurePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Expected ${label} to be a positive integer.`);
  }
}

function getVendorBackedEvidencePolicy(graphDocument) {
  const policy = graphDocument.evidencePolicy;
  if (!policy || typeof policy !== "object") {
    throw new Error("GraphDocument.evidencePolicy must be an object.");
  }
  const vendorPolicy = policy.vendorBackedEvidence;
  if (!vendorPolicy || typeof vendorPolicy !== "object") {
    throw new Error("GraphDocument.evidencePolicy.vendorBackedEvidence must be defined.");
  }
  const selector = vendorPolicy.selector;
  if (!selector || typeof selector !== "object") {
    throw new Error("vendorBackedEvidence.selector must be defined.");
  }
  ensureArray(vendorPolicy.requiredAttributes, "vendorBackedEvidence.requiredAttributes");
  ensureArray(selector.kindLabels, "vendorBackedEvidence.selector.kindLabels");
  ensureArray(selector.trustLevels, "vendorBackedEvidence.selector.trustLevels");
  ensurePositiveInteger(vendorPolicy.maxFreshnessWindowDays, "vendorBackedEvidence.maxFreshnessWindowDays");
  ensureNonEmptyString(vendorPolicy.reviewOwnerPattern, "vendorBackedEvidence.reviewOwnerPattern");
  return vendorPolicy;
}

function isVendorBackedEvidence(node, vendorPolicy) {
  return (
    node.kind === "EvidenceSource" &&
    vendorPolicy.selector.kindLabels.includes(node.kindLabel) &&
    vendorPolicy.selector.trustLevels.includes(node.trustLevel)
  );
}

function validateVendorBackedEvidence(nodes, graphDocument) {
  const vendorPolicy = getVendorBackedEvidencePolicy(graphDocument);
  const reviewOwnerMatcher = new RegExp(vendorPolicy.reviewOwnerPattern);
  const evidenceSources = nodes.filter((node) => node.kind === "EvidenceSource");
  const claims = nodes.filter((node) => node.kind === "Claim");
  const evidenceById = new Map(evidenceSources.map((node) => [node.evidenceId, node]));

  for (const node of evidenceSources) {
    if (!isVendorBackedEvidence(node, vendorPolicy)) {
      continue;
    }

    for (const field of vendorPolicy.requiredAttributes) {
      if (!(field in node)) {
        throw new Error(`Vendor-backed evidence ${node.id} is missing required field "${field}".`);
      }
    }

    ensureNonEmptyString(node.reviewOwner, `${node.id}.reviewOwner`);
    ensureIsoDate(node.reviewedAt, `${node.id}.reviewedAt`);
    ensureIsoDate(node.capturedAt, `${node.id}.capturedAt`);
    ensurePositiveInteger(node.freshnessWindowDays, `${node.id}.freshnessWindowDays`);

    if (!reviewOwnerMatcher.test(node.reviewOwner)) {
      throw new Error(
        `Vendor-backed evidence ${node.id} reviewOwner "${node.reviewOwner}" does not match ${vendorPolicy.reviewOwnerPattern}.`,
      );
    }

    if (node.freshnessWindowDays > vendorPolicy.maxFreshnessWindowDays) {
      throw new Error(
        `Vendor-backed evidence ${node.id} freshnessWindowDays ${node.freshnessWindowDays} exceeds policy max ${vendorPolicy.maxFreshnessWindowDays}.`,
      );
    }

    if (Date.parse(node.reviewedAt) < Date.parse(node.capturedAt)) {
      throw new Error(`Vendor-backed evidence ${node.id} reviewedAt must be on or after capturedAt.`);
    }
  }

  for (const claim of claims) {
    if (claim.provenanceKind !== "vendor-documentation" && claim.provenanceKind !== "vendor-inference") {
      continue;
    }

    const evidenceIds = ensureArray(claim.evidenceIds, `${claim.id}.evidenceIds`);
    const vendorEvidenceIds = evidenceIds.filter((evidenceId) => {
      const evidence = evidenceById.get(evidenceId);
      return evidence ? isVendorBackedEvidence(evidence, vendorPolicy) : false;
    });

    if (vendorEvidenceIds.length === 0) {
      throw new Error(`Vendor claim ${claim.id} must reference at least one vendor-backed evidence source.`);
    }

    if (
      claim.provenanceKind === "vendor-documentation" &&
      claim.evidenceStrength === "corroborated" &&
      vendorEvidenceIds.length < 2
    ) {
      throw new Error(`Vendor claim ${claim.id} is marked corroborated but cites fewer than two vendor-backed sources.`);
    }

    if ((claim.provenanceKind === "vendor-inference" || claim.evidenceStrength !== "corroborated") && claim.unresolvedGaps.length === 0) {
      throw new Error(`Vendor claim ${claim.id} must declare unresolvedGaps when evidence is not fully corroborated.`);
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

  validateVendorBackedEvidence(nodes, graphDocument);

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
        vendorEvidenceCount: nodes.filter((node) => node.kind === "EvidenceSource" && node.trustLevel === "official-web").length,
      },
      null,
      2,
    ),
  );
}

main();
