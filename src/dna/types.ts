/**
 * The ancient DNA layer's data (public/data/dna.json), written by scripts/ingest/aadr.ts from the Allen Ancient
 * DNA Resource. Kept out of features.geojson: it loads only when the layer is switched on.
 */
export interface DnaData {
  /** AADR release, e.g. "v66.p1". */
  release: string;
  /** Publications: [label, DOI link or ""]; people point into this list. */
  pubs: [label: string, url: string][];
  sites: DnaSite[];
}

export interface DnaSite {
  /** "dna:<lat>,<lon>" (3 decimals): stable across rebuilds while the coordinates stay put. */
  id: string;
  /** The locality without AADR's bracketed admin regions, which `place` keeps (when there were any). */
  name: string;
  place?: string;
  country: string;
  lon: number;
  lat: number;
  /** Earliest start and latest end of the people's date ranges (astronomical years). */
  start: number;
  end: number;
  /** Oldest first. */
  people: DnaPerson[];
}

/**
 * One individual, as a tuple to keep the file small: AADR individual id; 95% date range (astronomical years);
 * AADR's date text; molecular sex (M, F or U); Y and mtDNA haplogroups ("" if not called); AADR group label;
 * index into `pubs`; linked culture entity id ("" if none).
 */
export type DnaPerson = [
  id: string,
  start: number,
  end: number,
  dateText: string,
  sex: string,
  y: string,
  mt: string,
  group: string,
  pub: number,
  culture: string,
];

export const AADR_CITATION =
  "Mallick, S. et al. The Allen Ancient DNA Resource (AADR): a curated compendium of ancient human genomes. Scientific Data (2024). https://doi.org/10.1038/s41597-024-03031-7";
export const AADR_DATASET_URL = "https://doi.org/10.7910/DVN/FFIDCW";
