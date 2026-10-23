// The checks behind `npm run data:update -- --check` (docs/data-updates.md, step 2). Read-only: nothing here writes
// to data/ or public/. Upstream calls are few and batched (Zenodo 1, Dataverse 1, Wikipedia 1 per 50 pages,
// Wikidata 1 per 50 items); XRONOS is never contacted here (Rob downloads it with npm run data:fetch:xronos).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import { parse as parseYaml } from "yaml";
import type { DnaData } from "../../src/dna/types.ts";
import { AADR_DATASET, AADR_FILE_ID, AADR_RELEASE, CLIOPATRIA_RECORD } from "../fetch/pins.ts";
import { ingestRoad, ingestRoadCultures } from "../ingest/road.ts";
import { units, XRONOS_CSV } from "../ingest/xronos.ts";
import { distanceKm, siteStatus } from "../lib/qa.ts";
import { RAW_SOURCES, readLock, status } from "../lib/raw-store.ts";
import { textHash } from "../lib/text-hash.ts";
import { getItems, getJson } from "../lib/wikidata.ts";
import { XRONOS_STAMP, type DownloadStamp } from "../fetch/xronos.ts";

const CURATED = "data/curated";
export const IGNORE_PATH = "data/update-ignore.yaml";
const DAY = 86_400_000;
const csv = (path: string) => (existsSync(path) ? (parseCsv(readFileSync(path, "utf8"), { columns: true }) as Record<string, string>[]) : []);
const yaml = <T>(path: string): T => parseYaml(readFileSync(path, "utf8")) as T;
const daysSince = (iso: string, now: number) => Math.floor((now - Date.parse(iso)) / DAY);

// ---------- sources: locked snapshot against the latest upstream ----------

export interface SourceCheck {
  id: string;
  locked: string;
  latest: string;
  state: "current" | "newer" | "by hand" | "static" | "error";
  next?: string;
}

const lockedText = (id: string) => {
  const e = readLock()[id];
  return e ? `${e.version ? `${e.version}, ` : ""}retrieved ${e.retrieved}` : "not locked";
};

async function checkCliopatria(): Promise<SourceCheck> {
  const j = await getJson<{ hits: { hits: { id: number; metadata: { version?: string; publication_date: string } }[] } }>(
    `https://zenodo.org/api/records/${CLIOPATRIA_RECORD}/versions?size=25&sort=version`, { cache: false });
  const hits = [...j.hits.hits].sort((a, b) => b.metadata.publication_date.localeCompare(a.metadata.publication_date) || b.id - a.id);
  const pinned = hits.find((h) => String(h.id) === CLIOPATRIA_RECORD);
  const latest = hits[0];
  const name = (h: typeof latest) => `${h.metadata.version ?? "?"} (Zenodo ${h.id}, ${h.metadata.publication_date})`;
  return {
    id: "cliopatria",
    locked: `${pinned ? name(pinned) : `Zenodo ${CLIOPATRIA_RECORD}`}; ${lockedText("cliopatria")}`,
    latest: name(latest),
    state: String(latest.id) === CLIOPATRIA_RECORD ? "current" : "newer",
    ...(String(latest.id) !== CLIOPATRIA_RECORD && { next: `set CLIOPATRIA_RECORD = "${latest.id}" in scripts/fetch/pins.ts (and the citation in sources.yaml), npm run data:fetch -- --force` }),
  };
}

