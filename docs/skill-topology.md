# Skill Topology

This document records the proposal-aligned skill shape for the restructured
`first-tree` CLI.

## Proposal Target

The proposal aims for this shipped skill layout:

```text
skills/
  first-tree/         umbrella entrypoint
  tree/               handbook for `first-tree tree`
  first-tree-hub/     handbook for `first-tree hub`
  first-tree-github/  handbook for `first-tree github`
  gardener/           integration skill for maintenance workflows
```

The intent is:

- `first-tree`, `tree`, `first-tree-hub`, and `first-tree-github` stay
  lightweight handbook-style skills
- `gardener` is the special case that can ship workflow templates, scripts, and
  references because it acts more like an installable integration bundle

## Current Workspace Reality

This workspace has not restored that full topology yet.

Today:

- `tree` command documentation lives mainly in the root docs and CLI help
- `github scan` is implemented in `packages/auto`
- `packages/auto/skills/auto/` still exists as the historical skill payload for
  that runtime package
- `skills/gardener/` is not yet present in this workspace snapshot

## Why This Matters

The CLI restructure is not just a command rename. It also changes how agents
discover and consume the product handbooks:

- `first-tree tree skill ...` becomes the maintenance namespace
- `first-tree github scan` should eventually be paired with a dedicated
  `first-tree-github` handbook skill
- `gardener` should be delivered as a skill instead of as a top-level CLI product

## Contributor Guidance

When porting skill content back from the old main branch:

1. preserve the proposal's target names
2. avoid reintroducing the old top-level `skill` or `gardener` CLI public shape
3. update both the docs and install/upgrade flows together
