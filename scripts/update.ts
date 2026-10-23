// Semi-automated data update (docs/data-updates.md).
//   npm run data:update -- --check [--offline]   read-only: what is newer upstream, what is in doubt, what is unmapped
//   npm run data:update [-- --offline]           bring the data up to date here, rebuild, compare, hold back doubtful
//                                                new points; nothing is committed (read data/build/update-report.md)
//   npm run data:update -- --publish             commit that result, with a change log entry, to a new branch
//                                                data-update-<date> and push it (reuses the last run if nothing moved)
// Run from an up-to-date main. Never contacts XRONOS (Rob downloads it with npm run data:fetch:xronos); a new download
// or ROAD export already here is simply locked. Refuses to publish while the check lists doubts or the tests fail.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { addHeld, HELD_PATH, readHeld, type HeldRow } from "./lib/held-back.ts";
import { defaultStore, LOCK_PATH, pull, RAW_SOURCES, readLock, status } from "./lib/raw-store.ts";
import { baselineRev, buildDetails, entryId, readLog, writeLog, type LogDetails, type SourceBump } from "./update/changelog.ts";
import { markNew, runCheck, type CheckResult } from "./update/check.ts";
import { compareSnapshots, isEmpty, loadSnapshot } from "./update/compare.ts";
import { screen } from "./update/holdback.ts";
import { lockChanged, moveToNewReleases } from "./update/refresh.ts";
import { renderReport, renderUpdate, summary } from "./update/report.ts";

