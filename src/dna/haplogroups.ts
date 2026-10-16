import type { DnaPerson } from "./types";

/**
 * How the ancient DNA sites are coloured: by the commonest Y or mtDNA haplogroup family among the people there at the
 * slider's year, or plain. Three families each (a map is read all-pairs, and three hues is what stays apart for
 * colour-blind viewers), the rest grey; the card lists every haplogroup in full.
 */
export type DnaColour = "y" | "mt" | "plain";

export interface HaploClass {
  key: string;
  label: string;
  /** A few plain words for the legend; `note` is the fuller tooltip. */
  short: string;
  note: string;
  color: string;
  test: (h: string) => boolean;
}

export const OTHER_COLOR = "#8f8d86";
export const PLAIN_COLOR = "#9085e9";
/** Nobody there now has the haplogroup called (for Y, often only women sampled): drawn as a hollow ring. */
export const NONE_COLOR = "rgba(0, 0, 0, 0)";

const CLASSES: Record<Exclude<DnaColour, "plain">, HaploClass[]> = {
  y: [
    { key: "R1b", label: "R1b", short: "steppe herders, then western Europe", note: "Spread west with Steppe ancestry after 3000 BCE; most common in western Europe today", color: "#2a78d6", test: (h) => /^R1b/.test(h) },
    { key: "R1a", label: "R1a", short: "steppe herders, then east and south", note: "Spread with Steppe ancestry into eastern Europe, Central and South Asia", color: "#eb6834", test: (h) => /^R1a/.test(h) },
    { key: "IG", label: "I and G", short: "hunter-gatherers and first farmers", note: "I: Europe's hunter-gatherers; G2: the first farmers from Anatolia", color: "#1baf7a", test: (h) => /^[IG]\d?/.test(h) && !/^IJ/.test(h) },
  ],
  mt: [
    { key: "U", label: "U", short: "Europe's hunter-gatherers", note: "U5 and U2 were common among Europe's hunter-gatherers", color: "#2a78d6", test: (h) => /^U/.test(h) },
    { key: "H", label: "H and V", short: "farmers and later peoples", note: "Common among Europe's farmers and later peoples; H is Europe's commonest today", color: "#eb6834", test: (h) => /^(H|V|HV)/.test(h) },
    { key: "EA", label: "East Eurasian", short: "Asia and the Americas", note: "A–G, M, Y and Z: lineages of East, Central and South Asia and the Americas", color: "#1baf7a", test: (h) => /^([A-G]|M|Y|Z)/.test(h) && !/^(HV)/.test(h) },
  ],
};

export const classesFor = (mode: DnaColour): HaploClass[] => (mode === "plain" ? [] : CLASSES[mode]);

/** The person's haplogroup for the mode ("" when not called, or for Y, a woman). */
export const haploOf = (p: DnaPerson, mode: DnaColour) => (mode === "y" ? p[5] : mode === "mt" ? p[6] : "");

/** The class key of a haplogroup ("other" if none fits, "" if there is none). */
export function classOf(h: string, mode: DnaColour): string {
  if (!h || mode === "plain") return "";
  return CLASSES[mode].find((c) => c.test(h))?.key ?? "other";
}

/** The colour of a site: its commonest class among `people` with a called haplogroup (ties: the first class), or
 * NONE_COLOR when nobody's is called. */
export function siteColour(people: DnaPerson[], mode: DnaColour): string {
  if (mode === "plain") return PLAIN_COLOR;
  const counts = new Map<string, number>();
  for (const p of people) {
    const k = classOf(haploOf(p, mode), mode);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (!counts.size) return NONE_COLOR;
  let best = "", n = 0;
  for (const c of [...CLASSES[mode].map((c) => c.key), "other"]) {
    const m = counts.get(c) ?? 0;
    if (m > n) [best, n] = [c, m];
  }
  return CLASSES[mode].find((c) => c.key === best)?.color ?? OTHER_COLOR;
}
