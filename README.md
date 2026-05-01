# first-tree

**Shared Context for agent teams.** `first-tree` is a Git-native layer for
decisions, ownership, and cross-repo context that both humans and agents can
read from and write back to.

This repository is currently migrating the old main branch into a pnpm
workspace while adopting the
`first-tree-cli-restructure.20260429.md` proposal:

- `first-tree tree` remains the Context Tree surface
- `first-tree github scan` becomes the public home for the old `breeze` flow
- `first-tree hub` stays reserved as a stub namespace for now
- `gardener` moves out of the CLI and into a shipped skill
- skill maintenance moves from `first-tree skill ...` to `first-tree tree skill ...`

## Quick Links

- [Quickstart](#quickstart)
- [Product Surface](#product-surface)
- [Why first-tree](#why-first-tree)
- [Command Map](#command-map)
- [Migration Guide](./docs/cli-restructure-migration.md)
- [Skill Topology](./docs/skill-topology.md)
- [Onboarding Guide](./docs/onboarding.md)
- [Source Map](./docs/source-map.md)
- [Contributing](./CONTRIBUTING.md)
- [Support](./SUPPORT.md)
- [Security](./SECURITY.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

## Product Surface

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         first-tree (umbrella CLI)                    │
├───────────────────────────┬───────────────────────────┬──────────────┤
│           tree            │        github scan        │     hub      │
│     Context Tree CLI      │   GitHub inbox runtime    │  reserved    │
├───────────────────────────┼───────────────────────────┼──────────────┤
│ inspect / init / bind /   │ install / start / poll /  │ start / stop │
│ workspace / verify /      │ run / watch / doctor /    │ / doctor /   │
│ publish / tree skill ...  │ statusline / cleanup      │ status       │
└───────────────────────────┴───────────────────────────┴──────────────┘

Separate shipped skill target from the proposal:

  skills/gardener/    context-aware maintenance and review workflow
```

| Surface                  | Role                                                                           | Current repo status                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `first-tree tree`        | Context Tree onboarding, inspection, validation, publishing, skill maintenance | `inspect`, `status`, and `help onboarding` are wired; the rest of the proposal surface exists as scaffolding while the old tree runtime is ported back in |
| `first-tree github scan` | GitHub notification scanning and dispatch, formerly discussed as `breeze`      | Fully wired to [`packages/auto/`](./packages/auto/README.md), with proposal-level tree binding checks at the CLI entry                                    |
| `first-tree hub`         | Reserved namespace for future Hub integration                                  | Stub commands only in this workspace                                                                                                                      |
| `skills/gardener/`       | Context-aware review / maintenance skill                                       | Planned by proposal; not yet shipped in this workspace snapshot                                                                                           |

## Why first-tree

Humans and agents need the same level of context to ship together.

`CLAUDE.md` per repo drifts quickly. Search tools are useful, but they do not
become the source of truth. A Context Tree is meant to hold the durable
decisions, ownership, and cross-domain relationships that shape execution.

|                                               | Per-repo markdown only | Search / wiki tools | **first-tree** |
| --------------------------------------------- | ---------------------- | ------------------- | -------------- |
| Humans can read it                            | yes                    | yes                 | yes            |
| Agents can read it deterministically          | partial                | partial             | yes            |
| Agents can propose updates                    | rare                   | rare                | yes            |
| Works across repos                            | weak                   | strong              | strong         |
| Ownership is attached to nodes                | rare                   | inconsistent        | yes            |
| Can drive GitHub automation with tree context | no                     | no                  | yes            |

## Current Status

- The fetched `agent-team-foundation/first-tree` `main` branch in this
  worktree is the current remote `main`; this repo was already on that commit
  before the migration work started locally.
- The old backup repo still contains most of the historical tree, breeze,
  gardener, and README content. This workspace now uses it as a port-back
  reference rather than as the active structure.
- `packages/auto` is the most complete runtime today, so the public CLI now
  exposes it as `first-tree github scan`.
- The tree runtime is still mid-port. Public command names are now aligned with
  the proposal so documentation, tests, and future implementation can converge
  on one stable surface.

## Quickstart

From this repository:

```bash
pnpm install
pnpm --filter first-tree build
node apps/cli/dist/index.js tree inspect --json
node apps/cli/dist/index.js tree help onboarding
node apps/cli/dist/index.js github scan --help
```

If you are using the published CLI package instead of a source checkout, the
same command surface is:

```bash
npx -p first-tree first-tree tree inspect --json
npx -p first-tree first-tree github scan --help
```

## Command Map

### `first-tree tree`

| Command                                                                                                                                                                   | Role                                                               | Status in this workspace                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `inspect`                                                                                                                                                                 | Classify the current folder and report first-tree metadata         | implemented                                            |
| `status`                                                                                                                                                                  | Human-friendly alias for `inspect`                                 | implemented                                            |
| `help onboarding`                                                                                                                                                         | Print the onboarding narrative for the restructured CLI            | implemented                                            |
| `init`, `bootstrap`, `bind`, `integrate`, `workspace sync`, `verify`, `upgrade`, `publish`, `generate-codeowners`, `install-claude-code-hook`, `inject-context`, `review` | Proposal-level public tree surface                                 | placeholders while the old tree engine is ported back  |
| `skill install`, `skill upgrade`, `skill list`, `skill doctor`, `skill link`                                                                                              | Proposal-level replacement for the old top-level `skill` namespace | placeholders while shipped skill payloads are restored |

### `first-tree github scan`

| Command group                                                                                                                                         | Role                                                  | Status in this workspace |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------ |
| `install`, `start`, `stop`, `status`, `doctor`, `watch`, `poll`, `run`, `daemon`, `run-once`, `cleanup`, `statusline`, `status-manager`, `poll-inbox` | Public GitHub scan surface, backed by `packages/auto` | implemented              |

`github scan` follows the proposal's fail-closed binding rule:

- `install`, `start`, `run`, `daemon`, `run-once`, and `poll` require a bound
  tree repo from `.first-tree/source.json`, or an explicit
  `--tree-repo <owner/repo>` override.
- `status`, `doctor`, `stop`, `cleanup`, `watch`, and hook/internal commands can
  still run without a tree binding so local diagnosis is not blocked.

### `first-tree hub`

| Command                             | Role                                          | Status in this workspace |
| ----------------------------------- | --------------------------------------------- | ------------------------ |
| `start`, `stop`, `doctor`, `status` | Reserved namespace for future Hub integration | stub                     |

## Migration Notes

The public command path changes introduced by the proposal are:

| Old path                           | New path                                                       |
| ---------------------------------- | -------------------------------------------------------------- |
| `first-tree breeze <subcommand>`   | `first-tree github scan <subcommand>`                          |
| `first-tree skill <subcommand>`    | `first-tree tree skill <subcommand>`                           |
| `first-tree gardener <subcommand>` | delivered as `skills/gardener/`, not a top-level CLI namespace |

For deeper notes, port-back status, and contributor guidance, see
[docs/cli-restructure-migration.md](./docs/cli-restructure-migration.md).

## Repository Layout

```text
apps/
  cli/               published `first-tree` CLI package
packages/
  auto/              internal implementation for `first-tree github scan`
docs/
  cli-restructure-migration.md
  skill-topology.md
  onboarding.md
  source-map.md
```

## Open Source Docs

- [CONTRIBUTING.md](./CONTRIBUTING.md) explains local setup, validation, and
  the documentation expectations for public CLI changes.
- [SUPPORT.md](./SUPPORT.md) explains where to ask usage questions, report bugs,
  and send security-sensitive issues.
- [SECURITY.md](./SECURITY.md) covers supported versions and how to report
  vulnerabilities.
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) documents the expected behavior in
  issues, reviews, and discussions.
