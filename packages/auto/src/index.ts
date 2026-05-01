export {
  AUTO_USAGE,
  GITHUB_SCAN_USAGE,
  extractBackendFlag,
  runAuto,
  runGitHubScan,
} from "./cli.js";

export type Output = (text: string) => void;
