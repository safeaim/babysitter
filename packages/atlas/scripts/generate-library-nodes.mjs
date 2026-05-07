/**
 * generate-library-nodes.mjs
 *
 * Pre-build generator that walks the babysitter process library and produces
 * atlas graph YAML node documents for processes, skills, and agents that carry
 * graph metadata (@graph JSDoc blocks or graph: frontmatter).
 *
 * Output: packages/atlas/graph/generated-library/{processes,skills,agents}.yaml
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Path resolution ─────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const libraryDir = path.resolve(__dirname, "..", "..", "..", "library");
const outputDir = path.resolve(__dirname, "..", "graph", "generated-library");
const repoRoot = path.resolve(__dirname, "..", "..", "..");

// ── Helpers ─────────────────────────────────────────────────────────────────

function walkDir(dir, extensions, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walkDir(full, extensions, results);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract specialization name from a library path.
 * e.g. library/specializations/web-development/skills/react/SKILL.md -> web-development
 *      library/processes/shared/tdd-triplet.js -> null (shared process)
 */
function extractSpecialization(filePath) {
  const rel = path.relative(libraryDir, filePath).split(path.sep).join("/");
  const match = rel.match(/^specializations\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Compute a relative path from repo root, using forward slashes.
 */
function relativeFromRoot(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

// ── YAML escaping ───────────────────────────────────────────────────────────

function yamlString(value) {
  if (value == null) return '""';
  const str = String(value);
  // Use double-quoted form if the string contains special chars
  if (
    str.includes(":") ||
    str.includes("#") ||
    str.includes("'") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.includes("[") ||
    str.includes("]") ||
    str.includes("{") ||
    str.includes("}") ||
    str.includes(",") ||
    str.includes("&") ||
    str.includes("*") ||
    str.includes("!") ||
    str.includes("|") ||
    str.includes(">") ||
    str.includes("%") ||
    str.includes("@") ||
    str.includes("`") ||
    str.startsWith(" ") ||
    str.endsWith(" ") ||
    str === ""
  ) {
    return '"' + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r\n/g, "\\n").replace(/\r/g, "\\n").replace(/\n/g, "\\n") + '"';
  }
  return str;
}

// ── @graph JSDoc parsing ────────────────────────────────────────────────────

/**
 * Parse @graph block from JSDoc comment.
 * Format:
 *   @graph
 *     skillAreas: [skill-area:xxx, skill-area:yyy]
 *     topics: [topic:xxx]
 *     domains: [domain:xxx]
 *     roles: [role:xxx]
 *     workflows: [workflow:xxx]
 */
function parseGraphJSDoc(content) {
  // Match @graph block: everything from @graph to the next @tag or end of comment
  const graphMatch = content.match(/@graph\s*\n([\s\S]*?)(?=\n\s*\*\s*@|\*\/)/);
  if (!graphMatch) return null;

  const block = graphMatch[1];
  const result = {};

  // Parse each line as key: [values] — [^\]\n]* prevents matching across lines
  // so an unclosed bracket on one line won't consume subsequent lines.
  const lineRegex = /^\s*\*?\s*(\w+)\s*:\s*\[([^\]\n]*)\]/gm;
  let match;
  while ((match = lineRegex.exec(block)) !== null) {
    const key = match[1];
    const values = match[2]
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (values.length > 0) {
      result[key] = values;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parse @process or @description JSDoc tag for display name.
 */
function parseProcessName(content) {
  const descMatch = content.match(/@(?:process|description)\s+(.+?)(?:\n|\*\/)/);
  return descMatch ? descMatch[1].replace(/\s*\*\s*$/, "").trim() : null;
}

/**
 * Parse @module JSDoc tag.
 */
function parseModuleName(content) {
  const match = content.match(/@module\s+(\S+)/);
  return match ? match[1].trim() : null;
}

// ── Frontmatter parsing ─────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};

  // Simple YAML parser for flat and one-level-nested fields
  const lines = yaml.split("\n");
  let currentKey = null;

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    // Top-level key
    const topMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (topMatch) {
      const key = topMatch[1];
      let value = topMatch[2].trim();

      if (value === "" || value === ">") {
        // Object or block scalar — set key as current context
        currentKey = key;
        if (!result[key]) result[key] = {};
        continue;
      }

      // Inline array: [a, b, c]
      if (value.startsWith("[") && value.endsWith("]")) {
        result[key] = value
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
        currentKey = null;
        continue;
      }

      result[key] = value;
      currentKey = null;
      continue;
    }

    // Nested key (indented with spaces)
    const nestedMatch = line.match(/^\s+(\w[\w-]*)\s*:\s*(.*)/);
    if (nestedMatch && currentKey) {
      const key = nestedMatch[1];
      let value = nestedMatch[2].trim();

      if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
      }

      if (typeof result[currentKey] !== "object" || Array.isArray(result[currentKey])) {
        result[currentKey] = {};
      }
      result[currentKey][key] = value;
      continue;
    }

    // YAML list item under currentKey (for expertise, etc.)
    const listMatch = line.match(/^\s+-\s+(.*)/);
    if (listMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) {
        result[currentKey] = [];
      }
      result[currentKey].push(listMatch[1].trim());
    }
  }

  return result;
}

