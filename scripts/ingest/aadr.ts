// Allen Ancient DNA Resource (AADR, CC0; https://doi.org/10.7910/DVN/FFIDCW) -> public/data/dna.json, the ancient DNA
// layer. Reads the local annotation table fetched by scripts/fetch/aadr.ts (`npm run data:dna` runs both).
// Rules:
// - Individuals dated before 1 CE (mean date) with coordinates, whose AADR assessment is Pass or MERGE_PASS (not
//   PROVISIONAL_PASS). One row per individual (AADR lists some several times, one per data type): the row with the
//   most SNPs hit wins.
// - Date range: AADR's mean ± 2 SD for direct dates; for contextual dates (AADR's SD is that of a uniform range)
//   the full range, mean ± √3 SD. At least ± 50 years.
// - Individuals at the same coordinates form a site; sites within 1 km are merged (named after the commonest locality).
// - Culture links: an AADR group label ("Germany_EBA_Unetice") links to a culture when exactly one of its "_"-parts
//   is an `aadr` label in culture-labels.csv, after AADR's suffixes ("-o…" outlier, "-1" cluster, "-Dup") are taken
//   off. A link is dropped (the person stays) when their date range misses the culture's span by over 500 years.
// Outside data:build and its fingerprint (like the paleo layer); rerun after a new release or label change, and commit
// public/data/dna.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type { DnaCultureCounts, DnaData, DnaPerson, DnaSite } from "../../src/dna/types.ts";
import { distanceKm } from "../lib/qa.ts";
import { AADR_FILE, AADR_RELEASE } from "../fetch/pins.ts";

const ANNO = AADR_FILE;
const RELEASE = AADR_RELEASE;
const OUT = "public/data/dna.json";
const OUT_CULTURES = "public/data/dna-cultures.json";
const LABELS = "data/curated/culture-labels.csv";
const ENTITIES = "public/data/entities.json";
// AADR's PROVISIONAL_PASS is left out: provisionally accepted, without a reason given (when unsure, leave it out).
const PASS = /^(pass|merge_pass)$/i;
const MERGE_KM = 1;
const CULTURE_MARGIN = 500;

/** Column indexes, found by the start of each header (AADR's headers are long and change wording between releases). */
const COLUMNS = {
  individual: "Individual ID",
  pub: "Publication abbreviation",
  doi: "doi for publication",
  method: '"Method for Determining Date',
  meanBP: '"Date mean in BP',
  sd: '"Date standard deviation',
  fullDate: "Full Date",
  group: "Group ID",
  locality: "Locality",
  country: "Political Entity",
  lat: "Latitude",
  lon: "Longitude",
  snps: "SNPs hit on autosomal targets (Computed using easystats on 1240k",
  sex: "Molecular Sex",
  yAuto: "Y haplogroup  in ISOGG",
  yManual: "Y haplogroup manually called",
  mt: "mtDNA haplogroup if",
  assessment: "ASSESSMENT",
} as const;
type Col = keyof typeof COLUMNS;

export function columnIndexes(header: string[]): Record<Col, number> {
  const out = {} as Record<Col, number>;
  for (const [k, prefix] of Object.entries(COLUMNS) as [Col, string][]) {
    const i = header.findIndex((h) => h.trim() === prefix || h.startsWith(prefix));
    if (i < 0) throw new Error(`AADR: no column starting "${prefix}"`);
    out[k] = i;
  }
  return out;
}

/** 95% range in astronomical years from AADR's mean (BP) and SD. */
export function dateRange(meanBP: number, sd: number, contextual: boolean): [number, number] {
  const half = Math.max(50, contextual ? Math.sqrt(3) * sd : 2 * sd);
  const mid = 1950 - meanBP;
  return [Math.round(mid - half), Math.round(mid + half)];
}

/** A haplogroup cell, or "" for AADR's not-called markers ("..", "n/a (female)", "n/a (<2x)"). */
export const haplo = (s: string | undefined) => {
  const v = (s ?? "").trim();
  return !v || v === ".." || /^n\/a/i.test(v) ? "" : v;
};

/** The culture a group label links to: exactly one of its parts is a known label (suffixes off), else "". */
export function cultureOf(group: string, labels: Map<string, string>): string {
  const hits = new Set(
    group.split("_").map((p) => labels.get(p.replace(/-(o.*|\d+|Dup)$/, ""))).filter((x): x is string => !!x),
  );
  return hits.size === 1 ? [...hits][0] : "";
}

/** "MathiesonReichNature2018" -> "Mathieson Reich Nature 2018". */
export const pubLabel = (abbr: string) =>
  abbr.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Za-z])(\d{4}[a-z]?)$/, "$1 $2");

const unquote = (s: string) => s.trim().replace(/^"(.*)"$/, "$1").trim();

interface Row { person: DnaPerson; lat: number; lon: number; locality: string; country: string; snps: number; pubLabel: string; doi: string }

/** Group people at the same coordinates, then merge groups within MERGE_KM (largest first). */
export function clusterSites<T extends { lat: number; lon: number }>(rows: T[]): T[][] {
  const exact = new Map<string, T[]>();
  for (const r of rows) {
    const k = `${r.lat.toFixed(4)},${r.lon.toFixed(4)}`;
    (exact.get(k) ?? exact.set(k, []).get(k)!).push(r);
  }
  const clusters: { lat: number; lon: number; rows: T[] }[] = [];
  for (const g of [...exact.values()].sort((a, b) => b.length - a.length)) {
    const near = clusters.find((c) => distanceKm(c.lat, c.lon, g[0].lat, g[0].lon) < MERGE_KM);
    if (near) near.rows.push(...g);
    else clusters.push({ lat: g[0].lat, lon: g[0].lon, rows: [...g] });
  }
  return clusters.map((c) => c.rows);
}

