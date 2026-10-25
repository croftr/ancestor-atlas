// Refreshes both the atlas data and the news feed in one command.
// Only Rob runs this by hand (never an agent or a schedule: it downloads XRONOS).
//
//   npm run refresh                        download XRONOS, update & rebuild data (staged + report), update & upload news
//   npm run refresh -- --publish           also commit & push the data update branch (data-update-<date>)
//   npm run refresh -- --check             read-only: check upstream data sources and list new news items (--dry-run)
//   npm run refresh -- --no-xronos         skip the XRONOS download
//   npm run refresh -- --no-upload         write the news feed locally (public/news/feed.json) without uploading to S3
//   npm run refresh -- --days <n>          news lookback window in days (default 30)
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { HELD_PATH } from "./lib/held-back.ts";
import { LOCK_PATH } from "./lib/raw-store.ts";

const RUN_JSON = "data/build/update-run.json";
const DATA_PATHS = ["public/data", LOCK_PATH, HELD_PATH, "data/curated/road", "data/curated/sources.yaml", "scripts/fetch/pins.ts"];

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const opt = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

const env = { ...process.env, NODE_USE_ENV_PROXY: "1" };
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" }).trim();

function runStep(script: string, stepArgs: string[]): number {
  const r = spawnSync("npx", ["tsx", script, ...stepArgs], { stdio: "inherit", env });
  return r.status ?? 1;
}

const isCheck = has("--check");
const isOffline = has("--offline");
const isPublish = has("--publish");
const today = new Date().toISOString().slice(0, 10);

// If --publish is reusing an unpublished data run from earlier today, don't re-fetch XRONOS or reject the staged files.
const lastRun = existsSync(RUN_JSON)
  ? (JSON.parse(readFileSync(RUN_JSON, "utf8")) as { date?: string; published?: string })
  : undefined;
const reusingToday = isPublish && lastRun?.date === today && !lastRun.published;

if (!isCheck && !reusingToday) {
  const dirty = git("status", "--porcelain", "--", ...DATA_PATHS, "data/curated");
  if (dirty) {
    console.error(`✗ uncommitted changes the data update would mix with its own:\n${dirty}\n  Commit or stash them first.`);
    process.exit(1);
  }
}

// 1. XRONOS export (conditional GET; skipped in --check / --offline / --no-xronos or when reusing today's run).
if (!isCheck && !isOffline && !has("--no-xronos") && !reusingToday) {
  console.log("\n=== 1/3 XRONOS ===");
  const status = runStep("scripts/fetch/xronos.ts", []);
  if (status !== 0) {
    console.warn("⚠ XRONOS download failed; continuing with the existing XRONOS snapshot.");
  }
}

// 2. App data update (checks upstream, fetches Cliopatria/AADR/Wikidata, locks new raw files, rebuilds, screens, tests).
console.log("\n=== 2/3 Data update ===");
const dataArgs: string[] = [];
if (isCheck) dataArgs.push("--check");
if (isOffline) dataArgs.push("--offline");
if (isPublish) dataArgs.push("--publish");
const baseline = opt("--baseline");
if (baseline) dataArgs.push("--baseline", baseline);

const dataStatus = runStep("scripts/update.ts", dataArgs);
if (dataStatus !== 0) process.exit(dataStatus);

// 3. News feed update (runs after data update so any newly added entities are known to the classifier).
if (!isOffline) {
  console.log("\n=== 3/3 News feed ===");
  const newsArgs: string[] = [];
  if (has("--no-upload")) newsArgs.push("--no-upload");
  if (isCheck || has("--dry-run")) newsArgs.push("--dry-run");
  const days = opt("--days");
  if (days) newsArgs.push("--days", days);

  const newsStatus = runStep("scripts/news/update.ts", newsArgs);
  if (newsStatus !== 0) process.exit(newsStatus);
}
