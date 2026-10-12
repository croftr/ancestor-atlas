// ROAD (ROCEEH Out of Africa Database, CC BY-SA 4.0) -> hominin fossil site points.
// Two steps, because the raw export lives on only one machine (like XRONOS on another):
//   1. `npm run data:ingest:road` reads the hand-made export in data/raw/road/ (scripts/fetch/road.R) and writes
//      data/curated/road/sites.csv, one row per species and ROAD locality. That file is generated (never edit it by
//      hand) and committed, so every machine builds the same points.
//   2. `npm run data:build` turns sites.csv into features (roadFeatures); a ROAD point within 2 km of a curated or
//      XRONOS point of the same species is skipped there.
// Taxa map to species only through data/curated/road/species-labels.csv (explicit list; "cf.", "aff.", "sp." and
// "X or Y" identifications are not listed and so not imported). ROAD gives each assemblage a bracketing age range,
// often wide; a site's window is clipped to the species' span in entities.yaml, so ROAD never stretches a species,
// and a site that does not overlap that span at all is dropped for review (data/build/road-dropped.csv).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parse } from "csv-parse/sync";
import { parse as parseYaml } from "yaml";
import { iso1A2Code } from "@rapideditor/country-coder";
import type { FeatureProps } from "../../src/types.ts";
import { minWindow } from "../lib/dates.ts";
import { countryCodes, outsideCodes } from "../lib/countries.ts";
import { STEPS, segmentOfBce } from "../../src/time/scale.ts";

export const ROAD_RAW = "data/raw/road";
export const ROAD_SITES = "data/curated/road/sites.csv";
const LABELS = "data/curated/road/species-labels.csv";

// ROAD country names that country-coder does not resolve by name.
const COUNTRY_NAMES: Record<string, string[]> = {
  "Korea, North": ["KP"], "Korea, South": ["KR"], "Czech Republic": ["CZ", "SK"], "West Bank": ["PS", "IL"],
  Ukraine: ["UA", "RU"], Russia: ["RU", "UA"], China: ["CN", "TW"], // Crimea; Taiwan
  Israel: ["IL", "PS"], Jersey: ["JE", "GB"], "United Kingdom": ["GB", "IM", "GG", "JE"],
};
const codesFor = (name: string) => COUNTRY_NAMES[name] ?? countryCodes(name) ?? (iso1A2Code(name) ? [iso1A2Code(name)!] : undefined);

// ROAD's human_remains_category letters.
const PART: Record<string, string> = { C: "cranial", D: "dental", P: "postcranial", E: "endocast", I: "indirect" };

export interface RoadSite {
  entity_id: string; label: string; lat: number; lon: number; start_year: number; end_year: number; date_text: string;
  confidence: "high" | "medium" | "low"; finds: number; source_ref: string; coord_source: string; date_source: string;
  notes?: string; refs?: string; cultures?: string;
}
export const SITE_COLUMNS = ["entity_id", "label", "lat", "lon", "start_year", "end_year", "date_text", "confidence", "finds",
  "source_ref", "coord_source", "date_source", "notes", "refs", "cultures"] as const;

type Row = Record<string, string>;
const read = (f: string) => parse(readFileSync(f, "utf8"), { columns: true, relax_quotes: true }) as Row[];
const split = (s: string) => s.split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);

/** "1.8 Ma", "437 ka", "52 ka": an age in years before present, as the app writes them. */
export function formatAge(years: number): string {
  if (years >= 1e6) return `${(years / 1e6).toFixed(2).replace(/\.?0+$/, "")} Ma`;
  if (years >= 1e4) return `${Math.round(years / 1e3).toLocaleString("en")} ka`;
  return `${(years / 1e3).toFixed(1).replace(/\.0$/, "")} ka`;
}
export const formatRange = (oldest: number, youngest: number) => {
  if (oldest === youngest) return `c. ${formatAge(oldest)}`;
  const [a, b] = [formatAge(oldest), formatAge(youngest)];
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
};

/**
 * Slider window for a ROAD age bracket (years BP, oldest first) inside the species span (astronomical years).
 * Undefined when the bracket misses the span. Widened like other sites so it does not flash past on the slider,
 * but never past the span.
 */
