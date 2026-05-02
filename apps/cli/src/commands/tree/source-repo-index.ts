import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { TREE_SOURCE_REPOS_FILE, TreeBindingState, listTreeBindings } from "./binding-state.js";
import { ensureTrailingNewline, parseGitHubRemoteUrl } from "./shared.js";

const ROOT_NODE_FILE = "NODE.md";
const ROOT_REPO_INDEX_BEGIN = "<!-- BEGIN FIRST-TREE-SOURCE-REPO-INDEX -->";
const ROOT_REPO_INDEX_END = "<!-- END FIRST-TREE-SOURCE-REPO-INDEX -->";
const AGENTS_REPO_INDEX_BEGIN = "<!-- BEGIN FIRST-TREE-REPO-INDEX-GUIDE -->";
const AGENTS_REPO_INDEX_END = "<!-- END FIRST-TREE-REPO-INDEX-GUIDE -->";

type SyncAction = "created" | "updated" | "unchanged" | "skipped";

export type SourceRepoIndexSyncResult = {
  agentsAction: SyncAction;
  indexAction: SyncAction;
  rootNodeAction: SyncAction;
};

export function syncTreeSourceRepoIndex(treeRoot: string): SourceRepoIndexSyncResult {
  const bindings = listTreeBindings(treeRoot);

  return {
    agentsAction: upsertTreeAgentsRepoGuide(treeRoot),
    indexAction: writeSourceRepoIndex(treeRoot, bindings),
    rootNodeAction: upsertRootNodeRepoIndexSection(treeRoot),
  };
}

function compareBindings(left: TreeBindingState, right: TreeBindingState): number {
  const nameOrder = left.sourceName.localeCompare(right.sourceName);
  return nameOrder === 0 ? left.sourceId.localeCompare(right.sourceId) : nameOrder;
}

function formatRemoteCell(binding: TreeBindingState): string {
  if (!binding.remoteUrl) {
    return "Missing in binding metadata";
  }

  const github = parseGitHubRemoteUrl(binding.remoteUrl);

  if (github === null || github.host !== "github.com") {
    return `\`${binding.remoteUrl}\``;
  }

  const webUrl = `https://${github.host}/${github.owner}/${github.repo}`;
  return `[${github.owner}/${github.repo}](${webUrl})`;
}

