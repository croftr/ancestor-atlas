// Brings the raw data up to the latest upstream (step 3 of `npm run data:update`): moves the pins in
// scripts/fetch/pins.ts to a newer Cliopatria or AADR release, re-fetches what changed, and locks every raw file that
// differs from data/sources.lock.json (uploading the snapshot). XRONOS and ROAD are never fetched here: a new XRONOS
// download (npm run data:fetch:xronos, by Rob) or ROAD export (road.R) is simply locked.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { defaultStore, push, RAW_SOURCES, readLock, status, writeLock } from "../lib/raw-store.ts";
import type { SourceBump } from "./changelog.ts";
import type { SourceCheck } from "./check.ts";

const PINS = "scripts/fetch/pins.ts";
const SOURCES_YAML = "data/curated/sources.yaml";

/** Replaces `export const NAME = <value>;` in pins.ts. */
export function setPin(text: string, name: string, value: string | number): string {
  const re = new RegExp(`(export const ${name} = )([^;]+);`);
  if (!re.test(text)) throw new Error(`${PINS}: no ${name}`);
  return text.replace(re, `$1${typeof value === "number" ? value : JSON.stringify(value)};`);
}

const run = (args: string[]) => execFileSync("npx", ["tsx", ...args], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });

/** Moves pins to the releases the check found and fetches them. Returns the files that were edited. */
export function moveToNewReleases(sources: SourceCheck[], log = console.log): string[] {
  const edited: string[] = [];
  let pins = readFileSync(PINS, "utf8");
  const cl = sources.find((s) => s.id === "cliopatria" && s.state === "newer" && s.release);
  if (cl?.release) {
    const old = pins.match(/CLIOPATRIA_RECORD = "(\d+)"/)?.[1];
    pins = setPin(pins, "CLIOPATRIA_RECORD", cl.release.record!);
    writeFileSync(PINS, pins);
    // The citation names the version and record: keep it in step.
    const yaml = readFileSync(SOURCES_YAML, "utf8").replace(/Cliopatria v[\d.]+ \(doi:10\.5281\/zenodo\.\d+\)/, `Cliopatria ${cl.release.version} (doi:10.5281/zenodo.${cl.release.record})`);
    writeFileSync(SOURCES_YAML, yaml);
    edited.push(PINS, SOURCES_YAML);
    log(`Cliopatria: Zenodo ${old} -> ${cl.release.record} (${cl.release.version}); fetching`);
    run(["scripts/fetch/cliopatria.ts", "--force"]);
  }
  const aa = sources.find((s) => s.id === "aadr" && s.state === "newer" && s.release);
  if (aa?.release) {
    pins = setPin(pins, "AADR_RELEASE", aa.release.version);
    pins = setPin(pins, "AADR_FILE_ID", Number(aa.release.record));
    pins = setPin(pins, "AADR_MD5", aa.release.md5!);
    writeFileSync(PINS, pins);
    if (!edited.includes(PINS)) edited.push(PINS);
    log(`AADR: -> ${aa.release.version}; fetching (checksum-checked)`);
    run(["scripts/fetch/aadr.ts"]);
  }
  if (sources.some((s) => s.id === "wikidata" && s.state === "newer")) {
    log("Wikidata descriptions changed; fetching");
    run(["scripts/fetch/wikidata.ts"]);
  }
  return edited;
}

/** Locks (and uploads) every source whose files here differ from the lock. Returns what moved, for the change log. */
export function lockChanged(log = console.log): SourceBump[] {
  const lock = readLock();
  const store = defaultStore();
  const bumps: SourceBump[] = [];
  for (const source of RAW_SOURCES) {
    const st = status(source, lock);
    const differs = st.files.some((f) => f.state === "differs") || st.unlocked.length > 0;
    if (!differs) continue;
    const before = lock[source.id];
    log(`${source.id}: locking the new files`);
    const version = source.id === "aadr" ? readFileSync(PINS, "utf8").match(/AADR_RELEASE = "([^"]+)"/)?.[1]
      : source.id === "cliopatria" ? `Zenodo ${readFileSync(PINS, "utf8").match(/CLIOPATRIA_RECORD = "(\d+)"/)?.[1]}` : undefined;
    lock[source.id] = push(source, store, { version, log });
    writeLock(lock);
    const name = (e?: { version?: string; retrieved: string }) => (e ? e.version ?? `retrieved ${e.retrieved}` : "none");
    bumps.push({ id: source.id, from: name(before), to: name(lock[source.id]) });
  }
  return bumps;
}