export function siteWindow(oldest: number, youngest: number, span: [number, number]): { start: number; end: number; clipped: boolean } | undefined {
  const a0 = 1950 - oldest, b0 = 1950 - youngest;
  const [lo, hi] = span;
  const a = Math.max(a0, lo), b = Math.min(b0, hi);
  if (a > b) return undefined;
  let [start, end] = minWindow(a, b, 2 * STEPS[segmentOfBce(1 - (a + b) / 2)]);
  if (start < lo) [start, end] = [lo, Math.min(hi, lo + (end - start))];
  if (end > hi) [start, end] = [Math.max(lo, hi - (end - start)), hi];
  return { start, end, clipped: a !== a0 || b !== b0 };
}

/** Readable ROAD technocomplex: "MP/ Mousterian - Eurasia" -> "Mousterian (Eurasia)". */
export const cultureName = (t: string) => {
  const s = t.replace(/^(?:[A-Z]+\/)*[A-Z]+\/?\s+(?=\S)/, "").trim(); // period prefix: "MSA/ ", "LP/MP "
  const m = s.match(/^(.*?)\s+-\s+(.+)$/);
  return (m ? `${m[1]} (${m[2]})` : s).replace(/\b(E|M|L)SA\b/g, (_, x: string) => `${STONE_AGE[x]} Stone Age`);
};
const STONE_AGE: Record<string, string> = { E: "Early", M: "Middle", L: "Later" };

// Publications as given on ROAD dates: "Author, A.  2005  Title +++ Other, B. 1995 Title". Flattened to one
// "; "-separated list (semicolons inside a title would split it, so they become commas).
const pubs = (s: string) => s.split("+++").map((p) => p.replace(/\s+/g, " ").replace(/;/g, ",").trim()).filter(Boolean);

export interface RoadIngest { sites: RoadSite[]; dropped: Row[]; unmapped: Map<string, number>; stats: Record<string, number> }

