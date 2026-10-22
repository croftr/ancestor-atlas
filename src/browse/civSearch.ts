/**
 * Search on the Civilizations page. Every word typed must start a word somewhere in the civilization's name, its
 * group's or family's name, its region (or a plain name for the region), or its description; matches in the name
 * rank first. "Assyrian" also tries "Assyr", "Rome" also tries "Roman" (SYNONYMS), and when nothing matches a
 * near miss in a name is offered instead ("babilon" -> Babylonia).
 */

export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const wordsOf = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Other words for a typed word (folded), where its own beginning would not reach the name. */
const SYNONYMS: Record<string, string[]> = {
  rome: ["roman"],
  chinese: ["china"],
  greek: ["greece", "hellenistic"],
  greeks: ["greece", "hellenistic"],
  greece: ["greek", "hellenistic"],
  jewish: ["israel", "judah", "judea", "hasmonean"],
  hebrew: ["israel", "judah"],
  nubia: ["kush"],
  nubian: ["kush"],
  ethiopia: ["axum", "aksum"],
  aksum: ["axum"],
  india: ["janapada", "mahajanapada"],
  indian: ["india", "janapada", "mahajanapada"],
  carthaginian: ["carthage"],
};

/** Plain names for the page's regions, matched like the region itself (only names that hold for the whole region). */
const REGION_WORDS: Record<string, string> = {
  "Near East": "Middle East Levant",
  "Iran & Central Asia": "Iran",
  "Egypt & North Africa": "Africa",
  "South Asia": "India",
  "Mexico & Central America": "Mesoamerica America Americas",
  "Mediterranean Europe": "Europe",
  "Eastern Europe & Steppe": "Europe",
  "Sub-Saharan Africa": "Africa",
};

/** Well-known names the atlas does not have, with why (the globe ends at 1 CE). */
export const NOT_COVERED: Record<string, string> = {
  inca: "The Inca Empire rose in the 15th century CE, long after 1 CE, where the atlas ends.",
  aztec: "The Aztec Empire rose in the 15th century CE, long after 1 CE, where the atlas ends.",
  aztecs: "The Aztec Empire rose in the 15th century CE, long after 1 CE, where the atlas ends.",
  viking: "The Viking Age began in the 8th century CE, after 1 CE, where the atlas ends.",
  vikings: "The Viking Age began in the 8th century CE, after 1 CE, where the atlas ends.",
  mongol: "The Mongol Empire rose in the 13th century CE, after 1 CE, where the atlas ends.",
  mongols: "The Mongol Empire rose in the 13th century CE, after 1 CE, where the atlas ends.",
  ottoman: "The Ottoman Empire began around 1300 CE, after 1 CE, where the atlas ends.",
  byzantine: "The Byzantine Empire is counted from the 4th century CE, after 1 CE, where the atlas ends.",
  khmer: "The Khmer Empire rose in the 9th century CE, after 1 CE, where the atlas ends.",
};

export interface SearchRecord {
  id: string;
  name: string;
  /** Group or family name, then region. */
  context: string[];
  description?: string;
  start: number;
}

interface Indexed extends SearchRecord {
  nameWords: string[];
  contextWords: string[];
  regionWords: string[];
  descWords: Set<string>;
}

export const index = (records: SearchRecord[]): Indexed[] =>
  records.map((r) => ({
    ...r,
    nameWords: wordsOf(r.name),
    contextWords: r.context.flatMap(wordsOf),
    regionWords: r.context.flatMap((c) => wordsOf(REGION_WORDS[c] ?? "")),
    descWords: new Set(wordsOf(r.description ?? "")),
  }));

/** What a typed word may match the start of: itself, without an "-ian"/"-an"/"-s" ending, and its synonyms. */
export function variants(word: string): string[] {
  const out = new Set([word]);
  for (const end of ["ians", "ian", "ans", "an", "s"]) {
    if (word.endsWith(end) && word.length - end.length >= 4) {
      out.add(word.slice(0, -end.length));
      break;
    }
  }
  for (const v of [...out]) for (const s of SYNONYMS[v] ?? []) out.add(s);
  return [...out];
}

const starts = (words: Iterable<string>, vs: string[]) => {
  for (const w of words) if (vs.some((v) => w.startsWith(v))) return true;
  return false;
};

/** How well one typed word matches a record (0: not at all; 1: only in the description). */
function wordScore(r: Indexed, word: string): number {
  const vs = variants(word);
  if (r.nameWords[0]?.startsWith(word)) return 6;
  if (starts(r.nameWords, [word])) return 5;
  if (starts(r.nameWords, vs)) return 4;
  if (starts(r.contextWords, [word])) return 3;
  if (starts(r.contextWords, vs)) return 2.5;
  if (starts(r.regionWords, vs)) return 2;
  if (word.length >= 3 && starts(r.descWords, vs)) return 1;
  return 0;
}

/** A search result; `strong` unless some word was found only in the description. */
export type Hit = Indexed & { strong: boolean };

/** Records matching every word of the query, best first (then oldest first). */
export function search(records: Indexed[], query: string): Hit[] {
  const q = fold(query.trim());
  const words = wordsOf(q);
  if (!words.length) return [];
  const scored: { r: Indexed; s: number; strong: boolean }[] = [];
  for (const r of records) {
    let s = 0;
    let strong = true;
    for (const w of words) {
      const ws = wordScore(r, w);
      if (!ws) {
        s = 0;
        break;
      }
      s += ws;
      if (ws <= 1) strong = false;
    }
    if (!s) continue;
    const name = fold(r.name);
    if (name === q) s += 20;
    else if (name.startsWith(q)) s += 4;
    scored.push({ r, s, strong });
  }
  return scored.sort((a, b) => b.s - a.s || a.r.start - b.r.start).map((x) => ({ ...x.r, strong: x.strong }));
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length];
}

/** Names close to a query that matched nothing (a typo), best first; at most `max`. */
export function nearMisses(records: Indexed[], query: string, max = 4): Indexed[] {
  const words = wordsOf(query);
  if (words.length !== 1 || words[0].length < 4) return [];
  const w = words[0];
  const allowed = w.length >= 7 ? 2 : 1;
  const hits: { r: Indexed; d: number }[] = [];
  for (const r of records) {
    const d = Math.min(...r.nameWords.map((n) => Math.min(distance(w, n), distance(w, n.slice(0, w.length)))));
    if (d <= allowed) hits.push({ r, d });
  }
  return hits.sort((a, b) => a.d - b.d || a.r.start - b.r.start).slice(0, max).map((x) => x.r);
}

/** Where the typed words begin words in `text`, as [start, end) ranges of `text`, for highlighting. */
export function marks(text: string, query: string): [number, number][] {
  const words = wordsOf(query);
  if (!words.length) return [];
  const vs = [...new Set(words.flatMap(variants))].sort((a, b) => b.length - a.length);
  const out: [number, number][] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = m[0];
    const folded = fold(word);
    const v = vs.find((x) => folded.startsWith(x));
    if (!v) continue;
    // Walk the original letters until their folded form covers the match (accents fold away).
    let n = 0;
    let len = 0;
    for (const ch of word) {
      if (n >= v.length) break;
      n += fold(ch).length;
      len += ch.length;
    }
    out.push([m.index!, m.index! + len]);
  }
  return out;
}
