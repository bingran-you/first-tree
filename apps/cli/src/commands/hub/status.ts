import { failHubNotImplemented } from "./shared.js";
import type { CommandContext, SubcommandModule } from "../types.js";

export function runStatusCommand(context: CommandContext): void {
  failHubNotImplemented(context, "status");
}

export const statusCommand: SubcommandModule = {
  name: "status",
  alias: "",
  summary: "",
  description: "Show hub status.",
  action: runStatusCommand,
};
