# Contributing to first-tree

Thanks for helping improve `first-tree`.

This repository is in the middle of an intentional migration:

- the old single-package main branch is now reference material
- the active repo is a pnpm workspace
- the public CLI is being reshaped around `tree`, `github scan`, and `hub`
- `gardener` is moving out of the CLI and into a shipped skill

That means good contributions here do two things at once:

1. improve the current workspace
2. reduce ambiguity for the remaining port-back work

## Before You Change Anything

- Read [README.md](./README.md) for the public surface area.
- Read [docs/cli-restructure-migration.md](./docs/cli-restructure-migration.md)
  if your change touches command names, help output, or migration behavior.
- Read [docs/skill-topology.md](./docs/skill-topology.md) if your change touches
  shipped skills, onboarding docs, or the `tree skill` namespace.
- Read [docs/source-map.md](./docs/source-map.md) before moving code between
  `apps/cli` and `packages/auto`.
- If a change is large, cross-cutting, or proposal-shaping, open an issue or
  draft PR first so maintainers can align on the intended direction.

## Local Setup

Use the same baseline as CI:

- Node.js 22+
- pnpm 10+

Install dependencies from the repo root:

```bash
pnpm install
```

## Validation

Run the standard checks before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If you touch the published CLI package, also verify the built entry manually:

```bash
pnpm --filter first-tree build
node apps/cli/dist/index.js --help
```

## Change Discipline

- Keep public command names aligned with the restructure proposal unless the PR
  explicitly updates that contract.
- If you change `first-tree github scan`, update the public docs and the
  binding-contract notes in the same PR.
- If you change `apps/cli` help output, update the CLI tests and any affected
  README or migration guide examples.
- If you port functionality back from the old main branch, prefer matching the
  proposal's new public paths instead of reviving deprecated names.
- Keep the root package thin. Product-facing CLI code belongs in `apps/cli/`;
  reusable runtime logic belongs in `packages/`.

## Pull Requests

Helpful PRs for this repo usually include:

- the user-facing or maintainer-facing problem being solved
- the affected surface area (`tree`, `github scan`, `hub`, docs, packaging, or tests)
- the validation commands you ran
- any follow-up work that is still intentionally left out

## Where To Start Reading

- [README.md](./README.md) for the public entrypoint
- [docs/source-map.md](./docs/source-map.md) for the maintainer reading order
- [packages/auto/README.md](./packages/auto/README.md) for the current
  GitHub scan implementation
