// The hold-back screen (docs/data-updates.md, "When unsure, leave it out"): bulk points an update brings in are
// published only when they also look right next to what their entity already had. Anything else is held back in
// data/curated/held-back.csv until a person confirms it (status "confirmed"). Hand-curated rows are not screened (a person added them,
// with sources); removals are never held (leaving data out is the safe direction).
import { feature, iso1A2Code } from "@rapideditor/country-coder";
import { formatYear } from "../../src/time/scale.ts";
import type { HeldRow } from "../lib/held-back.ts";
import { distanceKm, outliers } from "../lib/qa.ts";
import type { Changes, SnapFeature, Snapshot } from "./compare.ts";

/** Sources whose points arrive in bulk, without a person looking at each. */
export const BULK = new Set(["xronos", "road"]);

const country = (f: SnapFeature) => (f.point ? iso1A2Code([f.point[0], f.point[1]]) ?? "sea" : "?");
const countryName = (code: string) => feature(code)?.properties.nameEn ?? code;

/**
 * Reasons a new bulk point looks doubtful (empty: publish it), against the entity's points before the update. An
 * entity with no points before (a culture a person has just mapped) is judged by its new points among themselves:
 * only the distance test applies. The reasons are shown on the public change log, so they use names, not ids.
 */
export function doubtsAbout(f: SnapFeature, before: SnapFeature[], span?: { start_year: number; end_year: number }, peers: SnapFeature[] = [], name = f.entity_id): string[] {
  const reasons: string[] = [];
  if (!f.point) return reasons;
  const fresh = !before.length;
  const others = (fresh ? peers.filter((x) => x !== f) : before).filter((x) => x.point);
  const pts = [...others, f].map((x) => ({ lat: x.point![1], lon: x.point![0] }));
  if (outliers(pts).includes(pts.length - 1)) {
    const nearest = Math.min(...others.map((x) => distanceKm(f.point![1], f.point![0], x.point![1], x.point![0])));
    reasons.push(`far from ${name}'s other sites (nearest ${Math.round(nearest).toLocaleString("en-US")} km)`);
  }
  if (!fresh) {
    const c = country(f);
    if (!before.some((x) => country(x) === c)) reasons.push(c === "sea" ? `at sea, where ${name} had no point` : `first ${name} point in ${countryName(c)}`);
  }
  reasons.push(...stretches(f, span, name));
  return reasons;
}

const stretches = (f: SnapFeature, span?: { start_year: number; end_year: number }, name = f.entity_id) =>
  span && (f.start_year < span.start_year || f.end_year > span.end_year)
    ? [`dated outside ${name}'s span (${formatYear(span.start_year)} to ${formatYear(span.end_year)})`]
    : [];

/** What to hold back from these changes. `curated`: entity ids defined in entities.yaml (a person added them). */
export function screen(changes: Changes, before: Snapshot, date: string, curated: Set<string> = new Set()): HeldRow[] {
  const held: HeldRow[] = [];
  const group = (fs: SnapFeature[]) => {
    const m = new Map<string, SnapFeature[]>();
    for (const f of fs) (m.get(f.entity_id) ?? m.set(f.entity_id, []).get(f.entity_id)!).push(f);
    return m;
  };
  const byEntity = group(before.features);
  const isBulk = (f: SnapFeature) => BULK.has(f.source_id) && (f.category === "species" || f.category === "culture");
  const bulk = changes.features.added.filter(isBulk);
  const peers = group(bulk);
  // A brand-new entity's span comes from the update itself, so only an existing entity's span counts.
  const spans = new Map(before.entities.map((e) => [e.id, e]));
  const names = new Map([...before.entities, ...changes.entities.added].map((e) => [e.id, e.name]));
  const hold = (f: SnapFeature, reasons: string[]) => {
    if (reasons.length) held.push({ id: f.id, kind: "feature", entity_id: f.entity_id, label: f.label ?? "", reason: reasons.join("; "), held: date, status: "held" });
  };
  for (const f of bulk) hold(f, doubtsAbout(f, byEntity.get(f.entity_id) ?? [], spans.get(f.entity_id), peers.get(f.entity_id), names.get(f.entity_id)));
  // A changed bulk point is screened too: in full when it moved more than 2 km, else only for its span (its place
  // was there before). Holding it leaves the point out; a point it had replaced or absorbed comes back.
  for (const c of changes.features.changed) {
    const f = c.after;
    if (!isBulk(f) || !c.fields.some((x) => ["dates", "place", "id", "merged"].includes(x))) continue;
    const moved = f.point && c.before.point ? distanceKm(f.point[1], f.point[0], c.before.point[1], c.before.point[0]) > 2 : false;
    const others = (byEntity.get(f.entity_id) ?? []).filter((x) => x.id !== c.before.id);
    const name = names.get(f.entity_id);
    hold(f, moved ? doubtsAbout(f, others, spans.get(f.entity_id), [], name) : stretches(f, spans.get(f.entity_id), name));
  }
  for (const e of changes.entities.added)
    if (e.category === "civilization" && !e.group && !curated.has(e.id))
      held.push({ id: e.id, kind: "entity", entity_id: e.id, label: e.name, reason: "new polity from Cliopatria: check its name, dates and territory", held: date, status: "held" });
  return held;
}
