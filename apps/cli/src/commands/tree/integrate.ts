import { existsSync } from "node:fs";
import { resolve } from "node:path";

import type { Command } from "commander";

import type { CommandContext, SubcommandModule } from "../types.js";
import {
  BoundTreeReference,
  RootKind,
  SourceBindingMode,
  TreeMode,
  buildStableSourceId,
  buildTreeId,
  deriveDefaultEntrypoint,
  determineScope,
  writeSourceState,
} from "./binding-state.js";
import { copyCanonicalSkills } from "./skill-lib.js";
import {
  ensureWhitepaperSymlink,
  upsertLocalTreeGitIgnore,
  upsertSourceIntegrationFiles,
} from "./source-integration.js";
import { isGitRepoRoot, readGitRemoteUrl, repoNameForRoot, resolveRepoRoot } from "./shared.js";

type IntegrateModeOption = SourceBindingMode | "source";

type IntegrateOptions = {
  entrypoint?: string;
  mode?: IntegrateModeOption;
  treeMode?: TreeMode;
  treePath?: string;
  treeUrl?: string;
  workspaceId?: string;
};

export const INTEGRATE_USAGE = `usage: first-tree tree integrate --tree-path PATH [--tree-url URL] [--tree-mode dedicated|shared] [--mode source|standalone-source|shared-source|workspace-root|workspace-member] [--workspace-id ID] [--entrypoint PATH]

Install local first-tree integration without mutating the tree repo.

Options:
  --tree-path PATH   Local checkout of the tree repo (required)
  --tree-url URL     Tree repo URL recorded in source.json
  --tree-mode MODE   dedicated or shared (default: infer)
  --mode MODE        source, standalone-source, shared-source, workspace-root, or workspace-member
  --workspace-id ID  Workspace identifier for workspace-root/member integrations
  --entrypoint PATH  Tree entrypoint override
  --help             Show this help message`;

function configureIntegrateCommand(command: Command): void {
  command
    .requiredOption("--tree-path <path>", "local checkout of the tree repo")
    .option("--tree-url <url>", "remote URL of the tree repo")
    .option("--tree-mode <mode>", "dedicated or shared")
    .option(
      "--mode <mode>",
      "source, standalone-source, shared-source, workspace-root, or workspace-member",
    )
    .option("--workspace-id <id>", "workspace identifier")
    .option("--entrypoint <path>", "tree entrypoint override");
}

function readIntegrateOptions(command: Command): IntegrateOptions {
  const options = command.opts() as Record<string, string | undefined>;
  return {
    entrypoint: options.entrypoint,
    mode: options.mode as IntegrateModeOption | undefined,
    treeMode: options.treeMode as TreeMode | undefined,
    treePath: options.treePath,
    treeUrl: options.treeUrl,
    workspaceId: options.workspaceId,
  };
}

function inferTreeMode(
  sourceRepoName: string,
  treeRepoName: string,
  explicit?: TreeMode,
): TreeMode {
  if (explicit !== undefined) {
    if (explicit !== "dedicated" && explicit !== "shared") {
      throw new Error(`Unsupported value for --tree-mode: ${explicit}`);
    }
    return explicit;
  }

  return treeRepoName === `${sourceRepoName}-tree` || treeRepoName === `${sourceRepoName}-context`
    ? "dedicated"
    : "shared";
}

function resolveBindingMode(
  explicit: IntegrateModeOption | undefined,
  treeMode: TreeMode,
): SourceBindingMode {
  if (explicit === "source") {
    return treeMode === "shared" ? "shared-source" : "standalone-source";
  }

  if (explicit !== undefined) {
    if (
      explicit !== "standalone-source" &&
      explicit !== "shared-source" &&
      explicit !== "workspace-root" &&
      explicit !== "workspace-member"
    ) {
      throw new Error(`Unsupported value for --mode: ${explicit}`);
    }
    return explicit;
  }

  return treeMode === "shared" ? "shared-source" : "standalone-source";
}

function runIntegrateCommand(context: CommandContext): void {
  try {
    const options = readIntegrateOptions(context.command);
    const sourceRoot = resolveRepoRoot(process.cwd());
    const treeRoot = resolve(process.cwd(), options.treePath ?? "");

    if (!existsSync(treeRoot)) {
      throw new Error(`Tree checkout does not exist: ${treeRoot}`);
    }

    if (resolve(treeRoot) === resolve(sourceRoot)) {
      throw new Error("The source/workspace root and tree repo resolved to the same path.");
    }

    const sourceRepoName = repoNameForRoot(sourceRoot);
    const treeRepoName = repoNameForRoot(treeRoot);
    const treeRemoteUrl = options.treeUrl ?? readGitRemoteUrl(treeRoot);
    const treeMode = inferTreeMode(sourceRepoName, treeRepoName, options.treeMode);
    const bindingMode = resolveBindingMode(options.mode, treeMode);
    const workspaceId =
      bindingMode === "workspace-root" || bindingMode === "workspace-member"
        ? options.workspaceId?.trim() || sourceRepoName
        : undefined;
    const rootKind: RootKind = isGitRepoRoot(sourceRoot) ? "git-repo" : "folder";
    const sourceRemoteUrl = isGitRepoRoot(sourceRoot) ? readGitRemoteUrl(sourceRoot) : undefined;
    const sourceId = buildStableSourceId(sourceRepoName, {
      fallbackRoot: sourceRoot,
      remoteUrl: sourceRemoteUrl,
    });
    const entrypoint =
      options.entrypoint ?? deriveDefaultEntrypoint(bindingMode, sourceRepoName, workspaceId);
    const treeReference: BoundTreeReference = {
      entrypoint,
      ...(treeRemoteUrl ? { remoteUrl: treeRemoteUrl } : {}),
      treeId: buildTreeId(treeRepoName),
      treeMode,
      treeRepoName,
    };

    copyCanonicalSkills(sourceRoot);
    ensureWhitepaperSymlink(sourceRoot);
    upsertLocalTreeGitIgnore(sourceRoot);
    upsertSourceIntegrationFiles(sourceRoot, treeRepoName, {
      bindingMode,
      entrypoint,
      treeMode,
      treeRepoUrl: treeRemoteUrl,
      workspaceId,
    });
    writeSourceState(sourceRoot, {
      bindingMode,
      rootKind,
      scope: determineScope(bindingMode),
      sourceId,
      sourceName: sourceRepoName,
      tree: treeReference,
      ...(workspaceId ? { workspaceId } : {}),
    });

    const summary = {
      bindingMode,
      sourceRoot,
      sourceStatePath: `${sourceRoot}/.first-tree/source.json`,
      treeMode,
      treeRepoName,
      treeRoot,
      ...(workspaceId ? { workspaceId } : {}),
    };

    if (context.options.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log("Context Tree Integrate\n");
    console.log(`  Source/workspace root: ${summary.sourceRoot}`);
    console.log(`  Tree repo:             ${summary.treeRoot}`);
    console.log(`  Binding mode:          ${summary.bindingMode}`);
    console.log(`  Tree mode:             ${summary.treeMode}`);
    if (summary.workspaceId) {
      console.log(`  Workspace id:          ${summary.workspaceId}`);
    }
    console.log("");
    console.log(`  Wrote ${summary.sourceStatePath}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

export const integrateCommand: SubcommandModule = {
  name: "integrate",
  alias: "",
  summary: "",
  description: "Install local tree integration without mutating the tree repo.",
  action: runIntegrateCommand,
  configure: configureIntegrateCommand,
};
