# {{name}}

{{description}}

## Prerequisites

Install the Babysitter SDK CLI:

```bash
npm install -g @a5c-ai/babysitter-sdk
```

## Installation — {{targetDisplayName}}

{{installInstructions}}

## What's Included

- **Skills**: {{skillNames}}
- **Hooks**: {{hookNames}}
- **Commands**: {{commandList}}
{{#if hasBinScripts}}
- **CLI**: Install/uninstall scripts for global and workspace setup
{{/if}}
{{#if hasExtension}}
- **Extension**: Programmatic {{targetDisplayName}} extension with hook bridge
{{/if}}

## Verification

```bash
{{verifyCommands}}
```

## Integration Model

The plugin provides:

- Core orchestration skill for multi-step workflow management
- Lifecycle hooks for session state, orchestration loops, and token compression
- Command wrappers for plan, resume, doctor, and other operations

The process library is fetched and bound through the SDK CLI.
