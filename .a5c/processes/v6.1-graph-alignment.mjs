/**
 * @process v6.1/graph-alignment
 * @description Execute the v6.1 graph alignment plan: rename packages to match atlas graph muxes,
 *   create missing packages, implement missing functionality, update graph, and annotate metadata.
 *   Follows the 5-phase execution order from docs/v6-spec-and-roadmap/v6.1/graph-alignment-tasks.md
 *   and agent-stack-decomposition.md.
 * @reference docs/v6-spec-and-roadmap/v6.1/graph-alignment-tasks.md
 * @reference docs/v6-spec-and-roadmap/v6.1/agent-stack-decomposition.md
 * @reference docs/v6-spec-and-roadmap/v6.1/mux-architecture-gaps.md
 * @inputs { workspace: string, targetPhases: string[], dryRun: boolean }
 * @outputs { success: boolean, phasesCompleted: string[], issues: object[], artifacts: string[] }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

// ---------------------------------------------------------------------------
// Phase 1: Package Renames
// ---------------------------------------------------------------------------

const renamePackageTask = defineTask('v6.1.rename-package', (args) => ({
  kind: 'agent',
  title: `Rename ${args.currentName} → ${args.targetName}`,
  labels: ['refactor', 'rename', args.phase],
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Monorepo refactoring engineer',
      task: `Rename npm package ${args.currentName} to ${args.targetName}.`,
      context: {
        currentDir: args.currentDir,
        targetDir: args.targetDir,
        currentNpm: args.currentNpm,
        targetNpm: args.targetNpm,
        graphMux: args.graphMux,
      },
      instructions: [
        `1. Rename directory: mv ${args.currentDir} ${args.targetDir}`,
        `2. Update package.json: name → "${args.targetNpm}"`,
        '3. Update root package.json workspaces array',
        '4. Find and update ALL import paths across the monorepo: grep -rn the old npm name',
        '5. Update CI workflow files (.github/workflows/) referencing the old name',
        '6. Update tsconfig references if any',
        '7. Run npm install to relink workspaces',
        '8. Build the renamed package: npm run build --workspace=' + args.targetNpm,
        '9. Run tests: npm run test --workspace=' + args.targetNpm + ' (if test script exists)',
        '10. Commit with message: "refactor: rename ' + args.currentNpm + ' → ' + args.targetNpm + '"',
        args.dryRun ? 'DRY RUN: describe changes but do not execute.' : '',
      ].filter(Boolean),
      outputFormat: 'JSON with { renamed: boolean, filesChanged: number, testsPass: boolean }',
    },
  },
}));

const dissolvePackageTask = defineTask('v6.1.dissolve-package', (args) => ({
  kind: 'agent',
  title: `Dissolve ${args.packageName} into ${args.targets.join(' + ')}`,
  labels: ['refactor', 'dissolve', args.phase],
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Monorepo refactoring engineer',
      task: `Dissolve package ${args.packageName} by moving its contents to target packages.`,
      context: {
        sourceDir: args.sourceDir,
        fileMapping: args.fileMapping,
        reason: args.reason,
      },
      instructions: [
        'For each source file, move it to the designated target package.',
        'Update all imports across the monorepo.',
        'Remove the source package from workspaces.',
        'Delete the source directory.',
        'Build all affected packages.',
        'Run tests for all affected packages.',
        'Commit with descriptive message.',
        args.dryRun ? 'DRY RUN: describe changes but do not execute.' : '',
      ].filter(Boolean),
      outputFormat: 'JSON with { dissolved: boolean, filesMoved: number, targetsUpdated: string[] }',
    },
  },
}));

// ---------------------------------------------------------------------------
// Phase 2: Create Missing Packages
// ---------------------------------------------------------------------------

const createPackageTask = defineTask('v6.1.create-package', (args) => ({
  kind: 'agent',
  title: `Create ${args.packageName} package`,
  labels: ['feat', 'new-package', args.phase],
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Package architect',
      task: `Create new npm package ${args.npmName} at ${args.directory}.`,
      context: {
        graphMux: args.graphMux,
        layer: args.layer,
        description: args.description,
        seedFrom: args.seedFrom,
        interfaces: args.interfaces,
      },
      instructions: [
        `1. Create directory: ${args.directory}`,
        '2. Create package.json with name, version 5.0.0, description, exports, types, license MIT',
        '3. Create tsconfig.json matching the SDK pattern (ES2022, CommonJS, strict)',
        '4. Create src/index.ts with the primary interfaces and exports',
        args.seedFrom ? `5. Move seed content from ${args.seedFrom}` : '5. Implement stub interfaces',
        '6. Add to root package.json workspaces',
        '7. npm install to link',
        '8. Build: npm run build',
        '9. Commit with message: "feat: create ' + args.npmName + ' package"',
      ],
      outputFormat: 'JSON with { created: boolean, exports: string[], testsPass: boolean }',
    },
  },
}));

const formalizeSchemaTask = defineTask('v6.1.formalize-schema', (args) => ({
  kind: 'agent',
  title: `Formalize ${args.schemaName} schema`,
  labels: ['feat', 'schema', args.phase],
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'API schema designer',
      task: `Define formal TypeScript types and JSON Schema for ${args.schemaName}.`,
      context: {
        currentTypes: args.currentTypes,
        graphNodeKinds: args.graphNodeKinds,
        consumers: args.consumers,
      },
      instructions: [
        'Research existing ad-hoc types across the codebase.',
        'Define canonical TypeScript interfaces.',
        'Create JSON Schema for runtime validation.',
        'Add schema validation to adapter tests.',
        'Export from the package index.',
        'Commit.',
      ],
      outputFormat: 'JSON with { types: string[], schemaFiles: string[], validationAdded: boolean }',
    },
  },
}));

// ---------------------------------------------------------------------------
// Phase 3: Missing Functionality
// ---------------------------------------------------------------------------

const implementFeatureTask = defineTask('v6.1.implement-feature', (args) => ({
  kind: 'agent',
  title: `Implement ${args.featureName}`,
  labels: ['feat', 'implementation', args.phase],
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Systems engineer',
      task: `Implement ${args.featureName} in ${args.package}.`,
      context: {
        graphSpec: args.graphSpec,
        acceptance: args.acceptance,
        existingCode: args.existingCode,
      },
      instructions: args.steps,
      outputFormat: 'JSON with { implemented: boolean, testsAdded: number, testsPass: boolean }',
    },
  },
}));

// ---------------------------------------------------------------------------
// Phase 4 & 5: Graph Updates and Metadata
// ---------------------------------------------------------------------------

const updateGraphTask = defineTask('v6.1.update-graph', (args) => ({
  kind: 'agent',
  title: `Update atlas graph: ${args.description}`,
  labels: ['graph', 'metadata', args.phase],
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Atlas graph maintainer',
      task: `Update the atlas graph YAML files: ${args.description}`,
      context: {
        targetFiles: args.targetFiles,
        changes: args.changes,
      },
      instructions: [
        'Edit the specified YAML files in packages/atlas/graph/',
        'Rebuild the index: npx tsx packages/atlas/src/indexer.ts --catalog-dir packages/atlas/graph --out packages/atlas/src/index.json',
        'Verify: npm run build --workspace=@a5c-ai/atlas',
        'Commit.',
      ],
      outputFormat: 'JSON with { updated: boolean, filesChanged: string[] }',
    },
  },
}));

const annotatePackageTask = defineTask('v6.1.annotate-package', (args) => ({
  kind: 'shell',
  title: `Annotate ${args.packageName} with atlas metadata`,
  labels: ['metadata', args.phase],
  shell: {
    command: 'node',
    args: ['-e', `
      const fs = require('fs');
      const pkgPath = '${args.packageJsonPath}';
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.atlas = ${JSON.stringify(args.atlasMetadata)};
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\\n');
      console.log(JSON.stringify({ annotated: true, package: pkg.name }));
    `],
    expectedExitCode: 0,
    timeout: 10000,
  },
}));

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const verifyPhaseTask = defineTask('v6.1.verify-phase', (args) => ({
  kind: 'shell',
  title: `Verify phase: ${args.phaseName}`,
  labels: ['verify', args.phase],
  shell: {
    command: 'bash',
    args: ['-c', [
      'set -euo pipefail',
      'echo "=== Verifying phase: ' + args.phaseName + ' ==="',
      // Build all affected packages
      ...(args.buildWorkspaces || []).map(ws => `npm run build --workspace=${ws} 2>&1 | tail -3`),
      // Run tests
      ...(args.testCommands || []).map(cmd => `${cmd} 2>&1 | tail -5`),
      // Verify graph
      args.verifyGraph ? 'npm run build --workspace=@a5c-ai/atlas 2>&1 | tail -5' : 'echo "graph verify skipped"',
      'echo "=== Phase verified ==="',
      'echo \'{"verified": true, "phase": "' + args.phaseName + '"}\'',
    ].join(' && ')],
    expectedExitCode: 0,
    timeout: 300000,
  },
}));

// ---------------------------------------------------------------------------
// Orchestration: the process function
// ---------------------------------------------------------------------------

export async function process(inputs, ctx) {
  const {
    workspace = process.cwd(),
    targetPhases = ['1.1', '1.2', '1.3', '2.1', '2.2', '3.1', '3.2', '3.3', '3.4', '4', '5'],
    dryRun = false,
  } = inputs ?? {};

  const phasesCompleted = [];
  const issues = [];
  const artifacts = [];

  // =========================================================================
  // PHASE 1.1: Rename agent-plugins-mux → extension-mux
  // =========================================================================
  if (targetPhases.includes('1.1')) {
    const rename1 = await ctx.task(renamePackageTask, {
      phase: 'phase-1.1',
      currentName: 'agent-plugins-mux',
      targetName: 'extension-mux',
      currentDir: 'packages/agent-plugins-mux',
      targetDir: 'packages/extension-mux',
      currentNpm: '@a5c-ai/agent-plugins-mux',
      targetNpm: '@a5c-ai/extension-mux',
      graphMux: 'mux:extension-mux',
      dryRun,
    });

    const verify1 = await ctx.task(verifyPhaseTask, {
      phase: 'phase-1.1',
      phaseName: '1.1 extension-mux rename',
      buildWorkspaces: ['@a5c-ai/extension-mux'],
      testCommands: ['npm run test --workspace=@a5c-ai/extension-mux'],
      verifyGraph: false,
    });

    phasesCompleted.push('1.1');
    await ctx.breakpoint({ reason: 'Phase 1.1 complete — review before proceeding' });
  }

  // =========================================================================
  // PHASE 1.2: Rename breakpoints-mux → tasks-mux
  // =========================================================================
  if (targetPhases.includes('1.2')) {
    const rename2 = await ctx.task(renamePackageTask, {
      phase: 'phase-1.2',
      currentName: 'breakpoints-mux',
      targetName: 'tasks-mux',
      currentDir: 'packages/breakpoints-mux',
      targetDir: 'packages/tasks-mux',
      currentNpm: '@a5c-ai/breakpoints-mux',
      targetNpm: '@a5c-ai/tasks-mux',
      graphMux: 'mux:tasks-mux',
      dryRun,
    });

    const verify2 = await ctx.task(verifyPhaseTask, {
      phase: 'phase-1.2',
      phaseName: '1.2 tasks-mux rename',
      buildWorkspaces: ['@a5c-ai/tasks-mux'],
      testCommands: ['npm run test --workspace=@a5c-ai/tasks-mux'],
      verifyGraph: false,
    });

    phasesCompleted.push('1.2');
    await ctx.breakpoint({ reason: 'Phase 1.2 complete — review before proceeding' });
  }

  // =========================================================================
  // PHASE 2.1 + agent-core dissolution: Create tool-mux from agent-core seed
  // =========================================================================
  if (targetPhases.includes('2.1')) {
    const [toolMux, dissolve] = await ctx.parallel.all([
      async () => ctx.task(createPackageTask, {
        phase: 'phase-2.1',
        packageName: 'tool-mux',
        npmName: '@a5c-ai/tool-mux',
        directory: 'packages/tool-mux',
        graphMux: 'mux:tool-mux',
        layer: 'L8 (Execution)',
        description: 'Tool schema translation, dispatch policies, and MCP bridging',
        seedFrom: 'packages/agent-core/src/agenticTools + deferredToolRegistry.ts',
        interfaces: ['ToolDescriptor', 'ToolDispatchPolicy', 'ToolSchemaTranslator'],
      }),
      async () => ctx.task(dissolvePackageTask, {
        phase: 'phase-2.1',
        packageName: '@a5c-ai/agent-core',
        sourceDir: 'packages/agent-core',
        targets: ['@a5c-ai/tool-mux', '@a5c-ai/babysitter-agent'],
        fileMapping: {
          'src/agenticTools/': 'packages/tool-mux/src/agentic-tools/',
          'src/deferredToolRegistry.ts': 'packages/tool-mux/src/deferred-tool-registry.ts',
          'src/tools.ts': 'packages/tool-mux/src/tools.ts',
          'src/backgroundProcessRegistry.ts': 'packages/babysitter-agent/src/runtime/background-process-registry.ts',
          'src/session.ts': 'packages/babysitter-agent/src/session/agent-core-session.ts',
        },
        reason: 'agent-core is misnamed — its contents belong in tool-mux (tools) and babysitter-agent (runtime)',
        dryRun,
      }),
    ], { maxConcurrency: 2 });

    phasesCompleted.push('2.1');
    await ctx.breakpoint({ reason: 'Phase 2.1 complete — tool-mux created, agent-core dissolved' });
  }

  // =========================================================================
  // PHASE 2.2: Formalize agent-comm-mux event schema
  // =========================================================================
  if (targetPhases.includes('2.2')) {
    const schema = await ctx.task(formalizeSchemaTask, {
      phase: 'phase-2.2',
      schemaName: 'agent-comm-mux canonical event schema',
      currentTypes: 'packages/agent-mux/core/src/types.ts',
      graphNodeKinds: ['Channel', 'ProtocolMessage'],
      consumers: ['agent-mux-tui', 'agent-mux-ui', 'agent-mux-webui', 'agent-mux-gateway'],
    });

    phasesCompleted.push('2.2');
  }

  // =========================================================================
  // PHASE 1.3: agent-mux decomposition
  // =========================================================================
  if (targetPhases.includes('1.3')) {
    // Extract agent-launch-mux
    const launchMux = await ctx.task(createPackageTask, {
      phase: 'phase-1.3',
      packageName: 'agent-launch-mux',
      npmName: '@a5c-ai/agent-launch-mux',
      directory: 'packages/agent-mux/launch',
      graphMux: 'mux:agent-launch-mux',
      layer: 'L8 (Execution)',
      description: 'Spawn and supervise agent invocations with 9-state lifecycle',
      seedFrom: 'packages/agent-mux/cli/src/commands/launch.ts',
      interfaces: ['InvocationOptions', 'InvocationState', 'SpawnArgs', 'LifecycleHooks'],
    });

    // Extract agent-config-mux
    const configMux = await ctx.task(createPackageTask, {
      phase: 'phase-1.3',
      packageName: 'agent-config-mux',
      npmName: '@a5c-ai/agent-config-mux',
      directory: 'packages/agent-mux/config',
      graphMux: 'mux:agent-config-mux',
      layer: 'L5-L6 (Runtime/Platform)',
      description: 'Cross-agent install, config, auth, and detection',
      seedFrom: 'packages/agent-mux/cli/src/commands/install*.ts + packages/agent-mux/adapters/',
      interfaces: ['AdapterConfig', 'InstallResult', 'DetectResult', 'AuthVerification'],
    });

    // Rename agent-mux-core → agent-comm-mux
    const commMux = await ctx.task(renamePackageTask, {
      phase: 'phase-1.3',
      currentName: 'agent-mux-core',
      targetName: 'agent-comm-mux',
      currentDir: 'packages/agent-mux/core',
      targetDir: 'packages/agent-mux/comm',
      currentNpm: '@a5c-ai/agent-mux-core',
      targetNpm: '@a5c-ai/agent-comm-mux',
      graphMux: 'mux:agent-comm-mux',
      dryRun,
    });

    const verify3 = await ctx.task(verifyPhaseTask, {
      phase: 'phase-1.3',
      phaseName: '1.3 agent-mux decomposition',
      buildWorkspaces: [
        '@a5c-ai/agent-launch-mux',
        '@a5c-ai/agent-config-mux',
        '@a5c-ai/agent-comm-mux',
        '@a5c-ai/agent-mux-cli',
      ],
      testCommands: ['npm run test:agent-mux'],
      verifyGraph: false,
    });

    phasesCompleted.push('1.3');
    await ctx.breakpoint({ reason: 'Phase 1.3 complete — agent-mux decomposed into 3 graph-aligned muxes' });
  }

  // =========================================================================
  // PHASE 3: Missing Functionality (parallel independent tasks)
  // =========================================================================
  if (targetPhases.some(p => p.startsWith('3.'))) {
    const phase3Tasks = [];

    if (targetPhases.includes('3.1')) {
      phase3Tasks.push(async () => ctx.task(implementFeatureTask, {
        phase: 'phase-3.1',
        featureName: '9-state invocation lifecycle',
        package: '@a5c-ai/agent-launch-mux',
        graphSpec: 'spawned → running → paused → interrupted → aborted | timed-out | completed | crashed | killed',
        acceptance: [
          'InvocationState enum with all 9 states',
          'State machine with valid transitions',
          'pause()/resume() via SIGSTOP/SIGCONT',
          'interrupt() with graceful timeout',
          'Retry policy with exponential backoff',
          'Min-version enforcement (semver gate)',
        ],
        existingCode: 'packages/agent-mux/launch/src/ (after Phase 1.3 extraction)',
        steps: [
          'Define InvocationState enum with all 9 states',
          'Implement state machine with valid transition map',
          'Add pause() — SIGSTOP on Unix, suspend on Windows',
          'Add resume() — SIGCONT',
          'Add interrupt() — SIGTERM with configurable timeout → SIGKILL',
          'Add lifecycle hooks: onSpawnError, onTimeout, onProcessExit, shouldRetry',
          'Implement RetryPolicy: { maxRetries, backoffMs, backoffMultiplier }',
          'Add semver min-version gate against AgentVersion from atlas graph',
          'Write tests for each state transition',
          'Write tests for retry policy',
        ],
      }));
    }

    if (targetPhases.includes('3.2')) {
      phase3Tasks.push(async () => ctx.task(implementFeatureTask, {
        phase: 'phase-3.2',
        featureName: 'Transport codec architecture',
        package: '@a5c-ai/transport-mux',
        graphSpec: 'TransportCodec per protocol — decode request, encode response, stream chunks',
        acceptance: [
          'TransportCodec interface defined',
          'Codecs: anthropic, openai-chat, openai-responses, google, bedrock',
          'Tool schema translation between formats',
          'Cost/usage normalization',
          'Codec selection from atlas graph TransportDescriptor',
        ],
        existingCode: 'packages/transport-mux/src/',
        steps: [
          'Define TransportCodec interface: decodeRequest, encodeResult, encodeStreamChunk, capabilities',
          'Extract existing translation from server.ts into per-protocol codec classes',
          'Implement tool schema translation (OpenAI ↔ Anthropic ↔ Google)',
          'Implement cost normalization (input_tokens ↔ prompt_tokens ↔ promptTokenCount)',
          'Make codec selection data-driven from atlas graph',
          'Write round-trip tests for each codec',
        ],
      }));
    }

    if (targetPhases.includes('3.3')) {
      phase3Tasks.push(async () => ctx.task(implementFeatureTask, {
        phase: 'phase-3.3',
        featureName: 'Structured install error reporting',
        package: '@a5c-ai/agent-config-mux',
        graphSpec: 'agent-config-mux returns structured errors with npm stderr and suggested fix',
        acceptance: [
          'InstallResult includes error details when installed=false',
          'npm stderr captured and returned',
          'Suggested fix included in error',
          'Auth verification step per adapter',
        ],
        existingCode: 'packages/agent-mux/config/src/ (after Phase 1.3)',
        steps: [
          'Add error field to InstallResult: { code, stderr, suggestedFix }',
          'Capture npm stderr from spawn',
          'Add per-adapter auth verification (check API key format/validity)',
          'Add post-install version check',
          'Write tests for error scenarios',
        ],
      }));
    }

    if (targetPhases.includes('3.4')) {
      phase3Tasks.push(async () => ctx.task(implementFeatureTask, {
        phase: 'phase-3.4',
        featureName: 'Session storage backend abstraction',
        package: '@a5c-ai/babysitter-sdk',
        graphSpec: 'session-storage-mux: multiple backends for session persistence',
        acceptance: [
          'SessionStorageBackend interface defined',
          'FileSystemBackend implements current behavior',
          'Backend selection via environment/config',
        ],
        existingCode: 'packages/sdk/src/session/',
        steps: [
          'Define SessionStorageBackend interface: read, write, list, delete',
          'Extract current filesystem logic into FileSystemBackend class',
          'Make session module use the backend interface',
          'Add backend factory with env-based selection',
          'Write tests using both FileSystemBackend and a mock backend',
        ],
      }));
    }

    if (phase3Tasks.length > 0) {
      await ctx.parallel.all(phase3Tasks, { maxConcurrency: 3 });
      phasesCompleted.push(...targetPhases.filter(p => p.startsWith('3.')));
      await ctx.breakpoint({ reason: 'Phase 3 complete — missing functionality implemented' });
    }
  }

  // =========================================================================
  // PHASE 4: Graph Updates
  // =========================================================================
  if (targetPhases.includes('4')) {
    const graphUpdates = await ctx.parallel.all([
      async () => ctx.task(updateGraphTask, {
        phase: 'phase-4',
        description: 'Add agent-mux-core as AgentCoreImpl, move misplaced node kinds',
        targetFiles: [
          'packages/atlas/graph/agent-stack/core-impls/',
          'packages/atlas/graph/extensions/',
          'packages/atlas/graph/compute/',
        ],
        changes: [
          'Add AgentCoreImpl record for agent-comm-mux (renamed from agent-mux-core)',
          'Move ProviderTranslation from extensions → compute cluster',
          'Move TransportRuntime from extensions → compute cluster',
          'Move AdapterModel from extensions → capabilities-and-models cluster',
          'Add SourceRef nodes for new packages (tool-mux, agent-launch-mux, agent-config-mux, agent-comm-mux)',
          'Add implementedBy edges from mux records to package SourceRefs',
          'Update extension-mux and tasks-mux SourceRef paths',
        ],
      }),
    ], { maxConcurrency: 1 });

    phasesCompleted.push('4');
  }

  // =========================================================================
  // PHASE 5: Package Metadata
  // =========================================================================
  if (targetPhases.includes('5')) {
    const packages = [
      { path: 'packages/sdk/package.json', meta: { layers: ['L4', 'L7', 'L8', 'L13'], muxes: ['session-storage-mux'], nodeKinds: ['Run', 'Phase', 'Effect', 'Session'] } },
      { path: 'packages/babysitter-agent/package.json', meta: { layers: ['L5', 'L11'], nodeKinds: ['AgentRuntimeImpl', 'AgentUIImpl'] } },
      { path: 'packages/transport-mux/package.json', meta: { layers: ['L3'], muxes: ['transport-mux'], nodeKinds: ['TransportProxy'] } },
      { path: 'packages/agent-catalog/package.json', meta: { layers: ['L12'], nodeKinds: ['KnowledgeFabricImpl'] } },
      { path: 'packages/observer-dashboard/package.json', meta: { layers: ['L11'], nodeKinds: ['Dashboard'] } },
      { path: 'packages/triggers/package.json', meta: { layers: [], nodeKinds: ['OperationalTrigger'] } },
      { path: 'packages/cloud/package.json', meta: { layers: [], nodeKinds: ['DeploymentTarget'] } },
    ];

    await ctx.parallel.all(
      packages.map(p => async () => ctx.task(annotatePackageTask, {
        phase: 'phase-5',
        packageName: p.path,
        packageJsonPath: p.path,
        atlasMetadata: p.meta,
      })),
      { maxConcurrency: 5 },
    );

    phasesCompleted.push('5');
  }

  // =========================================================================
  // Final summary
  // =========================================================================
  return {
    success: phasesCompleted.length === targetPhases.length,
    phasesCompleted,
    issues,
    artifacts,
  };
}
