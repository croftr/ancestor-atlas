import { readFileSync } from "node:fs";
import { MAX_YEAR, MIN_YEAR } from "../src/time/scale.ts";

const CATS = ["species", "culture", "civilization"];
const errors: string[] = [];
const err = (m: string) => errors.push(m);

let gj: any;
try {
  gj = JSON.parse(readFileSync("public/data/entities.geojson", "utf8"));
} catch (e) {
  console.error(`Cannot read public/data/entities.geojson: ${(e as Error).message}`);
  process.exit(1);
}

const ids = new Set<string>();
const counts: Record<string, number> = { species: 0, culture: 0, civilization: 0 };

const checkCoord = (id: string, c: unknown) => {
  if (!Array.isArray(c) || c.length < 2 || typeof c[0] !== "number" || typeof c[1] !== "number")
    return err(`${id}: malformed coordinate ${JSON.stringify(c)}`);
  if (c[0] < -180 || c[0] > 180) err(`${id}: longitude ${c[0]} out of range`);
  if (c[1] < -90 || c[1] > 90) err(`${id}: latitude ${c[1]} out of range`);
};
const checkRing = (id: string, ring: any[]) => {
  ring.forEach((c) => checkCoord(id, c));
  const a = ring[0], b = ring[ring.length - 1];
  if (!a || !b || a[0] !== b[0] || a[1] !== b[1]) err(`${id}: polygon ring is not closed`);
};

for (const [i, f] of (gj.features ?? []).entries()) {
  const p = f.properties ?? {};
  const id = typeof p.id === "string" ? p.id : `feature[${i}]`;
  if (typeof p.id !== "string" || !p.id) err(`${id}: missing string id`);
  else if (ids.has(p.id)) err(`${id}: duplicate id`);
  else ids.add(p.id);
  for (const k of ["entity_id", "name", "description"])
    if (typeof p[k] !== "string") err(`${id}: ${k} must be a string`);
  for (const k of ["start_year", "end_year"])
    if (!Number.isInteger(p[k])) err(`${id}: ${k} must be an integer`);
  if (p.weight !== undefined && (typeof p.weight !== "number" || p.weight < 0 || p.weight > 1))
    err(`${id}: weight must be a number in [0,1]`);
  for (const [k, v] of Object.entries(p))
    if (v !== null && typeof v === "object") err(`${id}: property ${k} is nested`);
  if (!CATS.includes(p.category)) { err(`${id}: invalid category ${p.category}`); continue; }
  counts[p.category]++;
  if (!(MIN_YEAR <= p.start_year && p.start_year <= p.end_year && p.end_year <= MAX_YEAR))
    err(`${id}: need ${MIN_YEAR} <= start_year <= end_year <= ${MAX_YEAR}, got ${p.start_year}..${p.end_year}`);

  const g = f.geometry;
  const t = g?.type;
  if (p.category === "civilization") {
    if (t === "Polygon") g.coordinates.forEach((r: any[]) => checkRing(id, r));
    else if (t === "MultiPolygon") g.coordinates.forEach((poly: any[]) => poly.forEach((r) => checkRing(id, r)));
    else err(`${id}: civilization must be Polygon/MultiPolygon, got ${t}`);
  } else {
    if (t === "Point") checkCoord(id, g.coordinates);
    else if (t === "MultiPoint") g.coordinates.forEach((c: unknown) => checkCoord(id, c));
    else err(`${id}: ${p.category} must be Point/MultiPoint, got ${t}`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(`OK: ${gj.features.length} features`);
for (const c of CATS) console.log(`  ${c}: ${counts[c]}`);