export function ingestRoad(raw = ROAD_RAW): RoadIngest {
  const labels = new Map<string, string>();
  for (const r of read(LABELS)) labels.set(`${r.genus.trim()}|${r.species.trim()}`, r.entity_id.trim());
  const spans = new Map<string, [number, number]>();
  for (const e of parseYaml(readFileSync("data/curated/entities.yaml", "utf8")) as { id: string; category?: string; start_year?: number; end_year?: number }[])
    if (e.category === "species" && e.start_year !== undefined && e.end_year !== undefined) spans.set(e.id, [e.start_year, e.end_year]);

  const localities = new Map(read(`${raw}/localities.csv`).map((l) => [l.locality_id, l]));
  // Cultures and dates are recorded per locality and geological layer.
  const layerKey = (loc: string, layer: string) => `${loc}\u0000${layer}`;
  const cultures = new Map<string, Set<string>>();
  for (const a of read(`${raw}/assemblages.csv`)) {
    // One field can hold several: "MP/ Mousterian - Eurasia, UP/ Aurignacian".
    const techs = (a.technocomplex ?? "").split(/,\s*(?=[A-Z]+(?:\/[A-Z]+)*\/)/).map((t) => t.trim()).filter(Boolean);
    for (const layer of techs.length ? split(a.geolayer) : []) {
      const k = layerKey(a.locality_id, layer);
      for (const t of techs) (cultures.get(k) ?? cultures.set(k, new Set()).get(k)!).add(t);
    }
  }
  const dates = new Map<string, Row[]>();
  for (const d of read(`${raw}/dates.csv`))
    for (const layer of split(d.geolayer)) {
      const k = layerKey(d.locality_id, layer);
      (dates.get(k) ?? dates.set(k, []).get(k)!).push(d);
    }

  const stats = { finds: 0, mapped: 0, ignored: 0, unmapped: 0, sites: 0, noAge: 0, outsideSpan: 0, coarse: 0, countryMismatch: 0 };
  const unmapped = new Map<string, number>();
  const groups = new Map<string, Row[]>(); // entity|locality -> finds
  for (const h of read(`${raw}/human-remains.csv`)) {
    stats.finds++;
    const key = `${h.genus.trim()}|${h.species.trim()}`;
    const entity = labels.get(key);
    if (entity === undefined) { stats.unmapped++; unmapped.set(key, (unmapped.get(key) ?? 0) + 1); continue; }
    if (!entity) { stats.ignored++; continue; }
    if (!spans.has(entity)) throw new Error(`${LABELS}: ${key} maps to unknown species ${entity}`);
    stats.mapped++;
    const g = `${entity}|${h.locality_id}`;
    (groups.get(g) ?? groups.set(g, []).get(g)!).push(h);
  }

  const sites: RoadSite[] = [];
  const dropped: Row[] = [];
  const drop = (reason: string, entity: string, h: Row, extra = "") => {
    dropped.push({ reason, entity_id: entity, locality: h.locality_id, country: h.country, lat: h.coord_y, lon: h.coord_x, detail: extra });
  };
  for (const [g, finds] of groups) {
    const entity = g.slice(0, g.indexOf("|"));
    const h = finds[0];
    const loc = localities.get(h.locality_id);
    const lat = Number(h.coord_y), lon = Number(h.coord_x);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) { stats.noAge++; drop("no coordinates", entity, h); continue; }
    if (Number.isInteger(lat) && Number.isInteger(lon)) { stats.coarse++; drop("whole-degree coordinates", entity, h); continue; }
    if (outsideCodes(codesFor(h.country), lat, lon)) { stats.countryMismatch++; drop("point outside its country", entity, h); continue; }

    // Age bracket: the finds' assemblages; failing that, the locality's.
    const ages = finds.filter((f) => f.age_min && f.age_max).map((f) => [Number(f.age_max), Number(f.age_min)]);
    let fromLocality = false;
    if (!ages.length && loc?.locality_age_min && loc.locality_age_max) {
      ages.push([Number(loc.locality_age_max), Number(loc.locality_age_min)]);
      fromLocality = true;
    }
    if (!ages.length) { stats.noAge++; drop("no age", entity, h); continue; }
    const oldest = Math.max(...ages.map((a) => a[0])), youngest = Math.min(...ages.map((a) => a[1]));
    const w = siteWindow(oldest, youngest, spans.get(entity)!);
    if (!w) { stats.outsideSpan++; drop("age outside the species span", entity, h, formatRange(oldest, youngest)); continue; }

    const layers = [...new Set(finds.flatMap((f) => split(f.geolayer)))];
    const layerDates = layers.flatMap((l) => dates.get(layerKey(h.locality_id, l)) ?? []);
    const uniqDates = [...new Map(layerDates.map((d) => [d.id, d])).values()];
    const methods = [...new Set(uniqDates.map((d) => d.dating_method.replace(/\s*dating$/i, "").replace(/\s*\(.*?\)/, "").trim()).filter(Boolean))];
    const cults = [...new Set(layers.flatMap((l) => [...(cultures.get(layerKey(h.locality_id, l)) ?? [])]))].map(cultureName);
    const parts = [...new Set(finds.flatMap((f) => split(f.human_remains_category).map((c) => PART[c]).filter(Boolean)))];
    const assemblages = [...new Set(finds.map((f) => f.assemblage_id))];

    // Confidence: a dated layer and a bracket narrow for its age, or at least one of the two.
    const mid = (oldest + youngest) / 2, width = oldest - youngest;
    const narrow = width <= 0.3 * mid, dated = uniqDates.length > 0;
    const confidence = fromLocality ? "low" : dated && narrow && !w.clipped ? "high" : dated || narrow ? "medium" : "low";
    const n = finds.length;
    const coordQuality = loc?.coordinate_source || "";
    sites.push({
      entity_id: entity, label: h.locality_id, lat, lon, start_year: w.start, end_year: w.end,
      date_text: `${formatRange(oldest, youngest)} (ROAD ${fromLocality ? "site" : "layer"} age${w.clipped ? ", shown within the species' range" : ""}` +
        `${dated ? `; ${uniqDates.length} date${uniqDates.length > 1 ? "s" : ""}: ${methods.join(", ")}` : ""}); ` +
        `${n} find${n > 1 ? "s" : ""}${parts.length ? ` (${parts.join(", ")})` : ""}`,
      confidence, finds: n,
      source_ref: `road:${h.locality_id}`,
      coord_source: `road:locality/${h.locality_id}`,
      date_source: `road:assemblage/${h.locality_id}#${assemblages.slice(0, 3).join(",")}${assemblages.length > 3 ? ",…" : ""}`,
      notes: coordQuality === "checked" || coordQuality === "gps" ? undefined
        : `ROAD marks these coordinates as ${coordQuality || "unchecked"}; the point may be approximate`,
      refs: [...new Set(uniqDates.flatMap((d) => pubs(d.publication)))].join("; ") || undefined,
      cultures: cults.join("; ") || undefined,
    });
  }
  sites.sort((a, b) => a.entity_id.localeCompare(b.entity_id) || a.label.localeCompare(b.label));
  stats.sites = sites.length;
  return { sites, dropped, unmapped, stats };
}

