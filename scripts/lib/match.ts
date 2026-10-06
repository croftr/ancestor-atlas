// Scoring Wikidata candidates for a curated site row. Pure, so it can be unit-tested.
import { normaliseLabel } from "./qa.ts";

const SITE_WORDS = /archaeolog|palaeo|paleo|fossil|hominin|cave|rock ?shelter|excavation|prehistoric|site|gorge|formation|tell\b|mound|shelter/i;
const PLACE_WORDS = /village|town|city|human settlement|municipalit|commune|county|district|prefecture|province|census|neighbourhood|neighborhood/i;
const NOISE_WORDS = /disambiguation|family name|given name|surname|human\b|taxon|scholarly article|film|album|band|asteroid|ship|book/i;

/** Name variants to search for: "Grotte du Renne (Arcy-sur-Cure)" -> ["Grotte du Renne (Arcy-sur-Cure)", "Grotte du Renne", "Arcy-sur-Cure"]. */
export function nameVariants(label: string): string[] {
  const out = [label.trim()];
  const base = label.replace(/\(.*?\)/g, "").trim();
  if (base && base !== out[0]) out.push(base);
  for (const m of label.matchAll(/\(([^)]+)\)/g))
    for (const part of m[1].split(/[\/;,]/).map((s) => s.trim()))
      if (part && !/^(member|layer|level|bed|unit|area)\b/i.test(part) && !/^\d/.test(part)) out.push(part);
  return [...new Set(out)];
}

export interface Candidate {
  qid: string;
  label?: string;
  description?: string;
  typeLabels: string[];
  distanceKm?: number;
  enwiki?: string;
  byName: boolean;
  byGeo: boolean;
}

export function scoreCandidate(c: Candidate, siteLabel: string): number {
  const text = `${c.description ?? ""} ${c.typeLabels.join(" ")}`;
  let s = 0;
  if (SITE_WORDS.test(text)) s += 3;
  if (PLACE_WORDS.test(text)) s -= 2;
  if (NOISE_WORDS.test(text)) s -= 5;
  const d = c.distanceKm;
  if (d === undefined) s -= 2;
  else if (d < 2) s += 3;
  else if (d < 10) s += 2;
  else if (d < 50) s += 1;
  else if (d > 300) s -= 3;
  if (c.enwiki) s += 1;
  if (c.byName && c.byGeo) s += 1;
  const wanted = new Set(nameVariants(siteLabel).map(normaliseLabel));
  if (c.label && wanted.has(normaliseLabel(c.label))) s += 2;
  return s;
}
