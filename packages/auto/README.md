# `@first-tree/auto`

Internal implementation package behind the public
`first-tree github scan` command.

This package still carries the historical `auto` package name inside the new
workspace, but the public CLI surface now follows the proposal-aligned path:

```bash
first-tree github scan <subcommand>
```

It turns explicit GitHub review requests and direct mentions into a triaged,
optionally auto-handled inbox, drives a Claude Code statusline, serves an SSE
dashboard, and runs scheduled background work.

## What's In This Directory

```text
packages/auto/
├── VERSION
├── README.md              # this file
├── assets/
│   └── dashboard.html     # SSE dashboard served by the daemon HTTP server
├── src/
│   ├── cli.ts             # dispatcher (AUTO_USAGE + DISPATCH table + runAuto)
│   ├── bridge.ts          # package-root + spawn helpers
│   ├── statusline.ts      # zero-dep bundle source — see below
│   ├── commands/          # install, start, stop, poll, watch, doctor, cleanup, status, status-manager
│   ├── daemon/            # long-lived process: broker, bus, claim, dispatcher, http, poller, runner, scheduler, …
│   └── runtime/           # classifier, config, identity, paths, store, types, …
├── tests/                 # vitest suites mirroring src/
├── tsconfig.json
├── tsdown.config.ts       # bundles src/statusline.ts → dist/auto-statusline.js
└── vitest.config.ts
```

## Commands

### Public command path

The public command surface is now `first-tree github scan ...`.

### Primary

| Command                                                  | Role                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `first-tree github scan install --allow-repo owner/repo` | Check `gh` / `jq` / auth, create `~/.first-tree/auto/config.yaml`, and start the daemon. Statusline hook wiring is a separate manual step. |
| `first-tree github scan start --allow-repo owner/repo`   | Launch the daemon in the background                                                                                                        |
| `first-tree github scan stop`                            | Stop the daemon and remove its lock                                                                                                        |
| `first-tree github scan status`                          | Print current daemon/runtime status                                                                                                        |
| `first-tree github scan doctor`                          | Diagnose daemon / gh login / runtime health                                                                                                |
| `first-tree github scan watch`                           | Interactive TUI inbox (Ink)                                                                                                                |
| `first-tree github scan poll`                            | One-shot inbox poll without requiring the daemon                                                                                           |

### Advanced / internal

| Command                                                                                                        | Role                                                                  |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `first-tree github scan run --allow-repo owner/repo` / `first-tree github scan daemon --allow-repo owner/repo` | Run the broker loop in the foreground                                 |
| `first-tree github scan run-once --allow-repo owner/repo`                                                      | Run one poll cycle, wait for drain, then exit                         |
| `first-tree github scan cleanup`                                                                               | Clear stale state                                                     |
| `first-tree github scan statusline`                                                                            | CLI shim that executes the pre-bundled `dist/auto-statusline.js` hook |
| `first-tree github scan status-manager`                                                                        | Internal helper used by auto runners                                  |
| `first-tree github scan poll-inbox`                                                                            | Legacy alias for `poll`                                               |

Run `first-tree github scan --help` for the authoritative list.

Daemon-starting commands (`install`, `start`, `run`, `daemon`, `run-once`)
must be given `--allow-repo <owner/repo[,owner/*,...]>` so GitHub Scan never
falls back to scanning every notification on the account.

Public `github scan` entrypoints also enforce the proposal's fail-closed tree
binding rule for commands that actually start scanning. Bind first, or pass
`--tree-repo <owner/repo>`.

## Runtime Constraints

`src/statusline.ts` is bundled separately (`dist/auto-statusline.js`) and
is called every few seconds by the Claude Code statusline hook. It must stay
zero-dep and cold-start under 30ms — do not import `ink`, `zod`, or the
umbrella CLI from it.

## Related

- Current workspace skill payload: [`skills/auto/SKILL.md`](./skills/auto/SKILL.md)
  Proposal target: a dedicated `first-tree-github` handbook skill
- Tests: [`tests/`](./tests)
