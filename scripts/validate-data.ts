// Validates public/data/{entities.json, features.geojson, sources.json}.
import { existsSync, readFileSync } from "node:fs";
import { MAX_YEAR, MIN_YEAR } from "../src/time/scale.ts";
import { EVIDENCE_REF, QID } from "./lib/qa.ts";

const CATS = ["species", "culture", "civilization", "event"];
const CONFIDENCE = ["high", "medium", "low"];
const HEX = /^#[0-9a-f]{6}$/i;
const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const read = (file: string): any => {
  try {
    return JSON.parse(readFileSync(`public/data/${file}`, "utf8"));
  } catch (e) {
    console.error(`Cannot read public/data/${file}: ${(e as Error).message}`);
    process.exit(1);
  }
};
const entityList: any[] = read("entities.json");
const gj = read("features.geojson");
const sourceList: any[] = read("sources.json");

// ---------- sources ----------
const sources = new Set<string>();
for (const s of sourceList) {
  for (const k of ["id", "name", "url", "licence", "citation"])
    if (typeof s[k] !== "string" || !s[k]) err(`source ${s.id}: missing ${k}`);
  if (sources.has(s.id)) err(`source ${s.id}: duplicate`);
  sources.add(s.id);
}

// ---------- registry ----------
const missingPictures = new Set<string>();
const entities = new Map<string, any>();
for (const e of entityList) {
  const id = e.id;
  if (typeof id !== "string" || !id) { err(`entity: missing id`); continue; }
  if (entities.has(id)) { err(`entity ${id}: duplicate id`); continue; }
  entities.set(id, e);
  for (const k of ["name", "description"]) if (typeof e[k] !== "string") err(`entity ${id}: ${k} must be a string`);
  if (!e.group && !e.description) warn(`entity ${id}: empty description`);
  if (!CATS.includes(e.category)) err(`entity ${id}: invalid category ${e.category}`);
  for (const k of ["start_year", "end_year"]) if (!Number.isInteger(e[k])) err(`entity ${id}: ${k} must be an integer`);
  if (e.start_year > e.end_year) err(`entity ${id}: start_year after end_year`);
  if (!Array.isArray(e.source_ids)) err(`entity ${id}: source_ids must be an array`);
  else for (const s of e.source_ids) if (!sources.has(s)) err(`entity ${id}: unknown source ${s}`);
  if (e.color !== undefined && !HEX.test(e.color)) err(`entity ${id}: bad colour ${e.color}`);
  if (e.image_url && !e.image_credit) err(`entity ${id}: image_url needs an image_credit (author/licence, or "AI-generated")`);
  if (e.fallback_image) {
    const f = e.fallback_image;
    if (!f.url || !f.credit || !f.label) err(`entity ${id}: fallback_image needs url, credit and label`);
    else if (!existsSync(`public${f.url}`)) missingPictures.add(f.url);
  }
  if (e.category === "event") {
    if (!Number.isInteger(e.year) || e.year < e.start_year || e.year > e.end_year) err(`event ${id}: year must be an integer within start_year..end_year`);
    if (typeof e.date_text !== "string" || !e.date_text) err(`event ${id}: missing date_text`);
  }
}
for (const e of entityList)
  for (const r of e.related_ids ?? []) {
    const t = entities.get(r);
    if (!t) err(`entity ${e.id}: related id ${r} does not exist`);
    else if (t.category === "event") err(`entity ${e.id}: related id ${r} is an event (link species, cultures or civilizations)`);
  }
const kids = new Map<string, number>();
for (const e of entityList) {
  if (e.parent_id === undefined) continue;
  const p = entities.get(e.parent_id);
  if (!p) err(`entity ${e.id}: parent_id ${e.parent_id} does not exist`);
  else {
    if (!p.group) err(`entity ${e.id}: parent ${p.id} is not a group`);
    if (p.category !== e.category) err(`entity ${e.id}: parent ${p.id} is in a different category`);
    kids.set(p.id, (kids.get(p.id) ?? 0) + 1);
  }
  // cycle check
  const seen = new Set<string>([e.id]);
  for (let c = p; c; c = entities.get(c.parent_id)) {
    if (seen.has(c.id)) { err(`entity ${e.id}: parent cycle through ${c.id}`); break; }
    seen.add(c.id);
  }
}
for (const e of entityList) if (e.group && !kids.get(e.id)) warn(`group ${e.id} has no children`);

// ---------- features ----------
const ids = new Set<string>();
const counts: Record<string, number> = { species: 0, culture: 0, civilization: 0, event: 0 };
const withFeatures = new Set<string>();

