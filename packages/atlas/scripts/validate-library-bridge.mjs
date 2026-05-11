/**
 * validate-library-bridge.mjs
 *
 * Post-build quality gate for the generated library graph. Runs after
 * generate-library-nodes.mjs + indexer and validates coverage, connectivity,
 * and attribute completeness of LibraryProcess, LibrarySkill, and LibraryAgent
 * nodes and their edges into the domain graph.
 *
 * Exit code: 0 if all checks pass, 1 if any threshold is violated.
 * Run: node packages/atlas/scripts/validate-library-bridge.mjs [--strict]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, '..', 'src', 'index.json');

if (!fs.existsSync(indexPath)) {
  console.error('index.json not found — run npm run build first');
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const records = Object.values(index.records);
const edges = index.edges;
const strict = process.argv.includes('--strict');

const pct = (n, d) => d > 0 ? (n / d * 100) : 0;
const pad = (s, w = 7) => String(s).padStart(w);

// ═══════════════════════════════════════════
// Collect entities
// ═══════════════════════════════════════════

const lp = records.filter(r => r._kind === 'LibraryProcess');
const ls = records.filter(r => r._kind === 'LibrarySkill');
const la = records.filter(r => r._kind === 'LibraryAgent');
const total = lp.length + ls.length + la.length;

const recordIds = new Set(Object.keys(index.records));

// ═══════════════════════════════════════════
// Check functions
// ═══════════════════════════════════════════

const failures = [];
const warnings = [];

function check(label, actual, threshold, unit = '%') {
  const pass = actual >= threshold;
  const status = pass ? '✓' : '✗';
  const tag = pass ? '' : ' ← FAIL';
  console.log(`  ${status} ${label}: ${actual.toFixed(1)}${unit} (threshold: ${threshold}${unit})${tag}`);
  if (!pass) failures.push(label);
}

function warn(label, count, context) {
  if (count > 0) {
    warnings.push(`${label}: ${count} ${context}`);
    console.log(`  ⚠ ${label}: ${count} ${context}`);
  }
}

// ═══════════════════════════════════════════
// 1. Entity counts (sanity)
// ═══════════════════════════════════════════

console.log('╔════════════════════════════════════════════════╗');
console.log('║   Library Bridge Quality Report               ║');
console.log('╠════════════════════════════════════════════════╣');
console.log(`║ Processes: ${pad(lp.length)}   Skills: ${pad(ls.length)}   Agents: ${pad(la.length)} ║`);
console.log('╠════════════════════════════════════════════════╣');

console.log('║ ENTITY COUNTS                                 ║');
check('Processes exist', lp.length, 100, '');
check('Skills exist', ls.length, 100, '');
check('Agents exist', la.length, 100, '');

// ═══════════════════════════════════════════
// 2. Zero orphans
// ═══════════════════════════════════════════

console.log('╠════════════════════════════════════════════════╣');
console.log('║ ORPHAN CHECK                                  ║');

const deg = new Map();
for (const e of edges) { deg.set(e.from, (deg.get(e.from) || 0) + 1); deg.set(e.to, (deg.get(e.to) || 0) + 1); }

const lpOrphan = lp.filter(r => !deg.has(r.id));
const lsOrphan = ls.filter(r => !deg.has(r.id));
const laOrphan = la.filter(r => !deg.has(r.id));

check('Process orphans', 100 - pct(lpOrphan.length, lp.length), 100);
check('Skill orphans', 100 - pct(lsOrphan.length, ls.length), 100);
check('Agent orphans', 100 - pct(laOrphan.length, la.length), 100);

// ═══════════════════════════════════════════
// 3. Dangling edges (targets exist in graph)
// ═══════════════════════════════════════════

console.log('╠════════════════════════════════════════════════╣');
console.log('║ DANGLING EDGES                                ║');

const libEdges = edges.filter(e =>
  e.from.startsWith('lib-process:') || e.from.startsWith('lib-skill:') || e.from.startsWith('lib-agent:')
);
const danglingLib = libEdges.filter(e => !recordIds.has(e.to));

check('Edge target validity', pct(libEdges.length - danglingLib.length, libEdges.length), 100);
warn('Dangling lib edges', danglingLib.length, 'edges point to non-existent targets');

if (danglingLib.length > 0) {
  const byKind = {};
  for (const e of danglingLib) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k}: ${v}`);
  }
}

// ═══════════════════════════════════════════
// 4. Semantic edge coverage (lib → domain)
// ═══════════════════════════════════════════

console.log('╠════════════════════════════════════════════════╣');
console.log('║ PROCESS SEMANTIC EDGES                        ║');

const lpEdge = (kind) => new Set(edges.filter(e => e.kind === kind && e.from.startsWith('lib-process:')).map(e => e.from));
check('Process→skill-area', pct(lpEdge('lib_requires_skill_area').size, lp.length), 90);
check('Process→role', pct(lpEdge('lib_involves_role').size, lp.length), 90);
check('Process→workflow', pct(lpEdge('lib_implements_workflow').size, lp.length), 95);
check('Process→domain', pct(lpEdge('lib_applies_to_domain').size, lp.length), 99);
check('Process→specialization', pct(lpEdge('lib_belongs_to_specialization').size, lp.length), 80);

console.log('╠════════════════════════════════════════════════╣');
console.log('║ SKILL SEMANTIC EDGES                          ║');

const lsEdge = (kind) => new Set(edges.filter(e => e.kind === kind && e.from.startsWith('lib-skill:')).map(e => e.from));
check('Skill→skill-area', pct(lsEdge('lib_requires_skill_area').size, ls.length), 99);
check('Skill→role', pct(lsEdge('lib_involves_role').size, ls.length), 99);

console.log('╠════════════════════════════════════════════════╣');
console.log('║ AGENT SEMANTIC EDGES                          ║');

const laEdge = (kind) => new Set(edges.filter(e => e.kind === kind && e.from.startsWith('lib-agent:')).map(e => e.from));
check('Agent→role', pct(laEdge('lib_involves_role').size, la.length), 99);
check('Agent→skill-area', pct(laEdge('lib_requires_skill_area').size, la.length), 99);

// ═══════════════════════════════════════════
// 5. Cross-graph connectivity
// ═══════════════════════════════════════════

console.log('╠════════════════════════════════════════════════╣');
console.log('║ CROSS-GRAPH CONNECTIVITY                      ║');

const nonLibIds = new Set(records.filter(r => !['LibraryProcess', 'LibrarySkill', 'LibraryAgent'].includes(r._kind)).map(r => r.id));
let crossEdgeCount = 0;
for (const e of libEdges) {
  if (nonLibIds.has(e.to)) crossEdgeCount++;
}
check('Cross-graph edges exist', crossEdgeCount, 1000, '');
console.log(`  ℹ Total lib→domain edges: ${crossEdgeCount}`);

// Process→agent and Process→skill internal refs
const lpWithAgent = new Set(edges.filter(e => e.kind === 'uses_agent' && e.from.startsWith('lib-process:')).map(e => e.from));
const lpWithSkillRef = new Set(edges.filter(e => e.kind === 'uses_skill' && e.from.startsWith('lib-process:')).map(e => e.from));
console.log(`  ℹ Process→agent refs: ${lpWithAgent.size}/${lp.length} (${pct(lpWithAgent.size, lp.length).toFixed(1)}%)`);
console.log(`  ℹ Process→skill refs: ${lpWithSkillRef.size}/${lp.length} (${pct(lpWithSkillRef.size, lp.length).toFixed(1)}%)`);

// ═══════════════════════════════════════════
// 6. Description coverage
// ═══════════════════════════════════════════

console.log('╠════════════════════════════════════════════════╣');
console.log('║ ATTRIBUTE COMPLETENESS                        ║');

const withDesc = (arr) => arr.filter(r => r.description && String(r.description).trim().length > 10);
check('Process descriptions', pct(withDesc(lp).length, lp.length), 98);
check('Skill descriptions', pct(withDesc(ls).length, ls.length), 95);
check('Agent descriptions', pct(withDesc(la).length, la.length), 95);

const withDisplay = (arr) => arr.filter(r => r.displayName && String(r.displayName).trim().length > 0);
check('Process displayNames', pct(withDisplay(lp).length, lp.length), 99);
check('Skill displayNames', pct(withDisplay(ls).length, ls.length), 99);
check('Agent displayNames', pct(withDisplay(la).length, la.length), 99);

// ═══════════════════════════════════════════
// 7. Edge target diversity (not all pointing to same few targets)
// ═══════════════════════════════════════════

console.log('╠════════════════════════════════════════════════╣');
console.log('║ EDGE TARGET DIVERSITY                         ║');

const skillAreaTargets = new Set(edges.filter(e => e.kind === 'lib_requires_skill_area').map(e => e.to));
const roleTargets = new Set(edges.filter(e => e.kind === 'lib_involves_role').map(e => e.to));
const workflowTargets = new Set(edges.filter(e => e.kind === 'lib_implements_workflow').map(e => e.to));
const domainTargets = new Set(edges.filter(e => e.kind === 'lib_applies_to_domain').map(e => e.to));
const specTargets = new Set(edges.filter(e => e.kind === 'lib_belongs_to_specialization').map(e => e.to));

check('Unique skill-area targets', skillAreaTargets.size, 30, '');
check('Unique role targets', roleTargets.size, 15, '');
check('Unique workflow targets', workflowTargets.size, 15, '');
check('Unique domain targets', domainTargets.size, 5, '');
check('Unique specialization targets', specTargets.size, 10, '');

// Top skill-area targets (distribution check)
const skillAreaCounts = {};
for (const e of edges.filter(e => e.kind === 'lib_requires_skill_area')) {
  skillAreaCounts[e.to] = (skillAreaCounts[e.to] || 0) + 1;
}
const sortedSA = Object.entries(skillAreaCounts).sort((a, b) => b[1] - a[1]);
const topSA = sortedSA[0];
const topSAPct = topSA ? pct(topSA[1], edges.filter(e => e.kind === 'lib_requires_skill_area').length) : 0;
warn('Top skill-area concentration', topSAPct > 20 ? 1 : 0,
  topSA ? `"${topSA[0]}" has ${topSAPct.toFixed(1)}% of all lib_requires_skill_area edges` : '');

// ═══════════════════════════════════════════
// 8. Methodology and topic coverage
// ═══════════════════════════════════════════

console.log('╠════════════════════════════════════════════════╣');
console.log('║ METHODOLOGY & TOPIC COVERAGE                  ║');

const lpWithMeth = new Set(edges.filter(e => e.kind === 'follows_methodology' && e.from.startsWith('lib-process:')).map(e => e.from));
console.log(`  ℹ Processes with methodology: ${lpWithMeth.size}/${lp.length} (${pct(lpWithMeth.size, lp.length).toFixed(1)}%)`);

const lpWithTopic = lpEdge('lib_covers_topic');
console.log(`  ℹ Processes with topic: ${lpWithTopic.size}/${lp.length} (${pct(lpWithTopic.size, lp.length).toFixed(1)}%)`);

// ═══════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════

console.log('╠════════════════════════════════════════════════╣');

if (failures.length === 0 && warnings.length === 0) {
  console.log('║ RESULT: ALL CHECKS PASSED ✓                   ║');
} else {
  if (failures.length > 0) {
    console.log(`║ FAILURES: ${failures.length}                                    ║`);
    for (const f of failures) console.log(`║   ✗ ${f.padEnd(42)} ║`);
  }
  if (warnings.length > 0) {
    console.log(`║ WARNINGS: ${warnings.length}                                    ║`);
    for (const w of warnings) console.log(`║   ⚠ ${w.slice(0, 42).padEnd(42)} ║`);
  }
}

console.log('╚════════════════════════════════════════════════╝');

if (strict && failures.length > 0) {
  process.exit(1);
}
