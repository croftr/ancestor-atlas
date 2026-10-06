// Merge raw ingests + curated files into public/data/{entities.json, features.geojson, sources.json}.
// Pipeline: data/raw (fetched) -> data/curated (hand-edited) -> public/data (built).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { parse as parseCsv } from "csv-parse/sync";
import { parse as parseYaml } from "yaml";
import { CATEGORIES, wikipediaUrl, type Category, type Entity, type FeatureProps, type Source } from "../src/types.ts";
import { civColors } from "./lib/colors.ts";
import { fingerprint, META_PATH } from "./lib/fingerprint.ts";
import { ingestCliopatria, simplifyGeometry } from "./ingest/cliopatria.ts";
import { readXronosSites, xronosFeatures } from "./ingest/xronos.ts";
import { distanceKm } from "./lib/qa.ts";

const OUT = "public/data";
const CURATED = "data/curated";
const CIV_BUDGET_BYTES = 3_000_000;

interface MatchRules {
  names?: string[];
  cliopatria_name_regex?: string;
  wikidata?: string[];
  cliopatria_member_of?: string[];
}
interface CuratedEntity extends Partial<Entity> {
  id: string;
  match_children?: MatchRules;
  candidate_keywords?: string[];
  exclude?: boolean;
}
type Geometry = { type: string; coordinates: unknown };
interface OutFeature {
  props: FeatureProps;
  geometry: Geometry;
}

const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

// ---------- load curated ----------
const sources = new Map<string, Source>(
  (parseYaml(readFileSync(`${CURATED}/sources.yaml`, "utf8")) as Source[]).map((s) => [s.id, s]),
);
const curated = (parseYaml(readFileSync(`${CURATED}/entities.yaml`, "utf8")) as CuratedEntity[]) ?? [];
const curatedIds = new Set<string>();
for (const c of curated) {
  if (curatedIds.has(c.id)) fail(`entities.yaml: duplicate id ${c.id}`);
  curatedIds.add(c.id);
}

// ---------- registry + features ----------
const entities = new Map<string, Entity>();
const features: OutFeature[] = [];
const descriptionFromWikidata = new Set<string>();