const checkCoord = (id: string, c: unknown) => {
  if (!Array.isArray(c) || c.length < 2 || typeof c[0] !== "number" || typeof c[1] !== "number")
    return err(`${id}: malformed coordinate ${JSON.stringify(c)}`);
  if (c[0] < -180 || c[0] > 180) err(`${id}: longitude ${c[0]} out of range`);
  if (c[1] < -90 || c[1] > 90) err(`${id}: latitude ${c[1]} out of range`);
};
const checkRing = (id: string, ring: any[]) => {
  if (ring.length < 4) err(`${id}: polygon ring has fewer than 4 positions`);
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
  for (const k of ["entity_id", "source_id"]) if (typeof p[k] !== "string" || !p[k]) err(`${id}: ${k} must be a string`);
  for (const k of ["start_year", "end_year"]) if (!Number.isInteger(p[k])) err(`${id}: ${k} must be an integer`);
  if (p.weight !== undefined && (typeof p.weight !== "number" || p.weight < 0 || p.weight > 1))
    err(`${id}: weight must be a number in [0,1]`);
  if (p.confidence !== undefined && !CONFIDENCE.includes(p.confidence)) err(`${id}: bad confidence ${p.confidence}`);
  for (const k of ["color", "line_color"]) if (p[k] !== undefined && !HEX.test(p[k])) err(`${id}: bad ${k} ${p[k]}`);
  for (const [k, v] of Object.entries(p)) if (v !== null && typeof v === "object") err(`${id}: property ${k} is nested`);
  if (!sources.has(p.source_id)) err(`${id}: unknown source_id ${p.source_id}`);
  // Evidence on curated point sites: well-formed when present, required once a row leaves `recall`.
  if (p.wikidata !== undefined && !QID.test(p.wikidata)) err(`${id}: bad wikidata id ${p.wikidata}`);
  for (const k of ["coord_source", "date_source"])
    if (p[k] !== undefined && !EVIDENCE_REF.test(p[k])) err(`${id}: ${k} "${p[k]}" should look like wikidata:/doi:/pbdb:/wikipedia:/road:/url:...`);
  if (p.category !== "civilization" && p.source_id !== "recall" && p.source_id !== "mock" && !(p.coord_source && p.date_source))
    err(`${id}: source_id ${p.source_id} needs both coord_source and date_source`);

  const e = entities.get(p.entity_id);
  if (!e) err(`${id}: unknown entity_id ${p.entity_id}`);
  else {
    withFeatures.add(e.id);
    if (e.group) err(`${id}: group entity ${e.id} must not have features`);
    if (e.category !== p.category) err(`${id}: category ${p.category} differs from entity's ${e.category}`);
    if (p.start_year < e.start_year || p.end_year > e.end_year)
      err(`${id}: dates ${p.start_year}..${p.end_year} fall outside entity span ${e.start_year}..${e.end_year}`);
  }
  if (!CATS.includes(p.category)) { err(`${id}: invalid category ${p.category}`); continue; }
  counts[p.category]++;
  if (!(MIN_YEAR <= p.start_year && p.start_year <= p.end_year && p.end_year <= MAX_YEAR))
    err(`${id}: need ${MIN_YEAR} <= start_year <= end_year <= ${MAX_YEAR}, got ${p.start_year}..${p.end_year}`);
  if (p.category === "civilization" && !p.color) err(`${id}: civilization feature has no colour`);

  const g = f.geometry;
  const t = g?.type;
  if (p.category === "civilization") {
    if (t === "Polygon") g.coordinates.forEach((r: any[]) => checkRing(id, r));
    else if (t === "MultiPolygon") g.coordinates.forEach((poly: any[]) => poly.forEach((r) => checkRing(id, r)));
    else err(`${id}: civilization must be Polygon/MultiPolygon, got ${t}`);
  } else {
    if (t === "Point") checkCoord(id, g.coordinates);
    else err(`${id}: ${p.category} must be a Point, got ${t}`);
  }
}
for (const e of entityList) if (!e.group && !withFeatures.has(e.id)) warn(`entity ${e.id}: has no features`);

for (const u of missingPictures) warn(`stand-in picture ${u} not added yet (members show no picture until it is)`);
for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  console.error(errors.slice(0, 50).map((e) => `✗ ${e}`).join("\n"));
  console.error(`\n${errors.length} problem(s) found${errors.length > 50 ? " (first 50 shown)" : ""}.`);
  process.exit(1);
}
console.log(`OK: ${gj.features.length} features, ${entityList.length} entities, ${sourceList.length} sources`);
for (const c of CATS) console.log(`  ${c}: ${counts[c]}`);
