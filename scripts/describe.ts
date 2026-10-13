// Set entity descriptions without a full data build:
//   npm run data:describe -- <texts.json>
// texts.json maps entity ids to their new description: { "homo-erectus": "Homo erectus was…", … }.
// Writes each into data/curated/entities.yaml (or events.yaml) and into that entity in
// public/data/entities.json, keeping each record's field order, and updates build-meta.json if
// public/data matched its inputs before. Only descriptions change, so this matches a real build
// (useful where a full build is incomplete, e.g. without the XRONOS download).
// A narrated entity's narration goes stale with its text: re-record with npm run audio:narrate -- --stale.
import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { fingerprint, META_PATH } from "./lib/fingerprint.ts";

const FILES = ["data/curated/entities.yaml", "data/curated/events.yaml"];
const ENTITIES = "public/data/entities.json";
const fail = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const input = process.argv[2] ?? fail("usage: npm run data:describe -- <texts.json>  ({ \"<entity id>\": \"<description>\" })");
const texts = JSON.parse(readFileSync(input, "utf8")) as Record<string, string>;
const meta = JSON.parse(readFileSync(META_PATH, "utf8"));
const wasFresh = meta.inputs_hash === fingerprint().hash;

const yaml = Object.fromEntries(FILES.map((f) => [f, readFileSync(f, "utf8").split("\n")]));
for (const [id, text] of Object.entries(texts)) {
  if (!text.trim()) fail(`${id}: empty description`);
  const file = FILES.find((f) => yaml[f].includes(`- id: ${id}`)) ?? fail(`${id}: no entry in ${FILES.join(" or ")}`);
  const lines = yaml[file];
  const start = lines.indexOf(`- id: ${id}`);
  let i = start + 1;
  while (i < lines.length && !lines[i].startsWith("- id:") && !lines[i].startsWith("  description:")) i++;
  if (!lines[i]?.startsWith("  description:")) fail(`${id}: no description line in ${file} (add one first)`);
  if (lines[i + 1]?.startsWith("    ")) fail(`${id}: description spans several lines in ${file}; make it one line first`);
  lines[i] = `  description: ${JSON.stringify(text)}`;
}
for (const f of FILES) {
  writeFileSync(f, yaml[f].join("\n"));
  const parsed = new Map((parseYaml(yaml[f].join("\n")) as { id: string; description?: string }[]).map((e) => [e.id, e]));
  for (const [id, text] of Object.entries(texts)) if (parsed.has(id) && parsed.get(id)!.description !== text) fail(`${id}: YAML did not read back`);
}

const out = readFileSync(ENTITIES, "utf8").split("\n");
let n = 0;
for (const [i, l] of out.entries()) {
  if (!l.startsWith("{")) continue;
  const comma = l.endsWith(",");
  const e = JSON.parse(comma ? l.slice(0, -1) : l);
  if (!(e.id in texts)) continue;
  e.description = texts[e.id]; // same key, so the field order is kept
  out[i] = JSON.stringify(e) + (comma ? "," : "");
  n++;
}
if (n !== Object.keys(texts).length) fail(`only ${n} of ${Object.keys(texts).length} found in ${ENTITIES}`);
writeFileSync(ENTITIES, out.join("\n"));
if (wasFresh) writeFileSync(META_PATH, JSON.stringify({ ...meta, inputs_hash: fingerprint().hash }) + "\n");

for (const [id, text] of Object.entries(texts)) console.log(`✓ ${id} (${text.length} characters)`);
console.log(wasFresh ? `Updated ${ENTITIES} and ${META_PATH}.` : `! public/data was already out of date: run npm run data:build.`);
