// Held back: bulk data an update brought in that looked doubtful (docs/data-updates.md, "When unsure, leave it out").
// data/curated/held-back.csv lists it; data:build leaves out every feature (XRONOS or ROAD point) or entity (a
// Cliopatria polity) whose status is "held". Changing a row's status to "confirmed" lets that item in at the next
// build. Rows are never deleted: the update screens only items not listed yet, so a decision is asked for once.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

export const HELD_PATH = "data/curated/held-back.csv";
export const HELD_COLUMNS = ["id", "kind", "entity_id", "label", "reason", "held", "status"] as const;

export interface HeldRow {
  /** Feature id (entity@x:slug, entity@r:slug) or, for kind "entity", the entity id. */
  id: string;
  kind: "feature" | "entity";
  entity_id: string;
  label: string;
  reason: string;
  /** Date it was held back (YYYY-MM-DD). */
  held: string;
  /** "held": left out (a person may write why in `reason`); "confirmed": a person checked it, let it in. */
  status: "held" | "confirmed";
}

export const readHeld = (path = HELD_PATH): HeldRow[] =>
  existsSync(path) ? (parse(readFileSync(path, "utf8"), { columns: true, skip_empty_lines: true }) as HeldRow[]) : [];

/** Ids the build leaves out: every row not confirmed. */
export const heldIds = (path = HELD_PATH) => new Set(readHeld(path).filter((r) => r.status !== "confirmed").map((r) => r.id));

const q = (x: string) => (/[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);

/** Adds rows (an id already listed is kept as it was). */
export function addHeld(rows: HeldRow[], path = HELD_PATH) {
  const all = readHeld(path);
  const have = new Set(all.map((r) => r.id));
  for (const r of rows) if (!have.has(r.id)) all.push(r);
  writeFileSync(path, [HELD_COLUMNS.join(","), ...all.map((r) => HELD_COLUMNS.map((c) => q(String(r[c] ?? ""))).join(","))].join("\n") + "\n");
}
