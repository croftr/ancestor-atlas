// Fetches English short descriptions (CC0) for every Wikidata ID used by the Cliopatria polities
// we import, plus the corrected IDs set in data/curated/entities.yaml.
// Output: data/raw/wikidata/descriptions.json  { "Q123": "ancient empire", ... }
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { readCliopatriaRows } from "../ingest/cliopatria.ts";

const OUT = "data/raw/wikidata/descriptions.json";
const curated = (parseYaml(readFileSync("data/curated/entities.yaml", "utf8")) as { wikidata?: string }[]) ?? [];
const ids = [
  ...new Set([...readCliopatriaRows().map((r) => r.Wikidata), ...curated.map((c) => c.wikidata)].filter(Boolean)),
].sort() as string[];
console.log(`Fetching descriptions for ${ids.length} Wikidata IDs ...`);

const out: Record<string, string> = {};
for (let i = 0; i < ids.length; i += 50) {
  const batch = ids.slice(i, i + 50);
  const url =
    "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=descriptions&languages=en" +
    `&ids=${batch.join("|")}`;
  const res = await fetch(url, { headers: { "User-Agent": "ancestor-atlas-data-fetch/0.1 (hobby project)" } });
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  const json = (await res.json()) as { entities?: Record<string, { descriptions?: { en?: { value: string } } }> };
  for (const [id, e] of Object.entries(json.entities ?? {})) {
    const d = e.descriptions?.en?.value;
    if (d) out[id] = d;
  }
}
mkdirSync("data/raw/wikidata", { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`Wrote ${Object.keys(out).length} descriptions to ${OUT}`);
