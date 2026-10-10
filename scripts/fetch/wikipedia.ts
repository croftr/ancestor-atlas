// Fetches English Wikipedia summary extracts for polities.
// Output: data/raw/wikipedia/summaries.json  { "<entity_id>": { "title": "...", "extract": "..." } }
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

interface EntitySummary {
  id: string;
  name: string;
  wikipedia_url: string;
}

const OUT = "data/raw/wikipedia/summaries.json";
mkdirSync("data/raw/wikipedia", { recursive: true });

const existing: Record<string, { title: string; extract: string; description?: string }> = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : {};

// Read all entities from public/data/entities.json
const entities: EntitySummary[] = JSON.parse(readFileSync("public/data/entities.json", "utf8"));
const civs = entities.filter((e: any) => e.category === "civilization" && !e.group && e.wikipedia_url);

console.log(`Checking Wikipedia summaries for ${civs.length} civilizations ...`);

let fetched = 0;
let errors = 0;

for (const civ of civs) {
  if (existing[civ.id]?.extract) continue;

  const match = civ.wikipedia_url.match(/\/wiki\/(.+)$/);
  if (!match) continue;

  const rawTitle = decodeURIComponent(match[1]);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(rawTitle)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AncestorAtlas/0.1 (https://github.com/ancestor-atlas; contact@ancestor-atlas.local)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`! ${civ.id} (${rawTitle}): HTTP ${res.status}`);
      errors++;
      continue;
    }

    const data = (await res.json()) as { title?: string; extract?: string; description?: string };
    if (data.extract) {
      existing[civ.id] = {
        title: data.title ?? rawTitle,
        extract: data.extract,
        description: data.description,
      };
      fetched++;
    }

    // Gentle rate limit: 40ms pause between requests
    await new Promise((resolve) => setTimeout(resolve, 40));
  } catch (err) {
    console.warn(`! ${civ.id}: ${(err as Error).message}`);
    errors++;
  }
}

writeFileSync(OUT, JSON.stringify(existing, null, 2));
console.log(`Done: fetched ${fetched} new summaries, total cached: ${Object.keys(existing).length}, errors: ${errors}`);
