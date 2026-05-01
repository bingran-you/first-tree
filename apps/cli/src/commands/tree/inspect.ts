import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import type { CommandContext, SubcommandModule } from "../types.js";

type InspectClassification = "tree-repo" | "workspace-root" | "source-repo" | "git-repo" | "folder";

type BindingSummary = {
  bindingMode?: string;
  scope?: string;
  treeEntrypoint?: string;
  treeMode?: string;
  treeRemoteUrl?: string;
  treeRepo?: string;
  treeRepoName?: string;
};

export type InspectResult = {
  binding?: BindingSummary;
  classification: InspectClassification;
  cwd: string;
  hasMembersNode: boolean;
  hasNode: boolean;
  rootKind: "git-repo" | "folder";
  rootPath: string;
  sourceStatePath?: string;
  treeStatePath?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readJson(path: string | undefined): unknown | undefined {
  if (path === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function findUpwards(startDir: string, relativePath: string): string | undefined {
  let currentDir = resolve(startDir);

  while (true) {
    const candidate = join(currentDir, relativePath);

    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDir = dirname(currentDir);

    if (parentDir === currentDir) {
      return undefined;
    }

    currentDir = parentDir;
  }
}

function parseGitHubRepo(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const exactRepo = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.exec(value);

  if (exactRepo !== null) {
    return exactRepo[0];
  }

  const httpsMatch = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/u.exec(value);

  if (httpsMatch?.[1] !== undefined) {
    return httpsMatch[1];
  }

  const sshMatch = /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/u.exec(value);

  return sshMatch?.[1];
}

function readBindingSummary(sourceStatePath: string | undefined): BindingSummary | undefined {
  const parsed = readJson(sourceStatePath);

  if (!isRecord(parsed)) {
    return undefined;
  }

  const tree = isRecord(parsed.tree) ? parsed.tree : undefined;

  if (tree === undefined) {
    return undefined;
  }

  return {
    bindingMode: asString(parsed.bindingMode) ?? asString(parsed.mode),
    scope: asString(parsed.scope),
    treeEntrypoint: asString(tree.entrypoint),
    treeMode: asString(tree.treeMode) ?? asString(tree.mode),
    treeRemoteUrl: asString(tree.remoteUrl),
    treeRepo:
      parseGitHubRepo(asString(tree.repo)) ??
      parseGitHubRepo(asString(tree.treeRepo)) ??
      parseGitHubRepo(asString(parsed.treeRepo)) ??
      parseGitHubRepo(asString(parsed.tree_repo)) ??
      parseGitHubRepo(asString(tree.remoteUrl)),
    treeRepoName: asString(tree.treeRepoName),
  };
}

function readTreeRepoName(treeStatePath: string | undefined): string | undefined {
  const parsed = readJson(treeStatePath);

  if (!isRecord(parsed)) {
    return undefined;
  }

  return asString(parsed.treeRepoName);
}

function formatInspectResult(result: InspectResult): string {
  const lines = [
    "first-tree tree inspect",
    `cwd: ${result.cwd}`,
    `root: ${result.rootPath}`,
    `classification: ${result.classification}`,
    `root kind: ${result.rootKind}`,
  ];

  if (result.sourceStatePath !== undefined) {
    lines.push(`source state: ${result.sourceStatePath}`);
  }

  if (result.treeStatePath !== undefined) {
    lines.push(`tree state: ${result.treeStatePath}`);
  }

  if (result.hasNode || result.hasMembersNode) {
    lines.push(`tree markers: NODE.md=${result.hasNode} members/NODE.md=${result.hasMembersNode}`);
  }

  if (result.binding !== undefined) {
    if (result.binding.bindingMode !== undefined) {
      lines.push(`binding mode: ${result.binding.bindingMode}`);
    }

    if (result.binding.scope !== undefined) {
      lines.push(`scope: ${result.binding.scope}`);
    }

    if (result.binding.treeMode !== undefined) {
      lines.push(`tree mode: ${result.binding.treeMode}`);
    }

    if (result.binding.treeRepo !== undefined) {
      lines.push(`tree repo: ${result.binding.treeRepo}`);
    } else if (result.binding.treeRepoName !== undefined) {
      lines.push(`tree repo name: ${result.binding.treeRepoName}`);
    }

    if (result.binding.treeRemoteUrl !== undefined) {
      lines.push(`tree remote: ${result.binding.treeRemoteUrl}`);
    }

    if (result.binding.treeEntrypoint !== undefined) {
      lines.push(`tree entrypoint: ${result.binding.treeEntrypoint}`);
    }
  } else {
    lines.push("binding: none");
  }

  return lines.join("\n");
}

export function inspectCurrentWorkingTree(cwd = process.cwd()): InspectResult {
  const sourceStatePath = findUpwards(cwd, ".first-tree/source.json");
  const treeStatePath = findUpwards(cwd, ".first-tree/tree.json");
  const gitMarkerPath = findUpwards(cwd, ".git");
  const rootPath =
    sourceStatePath !== undefined
      ? dirname(dirname(sourceStatePath))
      : treeStatePath !== undefined
        ? dirname(dirname(treeStatePath))
        : gitMarkerPath !== undefined
          ? dirname(gitMarkerPath)
          : resolve(cwd);
  const binding = readBindingSummary(sourceStatePath);
  const hasNode = existsSync(join(rootPath, "NODE.md"));
  const hasMembersNode = existsSync(join(rootPath, "members", "NODE.md"));
  const treeRepoName = readTreeRepoName(treeStatePath);

  const classification: InspectClassification =
    treeStatePath !== undefined || (hasNode && hasMembersNode)
      ? "tree-repo"
      : binding?.bindingMode === "workspace-root" || binding?.scope === "workspace"
        ? "workspace-root"
        : sourceStatePath !== undefined
          ? "source-repo"
          : gitMarkerPath !== undefined
            ? "git-repo"
            : "folder";

  return {
    binding: binding ?? (treeRepoName !== undefined ? { treeRepoName } : undefined),
    classification,
    cwd: resolve(cwd),
    hasMembersNode,
    hasNode,
    rootKind: gitMarkerPath !== undefined ? "git-repo" : "folder",
    rootPath,
    sourceStatePath,
    treeStatePath,
  };
}

export function runInspectCommand(context: CommandContext): void {
  const result = inspectCurrentWorkingTree();

  if (context.options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatInspectResult(result));
}

export const inspectCommand: SubcommandModule = {
  name: "inspect",
  alias: "",
  summary: "",
  description: "Inspect the current folder and report first-tree metadata.",
  action: runInspectCommand,
};
