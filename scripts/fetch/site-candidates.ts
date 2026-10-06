// For every curated site row without coord evidence, find Wikidata candidates by name and by location,
// and write data/build/site-candidates.csv (top 3 per row) for review.
// Accept a match by writing its QID into the row's `wikidata` column, then run `npm run sites:sync`.
// Usage: npm run sites:candidates [-- --entity homo-erectus]   (sandbox: NODE_USE_ENV_PROXY=1)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse as parseCsv } from "csv-parse/sync";
import { api, getItems, getLabels, sparql } from "../lib/wikidata.ts";
import { distanceKm } from "../lib/qa.ts";
import { nameVariants, scoreCandidate, type Candidate } from "../lib/match.ts";

const GEO_RADIUS_KM = 25;
const onlyEntity = process.argv.includes("--entity") ? process.argv[process.argv.indexOf("--entity") + 1] : undefined;

type Row = Record<string, any>;
const rows: Row[] = [];
for (const file of ["species-sites.csv", "culture-sites.csv"]) {
  const recs = parseCsv(readFileSync(`data/curated/${file}`, "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  recs.forEach((r, i) => rows.push({ ...r, file, line: i + 2 }));
}
const todo = rows.filter((r) => !r.coord_source && (!onlyEntity || r.entity_id === onlyEntity));
console.log(`Looking up ${todo.length} sites ...`);

const out: string[] = [
  "file,line,entity_id,site,rec_lat,rec_lon,rank,score,qid,wd_label,wd_description,types,wd_lat,wd_lon,distance_km,enwiki,found_by",
];
const q = (v: unknown) => (v === undefined ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
let n = 0, noneFound = 0;

for (const r of todo) {
  const lat = Number(r.lat), lon = Number(r.lon);
  const byName = new Set<string>();
  for (const v of nameVariants(r.label)) {
    const j = await api({ action: "wbsearchentities", search: v, language: "en", type: "item", limit: "10" });
    for (const s of j.search ?? []) byName.add(s.id);
  }
  const geo = await sparql(`SELECT ?item ?dist WHERE {
    SERVICE wikibase:around { ?item wdt:P625 ?c . bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral .
      bd:serviceParam wikibase:radius "${GEO_RADIUS_KM}" . bd:serviceParam wikibase:distance ?dist . }
  } ORDER BY ?dist LIMIT 60`);
  const byGeo = new Set(geo.results.bindings.map((b) => b.item.value.split("/").pop()!));

  const items = await getItems([...new Set([...byName, ...byGeo])]);
  const typeLabels = await getLabels([...new Set([...items.values()].flatMap((i) => i.types))]);
  const cands: (Candidate & { score: number; lat?: number; lon?: number })[] = [];
  for (const it of items.values()) {
    const c: Candidate = {
      qid: it.id,
      label: it.label,
      description: it.description,
      typeLabels: it.types.map((t) => typeLabels.get(t) ?? t),
      distanceKm: it.coord ? distanceKm(lat, lon, it.coord.lat, it.coord.lon) : undefined,
      enwiki: it.enwiki,
      byName: byName.has(it.id),
      byGeo: byGeo.has(it.id),
    };
    // Geo-only hits are mostly unrelated neighbours; keep them only if they look like a site.
    const score = scoreCandidate(c, r.label);
    if (!c.byName && score < 4) continue;
    cands.push({ ...c, score, lat: it.coord?.lat, lon: it.coord?.lon });
  }
  cands.sort((a, b) => b.score - a.score || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  if (!cands.length) noneFound++;
  const top = cands.slice(0, 3);
  if (!top.length) out.push([r.file, r.line, r.entity_id, r.label, r.lat, r.lon, 0].map(q).join(","));
  top.forEach((c, i) =>
    out.push(
      [r.file, r.line, r.entity_id, r.label, r.lat, r.lon, i + 1, c.score, c.qid, c.label, c.description, c.typeLabels.join("; "),
        c.lat, c.lon, c.distanceKm?.toFixed(1), c.enwiki, [c.byName && "name", c.byGeo && "geo"].filter(Boolean).join("+")]
        .map(q).join(","),
    ),
  );
  if (++n % 10 === 0) console.log(`  ${n}/${todo.length}`);
}

mkdirSync("data/build", { recursive: true });
writeFileSync("data/build/site-candidates.csv", out.join("\n") + "\n");
console.log(`Wrote data/build/site-candidates.csv (${todo.length} sites, ${noneFound} with no candidate)`);
