import type { Command } from "commander";

import type { CommandContext, SubcommandModule } from "../types.js";
import { generateCodeowners } from "./codeowners.js";

export const GENERATE_CODEOWNERS_USAGE = `usage: first-tree tree generate-codeowners [--check]

Generate \`.github/CODEOWNERS\` from the Context Tree's NODE.md ownership
frontmatter. Walks the tree, resolves owners with parent inheritance, and
writes the file.

Options:
  --check  Exit non-zero if CODEOWNERS is out-of-date (do not write)
  --help   Show this help message`;

function configureGenerateCodeownersCommand(command: Command): void {
  command.option("--check", "exit non-zero if CODEOWNERS is out-of-date");
}

export function runGenerateCodeownersCommand(context: CommandContext): void {
  const options = context.command.opts() as { check?: boolean };
  const exitCode = generateCodeowners(process.cwd(), { check: options.check === true });
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

export const generateCodeownersCommand: SubcommandModule = {
  name: "generate-codeowners",
  alias: "",
  summary: "",
  description: "Generate CODEOWNERS entries from first-tree ownership data.",
  configure: configureGenerateCodeownersCommand,
  action: runGenerateCodeownersCommand,
};
