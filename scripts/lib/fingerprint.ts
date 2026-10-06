// Fingerprint of everything that determines public/data: the curated files and the build code.
// data:build records it in public/data/build-meta.json; `npm run build` (what Vercel runs) refuses to
// ship if the curated data has changed since public/data was last built.
// Line endings are normalised so Windows and Linux checkouts agree. data/raw is not in git, so it
// can't be fingerprinted; re-run data:build after re-fetching raw data.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const FINGERPRINT_INPUTS = [
  "data/curated",
  "scripts/build-data.ts",
  "scripts/ingest",
  "scripts/lib/colors.ts",
  "scripts/lib/dates.ts",
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
  return { hash: h.digest("hex").slice(0, 16), files: list.length };
}
