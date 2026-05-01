/**
 * GitHub Scan / auto dispatcher.
 *
 * As of Phase 8 every scan subcommand runs on the TypeScript daemon.
 * `run` / `run-once` / `daemon` all route through `daemon/runner-skeleton.ts`;
 * the historical Rust backend and the `--backend=` flag have been retired.
 *
 * Heavy deps (child_process, ink, react, daemon modules) live in the
 * dynamically-imported command modules so help output stays lightweight.
 */

type ScanCliBrand = {
  bindingHelp?: string;
  commandPath: string;
  daemonLabel: string;
  errorPrefix: string;
  headlineName: string;
  homeEnv: string;
  installLabel: string;
  introDescription: string;
  runnerHome: string;
  storeDirEnv: string;
  storeRoot: string;
  supportsTreeRepoOption: boolean;
};

const AUTO_BRAND: ScanCliBrand = {
  commandPath: "first-tree auto",
  daemonLabel: "auto daemon",
  errorPrefix: "first-tree auto",
  headlineName: "Auto",
  homeEnv: "AUTO_HOME",
  installLabel: "auto install",
  introDescription: "proposal/inbox agent",
  runnerHome: "~/.first-tree/auto/runner",
  storeDirEnv: "AUTO_DIR",
  storeRoot: "~/.first-tree/auto",
  supportsTreeRepoOption: false,
};

const GITHUB_SCAN_BRAND: ScanCliBrand = {
  bindingHelp:
    "  install/start/run/daemon/run-once/poll resolve the Context Tree from\n" +
    "  `.first-tree/source.json` or `--tree-repo <owner/repo>`. Missing\n" +
    "  bindings fail closed so scan never runs without tree context.\n",
  commandPath: "first-tree github scan",
  daemonLabel: "GitHub Scan daemon",
  errorPrefix: "first-tree github scan",
  headlineName: "GitHub Scan",
  homeEnv: "AUTO_HOME",
  installLabel: "GitHub Scan install",
  introDescription: "GitHub automation and inbox agent",
  runnerHome: "~/.first-tree/auto/runner",
  storeDirEnv: "AUTO_DIR",
  storeRoot: "~/.first-tree/auto",
  supportsTreeRepoOption: true,
};

function buildUsage(brand: ScanCliBrand): string {
  const bindingBlock = brand.bindingHelp === undefined ? "" : `\nBinding:\n${brand.bindingHelp}`;

  return `usage: ${brand.commandPath} <command>

  ${brand.headlineName} is the ${brand.introDescription}. It polls explicit GitHub review
  requests and direct mentions, keeps a local inbox under \`${brand.storeRoot}/\`,
  and dispatches work to per-task agent runners.

Primary commands (start here):
  install               Run the first-run setup (creates config.yaml, then
                        starts the daemon; requires \`--allow-repo\`)
  start                 Launch the daemon in the background (launchd on macOS;
                        requires \`--allow-repo\`)
  stop                  Stop the daemon and remove its lock
  status                Print daemon lock + runtime/status.env
  doctor                Diagnose the local install
  watch                 Live TUI: status board + activity feed
  poll                  Poll explicit GitHub review requests and mentions
                        once (no daemon required)

Advanced commands (for agents or debugging):
  run, daemon           Run the broker loop in the foreground.
                        Humans should normally use \`start\` instead; requires
                        \`--allow-repo\`. \`daemon\` is an alias invoked by launchd.
  run-once              Run one poll cycle, wait for drain, exit. Requires
                        \`--allow-repo\`.
  cleanup               Remove stale workspaces + expired claims
                        (only run if \`doctor\` suggests it).${bindingBlock}
Options:
  --help, -h            Show this help message

Environment:
  ${brand.storeDirEnv}              Override \`${brand.storeRoot}\` (store root)
  ${brand.homeEnv}             Override \`${brand.runnerHome}\` (daemon private state)

Not shown above (hook/internal entry points — do not invoke directly):
  statusline            Claude Code statusline hook. Called by Claude Code via
                        the separate \`dist/auto-statusline.js\` bundle for
                        sub-30 ms cold start. See the auto skill for wiring.
  status-manager        Internal helper used by auto runners to manage per-
                        session status entries. No direct human/agent use.
  poll-inbox            Legacy alias for \`poll\`. Kept for existing scripts.
`;
}

