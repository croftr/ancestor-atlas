// Prepare a tour's intro video (played before its title card) for the media bucket:
//   npm run video:intro -- <video> <tour id> ["<credit>"]
// H.264 (CRF 23, at most 1280 wide, faststart) with its sound normalised to -16 LUFS, as narration and
// music, at data/build/video/intro/tours/<id>-v<n>.mp4, n one past the version in src/tours/tours.ts
// (keys are never overwritten). Sets the tour's `intro` there; `npm run audio:upload` uploads it.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { localPath, loudnormFilter, uploadCommand } from "./encode.ts";

const TOURS = "src/tours/tours.ts";
const [input, id, credit] = process.argv.slice(2);
if (!input || !id) {
  console.error('usage: npm run video:intro -- <video> <tour id> ["<credit>"]');
  process.exit(1);
}

const lines = readFileSync(TOURS, "utf8").split("\n");
const start = lines.indexOf(`    id: "${id}",`);
if (start < 0) {
  console.error(`✗ no tour ${id} in ${TOURS}`);
  process.exit(1);
}
const end = lines.findIndex((l, i) => i > start && l.startsWith("    stops:"));
const at = lines.slice(start, end).findIndex((l) => l.startsWith("    intro:"));
const current = at >= 0 ? lines[start + at].match(/-v(\d+)\.mp4/)?.[1] : undefined;
const key = `intro/tours/${id}-v${Number(current ?? 0) + 1}.mp4`;
const out = localPath(key);
mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });

const sound = loudnormFilter(input);
execFileSync(
  "ffmpeg",
  ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-map_metadata", "-1",
    "-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
    ...(sound ? ["-af", sound, "-c:a", "aac", "-b:a", "160k", "-ar", "48000"] : ["-an"]),
    "-movflags", "+faststart", out],
  { stdio: "inherit" },
);
const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], { encoding: "utf8" }));

const line = `    intro: { video: "${key}"${credit ? `, credit: ${JSON.stringify(credit)}` : ""} },`;
if (at >= 0) lines[start + at] = line;
else lines.splice(end, 0, line);
writeFileSync(TOURS, lines.join("\n"));

console.log(`✓ ${out} (${seconds.toFixed(1)} s, ${(statSync(out).size / 1e6).toFixed(1)} MB${sound ? "" : ", no sound"})`);
console.log(`✓ ${TOURS}: ${id} intro -> ${key}`);
console.log(`\nUpload (new key, never overwrite): npm run audio:upload, or\n  ${uploadCommand(out, key)}`);
