import { formatRange, MAX_YEAR } from "../time/scale";
import { shortDuration } from "../timeline/layout";
import type { Entity } from "../types";
import { stageTitle } from "./browse";

/**
 * How the Civilizations page arranges its civilizations: by region, oldest first, each region holding
 *   - groups: the group entities (Ancient Egypt, Ancient China...) with their periods, and an About page;
 *   - families: civilizations that share a picture (the Janapadas, the Hellenistic kingdoms, Ancient Korea...),
 *     gathered under that picture's name; a picture shared by only one civilization makes no family;
 *   - single civilizations.
 * Every civilization other than a group appears exactly once (civLayout.test.ts).
 */
export interface Cluster {
  kind: "group" | "family";
  id: string;
  title: string;
  /** The group entity (groups only). */
  entity?: Entity;
  picture?: { url: string; credit?: string };
  color?: string;
  region: string;
  members: Entity[];
  start: number;
  end: number;
}
export interface Single {
  kind: "single";
  id: string;
  entity: Entity;
  /** Its own picture, or one it shares with no other civilization. */
  picture?: string;
  region: string;
  start: number;
  end: number;
}
export type Entry = Cluster | Single;
export interface Region {
  name: string;
  entries: Entry[];
  /** Civilizations in it (a group's periods, not the group itself). */
  count: number;
  start: number;
  end: number;
}

export const NO_REGION = "Region not set";

/** A span the atlas cuts off at its end (1 CE): it carried on after. */
export const runsOn = (e: { end_year: number }) => e.end_year >= MAX_YEAR;
export const RUNS_ON_NOTE = "Carried on after 1 CE, where the atlas ends";

/** "30 BCE – 1 CE+" and "31+ yrs" for a span cut off at 1 CE. */
export const rangeText = (e: { start_year: number; end_year: number }) => formatRange(e.start_year, e.end_year) + (runsOn(e) ? "+" : "");
export const durationText = (e: { start_year: number; end_year: number }) => {
  const d = shortDuration(e.end_year - e.start_year);
  return runsOn(e) ? d.replace(" ", "+ ") : d;
};

/** The years marked on the page's time scale. */
export const TICKS = [-2999, -2499, -1999, -1499, -999, -499, 1];
export const tickLabel = (y: number) => (y >= 1 ? `${y} CE` : `${(1 - y).toLocaleString("en-US")} BCE`);

const byStart = (a: Entity, b: Entity) => a.start_year - b.start_year || a.end_year - b.end_year;

/** The region most of a cluster's members are in (ties: the earliest member's). */
function regionOf(members: Entity[]): string {
  const n = new Map<string, number>();
  for (const m of members) n.set(m.region ?? NO_REGION, (n.get(m.region ?? NO_REGION) ?? 0) + 1);
  let best = members[0].region ?? NO_REGION;
  for (const [r, k] of n) if (k > (n.get(best) ?? 0)) best = r;
  return best;
}

/** "the Mahajanapadas and early Vedic kingdoms in general" -> "Mahajanapadas and early Vedic kingdoms". */
const familyTitle = (label: string) => stageTitle(label.replace(/^the\s+/i, ""));

export function buildEntries(civs: Entity[], childrenOf: Map<string, Entity[]>): Entry[] {
  const entries: Entry[] = [];
  for (const g of civs.filter((e) => e.group)) {
    const members = [...(childrenOf.get(g.id) ?? [])].sort(byStart);
    entries.push({
      kind: "group",
      id: g.id,
      title: g.name,
      entity: g,
      picture: g.image_url ? { url: g.image_url, credit: g.image_credit } : undefined,
      color: g.color,
      region: g.region ?? regionOf(members),
      members,
      start: g.start_year,
      end: g.end_year,
    });
  }
  const loose = civs.filter((e) => !e.group && !e.parent_id).sort(byStart);
  const families = new Map<string, Entity[]>();
  for (const e of loose) {
    const key = e.fallback_image?.url;
    if (key) families.set(key, [...(families.get(key) ?? []), e]);
  }
  for (const e of loose) {
    const fb = e.fallback_image;
    const family = fb ? families.get(fb.url)! : [];
    if (fb && family.length >= 2) {
      if (family[0] !== e) continue; // the family is added once, at its oldest member
      entries.push({
        kind: "family",
        id: `family:${fb.url.replace(/^.*\/|\.webp$/g, "")}`,
        title: familyTitle(fb.label),
        picture: { url: fb.url, credit: fb.credit },
        color: family[0].color,
        region: regionOf(family),
        members: family,
        start: Math.min(...family.map((m) => m.start_year)),
        end: Math.max(...family.map((m) => m.end_year)),
      });
    } else {
      entries.push({
        kind: "single",
        id: e.id,
        entity: e,
        picture: e.image_url ?? fb?.url,
        region: e.region ?? NO_REGION,
        start: e.start_year,
        end: e.end_year,
      });
    }
  }
  return entries.sort((a, b) => a.start - b.start || a.end - b.end);
}

/** The entries by region, regions in the order they first appear in time. */
export function byRegion(entries: Entry[]): Region[] {
  const m = new Map<string, Region>();
  for (const e of entries) {
    const r = m.get(e.region) ?? { name: e.region, entries: [], count: 0, start: Infinity, end: -Infinity };
    r.entries.push(e);
    r.count += e.kind === "single" ? 1 : e.members.length;
    r.start = Math.min(r.start, e.start);
    r.end = Math.max(r.end, e.end);
    m.set(e.region, r);
  }
  return [...m.values()].sort((a, b) => a.start - b.start);
}

/**
 * Greedy packing into rows: each item goes in the first row where it starts at least `gap` after the row's last
 * item ends. Items are [x0, x1) extents (a timeline bar plus the room its label needs).
 */
export function pack<T extends { x0: number; x1: number }>(items: T[], gap: number): T[][] {
  const rows: T[][] = [];
  const ends: number[] = [];
  for (const it of [...items].sort((a, b) => a.x0 - b.x0)) {
    let r = ends.findIndex((end) => end + gap <= it.x0);
    if (r < 0) {
      r = rows.length;
      rows.push([]);
      ends.push(-Infinity);
    }
    rows[r].push(it);
    ends[r] = it.x1;
  }
  return rows;
}