// ── Edge generation ─────────────────────────────────────────────────────────

/**
 * Build applies_to edges from graph metadata.
 */
function buildEdges(fromId, graphMeta) {
  const edges = [];
  const edgeTargetKeys = ["skillAreas", "topics", "domains", "roles", "workflows"];

  for (const key of edgeTargetKeys) {
    const targets = graphMeta[key];
    if (!Array.isArray(targets)) continue;
    for (const target of targets) {
      edges.push({ kind: "applies_to", to: target });
    }
  }

  return edges;
}

// ── Node generation ─────────────────────────────────────────────────────────

function generateNodeYaml(node) {
  const lines = [];
  lines.push(`  - id: ${yamlString(node.id)}`);
  lines.push(`    kind: ${yamlString(node.kind)}`);
  lines.push(`    displayName: ${yamlString(node.displayName)}`);
  if (node.description) {
    lines.push(`    description: ${yamlString(node.description)}`);
  }
  lines.push(`    libraryPath: ${yamlString(node.libraryPath)}`);
  if (node.specialization) {
    lines.push(`    specialization: ${yamlString(node.specialization)}`);
  }
  if (node.role) {
    lines.push(`    role: ${yamlString(node.role)}`);
  }
  if (node.edges && node.edges.length > 0) {
    lines.push("    edges:");
    lines.push("      applies_to:");
    for (const edge of node.edges) {
      lines.push(`      - ${yamlString(edge.to)}`);
    }
  }
  return lines.join("\n");
}

