# @a5c-ai/babysitter

Metapackage for installing all babysitter npm packages.

## Installation

```bash
npm install -g @a5c-ai/babysitter
```

## Usage

Once installed, you can use the `babysitter` command:

```bash
npx @a5c-ai/babysitter --help
```

Or if installed globally:

```bash
babysitter --help          # agent-facing commands (default)
babysitter --help-human    # human-facing commands (harness:*, session:init, mcp:serve, ...)
```

## What's Included

This metapackage installs:

- **@a5c-ai/babysitter-sdk** - Core SDK with CLI for managing babysitter workflows

## CLI Entry Point

The `babysitter` command provided by this metapackage is an alias to the CLI from `@a5c-ai/babysitter-sdk`.

## Repository

https://github.com/a5c-ai/babysitter
