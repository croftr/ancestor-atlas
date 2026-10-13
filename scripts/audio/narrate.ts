// Narrate entities (events, species, cultures, civilizations), from the card's description to a clip in the bucket:
//   npm run audio:narrate -- <id> [<id>…]               generate with ElevenLabs
//   npm run audio:narrate -- --missing [--yes]          every event without a narration
//   npm run audio:narrate -- --tour <tour id> [--yes]   every stop of a tour without a narration
//   npm run audio:narrate -- --stale [--yes]            everything whose description changed since recording
//   npm run audio:narrate -- <id> --file <mp3>          use a recording you made instead
//   npm run audio:narrate -- --voices                   list your ElevenLabs voices (to pick ELEVENLABS_VOICE_ID)
// Options: --no-upload (prepare only; prints the upload command), --credit "<text>".
//
// Per entity: text-to-speech of the description as built (the text on its card) (ElevenLabs API; cached in data/build/audio/tts by text,
// so a re-run after a failed upload costs nothing), loudness-normalised mono MP3, uploaded to
// narration/<category>/<id>-v<n>.mp3 (a new key every time: the bucket caches for a year), then the
// entity's narration is set in events.yaml or entities.yaml and in public/data, so there is nothing to
// rebuild: commit both. A species, culture or civilization needs an entry in entities.yaml.
// Settings in .env.local (gitignored): ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, optional ELEVENLABS_MODEL.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { NARRATION_FOLDER, textHash } from "../lib/text-hash.ts";
import { TOURS } from "../../src/tours/tours.ts";
import { fingerprint, META_PATH } from "../lib/fingerprint.ts";
import { BUCKET, encode, uploadArgs, uploadCommand } from "./encode.ts";