function generateNodeDocument(kindName, nodes) {
  if (nodes.length === 0) {
    return `# Auto-generated by generate-library-nodes.mjs — do not edit.\nkind: NodeDocument\nnodes: []\n`;
  }
  const lines = [
    "# Auto-generated by generate-library-nodes.mjs — do not edit.",
    "kind: NodeDocument",
    "nodes:",
  ];
  for (const node of nodes) {
    lines.push(generateNodeYaml(node));
  }
  return lines.join("\n") + "\n";
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("[generate-library-nodes] scanning library...");

  // Clean and create output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  if (!fs.existsSync(libraryDir)) {
    console.log("[generate-library-nodes] library dir not found, writing empty files");
    fs.writeFileSync(path.join(outputDir, "processes.yaml"), generateNodeDocument("LibraryProcess", []));
    fs.writeFileSync(path.join(outputDir, "skills.yaml"), generateNodeDocument("LibrarySkill", []));
    fs.writeFileSync(path.join(outputDir, "agents.yaml"), generateNodeDocument("LibraryAgent", []));
    console.log("[generate-library-nodes] done: 0 processes, 0 skills, 0 agents");
    return;
  }

  const processNodes = [];
  const skillNodes = [];
  const agentNodes = [];

  // ── Process files (.js) ─────────────────────────────────────────────────

  const jsFiles = walkDir(libraryDir, [".js"]);
  for (const file of jsFiles) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    if (!content.includes("@graph")) continue;

    const graphMeta = parseGraphJSDoc(content);
    if (!graphMeta) continue;

    const specialization = extractSpecialization(file);
    const basename = path.basename(file, ".js");
    const specSlug = specialization ? slugify(specialization) : "shared";
    const id = `lib-process:${specSlug}--${slugify(basename)}`;
    const displayName = parseProcessName(content) || parseModuleName(content) || basename;
    const libraryPath = relativeFromRoot(file);

    // Extract description from @description JSDoc tag
    const descMatch = content.match(/@description\s+([\s\S]*?)(?=\n\s*\*\s*@|\*\/)/);
    const description = descMatch
      ? descMatch[1]
          .replace(/^\s*\*\s?/gm, "")
          .trim()
      : null;

    const edges = buildEdges(id, graphMeta);

    processNodes.push({
      id,
      kind: "LibraryProcess",
      displayName,
      description,
      libraryPath,
      specialization,
      edges,
    });
  }

  // ── Skill files (SKILL.md) ────────────────────────────────────────────────

  const skillFiles = walkDir(libraryDir, ["SKILL.md"]);
  for (const file of skillFiles) {
    if (!file.endsWith("SKILL.md")) continue;

    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const frontmatter = parseFrontmatter(content);
    if (!frontmatter || !frontmatter.graph) continue;

    const graphMeta =
      typeof frontmatter.graph === "object" && !Array.isArray(frontmatter.graph)
        ? frontmatter.graph
        : null;
    if (!graphMeta) continue;

    const specialization = extractSpecialization(file);
    const dirName = path.basename(path.dirname(file));
    const specSlug = specialization ? slugify(specialization) : "shared";
    const id = `lib-skill:${specSlug}--${slugify(dirName)}`;
    const displayName = frontmatter.name || dirName;
    const description = frontmatter.description || null;
    const libraryPath = relativeFromRoot(file);
    const edges = buildEdges(id, graphMeta);

    skillNodes.push({
      id,
      kind: "LibrarySkill",
      displayName,
      description,
      libraryPath,
      specialization,
      edges,
    });
  }

  // ── Agent files (AGENT.md) ────────────────────────────────────────────────

  const agentFiles = walkDir(libraryDir, ["AGENT.md"]);
  for (const file of agentFiles) {
    if (!file.endsWith("AGENT.md")) continue;

    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const frontmatter = parseFrontmatter(content);
    if (!frontmatter || !frontmatter.graph) continue;

    const graphMeta =
      typeof frontmatter.graph === "object" && !Array.isArray(frontmatter.graph)
        ? frontmatter.graph
        : null;
    if (!graphMeta) continue;

    const specialization = extractSpecialization(file);
    const dirName = path.basename(path.dirname(file));
    const specSlug = specialization ? slugify(specialization) : "shared";
    const id = `lib-agent:${specSlug}--${slugify(dirName)}`;
    const displayName = frontmatter.name || dirName;
    const description = frontmatter.description || null;
    const role = frontmatter.role || null;
    const libraryPath = relativeFromRoot(file);
    const edges = buildEdges(id, graphMeta);

    agentNodes.push({
      id,
      kind: "LibraryAgent",
      displayName,
      description,
      libraryPath,
      specialization,
      role,
      edges,
    });
  }

  // ── Write output ──────────────────────────────────────────────────────────

  fs.writeFileSync(
    path.join(outputDir, "processes.yaml"),
    generateNodeDocument("LibraryProcess", processNodes)
  );
  fs.writeFileSync(
    path.join(outputDir, "skills.yaml"),
    generateNodeDocument("LibrarySkill", skillNodes)
  );
  fs.writeFileSync(
    path.join(outputDir, "agents.yaml"),
    generateNodeDocument("LibraryAgent", agentNodes)
  );

  console.log(
    `[generate-library-nodes] done: ${processNodes.length} processes, ${skillNodes.length} skills, ${agentNodes.length} agents`
  );
}

main();
