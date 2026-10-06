// Fetches Paleobiology Database occurrences (CC BY 4.0) for one taxon at a time and saves the
// response untouched, plus when/where it came from, so every later row can be traced back.
//   npm run data:fetch:pbdb -- "Homo erectus"
// Output: data/raw/pbdb/<slug>.json   { retrieved, url, record_count, records: [...] }
import { mkdirSync, writeFileSync } from "node:fs";

const taxon = process.argv[2] ?? "Homo erectus";
const slug = taxon.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const url =
  "https://paleobiodb.org/data1.2/occs/list.json" +
  `?base_name=${encodeURIComponent(taxon)}&show=coords,loc,time,ref,ident&vocab=pbdb`;

console.log(`GET ${url}`);
const res = await fetch(url, { headers: { "User-Agent": "ancestor-atlas-data-fetch/0.1 (hobby project)" } });
if (!res.ok) throw new Error(`PBDB ${res.status} ${res.statusText}`);
const json = (await res.json()) as { records?: unknown[] };
const records = json.records ?? [];

mkdirSync("data/raw/pbdb", { recursive: true });
const out = `data/raw/pbdb/${slug}.json`;
writeFileSync(
  out,
  JSON.stringify({ retrieved: new Date().toISOString(), url, record_count: records.length, records }, null, 1),
);
console.log(`Wrote ${records.length} occurrence records to ${out}`);