// Curated point sites (species + culture): one Point feature per CSV row.
const num = (v: string | undefined) => (v === undefined || v === "" ? undefined : Number(v));
function loadSites(file: string, category: Category) {
  const path = `${CURATED}/${file}`;
  if (!existsSync(path)) return;
  const rows = parseCsv(readFileSync(path, "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const perEntity = new Map<string, number>();
  for (const [i, r] of rows.entries()) {
    const n = (perEntity.get(r.entity_id) ?? 0) + 1;
    perEntity.set(r.entity_id, n);
    const lat = Number(r.lat), lon = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) fail(`${file} row ${i + 2}: bad coordinates`);
    const props: FeatureProps = {
      id: `${r.entity_id}@${n}`,
      entity_id: r.entity_id,
      category,
      start_year: Number(r.start_year),
      end_year: Number(r.end_year),
      source_id: r.source_id,
    };
    if (r.label) props.label = r.label;
    if (r.date_text) props.date_text = r.date_text;
    if (r.confidence) props.confidence = r.confidence as FeatureProps["confidence"];
    if (num(r.weight) !== undefined) props.weight = num(r.weight);
    if (r.source_ref) props.source_ref = r.source_ref;
    for (const k of ["wikidata", "coord_source", "date_source"] as const) if (r[k]) props[k] = r[k];
    features.push({ props, geometry: { type: "Point", coordinates: [lon, lat] } });
  }
}
loadSites("species-sites.csv", "species");
loadSites("culture-sites.csv", "culture");

// Culture sites from XRONOS radiocarbon dates (local copy only; see scripts/ingest/xronos.ts).
// A XRONOS site within 2 km of a curated site of the same entity is skipped: the curated row wins.
const xr = readXronosSites();
if (!xr) console.warn("! data/raw/xronos/data.csv missing: no XRONOS sites (download https://xronos.ch/data.csv by hand)");
else {
  const curatedPts = features.map((f) => ({ e: f.props.entity_id, c: f.geometry.coordinates as number[] }));
  let near = 0;
  for (const f of xronosFeatures(xr.sites)) {
    const [lon, lat] = f.geometry.coordinates;
    if (curatedPts.some((p) => p.e === f.props.entity_id && distanceKm(lat, lon, p.c[1], p.c[0]) < 2)) { near++; continue; }
    features.push(f);
  }
  const s = xr.stats;
  console.log(`XRONOS: ${s.labelled} labelled dates (${s.conflicting} with conflicting labels, ${s.noCoords} without coordinates, ${s.uncalibrated} not calibratable, ${s.duplicates} duplicate lab numbers, ${s.outOfWindow} outside the culture's sourced range, ${s.coarse} with whole-degree coordinates; ${s.countryMismatch} sites dropped for coordinates inconsistent with their country, ${s.merged} spelling variants merged, ${s.setAside} outlying end dates set aside) -> ${s.sites} sites, ${near} skipped as curated duplicates`);
  // Review list of the set-aside dates, for spot checks against the XRONOS records.
  const q = (x: string | number) => (/[",\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x));
  const rows = xr.sites.flatMap((x) => (x.setAside ?? []).map((d) => {
    const kept = x.dates.map((k) => k.median - 1950);
    return [x.entity_id, x.site, x.country, d.labnr, d.bp, d.std, Math.round(d.median - 1950), Math.round(Math.max(...kept)), Math.round(Math.min(...kept)), x.dates.length, `https://xronos.ch/c14s/${d.recordId}`];
  }));
  mkdirSync("data/build", { recursive: true });
  writeFileSync("data/build/xronos-set-aside.csv", ["entity_id,site,country,labnr,bp,std,median_bce,kept_oldest_bce,kept_youngest_bce,kept_dates,record", ...rows.map((r) => r.map(q).join(","))].join("\n") + "\n");
}

// Civilizations from Cliopatria.
const wdPath = "data/raw/wikidata/descriptions.json";
const wdDescriptions: Record<string, string> = existsSync(wdPath) ? JSON.parse(readFileSync(wdPath, "utf8")) : {};
if (!existsSync(wdPath)) console.warn("! data/raw/wikidata/descriptions.json missing: using placeholder descriptions");

console.log("Ingesting Cliopatria ...");
const civ = ingestCliopatria();
const geoms = simplifyGeometry(civ.features);
const excluded = new Set(curated.filter((c) => c.exclude).map((c) => c.id));

for (const d of civ.entities) {
  if (excluded.has(d.id)) continue;
  const wd = d.wikidata ? wdDescriptions[d.wikidata] : undefined;
  if (wd) descriptionFromWikidata.add(d.id);
  entities.set(d.id, {
    id: d.id,
    name: d.name,
    category: "civilization",
    start_year: d.start_year,
    end_year: d.end_year,
    description: wd ? wd[0].toUpperCase() + wd.slice(1) + "." : "A polity recorded in the Cliopatria historical-geography database.",
    wikidata: d.wikidata,
    wikipedia_url: d.wikipedia_phrase ? wikipediaUrl(d.wikipedia_phrase) : undefined,
    source_ids: ["cliopatria"],
  });
}
let droppedGeom = 0;
for (const f of civ.features) {
  if (!entities.has(f.props.entity_id)) continue;
  const geometry = geoms.get(f.props.id);
  if (!geometry) droppedGeom++; // simplification collapsed it entirely
  else features.push({ props: f.props, geometry });
}
if (droppedGeom) console.warn(`! ${droppedGeom} civilization rows lost all geometry in simplification`);

// Curated entries: overlay on auto-created civs, define the rest.
for (const c of curated) {
  if (c.exclude) continue;
  const { match_children: _m, candidate_keywords: _k, exclude: _e, ...fields } = c;
  const existing = entities.get(c.id);
  if (c.group) {
    if (existing) fail(`group ${c.id} collides with a Cliopatria entity id`);
    entities.set(c.id, {
      category: "civilization",
      start_year: 0,
      end_year: 0,
      description: "",
      source_ids: [],
      name: c.name ?? c.id,
      ...fields,
      group: true,
    } as Entity);
  } else if (existing) {
    Object.assign(existing, fields);
    descriptionFromWikidata.delete(c.id);
  } else if (c.category === "civilization") {
    console.warn(`! entities.yaml: ${c.id} overrides no Cliopatria entity (typo, or no longer present)`);
  } else {
    entities.set(c.id, { source_ids: [], ...fields } as Entity);
  }
}

// ---------- hierarchy ----------
const groups = curated.filter((c) => c.group && !c.exclude);
for (const g of groups) {
  const rules = g.match_children ?? {};
  const regex = rules.cliopatria_name_regex ? new RegExp(rules.cliopatria_name_regex) : undefined;
  const names = new Set(rules.names ?? []);
  const wd = new Set(rules.wikidata ?? []);
  const members = new Set(rules.cliopatria_member_of ?? []);
  for (const d of civ.entities) {
    const e = entities.get(d.id);
    if (!e || e.group) continue;
    const hit =
      names.has(d.name) ||
      (regex?.test(d.name) ?? false) ||
      (d.wikidata !== undefined && wd.has(d.wikidata)) ||
      d.member_of.some((m) => members.has(m));
    if (!hit) continue;
    if (e.parent_id && e.parent_id !== g.id) fail(`${d.name} matches both ${e.parent_id} and ${g.id}`);
    e.parent_id = g.id;
  }
  for (const n of names)
    if (!civ.entities.some((d) => d.name === n)) console.warn(`! group ${g.id}: no Cliopatria polity named "${n}"`);
}
// Group spans are derived from children unless set explicitly in the yaml.
const children = new Map<string, Entity[]>();
for (const e of entities.values())
  if (e.parent_id) (children.get(e.parent_id) ?? children.set(e.parent_id, []).get(e.parent_id)!).push(e);
for (const g of groups) {
  const e = entities.get(g.id)!;
  const kids = children.get(g.id) ?? [];
  if (kids.length === 0) console.warn(`! group ${g.id} has no children`);
  if (g.start_year === undefined && kids.length) e.start_year = Math.min(...kids.map((k) => k.start_year));
  if (g.end_year === undefined && kids.length) e.end_year = Math.max(...kids.map((k) => k.end_year));
  e.source_ids = [...new Set(kids.flatMap((k) => k.source_ids))];
}

// ---------- colours ----------
const rootOf = (e: Entity): string => (e.parent_id ? rootOf(entities.get(e.parent_id)!) : e.id);
const featuresOf = new Map<string, OutFeature[]>();
for (const f of features) (featuresOf.get(f.props.entity_id) ?? featuresOf.set(f.props.entity_id, []).get(f.props.entity_id)!).push(f);
for (const e of entities.values()) {
  if (e.category !== "civilization") continue;
  const { color, line_color } = civColors(rootOf(e), e.id);
  e.color = color;
  for (const f of featuresOf.get(e.id) ?? []) Object.assign(f.props, { color, line_color });
}

// ---------- spans ----------
// Species/culture spans must cover every site window (bulk sources can extend what the curated rows give).
for (const f of features) {
  const e = entities.get(f.props.entity_id);
  if (!e || e.category === "civilization") continue;
  e.start_year = Math.min(e.start_year, f.props.start_year);
  e.end_year = Math.max(e.end_year, f.props.end_year);
}

// ---------- source ids ----------
// Species/culture sources come only from their sites (entities.yaml's source_ids would go stale as rows are sourced).
for (const e of entities.values()) if (e.category !== "civilization" && !e.group) e.source_ids = [];
for (const f of features) {
  const e = entities.get(f.props.entity_id);
  if (!e) fail(`feature ${f.props.id}: unknown entity ${f.props.entity_id}`);
  else if (!e.source_ids.includes(f.props.source_id)) e.source_ids.push(f.props.source_id);
}
for (const id of descriptionFromWikidata) entities.get(id)!.source_ids.push("wikidata");
const usedSources = new Set([...entities.values()].flatMap((e) => e.source_ids));
for (const f of features) usedSources.add(f.props.source_id);
for (const id of usedSources) if (!sources.has(id)) fail(`unknown source id "${id}" (add it to sources.yaml)`);

// ---------- write ----------
mkdirSync(OUT, { recursive: true });
const order = (c: Category) => CATEGORIES.indexOf(c);
features.sort(
  (a, b) => order(a.props.category) - order(b.props.category) || a.props.start_year - b.props.start_year || a.props.id.localeCompare(b.props.id),
);
const entityList = [...entities.values()].sort(
  (a, b) => order(a.category) - order(b.category) || a.start_year - b.start_year || a.id.localeCompare(b.id),
);
const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

writeFileSync(`${OUT}/entities.json`, "[\n" + entityList.map((e) => JSON.stringify(clean(e))).join(",\n") + "\n]\n");
writeFileSync(
  `${OUT}/features.geojson`,
  '{"type":"FeatureCollection","features":[\n' +
    features.map((f) => JSON.stringify({ type: "Feature", properties: f.props, geometry: f.geometry })).join(",\n") +
    "\n]}\n",
);
writeFileSync(`${META_PATH}`, JSON.stringify({ inputs_hash: fingerprint().hash }) + "\n");
writeFileSync(`${OUT}/sources.json`, JSON.stringify([...usedSources].sort().map((id) => sources.get(id)), null, 1) + "\n");

// ---------- report ----------
const kb = (p: string) => (statSync(p).size / 1024).toFixed(0) + " KB";
const civBytes = features.filter((f) => f.props.category === "civilization").reduce((n, f) => n + JSON.stringify(f).length, 0);
console.log(`\nWrote ${OUT}/ (entities.json ${kb(`${OUT}/entities.json`)}, features.geojson ${kb(`${OUT}/features.geojson`)}, sources.json)`);
for (const c of CATEGORIES)
  console.log(
    `  ${c}: ${entityList.filter((e) => e.category === c && !e.group).length} entities, ${features.filter((f) => f.props.category === c).length} features`,
  );
console.log(`  groups: ${entityList.filter((e) => e.group).map((g) => `${g.id} (${children.get(g.id)?.length ?? 0})`).join(", ")}`);
console.log(`  civilization geometry: ${(civBytes / 1e6).toFixed(2)} MB`);
if (civBytes > CIV_BUDGET_BYTES) console.warn(`! civilization data exceeds ${CIV_BUDGET_BYTES / 1e6} MB budget: lower SIMPLIFY_PERCENT`);
console.log(`  Cliopatria rows imported ${civ.stats.rows}; skipped ${civ.stats.composites} composite, ${civ.stats.relations} RELATION, ${civ.stats.late} after 1 CE`);

// Candidate names for curation: polities that look like they belong to a group but were not matched.
for (const g of groups.filter((c) => c.candidate_keywords)) {
  const kws = g.candidate_keywords!.map((k) => k.toLowerCase());
  const loose = civ.entities.filter((d) => {
    const e = entities.get(d.id);
    return e && !e.parent_id && kws.some((k) => d.name.toLowerCase().includes(k));
  });
  if (loose.length) console.log(`  unmatched candidates for ${g.id}: ${loose.map((d) => d.name).join(", ")}`);
}