function main() {
  if (!existsSync(ANNO)) {
    console.error(`✗ ${ANNO} missing: run npm run data:dna`);
    process.exit(1);
  }
  const lines = readFileSync(ANNO, "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("\t"));
  const col = columnIndexes(lines[0]);

  const labels = new Map<string, string>();
  for (const r of parse(readFileSync(LABELS, "utf8"), { columns: true }) as Record<string, string>[])
    if (r.source === "aadr") labels.set(r.label, r.entity_id);
  const spans = new Map<string, [number, number]>(
    (JSON.parse(readFileSync(ENTITIES, "utf8")) as { id: string; category: string; start_year: number; end_year: number }[])
      .filter((e) => e.category === "culture")
      .map((e) => [e.id, [e.start_year, e.end_year]]),
  );
  for (const [label, id] of labels) if (!spans.has(id)) throw new Error(`culture-labels.csv: aadr label ${label} maps to unknown culture ${id}`);

  const stats = { rows: lines.length - 1, recent: 0, failed: 0, noCoords: 0, duplicates: 0, linked: 0, linkOutOfSpan: 0 };
  const best = new Map<string, Row>();
  for (const r of lines.slice(1)) {
    const meanBP = Number(r[col.meanBP]);
    if (!(meanBP >= 1949) || /^modern/i.test(r[col.method])) { stats.recent++; continue; }
    if (!PASS.test(r[col.assessment].trim())) { stats.failed++; continue; }
    const lat = Number(r[col.lat]), lon = Number(r[col.lon]);
    if (!r[col.lat].trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90) { stats.noCoords++; continue; }
    const id = r[col.individual].trim();
    const [start, end] = dateRange(meanBP, Number(r[col.sd]) || 0, /^context/i.test(r[col.method]));
    const group = r[col.group].trim();
    let culture = cultureOf(group, labels);
    if (culture) {
      const [cs, ce] = spans.get(culture)!;
      if (end < cs - CULTURE_MARGIN || start > ce + CULTURE_MARGIN) { stats.linkOutOfSpan++; culture = ""; }
    }
    const sex = r[col.sex].trim().charAt(0) || "U";
    const y = haplo(r[col.yManual]) || haplo(r[col.yAuto]);
    const row: Row = {
      person: [id, start, end, unquote(r[col.fullDate]), sex, sex === "M" ? y : "", haplo(r[col.mt]), group, -1, culture],
      lat, lon,
      locality: unquote(r[col.locality]),
      country: r[col.country].trim(),
      snps: Number(r[col.snps]) || 0,
      pubLabel: pubLabel(r[col.pub].trim()),
      doi: /^https?:\/\//.test(r[col.doi].trim()) ? r[col.doi].trim() : "",
    };
    const prev = best.get(id);
    if (prev) stats.duplicates++;
    if (!prev || row.snps > prev.snps) best.set(id, row);
  }

  const pubs: DnaData["pubs"] = [];
  const pubIndex = new Map<string, number>();
  const sites: DnaSite[] = [];
  for (const rows of clusterSites([...best.values()])) {
    const names = new Map<string, number>();
    for (const r of rows) names.set(r.locality, (names.get(r.locality) ?? 0) + 1);
    const locality = [...names].sort((a, b) => b[1] - a[1])[0][0];
    const name = locality.replace(/\s*\(.*$/, "").trim() || locality;
    const place = name !== locality ? locality.slice(locality.indexOf("(") + 1).replace(/\)\s*$/, "").trim() : "";
    const people = rows.map((r) => {
      const key = `${r.pubLabel}|${r.doi}`;
      if (!pubIndex.has(key)) pubIndex.set(key, pubs.push([r.pubLabel, r.doi]) - 1);
      r.person[8] = pubIndex.get(key)!;
      if (r.person[9]) stats.linked++;
      return r.person;
    }).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
    const { lat, lon } = rows[0];
    sites.push({
      id: `dna:${lat.toFixed(3)},${lon.toFixed(3)}`,
      name, ...(place && { place }), country: rows[0].country, lat, lon,
      start: Math.min(...people.map((p) => p[1])),
      end: Math.max(...people.map((p) => p[2])),
      people,
    });
  }
  sites.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  const ids = new Set<string>();
  for (const s of sites) {
    if (ids.has(s.id)) throw new Error(`AADR: two sites share id ${s.id}`);
    ids.add(s.id);
  }

  const data: DnaData = { release: RELEASE, pubs, sites };
  writeFileSync(OUT, JSON.stringify(data) + "\n");
  // How many genomes and sites each culture has: small, so culture cards can say so without loading dna.json.
  const perCulture: DnaCultureCounts = {};
  for (const s of sites) {
    const here = new Set<string>();
    for (const p of s.people) if (p[9]) (here.add(p[9]), ((perCulture[p[9]] ??= [0, 0])[0] += 1));
    for (const c of here) perCulture[c][1] += 1;
  }
  writeFileSync(OUT_CULTURES, JSON.stringify(Object.fromEntries(Object.entries(perCulture).sort())) + "\n");
  console.log(
    `AADR ${RELEASE}: ${stats.rows} rows; ${stats.recent} after 1 CE or present-day, ${stats.failed} not passing, ${stats.noCoords} without coordinates, ` +
      `${stats.duplicates} extra rows for the same person -> ${best.size} people at ${sites.length} sites, ${pubs.length} publications; ` +
      `${stats.linked} linked to a culture (${stats.linkOutOfSpan} links dropped: date outside the culture's span ± ${CULTURE_MARGIN} years)`,
  );
  console.log(`Wrote ${OUT} (${(readFileSync(OUT).length / 1e6).toFixed(2)} MB)`);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/ingest/aadr.ts")) main();
