import { useEffect, useState } from "react";
import type { BrowseView } from "../route";
import type { CategoryCounts, LogDetails, LogEntry, LogSite } from "./types";

/** The raw sources an update checks (scripts/lib/raw-store.ts), as the page names them. */
export const SOURCE_NAMES: Record<string, string> = {
  xronos: "XRONOS",
  cliopatria: "Cliopatria",
  wikidata: "Wikidata",
  road: "ROAD",
  aadr: "Allen Ancient DNA Resource",
  paleo: "Coastlines and ice sheets",
};

const NOUNS: Record<keyof CategoryCounts, [string, string]> = {
  species: ["fossil site", "fossil sites"],
  culture: ["culture site", "culture sites"],
  civilization: ["territory map", "territory maps"],
  event: ["event place", "event places"],
};
const ORDER = Object.keys(NOUNS) as (keyof CategoryCounts)[];

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const nounFor = (category: string, n: number) => NOUNS[category as keyof CategoryCounts]?.[n === 1 ? 0 : 1] ?? (n === 1 ? "site" : "sites");

/** The browse page an entity of this category opens on. */
export const PAGE_OF: Record<string, BrowseView> = { species: "species", culture: "cultures", civilization: "civilizations", event: "events" };

export interface Chip { text: string; tone: "added" | "removed" | "changed" | "held" }

/** An entry's headline counts, as chips: "+37 culture sites", "−2 fossil sites", "5 changed", "10 held back". */
export function entryChips(e: LogEntry): Chip[] {
  const chips: Chip[] = [];
  for (const c of ORDER) if (e.added[c]) chips.push({ text: `+${e.added[c]!.toLocaleString("en-US")} ${nounFor(c, e.added[c]!)}`, tone: "added" });
  if (e.entitiesAdded) chips.push({ text: `+${plural(e.entitiesAdded, "new entry", "new entries")}`, tone: "added" });
  if (e.genomesAdded) chips.push({ text: `+${plural(e.genomesAdded, "ancient genome")}`, tone: "added" });
  for (const c of ORDER) if (e.removed[c]) chips.push({ text: `−${e.removed[c]!.toLocaleString("en-US")} ${nounFor(c, e.removed[c]!)}`, tone: "removed" });
  if (e.genomesRemoved) chips.push({ text: `−${plural(e.genomesRemoved, "ancient genome")}`, tone: "removed" });
  if (e.changed) chips.push({ text: `${e.changed.toLocaleString("en-US")} changed`, tone: "changed" });
  if (e.held) chips.push({ text: `${e.held.toLocaleString("en-US")} held back`, tone: "held" });
  return chips;
}

export interface SiteGroup<T extends LogSite = LogSite> { entity_id: string; entity: string; category: string; sites: T[] }

/** Sites grouped by what they belong to (Linear Pottery, H. sapiens…), biggest group first, then by name. */
export function groupByEntity<T extends LogSite>(sites: T[]): SiteGroup<T>[] {
  const groups = new Map<string, SiteGroup<T>>();
  for (const s of sites) {
    let g = groups.get(s.entity_id);
    if (!g) groups.set(s.entity_id, (g = { entity_id: s.entity_id, entity: s.entity, category: s.category, sites: [] }));
    g.sites.push(s);
  }
  const name = (s: LogSite) => s.label ?? s.id;
  for (const g of groups.values()) g.sites.sort((a, b) => name(a).localeCompare(name(b)));
  return [...groups.values()].sort((a, b) => b.sites.length - a.sites.length || a.entity.localeCompare(b.entity));
}

/** "23 October 2026", from an entry's YYYY-MM-DD date (read as a calendar date, whatever the time zone). */
export const formatDay = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** What a changed site's `fields` mean, in words. */
export function describeChange(fields: string[], was?: string): string {
  const words: Record<string, string> = { dates: "new dates", "date text": "date details", name: "renamed", source: "new source", place: "moved", territory: "new outline" };
  const parts: string[] = [];
  if (fields.includes("merged")) parts.push(was ? `merged with ${was}` : "merged with a nearby record");
  else if (was && (fields.includes("name") || fields.includes("id"))) parts.push(`was ${was}`);
  for (const f of fields) if (words[f] && !(f === "name" && was)) parts.push(words[f]);
  return parts.join(", ") || "updated";
}

// The log is small and loaded once a visit; each entry's details only when it is opened.
let logPromise: Promise<LogEntry[]> | null = null;
const detailPromises = new Map<string, Promise<LogDetails | null>>();

/** The list of published updates (no file yet: none). */
export const loadLog = () =>
  (logPromise ??= fetch("/data/changelog.json")
    .then((r) => (r.ok ? (r.json() as Promise<LogEntry[]>) : []))
    .catch(() => []));

export function loadDetails(id: string) {
  let p = detailPromises.get(id);
  if (!p) {
    p = fetch(`/data/changelog/${encodeURIComponent(id)}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<LogDetails>) : null))
      .catch(() => null);
    detailPromises.set(id, p);
  }
  return p;
}

export function useLog(): LogEntry[] | null {
  const [log, setLog] = useState<LogEntry[] | null>(null);
  useEffect(() => {
    let live = true;
    loadLog().then((l) => live && setLog(l));
    return () => {
      live = false;
    };
  }, []);
  return log;
}

/** An entry's details once `open` (undefined while loading, null if they could not be read). */
export function useDetails(id: string, open: boolean): LogDetails | null | undefined {
  const [details, setDetails] = useState<LogDetails | null | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    let live = true;
    loadDetails(id).then((d) => live && setDetails(d));
    return () => {
      live = false;
    };
  }, [id, open]);
  return details;
}