const EVENTS = "data/curated/events.yaml";
const CURATED_ENTITIES = "data/curated/entities.yaml";
const ENTITIES = "public/data/entities.json";
const API = "https://api.elevenlabs.io/v1";
const MODEL_DEFAULT = "eleven_multilingual_v2";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const option = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = option("--file");
const ids = args.filter((a, i) => !a.startsWith("--") && !["--file", "--credit", "--tour"].includes(args[i - 1]));
const fail = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const apiKey = () => process.env.ELEVENLABS_API_KEY || fail("set ELEVENLABS_API_KEY in .env.local (ElevenLabs: Profile → API keys)");
async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { "xi-api-key": apiKey(), ...init.headers } });
  if (!res.ok) throw new Error(`ElevenLabs ${path.split("?")[0]}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res;
}

if (flag("--voices")) {
  const { voices } = (await (await api("/voices")).json()) as { voices: { voice_id: string; name: string; category: string }[] };
  for (const v of voices) console.log(`${v.voice_id}  ${v.name} (${v.category})`);
  process.exit(0);
}

/** An entity to narrate: its text as built (the card's), and the curated file that carries its narration. */
interface Target {
  id: string;
  category: keyof typeof NARRATION_FOLDER;
  description: string;
  narration?: { src: string; text_hash: string };
  file: string;
}
const built = new Map(
  readFileSync(ENTITIES, "utf8")
    .split("\n")
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l.replace(/,$/, "")))
    .map((e: Target) => [e.id, e]),
);
const yamlFiles: Record<string, string> = { [EVENTS]: readFileSync(EVENTS, "utf8"), [CURATED_ENTITIES]: readFileSync(CURATED_ENTITIES, "utf8") };
const curatedIn = new Map<string, string>();
for (const f of [EVENTS, CURATED_ENTITIES]) for (const e of parseYaml(yamlFiles[f]) as { id: string }[]) curatedIn.set(e.id, f);
const target = (id: string): Target => {
  const e = built.get(id) ?? fail(`no entity ${id} in ${ENTITIES}`);
  const file = curatedIn.get(id) ?? fail(`${id} has no entry in ${CURATED_ENTITIES}: add one (id, category) first`);
  if (!e.description) fail(`${id} has no description`);
  return { id, category: e.category, description: e.description, narration: e.narration, file };
};
const tourId = option("--tour");
const tour = tourId ? (TOURS.find((t) => t.id === tourId) ?? fail(`no tour ${tourId}`)) : undefined;
const targets: Target[] = flag("--missing")
  ? [...built.values()].filter((e) => e.category === "event" && !e.narration).map((e) => target(e.id))
  : tour
    ? [...new Set(tour.stops.map((st) => st.entity))].map(target).filter((e) => !e.narration)
    : flag("--stale")
      ? [...built.values()].filter((e) => e.narration && e.narration.text_hash !== textHash(e.description)).map((e) => target(e.id))
      : ids.map(target);
if (targets.length === 0) fail(ids.length || tour || flag("--missing") || flag("--stale") ? "nothing to narrate" : "usage: see the top of scripts/audio/narrate.ts");
if (file && targets.length !== 1) fail("--file takes one entity");

// A batch spends ElevenLabs characters: show what it will cost and ask for --yes.
if (!file) {
  const chars = targets.reduce((n, e) => n + e.description.length, 0);
  // The quota needs the key's "User: read" permission; a key restricted to text-to-speech skips it.
  const sub = await fetch(`${API}/user/subscription`, { headers: { "xi-api-key": apiKey() } });
  const left = sub.ok ? ((await sub.json()) as { character_count: number; character_limit: number }) : null;
  console.log(
    `${targets.length} to narrate, ${chars.toLocaleString("en-US")} characters` +
      (left ? `; ElevenLabs quota left: ${(left.character_limit - left.character_count).toLocaleString("en-US")}` : " (quota not shown: the API key lacks User read)"),
  );
  if (targets.length > 1 && !flag("--yes")) {
    for (const e of targets) console.log(`  ${e.id} (${e.description.length})`);
    console.log("Run again with --yes to go ahead.");
    process.exit(0);
  }
}
const voice = file ? "" : process.env.ELEVENLABS_VOICE_ID || fail("set ELEVENLABS_VOICE_ID in .env.local (npm run audio:narrate -- --voices lists them)");
const credit = option("--credit") ?? (file ? "AI-generated narration" : "AI-generated narration (ElevenLabs)");

/** The description spoken, cached by its text so the same words are never paid for twice. */
async function speak(e: Target): Promise<string> {
  const path = `data/build/audio/tts/${e.id}-${textHash(e.description)}.mp3`;
  if (existsSync(path)) return path;
  const res = await api(`/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: e.description, model_id: process.env.ELEVENLABS_MODEL || MODEL_DEFAULT }),
  });
  mkdirSync("data/build/audio/tts", { recursive: true });
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

/** Upload to a key that must not exist yet. False if it could not (the command to run is printed). */
function upload(out: string, key: string): boolean {
  if (flag("--no-upload")) return false;
  const head = spawnSync("aws", ["s3api", "head-object", "--bucket", BUCKET, "--key", key], { encoding: "utf8" });
  if (head.status === 0) fail(`s3://${BUCKET}/${key} already exists (keys are never overwritten)`);
  if (!/Not Found|404/.test(head.stderr)) {
    console.error(`! could not reach S3 (${head.stderr.trim().split("\n").at(-1)}); log in to AWS, or upload by hand:`);
    return false;
  }
  execFileSync("aws", uploadArgs(out, key), { stdio: "inherit" });
  return true;
}

/**
 * Set the entity's narration line in its YAML file, keeping the file's layout: replace it, or add it
 * (events: before date_source; entities.yaml: straight after the description, where public/data has it).
 */