function buildTreeRepoOption(brand: ScanCliBrand): string {
  if (!brand.supportsTreeRepoOption) {
    return "";
  }

  return "    --tree-repo <owner/repo>     Override the bound Context Tree repo\n";
}

function buildInlineHelp(brand: ScanCliBrand): Partial<Record<string, string>> {
  const treeRepoOption = buildTreeRepoOption(brand);

  return {
    run: `usage: ${brand.commandPath} run [options]

  Run the ${brand.daemonLabel} in the foreground until stopped.

  Common options:
    --allow-repo <csv>           Required: restrict work to owner/repo or owner/* patterns
${treeRepoOption}    --poll-interval-secs <n>     Seconds between poll cycles
    --task-timeout-secs <n>      Per-task timeout
    --max-parallel <n>           Max concurrent agent tasks
    --search-limit <n>           Max search-derived candidates per cycle
`,
    daemon: `usage: ${brand.commandPath} daemon [options]

  Alias for \`${brand.commandPath} run\`. Still requires \`--allow-repo\`.
`,
    "run-once": `usage: ${brand.commandPath} run-once [options]

  Run one inbox poll plus one candidate-search cycle, wait for queued
  agent work to drain, then exit.

  Options:
    --allow-repo <csv>           Required: restrict work to owner/repo or owner/* patterns
${treeRepoOption}`,
    watch: `usage: ${brand.commandPath} watch

  Open the interactive TUI status board and activity feed.
`,
    statusline: `usage: ${brand.commandPath} statusline

  Print the one-line Claude Code statusline summary.
`,
    start: `usage: ${brand.commandPath} start [options]

  Launch the ${brand.daemonLabel} in the background.

  Options:
    --home <path>                Override runner home
    --profile <name>             Override daemon profile
    --allow-repo <csv>           Required: restrict work to owner/repo or owner/* patterns
${treeRepoOption}`,
    stop: `usage: ${brand.commandPath} stop [options]

  Stop the background ${brand.daemonLabel} for the active identity.

  Options:
    --home <path>                Override runner home
    --profile <name>             Override daemon profile
`,
    status: `usage: ${brand.commandPath} status [options]

  Print the current daemon lock and runtime status.

  Options:
    --home <path>                Override runner home
    --allow-repo <csv>           Display an explicit repo filter
`,
    doctor: `usage: ${brand.commandPath} doctor [options]

  Diagnose the local ${brand.installLabel} and auth/runtime state.

  Options:
    --home <path>                Override runner home
`,
    cleanup: `usage: ${brand.commandPath} cleanup [options]

  Remove stale workspaces and expired claims.

  Options:
    --home <path>                Override runner home
`,
  };
}

export const AUTO_USAGE = buildUsage(AUTO_BRAND);
export const GITHUB_SCAN_USAGE = buildUsage(GITHUB_SCAN_BRAND);

const AUTO_INLINE_HELP = buildInlineHelp(AUTO_BRAND);
const GITHUB_SCAN_INLINE_HELP = buildInlineHelp(GITHUB_SCAN_BRAND);

type Output = (text: string) => void;

type TsTarget = {
  kind: "ts";
  /** The node:module specifier to `await import()`. */
  specifier: TsSpecifier;
};

type TsSpecifier =
  | "status-manager"
  | "poll"
  | "watch"
  | "doctor"
  | "status"
  | "cleanup"
  | "start"
  | "stop"
  | "install";

type StatuslineTarget = {
  kind: "statusline";
};

type DaemonTarget = {
  kind: "daemon";
  /** `false` for `run`/`daemon`; `true` for `run-once`. */
  once: boolean;
};

type Target = TsTarget | StatuslineTarget | DaemonTarget;

const DISPATCH: Record<string, Target> = {
  install: { kind: "ts", specifier: "install" },

  // Foreground loops — all TS-backed.
  run: { kind: "daemon", once: false },
  daemon: { kind: "daemon", once: false },
  "run-once": { kind: "daemon", once: true },

  // Lifecycle (Phase 6)
  start: { kind: "ts", specifier: "start" },
  stop: { kind: "ts", specifier: "stop" },
  status: { kind: "ts", specifier: "status" },
  doctor: { kind: "ts", specifier: "doctor" },
  cleanup: { kind: "ts", specifier: "cleanup" },
  "poll-inbox": { kind: "ts", specifier: "poll" },

  // One-shot TS commands
  "status-manager": { kind: "ts", specifier: "status-manager" },
  poll: { kind: "ts", specifier: "poll" },
  watch: { kind: "ts", specifier: "watch" },

  // Statusline gets its own tiny dist bundle for sub-30ms cold start.
  statusline: { kind: "statusline" },
};

