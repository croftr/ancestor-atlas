// Refreshes the atlas data and the news feed in one command.
// Only Rob runs this by hand (never an agent or a schedule: it downloads XRONOS).
//
//   npm run refresh                        download XRONOS, rebuild the data, update & upload news
//   npm run refresh -- --no-xronos         skip the XRONOS download
//   npm run refresh -- --no-upload         write the news feed locally (public/news/feed.json) without uploading to S3
//   npm run refresh -- --dry-run           list new news items only (no news update)
//   npm run refresh -- --days <n>          news lookback window in days (default 30)
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const opt = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

const env = { ...process.env, NODE_USE_ENV_PROXY: "1" };
const run = (cmd: string, a: string[]) => spawnSync(cmd, a, { stdio: "inherit", env, shell: process.platform === "win32" }).status ?? 1;

// 1. XRONOS export (conditional GET).
if (!has("--no-xronos")) {
  console.log("\n=== 1/3 XRONOS ===");
  if (run("npx", ["tsx", "scripts/fetch/xronos.ts"]) !== 0) {
    console.warn("⚠ XRONOS download failed; continuing with the existing XRONOS snapshot.");
  }
}

// 2. Rebuild the data.
console.log("\n=== 2/3 Data build ===");
const buildStatus = run("npm", ["run", "data:build"]);
if (buildStatus !== 0) process.exit(buildStatus);

// 3. News feed (after the build, so any newly added entities are known to the classifier).
console.log("\n=== 3/3 News feed ===");
const newsArgs: string[] = [];
if (has("--no-upload")) newsArgs.push("--no-upload");
if (has("--dry-run")) newsArgs.push("--dry-run");
const days = opt("--days");
if (days) newsArgs.push("--days", days);
process.exit(run("npx", ["tsx", "scripts/news/update.ts", ...newsArgs]));
