import { failHubNotImplemented } from "./shared.js";
import type { CommandContext, SubcommandModule } from "../types.js";

export function runDoctorCommand(context: CommandContext): void {
  failHubNotImplemented(context, "doctor");
}

export const doctorCommand: SubcommandModule = {
  name: "doctor",
  alias: "",
  summary: "",
  description: "Check hub configuration.",
  action: runDoctorCommand,
};
