import type { CommandContext } from "../types.js";

export function failHubNotImplemented(context: CommandContext, actionName: string): never {
  context.command.error(`first-tree hub ${actionName} is not implemented yet.`, { exitCode: 1 });
}