export function buildSourceRepoIndex(bindings: TreeBindingState[]): string {
  const lines = [
    "---",
    'title: "Source Repos"',
    "owners: []",
    "---",
    "",
    "# Source Repos",
    "",
    "Generated from `.first-tree/bindings/*.json`. This is the quickest index of the source/workspace repos described by this Context Tree. The binding JSON files remain the canonical machine-readable source of truth.",
    "",
  ];

  if (bindings.length === 0) {
    lines.push("No bound source/workspace repos have been recorded yet.", "");
    return `${lines.join("\n")}\n`;
  }

  lines.push(...buildSourceRepoIndexTable(bindings));

  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function buildSourceRepoIndexTable(bindings: TreeBindingState[]): string[] {
  if (bindings.length === 0) {
    return ["No bound source/workspace repos have been recorded yet."];
  }

  const lines = ["| Source | GitHub | Binding | Tree Entrypoint |", "| --- | --- | --- | --- |"];

  for (const binding of [...bindings].sort(compareBindings)) {
    lines.push(
      [
        `| \`${binding.sourceName}\``,
        formatRemoteCell(binding),
        `\`${binding.bindingMode}\``,
        `\`${binding.entrypoint}\` |`,
      ].join(" | "),
    );
  }

  return lines;
}

function writeSourceRepoIndex(treeRoot: string, bindings: TreeBindingState[]): SyncAction {
  const fullPath = join(treeRoot, TREE_SOURCE_REPOS_FILE);
  const next = buildSourceRepoIndex(bindings);
  const current = existsSync(fullPath) ? readFileSync(fullPath, "utf-8") : null;

  if (current === next) {
    return "unchanged";
  }

  writeFileSync(fullPath, next);
  return current === null ? "created" : "updated";
}

function upsertRootNodeRepoIndexSection(treeRoot: string): SyncAction {
  const fullPath = join(treeRoot, ROOT_NODE_FILE);

  if (!existsSync(fullPath)) {
    return "skipped";
  }

  const current = readFileSync(fullPath, "utf-8");
  const nextBlock = [
    ROOT_REPO_INDEX_BEGIN,
    "## Source Repos",
    "",
    `- **[Source Repos](${TREE_SOURCE_REPOS_FILE})** — Generated index of bound source/workspace repos and their GitHub URLs.`,
    ROOT_REPO_INDEX_END,
  ].join("\n");
  const next = upsertManagedBlock(current, nextBlock, {
    begin: ROOT_REPO_INDEX_BEGIN,
    end: ROOT_REPO_INDEX_END,
    insertBefore: /^##\s+Domains\s*$/mu,
  });

  if (next === current) {
    return "unchanged";
  }

  writeFileSync(fullPath, next);
  return "updated";
}

function upsertTreeAgentsRepoGuide(treeRoot: string): SyncAction {
  const fullPath = join(treeRoot, "AGENTS.md");

  if (!existsSync(fullPath)) {
    return "skipped";
  }

  const current = readFileSync(fullPath, "utf-8");
  const nextBlock = [
    AGENTS_REPO_INDEX_BEGIN,
    "## Source Repo Index",
    "",
    `- If \`${TREE_SOURCE_REPOS_FILE}\` exists in the tree root, use it as the quickest index of bound source/workspace repos and their GitHub URLs.`,
    "- The canonical machine-readable source of truth remains `.first-tree/bindings/`.",
    "- When you need current code, use that repo index to open the relevant source repo as an additional working directory and refresh it locally.",
    AGENTS_REPO_INDEX_END,
  ].join("\n");
  const next = upsertManagedBlock(current, nextBlock, {
    begin: AGENTS_REPO_INDEX_BEGIN,
    end: AGENTS_REPO_INDEX_END,
    insertBefore: /^# Project-Specific Instructions\s*$/mu,
    insertAfter: /<!-- END CONTEXT-TREE FRAMEWORK -->\s*/mu,
  });

  if (next === current) {
    return "unchanged";
  }

  writeFileSync(fullPath, next);
  return "updated";
}

function upsertManagedBlock(
  text: string,
  block: string,
  options: {
    begin: string;
    end: string;
    insertAfter?: RegExp;
    insertBefore?: RegExp;
  },
): string {
  const normalized = ensureTrailingNewline(text.replaceAll("\r\n", "\n"));
  const managedBlock = new RegExp(
    `${escapeForRegExp(options.begin)}[\\s\\S]*?${escapeForRegExp(options.end)}\\n?`,
    "mu",
  );

  if (managedBlock.test(normalized)) {
    return ensureTrailingNewline(normalized.replace(managedBlock, `${block}\n`));
  }

  const insertBeforeMatch = options.insertBefore?.exec(normalized);

  if (insertBeforeMatch && insertBeforeMatch.index >= 0) {
    return ensureTrailingNewline(
      [
        normalized.slice(0, insertBeforeMatch.index).trimEnd(),
        block,
        normalized.slice(insertBeforeMatch.index).trimStart(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  const insertAfterMatch = options.insertAfter?.exec(normalized);

  if (insertAfterMatch && insertAfterMatch.index >= 0) {
    const insertAt = insertAfterMatch.index + insertAfterMatch[0].length;
    return ensureTrailingNewline(
      [normalized.slice(0, insertAt).trimEnd(), block, normalized.slice(insertAt).trimStart()]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  return ensureTrailingNewline(`${normalized.trimEnd()}\n\n${block}`);
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