/**
 * Historical `--backend=...` splitter. The flag is no longer meaningful
 * (Phase 8 dropped the Rust backend), but we still strip any stray
 * occurrence from the argv so existing scripts keep working.
 *
 * Exported for tests.
 */
export function extractBackendFlag(args: readonly string[]): {
  backend: "ts";
  rest: string[];
} {
  const rest: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--backend") {
      // Drop both the flag and its value.
      i += 1;
      continue;
    }
    if (arg?.startsWith("--backend=")) continue;
    rest.push(arg);
  }
  return { backend: "ts", rest };
}

function isHelpInvocation(args: readonly string[]): boolean {
  const first = args[0];
  return first === "--help" || first === "-h" || first === "help";
}

export async function runAuto(args: string[], output: Output = console.log): Promise<number> {
  return runScan(args, output, AUTO_BRAND);
}

export async function runGitHubScan(args: string[], output: Output = console.log): Promise<number> {
  return runScan(args, output, GITHUB_SCAN_BRAND);
}

async function runScan(args: string[], output: Output, brand: ScanCliBrand): Promise<number> {
  const write = (text: string): void => output(text);
  const usage = brand.commandPath === AUTO_BRAND.commandPath ? AUTO_USAGE : GITHUB_SCAN_USAGE;
  const inlineHelp =
    brand.commandPath === AUTO_BRAND.commandPath ? AUTO_INLINE_HELP : GITHUB_SCAN_INLINE_HELP;

  if (args.length === 0 || isHelpInvocation(args)) {
    write(usage);
    return 0;
  }

  const command = args[0];
  const rest = args.slice(1);
  const target = DISPATCH[command];

  if (!target) {
    write(`Unknown ${brand.commandPath.replace("first-tree ", "")} command: ${command}`);
    write(usage);
    return 1;
  }

  const commandInlineHelp = inlineHelp[command];

  if (commandInlineHelp && isHelpInvocation(rest)) {
    write(commandInlineHelp);
    return 0;
  }

  try {
    switch (target.kind) {
      case "ts":
        return await dispatchTsCommand(target.specifier, rest);
      case "statusline": {
        // Execute the separate `auto-statusline.js` bundle via `node`.
        // This keeps cold start under ~30ms: the bundle has zero npm
        // deps and doesn't load the full first-tree CLI. The bundle
        // resolution differs between dev mode (packages/auto/dist) and
        // bundled npm install (apps/cli/dist sibling); bridge handles
        // both.
        const bridge = await import("./bridge.js");
        const bundlePath = bridge.resolveStatuslineBundlePath();
        return bridge.spawnInherit(process.execPath, [bundlePath, ...rest]);
      }
      case "daemon": {
        // Strip any stray `--backend=` so existing scripts keep working.
        const { rest: residual } = extractBackendFlag(rest);
        const mod = await import("./daemon/runner-skeleton.js");
        return await mod.runDaemon(residual, { once: target.once });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${brand.errorPrefix}: ${message}\n`);
    return 1;
  }
}

/**
 * Lazy-import the TS command implementation so startup stays cheap for
 * workflows that never touch the ported commands.
 */
async function dispatchTsCommand(specifier: TsSpecifier, rest: string[]): Promise<number> {
  switch (specifier) {
    case "status-manager":
      return (await import("./commands/status-manager.js")).runStatusManager(rest);
    case "poll":
      return (await import("./commands/poll.js")).runPoll(rest);
    case "watch":
      return (await import("./commands/watch.js")).runWatch(rest);
    case "doctor":
      return (await import("./commands/doctor.js")).runDoctor(rest);
    case "status":
      return (await import("./commands/status.js")).runStatus(rest);
    case "cleanup":
      return (await import("./commands/cleanup.js")).runCleanup(rest);
    case "start":
      return (await import("./commands/start.js")).runStart(rest);
    case "stop":
      return (await import("./commands/stop.js")).runStop(rest);
    case "install":
      return (await import("./commands/install.js")).runInstall(rest);
  }
}
