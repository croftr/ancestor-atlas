export type Category = "species" | "culture" | "civilization" | "event";
export const CATEGORIES: Category[] = ["species", "culture", "civilization", "event"];

/** Registry entry (public/data/entities.json): one per species / culture / civilization / group. */
export interface Entity {
  id: string; // == feature.entity_id
  name: string;
  category: Category;
  start_year: number; // overall span, astronomical
  end_year: number;
  description: string;
  wikidata?: string;
  wikipedia_url?: string;
  source_ids: string[]; // keys into sources.json
  parent_id?: string; // optional group entity
  group?: boolean; // umbrella entity with no geometry of its own
  color?: string; // civilizations: build-time colour
  image_url?: string; // optional WebP image asset URL
  image_credit?: string; // required with image_url: author/licence, or that it is AI-generated
  /** Shared stand-in picture (picture-groups.yaml), shown until the entity has its own. */
  fallback_image?: { url: string; credit: string; label: string };
  // Events only
  year?: number; // best date (start_year..end_year is the stated range, or equal to it)
  date_text?: string; // the date as written, e.g. "c. 3.3 million years ago"
  related_ids?: string[]; // species / cultures / civilizations the event concerns
}

/** Feature properties (public/data/features.geojson). Flat so MapLibre can filter on them. */
export interface FeatureProps {
  id: string; // "homo-erectus@dmanisi"
  entity_id: string;
  category: Category; // duplicated for GPU filtering
  start_year: number; // astronomical
  end_year: number;
  label?: string;
  date_text?: string;
  confidence?: "high" | "medium" | "low";
  weight?: number; // culture heatmap intensity 0–1
  source_id: string;
  source_ref?: string;
  refs?: string; // publications behind the dates (bulk sources), "; "-separated
  via?: string; // radiocarbon compilations the dates were taken from (bulk sources), "; "-separated
  color?: string; // civilizations: fill colour
  line_color?: string; // civilizations: darker outline colour
  wikipedia_phrase?: string; // per-row Wikipedia page, when it differs from the entity's
  // Evidence for curated point sites (species/culture). Empty on a `recall` row until it is checked.
  wikidata?: string; // site QID, e.g. "Q20573231"
  coord_source?: string; // where lat/lon came from, e.g. "wikidata:Q20573231#P625", "doi:10.1126/…"
  notes?: string; // caveat shown on the card, e.g. place-level coordinates (events)
  date_source?: string; // where the dates came from, e.g. "doi:10.1038/…", "wikipedia:Dmanisi_hominins@1378502810"
}

/** Entry of public/data/sources.json. */
export interface Source {
  id: string;
  name: string;
  url: string;
  licence: string;
  citation: string;
}

export const wikipediaUrl = (phrase: string) =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent(phrase.replace(/ /g, "_")).replace(/%2F/g, "/")}`;
