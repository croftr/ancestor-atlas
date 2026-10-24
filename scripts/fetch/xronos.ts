// Downloads the XRONOS export (https://xronos.ch/data.csv, CC BY 4.0) into data/raw/xronos/data.csv:
//   npm run data:fetch:xronos
// Only Rob runs this, by hand: never an agent or a schedule (CLAUDE.md). The XRONOS team asked for the export to be
// downloaded at most about daily and cached; Rob keeps to that himself (his call, 24 Oct 2026: the command no longer
// enforces a wait). It asks only for changes since the last download (If-None-Match / If-Modified-Since), so a repeat
// costs XRONOS next to nothing when nothing changed. Every request is recorded in data/raw/xronos/download.json. A new file is checked for XRONOS's columns before it replaces the
// old one; then `npm run data:update -- --check` shows it, and locking it (data:push -- xronos) lets data:build use it.
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { XRONOS_CSV } from "../ingest/xronos.ts";

export const XRONOS_URL = process.env.XRONOS_URL ?? "https://xronos.ch/data.csv";
export const XRONOS_STAMP = "data/raw/xronos/download.json";
const UA = "ancestor-atlas/0.1 (https://github.com/croftr/ancestor-atlas; run by hand, cached)";
/** Columns the ingest reads (scripts/ingest/xronos.ts). */
export const XRONOS_COLUMNS = ["labnr", "bp", "std", "site", "country", "lat", "lng", "species", "typochronological_units", "reference"];

export interface DownloadStamp {
  /** Last request, successful or not. */
  requested: string;
  ok: boolean;
  /** Last time a new file was saved. */
  downloaded?: string;
  etag?: string;
  lastModified?: string;
  bytes?: number;
  sha256?: string;
  rows?: number;
  error?: string;
}

/** Columns of the ingest missing from a CSV header line. */
export const missingColumns = (header: string) => {
  const have = new Set(header.replace(/^﻿/, "").split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
  return XRONOS_COLUMNS.filter((c) => !have.has(c));
};

const readStamp = (): DownloadStamp | undefined => (existsSync(XRONOS_STAMP) ? JSON.parse(readFileSync(XRONOS_STAMP, "utf8")) : undefined);
const writeStamp = (s: DownloadStamp) => writeFileSync(XRONOS_STAMP, JSON.stringify(s, null, 2) + "\n");

async function hashAndCount(path: string): Promise<{ sha256: string; rows: number; header: string }> {
  const h = createHash("sha256");
  let rows = -1;
  let header = "";
  for await (const chunk of createReadStream(path)) {
    h.update(chunk);
    if (!header) header = chunk.toString("utf8").split(/\r?\n/)[0];
    for (const b of chunk as Buffer) if (b === 10) rows++;
  }
  return { sha256: h.digest("hex"), rows, header };
}

async function main() {
  const prev = readStamp();
  mkdirSync("data/raw/xronos", { recursive: true });
  const stamp: DownloadStamp = { ...prev, requested: new Date().toISOString(), ok: false };
  delete stamp.error;
  writeStamp(stamp); // recorded before the request, so a crash still counts as a request
  const headers: Record<string, string> = { "User-Agent": UA };
  if (existsSync(XRONOS_CSV) && prev?.etag) headers["If-None-Match"] = prev.etag;
  if (existsSync(XRONOS_CSV) && prev?.lastModified) headers["If-Modified-Since"] = prev.lastModified;
  console.log(`GET ${XRONOS_URL}`);
  const part = `${XRONOS_CSV}.part`;
  try {
    const res = await fetch(XRONOS_URL, { headers, signal: AbortSignal.timeout(15 * 60_000) });
    if (res.status === 304) {
      writeStamp({ ...stamp, ok: true });
      console.log(`✓ unchanged since the last download (${prev?.downloaded ?? "?"}); nothing saved`);
      return;
    }
    if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`);
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(part));
    const { sha256, rows, header } = await hashAndCount(part);
    const missing = missingColumns(header);
    if (missing.length) throw new Error(`the export has no ${missing.join(", ")} column (XRONOS changed its format?); kept the old file`);
    const same = prev?.sha256 === sha256 && existsSync(XRONOS_CSV);
    renameSync(part, XRONOS_CSV);
    writeStamp({
      ...stamp, ok: true, downloaded: stamp.requested, bytes: statSync(XRONOS_CSV).size, sha256, rows,
      etag: res.headers.get("etag") ?? undefined, lastModified: res.headers.get("last-modified") ?? undefined,
    });
    console.log(`✓ ${XRONOS_CSV}: ${rows.toLocaleString("en")} rows, ${(statSync(XRONOS_CSV).size / 1e6).toFixed(1)} MB` +
      (prev?.rows !== undefined ? ` (last download: ${prev.rows.toLocaleString("en")} rows)` : "") + (same ? ", identical to the last download" : ""));
    console.log("  Next: npm run data:update -- --check (data:build keeps refusing it until it is locked: npm run data:push -- xronos)");
  } catch (e) {
    if (existsSync(part)) rmSync(part);
    writeStamp({ ...stamp, ok: false, error: (e as Error).message });
    console.error(`✗ ${(e as Error).message}${/^5\d\d/.test((e as Error).message) ? " (XRONOS's server is not answering: try again later)" : ""}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
