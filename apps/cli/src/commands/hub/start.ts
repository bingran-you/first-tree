import { failHubNotImplemented } from "./shared.js";
import type { CommandContext, SubcommandModule } from "../types.js";

export function runStartCommand(context: CommandContext): void {
  failHubNotImplemented(context, "start");
}

export const startCommand: SubcommandModule = {
  name: "start",
  alias: "",
  summary: "",
  description: "Start hub services.",
  action: runStartCommand,
};