function setYaml(text: string, id: string, line: string, isEvent: boolean): string {
  const lines = text.split("\n");
  const start = lines.indexOf(`- id: ${id}`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith("- id:"));
  if (end < 0) end = lines.length;
  const block = lines.slice(start, end);
  const at = block.findIndex((l) => l.startsWith("  narration:"));
  if (at >= 0) block[at] = line;
  else if (isEvent) {
    const ds = block.findIndex((l) => l.startsWith("  date_source:") || l.startsWith("  places:"));
    block.splice(ds < 0 ? block.length : ds, 0, line);
  } else {
    let d = block.findIndex((l) => l.startsWith("  description:"));
    if (d < 0) fail(`${id}: no description in its YAML entry to narrate`);
    while (block[d + 1]?.startsWith("    ")) d++; // a description over several lines
    block.splice(d + 1, 0, line);
  }
  lines.splice(start, end - start, ...block);
  return lines.join("\n");
}

/**
 * Put the narration on the entity in public/data where the build would: events before source_ids;
 * civilizations (Cliopatria records with curated fields laid over them) after source_ids; species and
 * cultures (built from entities.yaml in its key order) after description.
 */
function setEntity(text: string, id: string, narration: object): string {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.includes(`"id":${JSON.stringify(id)},`));
  if (i < 0) fail(`${id} not in ${ENTITIES}`);
  const comma = lines[i].endsWith(",");
  const { narration: _old, ...rest } = JSON.parse(comma ? lines[i].slice(0, -1) : lines[i]);
  const after = rest.category === "event" ? null : rest.category === "civilization" ? "source_ids" : "description";
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (k === "source_ids" && after === null) out.narration = narration;
    out[k] = v;
    if (k === after) out.narration = narration;
  }
  lines[i] = JSON.stringify(out) + (comma ? "," : "");
  return lines.join("\n");
}

const META = JSON.parse(readFileSync(META_PATH, "utf8"));
const wasFresh = META.inputs_hash === fingerprint().hash;
let entities = readFileSync(ENTITIES, "utf8");
const pending: string[] = [];

for (const e of targets) {
  const version = Number(e.narration?.src.match(/-v(\d+)\.mp3$/)?.[1] ?? 0) + 1;
  const key = `narration/${NARRATION_FOLDER[e.category]}/${e.id}-v${version}.mp3`;
  const out = `data/build/audio/${key}`;
  let source: string;
  try {
    source = file ?? (await speak(e));
  } catch (err) {
    // Out of credit, say: keep what is done so far; a re-run picks up the rest.
    console.error(`✗ ${e.id}: ${(err as Error).message}\n  Stopping here; the clips above are kept. Run the same command again later for the rest.`);
    break;
  }
  const seconds = encode(source, out, { channels: 1, kbps: 96 });
  const uploaded = upload(out, key);
  console.log(`${uploaded ? "✓" : "…"} ${e.id}: ${key} (${seconds.toFixed(1)} s)${uploaded ? "" : " not uploaded"}`);
  if (!uploaded) pending.push(uploadCommand(out, key));
  const narration = { src: key, credit, text_hash: textHash(e.description) };
  yamlFiles[e.file] = setYaml(yamlFiles[e.file], e.id, `  narration: { src: ${key}, credit: ${JSON.stringify(credit)}, text_hash: "${narration.text_hash}" }`, e.category === "event");
  entities = setEntity(entities, e.id, narration);
}

const changed = [...new Set(targets.map((t) => t.file))];
for (const f of changed) writeFileSync(f, yamlFiles[f]);
writeFileSync(ENTITIES, entities);
// public/data matched its inputs before, and only narration changed: it still does.
if (wasFresh) writeFileSync(META_PATH, JSON.stringify({ ...META, inputs_hash: fingerprint().hash }) + "\n");
else console.warn("! public/data was already out of date before this run: run npm run data:build");

console.log(`\nUpdated ${[...changed, ENTITIES].join(", ")}: commit them${wasFresh ? ` (with ${META_PATH})` : ""}.`);
if (pending.length) console.log(`\n${pending.length} clip(s) still to upload: npm run audio:upload (with your AWS login)`);