async function checkAadr(): Promise<SourceCheck> {
  const j = await getJson<{ data: { dataFile: { id: number; filename: string; md5?: string; creationDate?: string } }[] }>(
    `https://dataverse.harvard.edu/api/datasets/:persistentId/versions/:latest/files?persistentId=${AADR_DATASET}`, { cache: false });
  const anno = j.data.map((f) => f.dataFile).find((f) => /^v[\w.]+_1240K\.aadr\.PUB\.anno$/.test(f.filename));
  if (!anno) return { id: "aadr", locked: `${AADR_RELEASE}; ${lockedText("aadr")}`, latest: "no 1240K annotation file in the latest version", state: "error" };
  const release = anno.filename.replace(/_1240K.*/, "");
  const current = anno.id === AADR_FILE_ID;
  return {
    id: "aadr",
    locked: `${AADR_RELEASE}; ${lockedText("aadr")}`,
    latest: `${release} (file ${anno.id}${anno.creationDate ? `, ${anno.creationDate}` : ""})`,
    state: current ? "current" : "newer",
    ...(!current && { next: `set AADR_RELEASE "${release}", AADR_FILE_ID ${anno.id}, AADR_MD5 "${anno.md5}" in scripts/fetch/pins.ts, npm run data:dna` }),
  };
}

/** Wikidata short descriptions (data/raw/wikidata/descriptions.json) against Wikidata now. */
async function checkWikidataDescriptions(): Promise<SourceCheck & { changed: string[] }> {
  const path = "data/raw/wikidata/descriptions.json";
  const locked = lockedText("wikidata");
  if (!existsSync(path)) return { id: "wikidata", locked, latest: "no local descriptions.json (npm run data:pull)", state: "error", changed: [] };
  const have = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
  const now = await getItems(Object.keys(have), { cache: false });
  const changed = Object.keys(have).filter((q) => (now.get(q)?.description ?? "") !== (have[q] ?? ""));
  return {
    id: "wikidata",
    locked,
    latest: changed.length ? `${changed.length} of ${Object.keys(have).length} descriptions changed` : `all ${Object.keys(have).length} descriptions unchanged`,
    state: changed.length ? "newer" : "current",
    ...(changed.length && { next: "npm run data:fetch (rewrites descriptions.json)" }),
    changed,
  };
}

function checkXronos(now: number): SourceCheck {
  const entry = readLock().xronos;
  const st = status(RAW_SOURCES.find((s) => s.id === "xronos")!, readLock());
  const stamp: DownloadStamp | undefined = existsSync(XRONOS_STAMP) ? JSON.parse(readFileSync(XRONOS_STAMP, "utf8")) : undefined;
  const differs = st.files.some((f) => f.state === "differs");
  const age = entry ? daysSince(entry.retrieved, now) : undefined;
  return {
    id: "xronos",
    locked: lockedText("xronos"),
    latest: differs
      ? `a newer download is here (${stamp?.downloaded ?? "date unknown"}), not locked yet`
      : stamp?.downloaded ? `last downloaded ${stamp.downloaded.slice(0, 10)}` : "not checked (never contacted automatically)",
    state: differs ? "newer" : "by hand",
    next: differs ? "step 3 locks and builds it (for now: npm run data:push -- xronos, npm run data:build)" : `npm run data:fetch:xronos (Rob, at most daily)${age !== undefined ? `; locked copy is ${age} days old` : ""}`,
  };
}

function checkRoad(now: number): SourceCheck {
  const entry = readLock().road;
  return {
    id: "road",
    locked: lockedText("road"),
    latest: "no version to ask for; a new export shows what changed",
    state: "by hand",
    next: `Rscript scripts/fetch/road.R (needs R)${entry ? `; locked export is ${daysSince(entry.retrieved, now)} days old` : ""}`,
  };
}

export async function checkSources(opts: { offline?: boolean; now?: number } = {}): Promise<{ sources: SourceCheck[]; descriptionsChanged: string[] }> {
  const now = opts.now ?? Date.now();
  const net = async (id: string, f: () => Promise<SourceCheck>): Promise<SourceCheck> => {
    if (opts.offline) return { id, locked: lockedText(id), latest: "not checked (--offline)", state: "by hand" };
    try { return await f(); } catch (e) { return { id, locked: lockedText(id), latest: `check failed: ${(e as Error).message.slice(0, 160)}`, state: "error" }; }
  };
  let descriptionsChanged: string[] = [];
  const sources = [
    checkXronos(now),
    await net("cliopatria", checkCliopatria),
    await net("wikidata", async () => { const { changed, ...r } = await checkWikidataDescriptions(); descriptionsChanged = changed; return r; }),
    checkRoad(now),
    await net("aadr", checkAadr),
    { id: "paleo", locked: lockedText("paleo"), latest: "published reconstructions; not expected to change", state: "static" as const },
  ];
  return { sources, descriptionsChanged };
}

