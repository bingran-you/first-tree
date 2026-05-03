import { failHubNotImplemented } from "./shared.js";
import type { CommandContext, SubcommandModule } from "../types.js";

export function runStopCommand(context: CommandContext): void {
  failHubNotImplemented(context, "stop");
}

export const stopCommand: SubcommandModule = {
  name: "stop",
  alias: "",
  summary: "",
  description: "Stop hub services.",
  action: runStopCommand,
};
