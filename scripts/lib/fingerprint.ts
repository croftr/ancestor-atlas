// Fingerprint of everything that determines public/data: the curated files and the build code.
// data:build records it in public/data/build-meta.json; `npm run build` (what Vercel runs) refuses to
// ship if the curated data has changed since public/data was last built.
// Line endings are normalised so Windows and Linux checkouts agree. data/raw is not in git; the raw files data:build
// reads count through their hashes in data/sources.lock.json (scripts/lib/raw-store.ts), so locking a new XRONOS,
// Cliopatria or Wikidata snapshot makes public/data stale until it is rebuilt.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { RAW_SOURCES, readLock } from "./raw-store.ts";

export const FINGERPRINT_INPUTS = [
  "data/curated",
  "scripts/build-data.ts",
  "scripts/ingest",
  "scripts/lib/colors.ts",
  "scripts/lib/dates.ts",
  "scripts/lib/calibrate.ts",
  "scripts/lib/countries.ts",
  "scripts/lib/regions.ts",
  "scripts/lib/qa.ts",
  "data/reference",
];
export const META_PATH = "public/data/build-meta.json";

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .filter((n) => !n.endsWith(".test.ts"))
    .flatMap((n) => files(join(path, n)));
}

export function fingerprint(root = "."): { hash: string; files: number } {
  const list = FINGERPRINT_INPUTS.flatMap((p) => files(join(root, p))).map((f) => f.replace(/\\/g, "/")).sort();
  const h = createHash("sha256");
  for (const f of list) h.update(f.slice(root === "." ? 0 : root.length + 1)).update("\0").update(readFileSync(f, "utf8").replace(/\r\n/g, "\n")).update("\0");
  const lock = readLock(root);
  for (const s of RAW_SOURCES.filter((s) => s.build && lock[s.id]))
    for (const f of lock[s.id].files) h.update(`raw:${f.path}`).update("\0").update(f.sha256).update("\0");
  return { hash: h.digest("hex").slice(0, 16), files: list.length };
}
