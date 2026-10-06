// Minimal Wikidata client: descriptive User-Agent (required to avoid 429s), retry with backoff,
// and an on-disk cache under data/raw/wikidata/cache so re-runs don't re-hit the API.
// In the cloud sandbox run with NODE_USE_ENV_PROXY=1.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const UA = "ancestor-atlas/0.1 (https://github.com/croftr/ancestor-atlas; hobby project, data provenance checks)";
const CACHE = "data/raw/wikidata/cache";
const API = "https://www.wikidata.org/w/api.php";
const SPARQL = "https://query.wikidata.org/sparql";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getJson<T = any>(url: string, { cache = true } = {}): Promise<T> {
  const file = `${CACHE}/${createHash("sha1").update(url).digest("hex")}.json`;
  if (cache && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
    } catch (e) {
      if (attempt < 5) { console.warn(`  retrying after ${(e as Error).name}: ${url.slice(0, 80)}...`); await sleep(2000 * 2 ** attempt); continue; }
      throw e;
    }
    if (res.ok) {
      const json = await res.json();
      if (json?.error) {
        // Never cache an error response. maxlag = Wikidata asking clients to back off while it catches up.
        if (json.error.code === "maxlag" && attempt < 8) { await sleep(Math.max(5, Number(json.error.lag) || 5) * 1000 + 2000 * attempt); continue; }
        throw new Error(`Wikidata API error ${json.error.code}: ${json.error.info} (${url.slice(0, 120)})`);
      }
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(file, JSON.stringify(json));
      await sleep(150); // be polite
      return json as T;
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(Number(res.headers.get("retry-after")) * 1000 || 2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
}

export const api = (params: Record<string, string>) =>
  getJson(`${API}?${new URLSearchParams({ format: "json", ...params })}`); // read-only, so no maxlag (that is for edits)

export const sparql = (query: string) =>
  getJson<{ results: { bindings: Record<string, { value: string }>[] } }>(`${SPARQL}?${new URLSearchParams({ query, format: "json" })}`);

export interface WdItem {
  id: string;
  label?: string;
  description?: string;
  types: string[]; // P31 QIDs
  coord?: { lat: number; lon: number };
  enwiki?: string;
}

/** Fetch label, description, P31, P625 and enwiki title for up to any number of QIDs. */
export async function getItems(ids: string[]): Promise<Map<string, WdItem>> {
  const out = new Map<string, WdItem>();
  for (let i = 0; i < ids.length; i += 50) {
    const j = await api({
      action: "wbgetentities",
      ids: ids.slice(i, i + 50).join("|"),
      props: "labels|descriptions|claims|sitelinks",
      languages: "en",
      sitefilter: "enwiki",
      languagefallback: "1",
    });
    for (const [id, e] of Object.entries<any>(j.entities ?? {})) {
      if (e.missing !== undefined) continue;
      const p625 = e.claims?.P625?.find((c: any) => c.rank !== "deprecated")?.mainsnak?.datavalue?.value;
      out.set(id, {
        id,
        label: e.labels?.en?.value,
        description: e.descriptions?.en?.value,
        types: (e.claims?.P31 ?? []).map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean),
        coord: p625 ? { lat: p625.latitude, lon: p625.longitude } : undefined,
        enwiki: e.sitelinks?.enwiki?.title,
      });
    }
  }
  return out;
}

/** English labels for QIDs (used to turn P31 types into words). */
export async function getLabels(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 50) {
    const j = await api({ action: "wbgetentities", ids: ids.slice(i, i + 50).join("|"), props: "labels", languages: "en" });
    for (const [id, e] of Object.entries<any>(j.entities ?? {})) if (e.labels?.en) out.set(id, e.labels.en.value);
  }
  return out;
}