const REPORT = "data/build/update-report.md";
const CHECK_JSON = "data/build/update-check.json";
const RUN_JSON = "data/build/update-run.json";
/** What an update may change and a publish commits. */
const PATHS = ["public/data", LOCK_PATH, HELD_PATH, "data/curated/road", "data/curated/sources.yaml", "scripts/fetch/pins.ts"];
const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const opt = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const today = new Date().toISOString().slice(0, 10);
const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" }).trim();
const sh = (cmd: string, a: string[]) => {
  const r = spawnSync(cmd, a, { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
  if (r.status !== 0) fail(`${cmd} ${a.join(" ")} failed`);
};

interface Run {
  date: string;
  baseline: string;
  bumps: SourceBump[];
  held: HeldRow[];
  doubts: string[];
  testsOk: boolean;
  details: Omit<LogDetails, "entry"> & { entry: Omit<LogDetails["entry"], "id"> };
  empty: boolean;
  /** Fingerprint of everything a publish commits, to tell whether the run is still what is on disk. */
  hash: string;
  /** The change log entry it was published as, once it has been. */
  published?: string;
}

function hashPaths(): string {
  const h = createHash("sha256");
  const files = git("ls-files", "--cached", "--others", "--exclude-standard", "--", ...PATHS).split("\n").filter(Boolean).sort();
  for (const f of files) if (existsSync(f)) h.update(f).update("\0").update(readFileSync(f)).update("\0");
  return h.digest("hex").slice(0, 16);
}

async function check(offline: boolean): Promise<CheckResult> {
  const previous = existsSync(CHECK_JSON) ? (JSON.parse(readFileSync(CHECK_JSON, "utf8")) as CheckResult) : undefined;
  const result = await runCheck({ offline, log: (s) => console.log(`… ${s}`) });
  markNew(result, previous);
  mkdirSync("data/build", { recursive: true });
  writeFileSync(CHECK_JSON, JSON.stringify(result, null, 2) + "\n");
  return result;
}

async function update(): Promise<Run> {
  const offline = has("--offline");
  const dirty = git("status", "--porcelain", "--", ...PATHS, "data/curated");
  if (dirty) fail(`uncommitted changes the update would mix with its own:\n${dirty}\n  Commit or stash them first.`);

  // Raw data: every locked file must be here (a newer local XRONOS download or ROAD export is fine: it gets locked).
  const lock = readLock();
  const missing = RAW_SOURCES.map((s) => status(s, lock)).filter((st) => st.files.some((f) => f.state === "missing"));
  if (missing.length) {
    console.log(`… downloading locked raw files missing here (${missing.map((m) => m.source.id).join(", ")})`);
    for (const st of missing) pull(st, defaultStore());
  }

  const result = await check(offline);
  console.log("… bringing sources up to date");
  if (!offline) moveToNewReleases(result.sources);
  const bumps = lockChanged();

  console.log("… rebuilding");
  sh("npx", ["tsx", "scripts/ingest/road.ts"]);
  sh("npm", ["run", "-s", "data:build"]);
  sh("npx", ["tsx", "scripts/ingest/aadr.ts"]);

  const baseline = opt("--baseline") ?? baselineRev();
  const before = loadSnapshot(baseline);
  let changes = compareSnapshots(before, loadSnapshot());
  const curated = new Set(((parseYaml(readFileSync("data/curated/entities.yaml", "utf8")) as { id: string }[]) ?? []).map((e) => e.id));
  // Only items nobody has decided on yet: a row already in held-back.csv (held or confirmed) is not asked about again.
  const decided = new Set(readHeld().map((r) => r.id));
  const held = screen(changes, before, today, curated).filter((h) => !decided.has(h.id));
  if (held.length) {
    console.log(`… holding back ${held.length} doubtful new items (${HELD_PATH}); rebuilding without them`);
    addHeld(held);
    sh("npm", ["run", "-s", "data:build"]);
    changes = compareSnapshots(before, loadSnapshot());
  }

  console.log("… running the tests");
  const tests = spawnSync("npx", ["vitest", "run"], { encoding: "utf8" });
  const testsOk = tests.status === 0;
  if (!testsOk) console.error(tests.stdout.split("\n").filter((l) => /FAIL|×|Tests /.test(l)).slice(0, 20).join("\n"));

  const details = buildDetails("", today, changes, loadSnapshot(), before, bumps, held);
  const { id: _, ...entry } = details.entry;
  const run: Run = {
    date: today, baseline, bumps, held, doubts: result.doubts, testsOk, details: { ...details, entry },
    empty: isEmpty(changes) && !bumps.length && !held.length, hash: hashPaths(),
  };
  writeFileSync(RUN_JSON, JSON.stringify(run) + "\n");
  writeFileSync(REPORT, renderUpdate(run.details, { baseline, bumps, held, testsOk, doubts: result.doubts }) + "\n" + renderReport(result));
  console.log(summary(result).join("\n"));
  return run;
}

function publish(run: Run) {
  if (run.doubts.length) fail(`${run.doubts.length} doubts to resolve first (see ${REPORT}): when unsure, leave it out`);
  if (!run.testsOk) fail("the tests fail with this data: not publishing");
  if (run.empty) {
    console.log("Nothing new to publish.");
    return;
  }
  const id = entryId(run.date, readLog());
  writeLog({ ...run.details, entry: { ...run.details.entry, id } });
  const branch = `data-update-${id}`;
  git("switch", "-c", branch);
  git("add", "--", ...PATHS.filter((p) => existsSync(p)));
  const e = run.details.entry;
  const n = (c: Record<string, number | undefined>) => Object.values(c).reduce<number>((a, b) => a + (b ?? 0), 0);
  const lines = [
    `Data update ${id}`, "",
    ...run.bumps.map((b) => `- ${b.id}: ${b.from} -> ${b.to}`),
    `- ${n(e.added)} sites added, ${n(e.removed)} removed, ${e.changed} changed; ${e.entitiesAdded} new entities`,
    ...(e.genomesAdded || e.genomesRemoved ? [`- ancient genomes: +${e.genomesAdded} / -${e.genomesRemoved}`] : []),
    ...(run.held.length ? [`- ${run.held.length} doubtful new items held back in ${HELD_PATH}`] : []),
    "", "Made by npm run data:update -- --publish (docs/data-updates.md).",
  ];
  git("commit", "-q", "-m", lines.join("\n"));
  writeFileSync(RUN_JSON, JSON.stringify({ ...run, published: id }) + "\n");
  git("push", "-q", "-u", "origin", branch);
  console.log(`✓ committed and pushed ${branch}. Review it, then merge into main when happy (Vercel deploys main).`);
}

if (has("--check")) {
  const result = await check(has("--offline"));
  writeFileSync(REPORT, renderReport(result));
  console.log(summary(result).join("\n"));
  console.log(`Report: ${REPORT}`);
} else {
  const last = existsSync(RUN_JSON) ? (JSON.parse(readFileSync(RUN_JSON, "utf8")) as Run) : undefined;
  if (has("--publish") && last?.published && last.hash === hashPaths()) fail(`already published as ${last.published}; nothing has changed since`);
  const reuse = has("--publish") && last?.date === today && !last.published && last.hash === hashPaths();
  if (reuse) console.log(`Publishing the update run from earlier today (nothing has moved since; report: ${REPORT})`);
  const run = reuse ? last! : await update();
  if (has("--publish")) publish(run);
  else if (!run.empty) {
    const tracked = PATHS.filter((p) => git("ls-files", "--", p));
    const fresh = git("ls-files", "--others", "--exclude-standard", "--", ...PATHS).split("\n").filter(Boolean);
    console.log(`Report: ${REPORT}. Nothing is committed yet.`);
    console.log(`  Publish: npm run data:update -- --publish`);
    console.log(`  Discard: git restore -- ${tracked.join(" ")}${fresh.length ? ` && rm ${fresh.join(" ")}` : ""}`);
  } else console.log(`Nothing new. Report: ${REPORT}`);
}
