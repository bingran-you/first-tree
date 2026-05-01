# Source Map

This document is the quickest reading path for contributors working in the
restructured workspace.

## Start Here

1. [README.md](../README.md)
2. [docs/cli-restructure-migration.md](./cli-restructure-migration.md)
3. [docs/skill-topology.md](./skill-topology.md)
4. [docs/onboarding.md](./onboarding.md)

## CLI Entry

- [`apps/cli/src/index.ts`](../apps/cli/src/index.ts): root program, version,
  global flags, all-commands appendix
- [`apps/cli/src/commands/index.ts`](../apps/cli/src/commands/index.ts): top-level command registration
- [`apps/cli/src/commands/tree/index.ts`](../apps/cli/src/commands/tree/index.ts): proposal-aligned tree surface
- [`apps/cli/src/commands/github/index.ts`](../apps/cli/src/commands/github/index.ts): public `github scan` entry
- [`apps/cli/src/commands/github/scan-binding.ts`](../apps/cli/src/commands/github/scan-binding.ts): tree-binding fail-closed logic

## GitHub Scan Runtime

- [`packages/auto/src/cli.ts`](../packages/auto/src/cli.ts): dispatcher and help text
- [`packages/auto/src/commands/`](../packages/auto/src/commands): command implementations
- [`packages/auto/src/daemon/`](../packages/auto/src/daemon): long-running runtime
- [`packages/auto/src/runtime/`](../packages/auto/src/runtime): parsing, config, paths, task state
- [`packages/auto/README.md`](../packages/auto/README.md): package-level overview

## Tests

- [`apps/cli/tests/`](../apps/cli/tests): umbrella CLI tests
- [`packages/auto/tests/`](../packages/auto/tests): GitHub scan runtime tests

## Historical Reference

The old backup repo still holds the fuller pre-workspace implementation and the
older README voice. Use it as a reference when porting behavior back, but land
new code under the proposal's current public names.