/** Reads the generated data/curated/road/sites.csv; undefined when it has not been generated yet. */
export function readRoadSites(path = ROAD_SITES): RoadSite[] | undefined {
  if (!existsSync(path)) return undefined;
  return (parse(readFileSync(path, "utf8"), { columns: true }) as Row[]).map((r) => ({
    ...r, lat: Number(r.lat), lon: Number(r.lon), start_year: Number(r.start_year), end_year: Number(r.end_year), finds: Number(r.finds),
    notes: r.notes || undefined, refs: r.refs || undefined, cultures: r.cultures || undefined,
  }) as RoadSite);
}

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** One Point feature per site. */
export function roadFeatures(sites: RoadSite[]): { props: FeatureProps; geometry: { type: string; coordinates: number[] } }[] {
  const maxN = Math.max(1, ...sites.map((s) => s.finds));
  const used = new Set<string>();
  return sites.map((s) => {
    let id = `${s.entity_id}@r:${slug(s.label) || "site"}`;
    for (let k = 2; used.has(id); k++) id = `${s.entity_id}@r:${slug(s.label)}-${k}`;
    used.add(id);
    const props: FeatureProps = {
      id, entity_id: s.entity_id, category: "species", start_year: s.start_year, end_year: s.end_year,
      label: s.label, date_text: s.date_text, confidence: s.confidence,
      weight: Math.round((Math.log(s.finds + 1) / Math.log(maxN + 1)) * 1000) / 1000,
      source_id: "road", source_ref: s.source_ref, coord_source: s.coord_source, date_source: s.date_source,
    };
    if (s.notes) props.notes = s.notes;
    if (s.refs) props.refs = s.refs;
    if (s.cultures) props.cultures = s.cultures;
    return { props, geometry: { type: "Point", coordinates: [s.lon, s.lat] } };
  });
}

// ---------- CLI: data/raw/road -> data/curated/road/sites.csv ----------
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (!existsSync(`${ROAD_RAW}/human-remains.csv`)) {
    console.error(`✗ ${ROAD_RAW}/human-remains.csv missing: run Rscript scripts/fetch/road.R first`);
    process.exit(1);
  }
  const { sites, dropped, unmapped, stats } = ingestRoad();
  const q = (x: unknown) => (x === undefined ? "" : /[",\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x));
  mkdirSync("data/curated/road", { recursive: true });
  writeFileSync(ROAD_SITES, [SITE_COLUMNS.join(","), ...sites.map((s) => SITE_COLUMNS.map((c) => q(s[c])).join(","))].join("\n") + "\n");
  mkdirSync("data/build", { recursive: true });
  const cols = ["reason", "entity_id", "locality", "country", "lat", "lon", "detail"];
  writeFileSync("data/build/road-dropped.csv", [cols.join(","), ...dropped.map((d) => cols.map((c) => q(d[c])).join(","))].join("\n") + "\n");
  console.log(`ROAD: ${stats.finds} finds, ${stats.mapped} mapped to a species, ${stats.ignored} of listed non-imported taxa, ${stats.unmapped} unlisted or uncertain` +
    ` -> ${stats.sites} sites (dropped: ${stats.outsideSpan} outside the species span, ${stats.noAge} without age or coordinates,` +
    ` ${stats.coarse} whole-degree, ${stats.countryMismatch} outside their country; see data/build/road-dropped.csv)`);
  const perEntity = new Map<string, number>();
  for (const s of sites) perEntity.set(s.entity_id, (perEntity.get(s.entity_id) ?? 0) + 1);
  console.log("  " + [...perEntity].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e} ${n}`).join(", "));
  console.log(`  unlisted taxa: ${[...unmapped].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.replace("|", " ").trim() || "(blank)"} (${n})`).join(", ")}`);
  console.log(`Wrote ${ROAD_SITES}`);
}
