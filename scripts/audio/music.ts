// Prepare a tour's background music for the media bucket:
//   npm run audio:music -- <track> <tour id> "<credit>"
// Normalises loudness (-16 LUFS, as narration; the app mixes it lower), encodes stereo 128 kbps MP3
// at data/build/audio/music/tours/<id>-v<n>.mp3, n one past the version in src/tours/tours.ts (keys
// are never overwritten), sets the tour's `music` there and prints the upload command.
import { readFileSync, writeFileSync } from "node:fs";
import { encode, uploadCommand } from "./encode.ts";

const TOURS = "src/tours/tours.ts";
const [input, id, credit] = process.argv.slice(2);
if (!input || !id || !credit) {
  console.error('usage: npm run audio:music -- <track> <tour id> "<credit: title, artist, licence>"');
  process.exit(1);
}

const lines = readFileSync(TOURS, "utf8").split("\n");
const start = lines.indexOf(`    id: "${id}",`);
if (start < 0) {
  console.error(`✗ no tour ${id} in ${TOURS}`);
  process.exit(1);
}
let end = lines.findIndex((l, i) => i > start && l.startsWith("    stops:"));
const at = lines.slice(start, end).findIndex((l) => l.startsWith("    music:"));
const current = at >= 0 ? lines[start + at].match(/-v(\d+)\.mp3/)?.[1] : undefined;
const key = `music/tours/${id}-v${Number(current ?? 0) + 1}.mp3`;
const out = `data/build/audio/${key}`;

const seconds = encode(input, out, { channels: 2, kbps: 128 });

const line = `    music: { src: "${key}", credit: ${JSON.stringify(credit)} },`;
if (at >= 0) lines[start + at] = line;
else lines.splice(end, 0, line);
writeFileSync(TOURS, lines.join("\n"));

console.log(`✓ ${out} (${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")})`);
console.log(`✓ ${TOURS}: ${id} music -> ${key}`);
console.log(`\nUpload (new key, never overwrite):\n  ${uploadCommand(out, key)}`);
