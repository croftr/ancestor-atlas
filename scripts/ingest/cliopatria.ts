// Cliopatria (Seshat Global History Databank), CC BY 4.0: raw geojson -> normalised civilization features.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FeatureProps } from "../../src/types.ts";
import { formatYear, MAX_YEAR } from "../../src/time/scale.ts";

export const RAW_FILE = "data/raw/cliopatria/cliopatria.geojson";
const BUILD_DIR = "data/build";

/** mapshaper Douglas-Peucker retention. Tuned so civilizations stay under ~3 MB. */
export const SIMPLIFY_PERCENT = process.env.SIMPLIFY_PERCENT ?? "30%";
/** Coordinate precision in degrees (~1 km). */
export const COORD_PRECISION = 0.01;

export interface CliopatriaProps {
  Name: string;
  FromYear: number;
  ToYear: number;
  Area: number;
  Type: "POLITY" | "RELATION";
  Wikipedia: string;
  Wikidata: string;
  SeshatID: string;
  Components: string;
  MemberOf: string;
}
interface RawFeature {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties: CliopatriaProps;
}

/**
 * Year convention: Cliopatria contains a year 0 and its rows are contiguous across it
 * (e.g. Roman Empire ... (-14..0), (1..5)), so its numbering is already astronomical
 * (0 = 1 BCE) and needs no conversion. The data_plan assumed historical numbering
 * (no year 0); the data disproves that. See cliopatria.test.ts.
 */
export const fromCliopatriaYear = (y: number) => y;

/**
 * Composite rows ("(Warring States China)", "(Macedonian Empire)", ...) are unions of
 * their components, which are also present as rows. Drawing both would double-paint
 * the map, so composites are not imported (their members are grouped via `MemberOf`).
 */
export const isComposite = (p: CliopatriaProps) => p.Name.startsWith("(");

/** Rows that D2 says to import: POLITY rows that exist at or before 1 CE. */
export const isImported = (p: CliopatriaProps) =>
  p.Type === "POLITY" && fromCliopatriaYear(p.FromYear) <= MAX_YEAR && !isComposite(p);

function readRaw(): RawFeature[] {
  if (!existsSync(RAW_FILE)) throw new Error(`${RAW_FILE} not found. Run: npm run data:fetch`);
  return (JSON.parse(readFileSync(RAW_FILE, "utf8")) as { features: RawFeature[] }).features;
}

export function readCliopatriaRows(): CliopatriaProps[] {
  return readRaw().map((f) => f.properties).filter(isImported);
}

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Auto-created registry data for one Cliopatria `Name`; the build merges curated overrides on top. */
export interface CivEntityDraft {
  id: string;
  name: string;
  wikidata?: string;
  wikipedia_phrase?: string; // from the earliest row
  start_year: number;
  end_year: number;
  member_of: string[]; // Cliopatria composite names this polity belongs to
}

export interface CliopatriaIngest {
  entities: CivEntityDraft[];
  features: { props: FeatureProps; geometry: RawFeature["geometry"] }[];
  stats: { rows: number; composites: number; relations: number; late: number };
}

export function ingestCliopatria(): CliopatriaIngest {
  const raw = readRaw();
  const stats = { rows: 0, composites: 0, relations: 0, late: 0 };
  const byName = new Map<string, RawFeature[]>();
  for (const f of raw) {
    const p = f.properties;
    if (p.Type !== "POLITY") stats.relations++;
    else if (fromCliopatriaYear(p.FromYear) > MAX_YEAR) stats.late++;
    else if (isComposite(p)) stats.composites++;
    else {
      stats.rows++;
      (byName.get(p.Name) ?? byName.set(p.Name, []).get(p.Name)!).push(f);
    }
  }

  // Stable entity ids: slug of Name; on collision ("Han" vs "Hán") the later name gets its Wikidata id.
  const names = [...byName.keys()].sort();
  const idOf = new Map<string, string>();
  const used = new Set<string>();
  for (const name of names) {
    let id = slugify(name);
    if (used.has(id)) id = `${id}-${(byName.get(name)![0].properties.Wikidata || "2").toLowerCase()}`;
    if (used.has(id)) throw new Error(`Cannot derive a unique id for ${name}`);
    used.add(id);
    idOf.set(name, id);
  }

  const entities: CivEntityDraft[] = [];
  const features: CliopatriaIngest["features"] = [];
  for (const name of names) {
    const entityId = idOf.get(name)!;
    const rows = byName.get(name)!.sort((a, b) => a.properties.FromYear - b.properties.FromYear);
    const first = rows[0].properties;
    const memberOf = new Set<string>();
    let end = -Infinity;
    for (const f of rows) {
      const p = f.properties;
      const start = fromCliopatriaYear(p.FromYear);
      const origEnd = fromCliopatriaYear(p.ToYear);
      const clipped = Math.min(origEnd, MAX_YEAR);
      end = Math.max(end, clipped);
      if (p.MemberOf) memberOf.add(p.MemberOf);
      const props: FeatureProps = {
        id: `${entityId}@${p.FromYear}`,
        entity_id: entityId,
        category: "civilization",
        start_year: start,
        end_year: clipped,
        label: name,
        date_text: `${formatYear(start)} – ${formatYear(origEnd)}`,
        source_id: "cliopatria",
        source_ref: `cliopatria:${name}:${p.FromYear}`,
      };
      if (p.Wikipedia && p.Wikipedia !== first.Wikipedia) props.wikipedia_phrase = p.Wikipedia;
      features.push({ props, geometry: f.geometry });
    }
    entities.push({
      id: entityId,
      name,
      wikidata: first.Wikidata || undefined,
      wikipedia_phrase: first.Wikipedia || undefined,
      start_year: fromCliopatriaYear(first.FromYear),
      end_year: end,
      member_of: [...memberOf].sort(),
    });
  }

  const ids = new Set<string>();
  for (const f of features) {
    if (ids.has(f.props.id)) throw new Error(`Duplicate feature id ${f.props.id}`);
    ids.add(f.props.id);
  }
  return { entities, features, stats };
}

/** Topology-aware simplification via mapshaper. Returns geometry keyed by feature id. */
export function simplifyGeometry(features: CliopatriaIngest["features"]): Map<string, RawFeature["geometry"]> {
  mkdirSync(BUILD_DIR, { recursive: true });
  const inFile = `${BUILD_DIR}/cliopatria.filtered.geojson`;
  const outFile = `${BUILD_DIR}/cliopatria.simplified.geojson`;
  const fc = {
    type: "FeatureCollection",
    features: features.map((f) => ({ type: "Feature", properties: { id: f.props.id }, geometry: f.geometry })),
  };
  writeFileSync(inFile, JSON.stringify(fc));
  // No -clean: all time slices share one layer, so "fixing" overlaps would destroy real data.
  execFileSync(
    "node_modules/.bin/mapshaper",
    [inFile, "-simplify", "dp", SIMPLIFY_PERCENT, "keep-shapes", "-o", outFile, `precision=${COORD_PRECISION}`, "format=geojson"],
    { stdio: ["ignore", "ignore", "inherit"], maxBuffer: 1 << 28 },
  );
  const out = JSON.parse(readFileSync(outFile, "utf8")) as { features: { properties: { id: string }; geometry: RawFeature["geometry"] }[] };
  const geoms = new Map<string, RawFeature["geometry"]>();
  for (const f of out.features) {
    if (f.geometry) geoms.set(f.properties.id, f.geometry);
  }
  return geoms;
}
