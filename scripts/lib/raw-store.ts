// Raw data snapshots, shared between machines. data/raw is gitignored and each machine has had only some of it
// (XRONOS on one, the ROAD export on another), so a full build was possible on neither. Now every raw file a
// build or ingest reads is recorded in data/sources.lock.json (path, SHA-256, size) and kept in the media bucket
// under raw/<source>/<hash>/<file>, a private prefix (scripts/aws/bucket-policy.json leaves it out of public reads).
// Keys are content-addressed, so a snapshot is never overwritten and the same file is stored once.
//   npm run data:raw            status of every source: locked, here, matching?
//   npm run data:push -- <id>…  record this machine's files for those sources in the lock and upload them
//   npm run data:pull [-- <id>…] download every locked file that is missing here (or, with --force, different)
// RAW_STORE=<directory> uses a local folder instead of the bucket (tests, or a machine without AWS).
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export const LOCK_PATH = "data/sources.lock.json";
const BUCKET = "robs-ancestors-atlas";
const REGION = "eu-west-2";

export interface RawSource {
  id: string;
  /** The raw files, or `dir` for every file at the top of that folder. */
  files?: string[];
  dir?: string;
  /** Read by data:build, so part of public/data's fingerprint (scripts/lib/fingerprint.ts). */
  build?: boolean;
  /** How to get the files when the bucket has no snapshot yet. */
  fetch: string;
}

export const RAW_SOURCES: RawSource[] = [
  { id: "xronos", files: ["data/raw/xronos/data.csv"], build: true, fetch: "download https://xronos.ch/data.csv by hand" },
  { id: "cliopatria", files: ["data/raw/cliopatria/cliopatria.geojson"], build: true, fetch: "npm run data:fetch" },
  { id: "wikidata", files: ["data/raw/wikidata/descriptions.json"], build: true, fetch: "npm run data:fetch" },
  { id: "road", dir: "data/raw/road", fetch: "Rscript scripts/fetch/road.R" },
  { id: "aadr", dir: "data/raw/aadr", fetch: "npm run data:dna" },
  { id: "paleo", dir: "data/raw/paleo", fetch: "npm run data:fetch:paleo" },
];

export interface LockedFile {
  path: string;
  sha256: string;
  bytes: number;
  key: string;
}
export interface LockEntry {
  /** Upstream release, when known ("v0.2.1"). */
  version?: string;
  /** Date the files were downloaded (the newest file's modification date). */
  retrieved: string;
  files: LockedFile[];
}
export type Lock = Record<string, LockEntry>;

export const readLock = (root = "."): Lock => {
  const p = join(root, LOCK_PATH);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Lock) : {};
};

export function writeLock(lock: Lock, root = ".") {
  const ordered = Object.fromEntries(RAW_SOURCES.filter((s) => lock[s.id]).map((s) => [s.id, lock[s.id]]));
  writeFileSync(join(root, LOCK_PATH), JSON.stringify(ordered, null, 2) + "\n");
}

export const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

export const keyFor = (source: string, path: string, hash: string) => `raw/${source}/${hash.slice(0, 16)}/${basename(path)}`;

/** This machine's files for a source (those that exist). */
export function localFiles(source: RawSource, root = "."): string[] {
  if (source.files) return source.files.filter((f) => existsSync(join(root, f)));
  const dir = join(root, source.dir!);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => statSync(join(dir, n)).isFile())
    .sort()
    .map((n) => `${source.dir}/${n}`);
}

export type FileState = "match" | "missing" | "differs";
export interface SourceStatus {
  source: RawSource;
  entry?: LockEntry;
  /** Locked files, with how this machine's copy compares. */
  files: { file: LockedFile; state: FileState }[];
  /** Files here that the lock does not list. */
  unlocked: string[];
}

export function status(source: RawSource, lock: Lock, root = "."): SourceStatus {
  const entry = lock[source.id];
  const files = (entry?.files ?? []).map((file) => {
    const p = join(root, file.path);
    const state: FileState = !existsSync(p) ? "missing" : statSync(p).size === file.bytes && sha256(p) === file.sha256 ? "match" : "differs";
    return { file, state };
  });
  const locked = new Set(files.map((f) => f.file.path));
  return { source, entry, files, unlocked: localFiles(source, root).filter((f) => !locked.has(f)) };
}

// ---------- the store: the bucket's raw/ prefix, or a local folder ----------