// ---------- pinned Wikipedia revisions ----------

export interface Pin { lang: string; title: string; rev: number; file: string }
const PIN = /wikipedia:(?:([a-z]{2,3}):)?([^@\s"',|;]+)@(\d+)/g;
const OLDID = /https:\/\/([a-z]{2,3})\.wikipedia\.org\/w\/index\.php\?title=([^&\s"']+)&oldid=(\d+)/g;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(csv|ya?ml|tsx?)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

/** Every pinned Wikipedia revision in the curated data and the app (routes, gene flow…). */
export function findPins(dirs = [CURATED, "src"]): Pin[] {
  const pins: Pin[] = [];
  for (const file of dirs.flatMap(walk)) {
    const text = readFileSync(file, "utf8");
    for (const re of [PIN, OLDID])
      for (const m of text.matchAll(re)) pins.push({ lang: m[1] ?? "en", title: decodeURIComponent(m[2]).replace(/ /g, "_"), rev: Number(m[3]), file });
  }
  return pins;
}

export interface PinCheck {
  lang: string;
  title: string;
  /** Distinct pinned revisions, oldest first, with how often each is cited. */
  pins: { rev: number; uses: number }[];
  files: string[];
  latest?: { rev: number; timestamp: string };
  state: "current" | "edited" | "missing";
  diff?: string;
  /** For an edited page: edits since the newest pin (500 = at least) and the change in size, in bytes. */
  edits?: number;
  bytes?: number;
}

export function groupPins(pins: Pin[]): PinCheck[] {
  const groups = new Map<string, PinCheck>();
  for (const p of pins) {
    const key = `${p.lang}:${p.title}`;
    const g = groups.get(key) ?? groups.set(key, { lang: p.lang, title: p.title, pins: [], files: [], state: "current" }).get(key)!;
    const pin = g.pins.find((x) => x.rev === p.rev);
    if (pin) pin.uses++;
    else g.pins.push({ rev: p.rev, uses: 1 });
    if (!g.files.includes(p.file)) g.files.push(p.file);
  }
  for (const g of groups.values()) g.pins.sort((a, b) => a.rev - b.rev);
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** Asks each Wikipedia for the latest revision of every pinned page (50 titles a request). */
export async function checkPins(groups: PinCheck[]): Promise<PinCheck[]> {
  for (const lang of new Set(groups.map((g) => g.lang))) {
    const mine = groups.filter((g) => g.lang === lang);
    for (let i = 0; i < mine.length; i += 50) {
      const batch = mine.slice(i, i + 50);
      const params = new URLSearchParams({ action: "query", prop: "revisions", rvprop: "ids|timestamp", redirects: "1", format: "json", formatversion: "2", titles: batch.map((g) => g.title).join("|") });
      const j = await getJson<{ query: { normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[]; pages: { title: string; missing?: boolean; revisions?: { revid: number; timestamp: string }[] }[] } }>(
        `https://${lang}.wikipedia.org/w/api.php?${params}`, { cache: false });
      const follow = (t: string) => {
        let x = t.replace(/_/g, " ");
        x = j.query.normalized?.find((n) => n.from === x)?.to ?? x;
        return j.query.redirects?.find((r) => r.from === x)?.to ?? x;
      };
      for (const g of batch) {
        const page = j.query.pages.find((p) => p.title === follow(g.title));
        const rev = page?.revisions?.[0];
        if (!page || page.missing || !rev) { g.state = "missing"; continue; }
        g.latest = { rev: rev.revid, timestamp: rev.timestamp };
        const newest = g.pins[g.pins.length - 1].rev;
        g.state = rev.revid > newest ? "edited" : "current";
        if (g.state === "edited") g.diff = `https://${lang}.wikipedia.org/w/index.php?diff=cur&oldid=${newest}`;
      }
    }
  }
  // How much changed: the page's history back to the pin (one request a page, edited pages only).
  for (const g of groups.filter((x) => x.state === "edited")) {
    const pin = g.pins[g.pins.length - 1].rev;
    const params = new URLSearchParams({ action: "query", prop: "revisions", titles: g.title, rvprop: "ids|size", rvlimit: "500", rvendid: String(pin), redirects: "1", format: "json", formatversion: "2" });
    const j = await getJson<{ query: { pages: { revisions?: { revid: number; size: number }[] }[] } }>(`https://${g.lang}.wikipedia.org/w/api.php?${params}`, { cache: false });
    const revs = j.query.pages[0]?.revisions ?? [];
    const old = revs.find((r) => r.revid === pin);
    g.edits = revs.filter((r) => r.revid !== pin).length;
    if (old) g.bytes = revs[0].size - old.size;
  }
  return groups.sort((a, b) => b.pins.reduce((n, p) => n + p.uses, 0) - a.pins.reduce((n, p) => n + p.uses, 0) || (b.edits ?? 0) - (a.edits ?? 0) || a.title.localeCompare(b.title));
}

// ---------- Wikidata coordinates of curated points ----------

export interface CoordRow { qid: string; label: string; where: string; lat: number; lon: number }
export interface CoordCheck extends CoordRow { state: "moved" | "no-coords" | "gone"; now?: { lat: number; lon: number }; km?: number }

/** Curated points whose coordinates were taken from Wikidata (sites with coord_source wikidata:Q…, event places, XRONOS moves). */
export function wikidataPoints(): CoordRow[] {
  const rows: CoordRow[] = [];
  for (const file of ["species-sites.csv", "culture-sites.csv"])
    for (const r of csv(`${CURATED}/${file}`)) {
      const q = r.coord_source?.match(/^wikidata:(Q\d+)/)?.[1];
      if (q) rows.push({ qid: q, label: `${r.entity_id}: ${r.label}`, where: file, lat: Number(r.lat), lon: Number(r.lon) });
    }
  for (const ev of yaml<{ id: string; places?: { label: string; lat: number; lon: number; wikidata?: string }[] }[]>(`${CURATED}/events.yaml`) ?? [])
    for (const p of ev.places ?? []) if (p.wikidata) rows.push({ qid: p.wikidata, label: `${ev.id}: ${p.label}`, where: "events.yaml", lat: p.lat, lon: p.lon });
  for (const r of csv(`${CURATED}/xronos-site-fixes.csv`))
    if (r.action === "move" && r.wikidata) rows.push({ qid: r.wikidata, label: `${r.site} (${r.country})`, where: "xronos-site-fixes.csv", lat: Number(r.lat), lon: Number(r.lon) });
  return rows;
}

export function compareCoords(rows: CoordRow[], items: Map<string, { coord?: { lat: number; lon: number } }>, minKm = 1): CoordCheck[] {
  const out: CoordCheck[] = [];
  for (const r of rows) {
    const item = items.get(r.qid);
    if (!item) out.push({ ...r, state: "gone" });
    else if (!item.coord) out.push({ ...r, state: "no-coords" });
    else {
      const km = distanceKm(r.lat, r.lon, item.coord.lat, item.coord.lon);
      if (km > minKm) out.push({ ...r, state: "moved", now: item.coord, km: Math.round(km * 10) / 10 });
    }
  }
  return out.sort((a, b) => (b.km ?? 1e9) - (a.km ?? 1e9)); // vanished and gone first, then the furthest moves
}

export async function checkCoords(): Promise<{ checked: number; changes: CoordCheck[] }> {
  const rows = wikidataPoints();
  const items = await getItems([...new Set(rows.map((r) => r.qid))], { cache: false });
  return { checked: rows.length, changes: compareCoords(rows, items) };
}

// ---------- not mapped yet: labels only a person can add ----------

export interface Ignore { xronos?: string[]; road_taxa?: string[]; road_cultures?: string[]; aadr_groups?: string[] }
export const readIgnore = (): Ignore => (existsSync(IGNORE_PATH) ? yaml<Ignore>(IGNORE_PATH) ?? {} : {});

// Period names and phase codes rather than cultures, in the languages XRONOS mixes: "LN", "Néolithique ancien",
// "Nordisches Spätneolithikum", "Late Neolithic/Early Bronze Age", "Upper Paleolithic (Eurasia)", "unspec.".
const PERIOD = /^(?:(?:neo|meso|pal(?:a)?eo|chalco|eneo)lith(?:ic|ique|ikum|icum)?|copper ?age|bronze ?age|iron ?age|stone ?age|bronze|iron|bronzezeit|eisenzeit|age du (?:bronze|fer)|pleistocene|holocene|hg|[uefjms]?[eml]?(?:n|m|p|c|ba|ia|up|pn|sa)|meso|neo|chalco|ln|lgm)$/;
const QUALIFIER = /\b(?:early|middle|late|later|final|terminal|initial|upper|lower|older|younger|ancien|moyen|recent|superieur|inferieur|nordisches|british|transition(?:al)?)\b|^(?:epi|proto|pre|post|fruh|mittel|jung|spat|end|alt)(?=\w)/g;
const VAGUE = /^(?:unspec\.?|unknown|undiff\.?|indet\.?|n\.c\.|undated|transition|varia|unclear|\?+)$/;

export function isGenericPeriod(label: string): boolean {
  const plain = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
    .replace(/\s*\(.*\)$/, "").trim();
  if (!plain) return true;
  return plain.split(/\s*[/–]\s*|\s+-\s+/).every((part) => {
    if (VAGUE.test(part)) return true;
    let rest = part;
    for (let i = 0; i < 3; i++) rest = rest.replace(QUALIFIER, "").replace(/^[\s-]+/, "");
    rest = rest.replace(/[\s-]+(?:[ivx]+|\d+)[a-z]?$/, "").replace(/[\s-]+/g, " ").trim();
    return !rest || PERIOD.test(rest) || PERIOD.test(rest.replace(/ /g, ""));
  });
}

/** ROAD identifications the ingest never imports (sp., cf., aff., indet., "X or Y", "X/Y", a genus alone). */
export const isUncertainTaxon = (label: string) =>
  /\b(?:indet|n\.c|sp|cf|aff)\b\.?|\bor\b|\/|^\(blank\)$/i.test(label.trim()) || /^[A-Z][a-z]+$/.test(label.trim());

const words = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z]+/).filter(Boolean);
const COMMON = new Set(["culture", "cultures", "period", "and", "early", "middle", "late", "stone", "age", "africa", "pottery", "neolithic", "ware", "linear", "pre", "bantu", "speaking", "farmers", "stroke", "ornamented"]);

/** Distinctive words of each existing culture's name ("lengyel", "mousterian", "lbk"), for spotting gaps that are cultures we already have. */
export function cultureWords(): Map<string, string> {
  const path = "public/data/entities.json";
  const out = new Map<string, string>();
  if (!existsSync(path)) return out;
  for (const e of JSON.parse(readFileSync(path, "utf8")) as { name: string; category: string }[])
    if (e.category === "culture") for (const w of words(e.name)) if (w.length >= 3 && !COMMON.has(w)) out.set(w, e.name);
  return out;
}

/** The existing culture a label names, if any ("Hungary_LN_Lengyel" -> "Lengyel culture"). */
export const matchCulture = (label: string, known: Map<string, string>) => words(label).map((w) => known.get(w)).find(Boolean);

/** AADR groups that are only a place and periods ("Spain_C", "England_LIA_MIA"): no culture to map. */
export const isPeriodGroup = (group: string) => group.split("_").slice(1).every((p) => isGenericPeriod(p.replace(/-.*$/, "")));

export interface Gap { label: string; count: number; sites?: number; isNew?: boolean; /** An existing culture the label names: only a label row is missing. */ culture?: string }
const top = (m: Map<string, { count: number; sites?: Set<string> }>, n: number, ignore: string[] = []) =>
  [...m].filter(([k]) => !ignore.includes(k))
    .map(([label, v]) => ({ label, count: v.count, ...(v.sites && { sites: v.sites.size }) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, n);

/** XRONOS labels on dates older than about 1 CE that carry no mapped label, by number of dates (and sites). */
export function xronosGaps(ignore: string[] = [], n = 30): { gaps: Gap[]; generic: number } {
  if (!existsSync(XRONOS_CSV)) return { gaps: [], generic: 0 };
  const mapped = new Set(csv(`${CURATED}/culture-labels.csv`).filter((r) => r.source === "xronos").map((r) => r.label));
  const counts = new Map<string, { count: number; sites: Set<string> }>();
  let generic = 0;
  for (const r of parseCsv(readFileSync(XRONOS_CSV, "utf8"), { columns: true, relax_quotes: true }) as Record<string, string>[]) {
    if (!(Number(r.bp) > 1950)) continue;
    const us = units(r.typochronological_units);
    if (!us.length || us.some((u) => mapped.has(u))) continue;
    for (const u of us) {
      if (isGenericPeriod(u)) { generic++; continue; }
      const c = counts.get(u) ?? counts.set(u, { count: 0, sites: new Set() }).get(u)!;
      c.count++;
      c.sites.add(`${r.site}|${r.country}`);
    }
  }
  return { gaps: top(counts, n, ignore), generic };
}

/** ROAD taxa not in road/species-labels.csv (uncertain ones left out), and culture names not in culture-labels.csv (period names left out). */
export function roadGaps(ignore: Ignore = {}, n = 20): { taxa: Gap[]; cultures: Gap[] } {
  if (!existsSync("data/raw/road/human-remains.csv")) return { taxa: [], cultures: [] };
  const wrap = (m: Map<string, number>, keep = (_: string) => true) =>
    new Map([...m].map(([k, count]) => [k.replace("|", " ").trim() || "(blank)", { count }] as const).filter(([k]) => keep(k)));
  return {
    taxa: top(wrap(ingestRoad().unmapped, (k) => !isUncertainTaxon(k)), n, ignore.road_taxa),
    cultures: top(wrap(ingestRoadCultures().unmapped, (k) => !isGenericPeriod(k.replace(/\s*\(.*\)$/, ""))), n, ignore.road_cultures),
  };
}

/** AADR group labels whose people link to no culture (from public/data/dna.json), by number of people; groups that are only a place and periods left out. */
export function aadrGaps(ignore: string[] = [], n = 25): Gap[] {
  const path = "public/data/dna.json";
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, "utf8")) as DnaData;
  const counts = new Map<string, { count: number; sites: Set<string> }>();
  for (const s of data.sites)
    for (const p of s.people) {
      if (p[9] || isPeriodGroup(p[7])) continue;
      const c = counts.get(p[7]) ?? counts.set(p[7], { count: 0, sites: new Set() }).get(p[7])!;
      c.count++;
      c.sites.add(s.id);
    }
  return top(counts, n, ignore);
}

// ---------- the work lists that already exist ----------

export interface Queues { recall: string[]; partial: string[]; staleNarration: string[]; setAside?: number; droppedCoords?: number }

export function queues(): Queues {
  const recall: string[] = [];
  const partial: string[] = [];
  for (const file of ["species-sites.csv", "culture-sites.csv"])
    for (const r of csv(`${CURATED}/${file}`)) {
      const s = siteStatus(r as { source_id: string });
      if (s === "recall") recall.push(`${r.entity_id}: ${r.label}`);
      else if (s === "partial") partial.push(`${r.entity_id}: ${r.label}`);
    }
  // As the validator does: the built entities (events included), whose description is what the narration reads.
  type Narrated = { id: string; description?: string; narration?: { text_hash?: string } };
  const built = existsSync("public/data/entities.json") ? (JSON.parse(readFileSync("public/data/entities.json", "utf8")) as Narrated[]) : [];
  const staleNarration = built.filter((e) => e.narration?.text_hash && e.narration.text_hash !== textHash(e.description ?? "")).map((e) => e.id);
  const lines = (p: string) => (existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").length - 1 : undefined);
  return { recall, partial, staleNarration, setAside: lines("data/build/xronos-set-aside.csv"), droppedCoords: lines("data/build/xronos-dropped-coords.csv") };
}

// ---------- everything, and what is new since the last check ----------

export interface CheckResult {
  checked: string;
  offline: boolean;
  sources: SourceCheck[];
  descriptionsChanged: string[];
  pins: { total: number; pages: number; edited: PinCheck[]; missing: PinCheck[] };
  coords: { checked: number; changes: CoordCheck[] };
  gaps: { xronos: Gap[]; xronosGeneric: number; roadTaxa: Gap[]; roadCultures: Gap[]; aadr: Gap[] };
  queues: Queues;
  /** What is wrong or could not be verified. An update is not published while any remain (Rob's call, 23 Oct 2026). */
  doubts: string[];
}

/** The doubts in a check: curated points that no longer match their source, pages that vanished, checks that failed. */
export function doubtsOf(r: Omit<CheckResult, "doubts">): string[] {
  const out: string[] = [];
  for (const c of r.coords.changes)
    out.push(`${c.label} (${c.where}): ${c.state === "moved" ? `Wikidata ${c.qid} is ${c.km} km away` : c.state === "no-coords" ? `Wikidata ${c.qid} has no coordinates` : `Wikidata ${c.qid} is gone`}`);
  for (const g of r.pins.missing) out.push(`Wikipedia ${g.lang}:${g.title} is missing or moved (cited in ${g.files.join(", ")})`);
  for (const s of r.sources) if (s.state === "error") out.push(`${s.id}: ${s.latest}`);
  return out;
}

/** Marks gaps that the previous check did not list. */
export function markNew(result: CheckResult, previous?: CheckResult) {
  if (!previous) return;
  for (const k of ["xronos", "roadTaxa", "roadCultures", "aadr"] as const) {
    const before = new Set(previous.gaps[k].map((g) => g.label));
    for (const g of result.gaps[k]) if (!before.has(g.label)) g.isNew = true;
  }
}

export async function runCheck(opts: { offline?: boolean; log?: (s: string) => void } = {}): Promise<CheckResult> {
  const log = opts.log ?? (() => {});
  log("sources…");
  const { sources, descriptionsChanged } = await checkSources(opts);
  const all = findPins();
  let groups = groupPins(all);
  let coords: CheckResult["coords"] = { checked: 0, changes: [] };
  if (!opts.offline) {
    log(`Wikipedia: ${groups.length} pinned pages…`);
    groups = await checkPins(groups);
    log("Wikidata coordinates…");
    coords = await checkCoords();
  }
  log("labels not mapped yet…");
  const ignore = readIgnore();
  const xr = xronosGaps(ignore.xronos);
  const road = roadGaps(ignore);
  const aadr = aadrGaps(ignore.aadr_groups);
  const known = cultureWords();
  for (const g of [...xr.gaps, ...road.cultures, ...aadr]) {
    const c = matchCulture(g.label, known);
    if (c) g.culture = c;
  }
  const result: Omit<CheckResult, "doubts"> = {
    checked: new Date().toISOString(),
    offline: !!opts.offline,
    sources,
    descriptionsChanged,
    pins: { total: all.length, pages: groups.length, edited: groups.filter((g) => g.state === "edited"), missing: groups.filter((g) => g.state === "missing") },
    coords,
    gaps: { xronos: xr.gaps, xronosGeneric: xr.generic, roadTaxa: road.taxa, roadCultures: road.cultures, aadr },
    queues: queues(),
  };
  return { ...result, doubts: doubtsOf(result) };
}
