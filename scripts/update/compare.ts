// What changed in public/data between two versions (a git revision, or the working tree): features, entities and
// the ancient DNA layer. Used by `npm run data:update` for the report, the hold-back screen and the change log.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { DnaData } from "../../src/dna/types.ts";
import { distanceKm } from "../lib/qa.ts";

export interface SnapFeature {
  id: string;
  entity_id: string;
  category: string;
  source_id: string;
  start_year: number;
  end_year: number;
  label?: string;
  date_text?: string;
  /** Points: [lon, lat]. Polygons: undefined (compared by `shape`). */
  point?: [number, number];
  shape?: string;
}
export interface SnapEntity { id: string; name: string; category: string; start_year: number; end_year: number; description?: string; group?: string }
export interface Snapshot { label: string; features: SnapFeature[]; entities: SnapEntity[]; dna?: DnaData }

const FILES = { features: "public/data/features.geojson", entities: "public/data/entities.json", dna: "public/data/dna.json" };

function read(rev: string | undefined, path: string): string | undefined {
  if (!rev) return existsSync(path) ? readFileSync(path, "utf8") : undefined;
  try { return execFileSync("git", ["show", `${rev}:${path}`], { encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return undefined; }
}

/** public/data at a git revision, or in the working tree when `rev` is undefined. */
export function loadSnapshot(rev?: string): Snapshot {
  const fj = read(rev, FILES.features);
  const ej = read(rev, FILES.entities);
  if (!fj || !ej) throw new Error(`no public/data at ${rev ?? "the working tree"}`);
  const features = (JSON.parse(fj).features as { properties: Record<string, any>; geometry: { type: string; coordinates: any } }[]).map((f) => {
    const p = f.properties;
    const point = f.geometry.type === "Point";
    return {
      id: p.id, entity_id: p.entity_id, category: p.category, source_id: p.source_id, start_year: p.start_year, end_year: p.end_year,
      ...(p.label && { label: p.label }), ...(p.date_text && { date_text: p.date_text }),
      ...(point ? { point: f.geometry.coordinates as [number, number] } : { shape: createHash("sha1").update(JSON.stringify(f.geometry.coordinates)).digest("hex").slice(0, 12) }),
    };
  });
  const entities = (JSON.parse(ej) as SnapEntity[]).map(({ id, name, category, start_year, end_year, description, group }) => ({ id, name, category, start_year, end_year, description, ...(group && { group }) }));
  const dj = read(rev, FILES.dna);
  return { label: rev ?? "working tree", features, entities, ...(dj && { dna: JSON.parse(dj) as DnaData }) };
}

export interface FeatureChange { before: SnapFeature; after: SnapFeature; fields: string[] }
export interface EntityChange { before: SnapEntity; after: SnapEntity; fields: string[] }
export interface DnaChanges {
  release?: { from: string; to: string };
  peopleAdded: number;
  peopleRemoved: number;
  sitesAdded: { id: string; name: string; country: string; people: number }[];
  sitesRemoved: { id: string; name: string; country: string; people: number }[];
}
export interface Changes {
  features: { added: SnapFeature[]; removed: SnapFeature[]; changed: FeatureChange[] };
  entities: { added: SnapEntity[]; removed: SnapEntity[]; changed: EntityChange[] };
  dna: DnaChanges;
}

const km = (a: SnapFeature, b: SnapFeature) => (a.point && b.point ? distanceKm(a.point[1], a.point[0], b.point[1], b.point[0]) : Infinity);

function featureFields(a: SnapFeature, b: SnapFeature): string[] {
  const f: string[] = [];
  if (a.start_year !== b.start_year || a.end_year !== b.end_year) f.push("dates");
  if ((a.date_text ?? "") !== (b.date_text ?? "") && !f.includes("dates")) f.push("date text");
  if ((a.label ?? "") !== (b.label ?? "")) f.push("name");
  if (a.source_id !== b.source_id) f.push("source");
  if (a.point && b.point ? km(a, b) > 0.1 : a.shape !== b.shape) f.push(a.point ? "place" : "territory");
  return f;
}

export function compareSnapshots(before: Snapshot, after: Snapshot): Changes {
  const oldById = new Map(before.features.map((f) => [f.id, f]));
  const newById = new Map(after.features.map((f) => [f.id, f]));
  let added = after.features.filter((f) => !oldById.has(f.id));
  let removed = before.features.filter((f) => !newById.has(f.id));
  const changed: FeatureChange[] = [];
  for (const f of after.features) {
    const o = oldById.get(f.id);
    if (!o) continue;
    const fields = featureFields(o, f);
    if (fields.length) changed.push({ before: o, after: f, fields });
  }
  // An id can change while the place stays: a renamed or renumbered site (same entity and name within 2 km), or two
  // points the build merged, as it does within 2 km (a ROAD point listed on a new XRONOS point's card, say).
  const paired = new Set<SnapFeature>();
  for (const sameName of [true, false])
    for (const a of added) {
      if (paired.has(a)) continue;
      const r = removed
        .filter((x) => !paired.has(x) && x.entity_id === a.entity_id && (!sameName || (x.label ?? "") === (a.label ?? "")) && km(x, a) < 2)
        .sort((x, y) => km(x, a) - km(y, a))[0];
      if (!r) continue;
      paired.add(r).add(a);
      changed.push({ before: r, after: a, fields: [sameName ? "id" : "merged", ...featureFields(r, a)] });
    }
  added = added.filter((f) => !paired.has(f));
  removed = removed.filter((f) => !paired.has(f));

  const oldE = new Map(before.entities.map((e) => [e.id, e]));
  const newE = new Map(after.entities.map((e) => [e.id, e]));
  const entityChanged: EntityChange[] = [];
  for (const e of after.entities) {
    const o = oldE.get(e.id);
    if (!o) continue;
    const fields = [
      ...(o.name !== e.name ? ["name"] : []),
      ...(o.start_year !== e.start_year || o.end_year !== e.end_year ? ["span"] : []),
      ...((o.description ?? "") !== (e.description ?? "") ? ["description"] : []),
    ];
    if (fields.length) entityChanged.push({ before: o, after: e, fields });
  }

  return {
    features: { added, removed, changed },
    entities: { added: after.entities.filter((e) => !oldE.has(e.id)), removed: before.entities.filter((e) => !newE.has(e.id)), changed: entityChanged },
    dna: compareDna(before.dna, after.dna),
  };
}

export function compareDna(before?: DnaData, after?: DnaData): DnaChanges {
  const people = (d?: DnaData) => new Set(d?.sites.flatMap((s) => s.people.map((p) => p[0])) ?? []);
  const sites = (d?: DnaData) => new Map(d?.sites.map((s) => [s.id, s]) ?? []);
  const [pb, pa, sb, sa] = [people(before), people(after), sites(before), sites(after)];
  const brief = (s: DnaData["sites"][number]) => ({ id: s.id, name: s.name, country: s.country, people: s.people.length });
  return {
    ...(before && after && before.release !== after.release && { release: { from: before.release, to: after.release } }),
    peopleAdded: [...pa].filter((p) => !pb.has(p)).length,
    peopleRemoved: [...pb].filter((p) => !pa.has(p)).length,
    sitesAdded: [...sa.values()].filter((s) => !sb.has(s.id)).map(brief),
    sitesRemoved: [...sb.values()].filter((s) => !sa.has(s.id)).map(brief),
  };
}

export const isEmpty = (c: Changes) =>
  !c.features.added.length && !c.features.removed.length && !c.features.changed.length &&
  !c.entities.added.length && !c.entities.removed.length && !c.entities.changed.length &&
  !c.dna.peopleAdded && !c.dna.peopleRemoved && !c.dna.release;
