# Drift Taxonomy

Every finding produced by sync must be classified into exactly one of these
six categories. The category drives the fix workflow — see
`references/fix-workflow.md`.

## `tree-stale`

The tree node states a fact that _was_ true but is no longer. The code side
moved; the tree did not.

**Signals:** the tree references a function / file / path that the code
shows has been renamed, removed, or restructured. The tree's claim was
correct at some prior commit.

**Example:** tree node says "Auth middleware lives at `src/middleware/auth.ts`"
but the code shows it was moved to `src/auth/middleware.ts` two months ago.

**Fix bias:** code is the ground truth → update the tree.

## `tree-wrong`

The tree node states a fact that was never correct, independent of any code
movement.

**Signals:** the tree's claim cannot be traced to any commit; or it
contradicts the code at the time the node was written.

**Example:** tree node says "All endpoints return JSON" but a PR from before
the node was written introduced a streaming endpoint that returns NDJSON.

**Fix bias:** correct the tree, but check ownership — the original author
may have meant something subtler.

## `tree-outdated`

The tree node was correct, but a more recent decision supersedes it. The old
decision is not "wrong" — it has just been replaced.

**Signals:** a newer tree node, RFC, or merged PR discusses the same area
and reaches a different conclusion.

**Example:** tree node says "We use Postgres" but a migration RFC merged
last quarter switched the relevant service to ClickHouse.

**Fix bias:** mark the old node as superseded and link the new decision.
Don't delete history — preserve the rationale.

## `code-not-synced`

The code side made a change that should have produced a tree update but
didn't. The tree is silent on something it should now cover.

**Signals:** a merged PR introduces a new service / cross-repo dep / public
contract / ownership shift, and no corresponding tree node exists.

**Example:** a new repo joined the workspace last week; the tree's
`source-repos.md` and the relevant domain `NODE.md` make no mention of it.

**Fix bias:** add the missing tree node. This is the boundary case where
sync may hand off to `first-tree-write` if the user already provided the
specific source PR — see `references/boundary.md`.

## `cross-domain-broken`

A `soft_links` reference between domains is broken — the target was
renamed, removed, or moved out of the tree.

**Signals:** `tree verify` reports a broken `soft_links` target, or a
`NODE.md` references a sibling that no longer exists.

**Example:** `members/alice/NODE.md` has `soft_links: [auth/middleware]`
but `auth/middleware/NODE.md` was renamed to `auth/handlers/`.

**Fix bias:** repair the link. If the target genuinely went away, decide
whether to drop the link or replace with the new target.

## `ownership-stale`

The tree's frontmatter `owners:` list does not match the code-side reality.
A maintainer left, ownership was redistributed, or the node never had the
right owners.

**Signals:** the listed owner has not touched the code area for >6 months;
PRs in the area are reviewed by a different team; the user (in conversation)
disagrees with the listed owner.

**Example:** `auth/NODE.md` lists `[bob]` but Bob left the team and Carol
has been the de-facto reviewer for three months.

**Fix bias:** update via owner-review, not unilaterally. Ownership changes
are a high-trust operation — flag for human approval rather than auto-PR.

## Classification Rules

- A finding fits **exactly one** category. If two seem to fit, pick the
  more specific one (`tree-outdated` over `tree-stale`, `ownership-stale`
  over `tree-wrong`).
- If you cannot classify, the finding is not yet a drift — it is a
  question. Ask the user before reporting it.
- "The tree could be more detailed" is **not** drift. Sync looks for facts
  that disagree, not for absent depth. Use `first-tree-write` to add
  content.

## Code Is The Ground Truth

For `tree-stale`, `tree-wrong`, `tree-outdated`, and `cross-domain-broken`,
default to merged code on the default branch as the higher-confidence
source — the proposal calls this "已合入代码上位".

The exception is a tree node whose frontmatter explicitly declares
`decisionLocksCode: true`. That is a deliberate "tree wins, escalate to a
human" marker. Treat any drift on such a node as `needs-human` regardless
of category. (This frontmatter key is reserved by the proposal but the
validator does not parse it yet — read it as plain frontmatter.)
