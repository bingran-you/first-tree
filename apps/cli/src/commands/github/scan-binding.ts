import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const TREE_REPO_FLAG = "--tree-repo";
const TREE_REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;

const BINDING_REQUIRED_SUBCOMMANDS = new Set([
  "install",
  "start",
  "run",
  "daemon",
  "run-once",
  "poll",
]);

type SourceStateBinding = {
  sourceStatePath: string;
  treeRepo?: string;
  treeRepoName?: string;
};

type BindingResolution =
  | {
      ok: true;
      source: "flag" | "source-state";
      treeRepo?: string;
      treeRepoName?: string;
      sourceStatePath?: string;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isHelpRequest(args: readonly string[]): boolean {
  const first = args[0];
  return first === "--help" || first === "-h" || first === "help";
}

function parseGitHubRepo(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (TREE_REPO_PATTERN.test(value)) {
    return value;
  }

  const httpsMatch = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/u.exec(value);

  if (httpsMatch?.[1] !== undefined) {
    return httpsMatch[1];
  }

  const sshMatch = /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/u.exec(value);

  return sshMatch?.[1];
}

function readJson(path: string): unknown | undefined {
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

function parseSourceStateBinding(sourceStatePath: string): SourceStateBinding | undefined {
  const parsed = readJson(sourceStatePath);

  if (!isRecord(parsed)) {
    return undefined;
  }

  const tree = isRecord(parsed.tree) ? parsed.tree : undefined;
  const treeRepo = parseGitHubRepo(
    asString(tree?.repo) ??
      asString(tree?.treeRepo) ??
      asString(parsed.treeRepo) ??
      asString(parsed.tree_repo) ??
      asString(tree?.remoteUrl),
  );
  const treeRepoName = asString(tree?.treeRepoName);

  if (tree === undefined && treeRepo === undefined && treeRepoName === undefined) {
    return undefined;
  }

  return {
    sourceStatePath,
    treeRepo,
    treeRepoName,
  };
}

export function isGitHubScanHelpRequest(args: readonly string[]): boolean {
  if (args.length === 0) {
    return true;
  }

  if (isHelpRequest(args)) {
    return true;
  }

  return args[0] !== undefined && isHelpRequest(args.slice(1));
}

export function requiresGitHubScanBinding(subcommand: string | undefined): boolean {
  return subcommand !== undefined && BINDING_REQUIRED_SUBCOMMANDS.has(subcommand);
}

export function readTreeRepoArg(args: readonly string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === TREE_REPO_FLAG) {
      return args[index + 1];
    }

    if (current?.startsWith(`${TREE_REPO_FLAG}=`)) {
      return current.slice(`${TREE_REPO_FLAG}=`.length);
    }
  }

  return undefined;
}

export function stripTreeRepoArg(args: readonly string[]): string[] {
  const stripped: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === TREE_REPO_FLAG) {
      index += 1;
      continue;
    }

    if (current?.startsWith(`${TREE_REPO_FLAG}=`)) {
      continue;
    }

    stripped.push(current);
  }

  return stripped;
}

export function resolveGitHubScanBinding(args: readonly string[]): BindingResolution {
  const explicitTreeRepo = readTreeRepoArg(args);

  if (explicitTreeRepo !== undefined) {
    if (!TREE_REPO_PATTERN.test(explicitTreeRepo)) {
      return {
        ok: false,
        error:
          "Invalid `--tree-repo` value. Expected `owner/repo`, for example `agent-team-foundation/first-tree-context`.",
      };
    }

    return {
      ok: true,
      source: "flag",
      treeRepo: explicitTreeRepo,
    };
  }

  const sourceStatePath = findUpwards(process.cwd(), ".first-tree/source.json");

  if (sourceStatePath !== undefined) {
    const binding = parseSourceStateBinding(sourceStatePath);

    if (binding !== undefined) {
      return {
        ok: true,
        source: "source-state",
        treeRepo: binding.treeRepo,
        treeRepoName: binding.treeRepoName,
        sourceStatePath: binding.sourceStatePath,
      };
    }
  }

  return {
    ok: false,
    error: [
      "first-tree github scan requires a bound tree repo before it can start scanning.",
      "Bind this repo first with `first-tree tree bind ...`, or retry with `--tree-repo <owner/repo>`.",
      "Expected binding metadata in `.first-tree/source.json`.",
    ].join("\n"),
  };
}
