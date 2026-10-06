// For each curated site row that has a `wikidata` QID but no `coord_source`, take the coordinates
// from the item's P625 and record where they came from. Dates are untouched.
// Usage: npm run sites:sync [-- --dry-run]   (sandbox: NODE_USE_ENV_PROXY=1)
import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseCsv } from "csv-parse/sync";
import { getItems } from "./lib/wikidata.ts";
import { distanceKm, QID } from "./lib/qa.ts";

const dry = process.argv.includes("--dry-run");
const q = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const round = (x: number) => String(Math.round(x * 1e5) / 1e5);

for (const file of ["species-sites.csv", "culture-sites.csv"]) {
  const path = `data/curated/${file}`;
  const text = readFileSync(path, "utf8");
  const header = text.slice(0, text.indexOf("\n")).split(",");
  const rows = parseCsv(text, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  // "keep-coords" in notes = the Wikidata point was checked and rejected (too coarse / wrong); don't re-apply it.
  const todo = rows.filter((r) => r.wikidata && !r.coord_source && !/keep-coords/.test(r.notes ?? ""));
  for (const r of todo) if (!QID.test(r.wikidata)) throw new Error(`${file}: ${r.label}: bad QID ${r.wikidata}`);
  const items = await getItems([...new Set(todo.map((r) => r.wikidata))]);
  let changed = 0;
  for (const r of todo) {
    const it = items.get(r.wikidata);
    if (!it?.coord) { console.warn(`! ${file}: ${r.label}: ${r.wikidata} has no P625; left as is`); continue; }
    const km = distanceKm(Number(r.lat), Number(r.lon), it.coord.lat, it.coord.lon);
    console.log(`  ${r.entity_id} / ${r.label}: ${r.wikidata} (${it.label}), moved ${km.toFixed(1)} km`);
    r.lat = round(it.coord.lat);
    r.lon = round(it.coord.lon);
    r.coord_source = `wikidata:${r.wikidata}#P625`;
    const note = `recalled coords were ${km.toFixed(1)} km off`;
    r.notes = r.notes ? `${r.notes}; ${note}` : note;
    changed++;
  }
  console.log(`${file}: ${changed} row(s) updated`);
  if (!dry && changed) writeFileSync(path, [header.join(","), ...rows.map((r) => header.map((h) => q(r[h] ?? "")).join(","))].join("\n") + "\n");
}
