// Prepare an event narration for the media bucket:
//   npm run audio:narration -- <recording> <event id> [credit]
// Normalises loudness (-16 LUFS, peaks under -1.5 dBTP), encodes mono 96 kbps MP3, and writes
// data/build/audio/narration/events/<id>-v<n>.mp3, n one past the version in events.yaml (keys are
// never overwritten: the bucket serves them with a year-long cache). Sets the event's `narration`
// in events.yaml (src, credit, text_hash of the description) and prints the upload command.
import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { textHash } from "../lib/text-hash.ts";
import { encode, uploadCommand } from "./encode.ts";

const EVENTS = "data/curated/events.yaml";
const [input, id, credit = "AI-generated narration"] = process.argv.slice(2);
if (!input || !id) {
  console.error("usage: npm run audio:narration -- <recording> <event id> [credit]");
  process.exit(1);
}

const yamlText = readFileSync(EVENTS, "utf8");
const events = parseYaml(yamlText) as { id: string; description: string; narration?: { src: string } }[];
const ev = events.find((e) => e.id === id);
if (!ev) {
  console.error(`✗ no event ${id} in ${EVENTS}`);
  process.exit(1);
}
const version = Number(ev.narration?.src.match(/-v(\d+)\.mp3$/)?.[1] ?? 0) + 1;
const key = `narration/events/${id}-v${version}.mp3`;
const out = `data/build/audio/${key}`;

const seconds = encode(input, out, { channels: 1, kbps: 96 });

// Set the event's narration line in place (keeps the file's layout): replace one, or add it before date_source.
const line = `  narration: { src: ${key}, credit: ${JSON.stringify(credit)}, text_hash: "${textHash(ev.description)}" }`;
const lines = yamlText.split("\n");
const start = lines.indexOf(`- id: ${id}`);
let end = lines.findIndex((l, i) => i > start && l.startsWith("- id:"));
if (end < 0) end = lines.length;
const block = lines.slice(start, end);
const at = block.findIndex((l) => l.startsWith("  narration:"));
if (at >= 0) block[at] = line;
else {
  const ds = block.findIndex((l) => l.startsWith("  date_source:") || l.startsWith("  places:"));
  block.splice(ds < 0 ? block.length : ds, 0, line);
}
lines.splice(start, end - start, ...block);
writeFileSync(EVENTS, lines.join("\n"));

console.log(`✓ ${out} (${seconds.toFixed(1)} s)`);
console.log(`✓ ${EVENTS}: ${id} narration -> ${key}`);
console.log(`\nUpload (new key, never overwrite):\n  ${uploadCommand(out, key)}`);
console.log(`\nThen: npm run data:build, and commit events.yaml with public/data.`);
