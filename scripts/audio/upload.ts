// Upload every narration, music and ambience clip the app refers to that is not in the bucket yet:
//   npm run audio:upload [-- --dry-run]
// Checks each key over the bucket's public URL (no AWS login needed for that), then uploads the
// missing ones from data/build/audio with `aws s3 cp`. Keys are never overwritten (year-long cache).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { MEDIA_BASE_DEFAULT, uploadArgs } from "./encode.ts";

const files = ["data/curated/events.yaml", "data/curated/entities.yaml", "src/tours/tours.ts", "src/tours/ambience.ts"];
const keys = [...new Set(files.flatMap((f) => readFileSync(f, "utf8").match(/\b(?:narration|music|ambience)\/[a-z]+\/[a-z0-9-]+-v\d+\.mp3/g) ?? []))].sort();

const missing: string[] = [];
await Promise.all(
  keys.map(async (key) => {
    const res = await fetch(`${MEDIA_BASE_DEFAULT}/${key}`, { method: "HEAD" });
    if (res.status !== 200) missing.push(key);
  }),
);
console.log(`${keys.length} clips referenced, ${missing.length} not in the bucket yet`);
let failed = 0;
for (const key of missing.sort()) {
  const local = `data/build/audio/${key}`;
  if (!existsSync(local)) {
    console.error(`✗ ${key}: no local file ${local} (made on another machine?)`);
    failed++;
    continue;
  }
  if (process.argv.includes("--dry-run")) {
    console.log(`  would upload ${key}`);
    continue;
  }
  execFileSync("aws", uploadArgs(local, key), { stdio: "inherit" });
  console.log(`✓ ${key}`);
}
if (failed) process.exit(1);
