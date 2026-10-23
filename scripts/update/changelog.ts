// The public change log (docs/data-updates.md, step 4 shows it at #/updates): public/data/changelog.json holds one
// small entry per published update, newest first; public/data/changelog/<id>.json the details, loaded when an entry
// is opened. Written by `npm run data:update -- --publish`, never by data:build (so it is outside the fingerprint).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { HeldRow } from "../lib/held-back.ts";
import type { Changes, SnapFeature, Snapshot } from "./compare.ts";

export const CHANGELOG = "public/data/changelog.json";
export const DETAILS_DIR = "public/data/changelog";

export interface SourceBump { id: string; from: string; to: string }
type Counts = Partial<Record<"species" | "culture" | "civilization" | "event", number>>;
export interface LogEntry {
  id: string;
  date: string;
  sources: SourceBump[];
  added: Counts;
  removed: Counts;
  changed: number;
  entitiesAdded: number;
  genomesAdded: number;
  genomesRemoved: number;
  held: number;
}
export interface LogSite { id: string; entity_id: string; entity: string; category: string; label?: string; date_text?: string; source_id: string; lat?: number; lon?: number }
export interface LogDetails {
  entry: LogEntry;
  added: LogSite[];
  removed: LogSite[];
  /** `was`: the site's earlier name, when it was renamed or merged into this one. */
  changed: (LogSite & { fields: string[]; was?: string })[];
  entities: { added: { id: string; name: string; category: string }[]; removed: { id: string; name: string; category: string }[]; changed: { id: string; name: string; fields: string[] }[] };
  dna: Changes["dna"];
  held: HeldRow[];
}

export const readLog = (): LogEntry[] => (existsSync(CHANGELOG) ? (JSON.parse(readFileSync(CHANGELOG, "utf8")) as LogEntry[]) : []);

/**
 * The revision to compare against: the commit that wrote the last change log entry, so data added by hand since
 * then is logged too. Before the first entry (or when that commit is not here), HEAD.
 */
export function baselineRev(): string {
  try {
    const rev = execFileSync("git", ["log", "-1", "--format=%H", "--", CHANGELOG], { encoding: "utf8" }).trim();
    if (rev) return rev;
  } catch { /* not in git */ }
  return "HEAD";
}

const count = (fs: { category: string }[]): Counts => {
  const c: Counts = {};
  for (const f of fs) c[f.category as keyof Counts] = (c[f.category as keyof Counts] ?? 0) + 1;
  return c;
};

export function buildDetails(id: string, date: string, changes: Changes, after: Snapshot, before: Snapshot, sources: SourceBump[], held: HeldRow[]): LogDetails {
  const names = new Map([...before.entities, ...after.entities].map((e) => [e.id, e.name]));
  const site = (f: SnapFeature): LogSite => ({
    id: f.id, entity_id: f.entity_id, entity: names.get(f.entity_id) ?? f.entity_id, category: f.category, source_id: f.source_id,
    ...(f.label && { label: f.label }), ...(f.date_text && { date_text: f.date_text }),
    ...(f.point && { lat: f.point[1], lon: f.point[0] }),
  });
  const brief = (e: { id: string; name: string; category: string }) => ({ id: e.id, name: e.name, category: e.category });
  const entry: LogEntry = {
    id, date, sources,
    added: count(changes.features.added),
    removed: count(changes.features.removed),
    changed: changes.features.changed.length,
    entitiesAdded: changes.entities.added.length,
    genomesAdded: changes.dna.peopleAdded,
    genomesRemoved: changes.dna.peopleRemoved,
    held: held.length,
  };
  return {
    entry,
    added: changes.features.added.map(site),
    removed: changes.features.removed.map(site),
    changed: changes.features.changed.map((c) => ({ ...site(c.after), fields: c.fields, ...((c.before.label ?? "") !== (c.after.label ?? "") && { was: c.before.label ?? c.before.id }) })),
    entities: {
      added: changes.entities.added.map(brief),
      removed: changes.entities.removed.map(brief),
      changed: changes.entities.changed.map((c) => ({ id: c.after.id, name: c.after.name, fields: c.fields })),
    },
    dna: changes.dna,
    held,
  };
}

/** An id for today's entry: the date, with -2, -3… when there is already one. */
export function entryId(date: string, log: LogEntry[]): string {
  let id = date;
  for (let n = 2; log.some((e) => e.id === id); n++) id = `${date}-${n}`;
  return id;
}

export function writeLog(details: LogDetails) {
  mkdirSync(DETAILS_DIR, { recursive: true });
  writeFileSync(`${DETAILS_DIR}/${details.entry.id}.json`, JSON.stringify(details) + "\n");
  writeFileSync(CHANGELOG, JSON.stringify([details.entry, ...readLog()], null, 1) + "\n");
}
