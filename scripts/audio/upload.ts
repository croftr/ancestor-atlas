// Upload every narration, music, ambience and video clip the app refers to that is not in the bucket yet:
//   npm run audio:upload [-- --dry-run]
// Checks each key over the bucket's public URL (no AWS login needed for that), then uploads the
// missing ones from data/build/audio or data/build/video with `aws s3 cp`. Keys are never overwritten (year-long cache).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { BUCKET, MEDIA_BASE_DEFAULT, REGION, uploadArgs } from "./encode.ts";

const files = ["data/curated/events.yaml", "data/curated/entities.yaml", "src/tours/tours.ts", "src/tours/ambience.ts"];
const keys = [
  ...new Set(
    files.flatMap((f) => readFileSync(f, "utf8").match(/\b(?:(?:narration|music|ambience)\/[a-z]+\/(?:[a-z0-9-]+\/)?[a-z0-9-]+-v\d+\.mp3|video\/[a-z]+\/[a-z0-9-]+-v\d+\.mp4)/g) ?? []),
  ),
].sort();

const videoUploadArgs = (out: string, key: string) => [
  "s3", "cp", out, `s3://${BUCKET}/${key}`, "--content-type", "video/mp4",
  "--cache-control", "public, max-age=31536000, immutable", "--region", REGION, "--only-show-errors",
];

const missing: string[] = [];
// A few at a time: all of them at once (130+) time out connecting.
const queue = [...keys];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let key; (key = queue.shift()); ) {
      const res = await fetch(`${MEDIA_BASE_DEFAULT}/${key}`, { method: "HEAD" });
      if (res.status !== 200) missing.push(key);
    }
  }),
);
console.log(`${keys.length} clips referenced, ${missing.length} not in the bucket yet`);
let failed = 0;
for (const key of missing.sort()) {
  const isVideo = key.endsWith(".mp4");
  const local = isVideo ? `data/build/${key}` : `data/build/audio/${key}`;
  if (!existsSync(local)) {
    console.error(`✗ ${key}: no local file ${local} (made on another machine?)`);
    failed++;
    continue;
  }
  if (process.argv.includes("--dry-run")) {
    console.log(`  would upload ${key}`);
    continue;
  }
  execFileSync("aws", isVideo ? videoUploadArgs(local, key) : uploadArgs(local, key), { stdio: "inherit" });
  console.log(`✓ ${key}`);
}
if (failed) process.exit(1);
