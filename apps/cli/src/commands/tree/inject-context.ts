import type { CommandContext, SubcommandModule } from "../types.js";
import { buildTreeFirstContextBundle } from "./tree-first-context.js";

export const INJECT_CONTEXT_USAGE = `usage: first-tree tree inject-context

Output a SessionStart hook payload that injects tree-first cross-repo context.
When the current working directory is a bound source/workspace root, the
command resolves a local tree checkout, reads the tree root NODE.md, and
appends a bindings-derived repo index. Tree repos still work directly.

Options:
  --help  Show this help message`;

export function runInjectContextCommand(_context: CommandContext): void {
  const bundle = buildTreeFirstContextBundle(process.cwd());

  if (bundle === null) {
    return;
  }

  const payload = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: bundle.additionalContext,
    },
  };

  console.log(JSON.stringify(payload));
}

export const injectContextCommand: SubcommandModule = {
  name: "inject-context",
  alias: "",
  summary: "",
  description: "Emit the Claude Code SessionStart payload from NODE.md.",
  action: runInjectContextCommand,
};
