// Fails when public/data was built from different curated data / build code than what's committed.
// Run by `npm run build`, so Vercel can't deploy stale data. Fix: npm run data:build, then commit public/data.
import { existsSync, readFileSync } from "node:fs";
import { fingerprint, META_PATH } from "./lib/fingerprint.ts";

const now = fingerprint();
const built = existsSync(META_PATH) ? JSON.parse(readFileSync(META_PATH, "utf8")).inputs_hash : undefined;
if (built !== now.hash) {
  console.error(`✗ public/data is stale: built from inputs ${built ?? "(unknown)"}, current inputs are ${now.hash}.`);
  console.error("  Run `npm run data:build` and commit public/data.");
  process.exit(1);
}
console.log(`OK: public/data matches curated inputs (${now.hash}, ${now.files} files)`);
