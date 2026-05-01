import type { Command } from "commander";

import type { CommandModule } from "../types.js";
import {
  isGitHubScanHelpRequest,
  requiresGitHubScanBinding,
  resolveGitHubScanBinding,
  stripTreeRepoArg,
} from "./scan-binding.js";

type CommandWithUnknownCommand = Command & {
  unknownCommand(): void;
};

export const githubCommand: CommandModule = {
  name: "github",
  description: "Work with GitHub automation commands.",
  register(program: Command): void {
    const command = program
      .command("github")
      .description("Work with GitHub automation commands.")
      .allowExcessArguments(true)
      .action(() => {
        if (command.args.length > 0) {
          (command as CommandWithUnknownCommand).unknownCommand();
          return;
        }

        command.outputHelp();
      });

    const scanCommand = command
      .command("scan")
      .description("Scan GitHub notifications and dispatch tree-aware work.")
      .argument("[args...]", "github scan sub-command and its arguments")
      .allowUnknownOption(true)
      .helpOption(false)
      .helpCommand(false)
      .action(async (_args: string[]) => {
        const forwardedArgs = [...scanCommand.args];
        const subcommand = forwardedArgs[0];

        if (requiresGitHubScanBinding(subcommand) && !isGitHubScanHelpRequest(forwardedArgs)) {
          const resolution = resolveGitHubScanBinding(forwardedArgs);

          if (!resolution.ok) {
            console.error(resolution.error);
            process.exitCode = 1;
            return;
          }
        }

        const { runGitHubScan } = await import("@first-tree/auto");
        const exitCode = await runGitHubScan(stripTreeRepoArg(forwardedArgs));

        if (typeof exitCode === "number" && exitCode !== 0) {
          process.exitCode = exitCode;
        }
      });

    scanCommand.showSuggestionAfterError(true);
  },
};
