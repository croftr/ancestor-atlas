// The public change log (docs/data-updates.md, step 4), written by `npm run data:update -- --publish`
// (scripts/update/changelog.ts) and shown at #/updates: public/data/changelog.json holds one small entry per published
// update, newest first; public/data/changelog/<id>.json the details, loaded when an entry is opened.

/** A raw source that moved on: XRONOS "retrieved 2026-10-06" to "retrieved 2026-10-23", Cliopatria "v0.2.1" to "v0.3"… */
export interface SourceBump { id: string; from: string; to: string }
export type CategoryCounts = Partial<Record<"species" | "culture" | "civilization" | "event", number>>;

export interface LogEntry {
  /** The date, with -2, -3… for a second update on one day. */
  id: string;
  date: string;
  sources: SourceBump[];
  added: CategoryCounts;
  removed: CategoryCounts;
  changed: number;
  entitiesAdded: number;
  genomesAdded: number;
  genomesRemoved: number;
  held: number;
}

export interface LogSite { id: string; entity_id: string; entity: string; category: string; label?: string; date_text?: string; source_id: string; lat?: number; lon?: number }
export interface LogEntity { id: string; name: string; category: string }

export interface DnaChanges {
  release?: { from: string; to: string };
  peopleAdded: number;
  peopleRemoved: number;
  sitesAdded: { id: string; name: string; country: string; people: number }[];
  sitesRemoved: { id: string; name: string; country: string; people: number }[];
}

/** Something an update brought in that looked doubtful, left off the map until a person checks it. */
export interface LogHeld { id: string; kind: "feature" | "entity"; entity_id: string; label: string; reason: string; held: string; status: "held" | "confirmed" }

export interface LogDetails {
  entry: LogEntry;
  added: LogSite[];
  removed: LogSite[];
  /** `was`: the site's earlier name, when it was renamed or merged into this one. */
  changed: (LogSite & { fields: string[]; was?: string })[];
  entities: { added: LogEntity[]; removed: LogEntity[]; changed: (Omit<LogEntity, "category"> & { fields: string[] })[] };
  dna: DnaChanges;
  held: LogHeld[];
}