export interface Store {
  name: string;
  has(key: string): boolean;
  put(path: string, key: string): void;
  get(key: string, path: string): void;
}

const aws = (args: string[]) => spawnSync("aws", [...args, "--region", REGION], { encoding: "utf8" });

export const s3Store: Store = {
  name: `s3://${BUCKET}`,
  has(key) {
    const r = aws(["s3api", "head-object", "--bucket", BUCKET, "--key", key]);
    if (r.status === 0) return true;
    if (/Not Found|404/.test(r.stderr)) return false;
    throw new Error(`aws s3api head-object ${key} failed (logged in?):\n${r.stderr.trim()}`);
  },
  put(path, key) {
    execFileSync("aws", ["s3", "cp", path, `s3://${BUCKET}/${key}`, "--region", REGION, "--only-show-errors"], { stdio: "inherit" });
  },
  get(key, path) {
    execFileSync("aws", ["s3", "cp", `s3://${BUCKET}/${key}`, path, "--region", REGION, "--only-show-errors"], { stdio: "inherit" });
  },
};

export const dirStore = (dir: string): Store => ({
  name: dir,
  has: (key) => existsSync(join(dir, key)),
  put(path, key) {
    mkdirSync(dirname(join(dir, key)), { recursive: true });
    copyFileSync(path, join(dir, key));
  },
  get: (key, path) => copyFileSync(join(dir, key), path),
});

export const defaultStore = (): Store => (process.env.RAW_STORE ? dirStore(process.env.RAW_STORE) : s3Store);

// ---------- push and pull ----------

/**
 * Records this machine's files for a source in the lock (replacing its entry) and uploads any the store lacks.
 * Returns the new entry; the caller writes the lock once every upload has worked.
 */
export function push(source: RawSource, store: Store, opts: { root?: string; version?: string; log?: (s: string) => void } = {}): LockEntry {
  const { root = ".", log = console.log } = opts;
  const paths = localFiles(source, root);
  if (!paths.length) throw new Error(`${source.id}: no files here (${source.files?.join(", ") ?? source.dir}); get them with: ${source.fetch}`);
  const files = paths.map((path) => {
    const p = join(root, path);
    const hash = sha256(p);
    const key = keyFor(source.id, path, hash);
    if (store.has(key)) log(`  = ${path} (already stored)`);
    else {
      log(`  ↑ ${path} -> ${key}`);
      store.put(p, key);
    }
    return { path, sha256: hash, bytes: statSync(p).size, key };
  });
  const newest = Math.max(...paths.map((p) => statSync(join(root, p)).mtimeMs));
  return { ...(opts.version ? { version: opts.version } : {}), retrieved: new Date(newest).toISOString().slice(0, 10), files };
}

/**
 * Downloads the locked files that are missing here. A file that differs is left alone (it may be newer data not
 * pushed yet) unless `force`. Each download is checked against its hash before it replaces anything.
 */
export function pull(st: SourceStatus, store: Store, opts: { root?: string; force?: boolean; log?: (s: string) => void } = {}): { fetched: number; kept: string[] } {
  const { root = ".", force = false, log = console.log } = opts;
  let fetched = 0;
  const kept: string[] = [];
  for (const { file, state } of st.files) {
    if (state === "match" || (state === "differs" && !force)) {
      if (state === "differs") kept.push(file.path);
      continue;
    }
    const p = join(root, file.path);
    mkdirSync(dirname(p), { recursive: true });
    const tmp = `${p}.part`;
    log(`  ↓ ${file.key} -> ${file.path}`);
    store.get(file.key, tmp);
    if (sha256(tmp) !== file.sha256) {
      rmSync(tmp);
      throw new Error(`${file.path}: download does not match the lock's SHA-256; nothing replaced`);
    }
    renameSync(tmp, p);
    fetched++;
  }
  return { fetched, kept };
}

/** Problems with the raw files data:build is about to read, compared with the lock. */
export function buildInputProblems(root = "."): { errors: string[]; warnings: string[] } {
  const lock = readLock(root);
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const source of RAW_SOURCES.filter((s) => s.build)) {
    const st = status(source, lock, root);
    for (const { file, state } of st.files) if (state !== "match") errors.push(`${file.path} is ${state === "missing" ? "missing" : "not the locked version"}`);
    for (const f of st.unlocked) warnings.push(`${f} is not in ${LOCK_PATH} (npm run data:push -- ${source.id})`);
  }
  return { errors, warnings };
}
