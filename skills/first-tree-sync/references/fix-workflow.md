# Fix Workflow

Sync's second phase: take the `drifts[]` from the audit phase and decide,
per finding, whether to:

- **auto-fix** — open a tree-repo PR with the correction
- **needs-human** — leave a label or comment for human disambiguation
- **skip** — the finding is a false positive or out of scope

## Default Routing By Drift Type

| Drift type            | Default route                                                                                                                                                    | Notes                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `tree-stale`          | auto-fix                                                                                                                                                         | Code is the ground truth; mechanical update.                                |
| `tree-wrong`          | auto-fix when the correction is small; needs-human if rationale changes                                                                                          | Always link the offending PR / commit so reviewers see the source of truth. |
| `tree-outdated`       | needs-human                                                                                                                                                      | Superseding decisions cross domains; require an owner.                      |
| `code-not-synced`     | needs-human if the code change introduces a new decision; auto-fix only for purely additive structural notes (e.g. registering a new repo in `source-repos.md`). |
| `cross-domain-broken` | auto-fix when the new target is unambiguous; needs-human when the link could go to multiple replacements.                                                        |
| `ownership-stale`     | needs-human always                                                                                                                                               | Ownership changes are high-trust and require a person.                      |

`decisionLocksCode: true` on the tree node overrides the default to
`needs-human` regardless of type — never auto-fix a locked node.

## Auto-Fix Workflow

For each drift routed to auto-fix:

1. Branch off the tree repo's default branch:
   `chore(sync)/<drift-type>/<short-slug>`.
2. Make the smallest correct change to the tree node. Keep diffs minimal.
3. Update the node's frontmatter `lastReviewed:` (if the field exists) or
   leave frontmatter alone.
4. Commit with a message in the form:
   `sync(tree): <drift-type> — <one-line summary>`.
5. Open a PR against the tree repo with:
   - the `evidence` from the drift entry as the body
   - a link to the source PR or commit that motivated the correction
   - the assignee set to the node's `owners` (first owner if multi)

Do not bundle multiple drifts into one PR unless they touch the same
node and are the same type.

## Needs-Human Workflow

For each drift routed to needs-human:

1. Open a PR or issue on the tree repo with the drift evidence.
2. Apply a label that describes the request type (e.g. `tree-drift`,
   `ownership-review`, `superseded-decision`). Tags are coordinated through
   `first-tree-github-scan`'s tag table; check there before inventing new
   ones.
3. Tag the listed `owners` of the affected node.
4. Stop. Do not edit the tree until the human responds.

## Skip Conditions

Mark a finding as skip when:

- the audit produced a false positive (rerun classification — usually
  `tree-wrong` candidates fall here)
- the disagreement is intentional and documented elsewhere
- the user has explicitly told you to ignore this area

Always log the skip reason. Skipped findings should still appear in the
`drifts[]` output with `route: "skip"` so downstream tooling can audit the
audit.

## Hand-Off To `first-tree-write`

If a `code-not-synced` finding has an obvious source PR the user wants
reflected in the tree, do not stay in sync. Hand off:

- "I found a code change that is not in the tree. Want me to write the
  tree update from that PR?"
- If yes, switch into `first-tree-write` with the PR as input.

Sync's job ends when the drift is classified and routed. Write turns one
specific source into one tree update. See `references/boundary.md`.

## What This Workflow Does NOT Do

- It does not merge the auto-fix PRs. Reviewer policy is the tree repo's
  business.
- It does not retry on review feedback. Owners may rewrite the PR; sync
  gives them a starting point, not a final answer.
- It does not loop. One audit → one fix pass → done. Run sync again if you
  want another sweep.
