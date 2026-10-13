// Narrate events, from the description to a clip in the bucket:
//   npm run audio:narrate -- <event id> [<event id>…]   generate with ElevenLabs
//   npm run audio:narrate -- --missing [--yes]          every event without a narration
//   npm run audio:narrate -- --stale [--yes]            every event whose description changed since recording
//   npm run audio:narrate -- <event id> --file <mp3>    use a recording you made instead
//   npm run audio:narrate -- --voices                   list your ElevenLabs voices (to pick ELEVENLABS_VOICE_ID)
// Options: --no-upload (prepare only; prints the upload command), --credit "<text>".
//
// Per event: text-to-speech of the description (ElevenLabs API; cached in data/build/audio/tts by text,
// so a re-run after a failed upload costs nothing), loudness-normalised mono MP3, uploaded to
// narration/events/<id>-v<n>.mp3 (a new key every time: the bucket caches for a year), then events.yaml
// and that event in public/data are updated, so there is nothing to rebuild: commit both.
// Settings in .env.local (gitignored): ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, optional ELEVENLABS_MODEL.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { textHash } from "../lib/text-hash.ts";
import { fingerprint, META_PATH } from "../lib/fingerprint.ts";
import { BUCKET, encode, uploadCommand } from "./encode.ts";

const EVENTS = "data/curated/events.yaml";
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
const ids = args.filter((a, i) => !a.startsWith("--") && !["--file", "--credit"].includes(args[i - 1]));
const fail = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const apiKey = () => process.env.ELEVENLABS_API_KEY || fail("set ELEVENLABS_API_KEY in .env.local (ElevenLabs: Profile → API keys)");
async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { "xi-api-key": apiKey(), ...init.headers } });
  if (!res.ok) fail(`ElevenLabs ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res;
}

if (flag("--voices")) {
  const { voices } = (await (await api("/voices")).json()) as { voices: { voice_id: string; name: string; category: string }[] };
  for (const v of voices) console.log(`${v.voice_id}  ${v.name} (${v.category})`);
  process.exit(0);
}

interface CuratedEvent {
  id: string;
  name: string;
  description: string;
  narration?: { src: string; text_hash: string };
}
const yamlText = readFileSync(EVENTS, "utf8");
const events = parseYaml(yamlText) as CuratedEvent[];
const targets = flag("--missing")
  ? events.filter((e) => !e.narration)
  : flag("--stale")
    ? events.filter((e) => e.narration && e.narration.text_hash !== textHash(e.description))
    : ids.map((id) => events.find((e) => e.id === id) ?? fail(`no event ${id} in ${EVENTS}`));
if (targets.length === 0) fail(ids.length || flag("--missing") || flag("--stale") ? "nothing to narrate" : "usage: see the top of scripts/audio/narrate.ts");
if (file && targets.length !== 1) fail("--file takes one event");

// A batch spends ElevenLabs characters: show what it will cost and ask for --yes.
if (!file) {
  const chars = targets.reduce((n, e) => n + e.description.length, 0);
  // The quota needs the key's "User: read" permission; a key restricted to text-to-speech skips it.
  const sub = await fetch(`${API}/user/subscription`, { headers: { "xi-api-key": apiKey() } });
  const left = sub.ok ? ((await sub.json()) as { character_count: number; character_limit: number }) : null;
  console.log(
    `${targets.length} event(s), ${chars.toLocaleString("en-US")} characters` +
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
async function speak(e: CuratedEvent): Promise<string> {
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
  execFileSync("aws", ["s3", "cp", out, `s3://${BUCKET}/${key}`, "--content-type", "audio/mpeg", "--cache-control", "public, max-age=31536000, immutable", "--only-show-errors"], {
    stdio: "inherit",
  });
  return true;
}

/** Set the event's narration line in events.yaml, keeping the file's layout. */
function setYaml(text: string, id: string, line: string): string {
  const lines = text.split("\n");
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
  return lines.join("\n");
}

/** Put the narration on the event in public/data as the build would (just before source_ids). */
function setEntity(text: string, id: string, narration: object): string {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.includes(`"id":${JSON.stringify(id)},`));
  if (i < 0) fail(`${id} not in ${ENTITIES}`);
  const comma = lines[i].endsWith(",");
  const { narration: _old, source_ids, ...rest } = JSON.parse(comma ? lines[i].slice(0, -1) : lines[i]);
  lines[i] = JSON.stringify({ ...rest, narration, source_ids }) + (comma ? "," : "");
  return lines.join("\n");
}

const META = JSON.parse(readFileSync(META_PATH, "utf8"));
const wasFresh = META.inputs_hash === fingerprint().hash;
let yaml = yamlText;
let entities = readFileSync(ENTITIES, "utf8");
const pending: string[] = [];

for (const e of targets) {
  const version = Number(e.narration?.src.match(/-v(\d+)\.mp3$/)?.[1] ?? 0) + 1;
  const key = `narration/events/${e.id}-v${version}.mp3`;
  const out = `data/build/audio/${key}`;
  const source = file ?? (await speak(e));
  const seconds = encode(source, out, { channels: 1, kbps: 96 });
  const uploaded = upload(out, key);
  console.log(`${uploaded ? "✓" : "…"} ${e.id}: ${key} (${seconds.toFixed(1)} s)${uploaded ? "" : " not uploaded"}`);
  if (!uploaded) pending.push(uploadCommand(out, key));
  const narration = { src: key, credit, text_hash: textHash(e.description) };
  yaml = setYaml(yaml, e.id, `  narration: { src: ${key}, credit: ${JSON.stringify(credit)}, text_hash: "${narration.text_hash}" }`);
  entities = setEntity(entities, e.id, narration);
}

writeFileSync(EVENTS, yaml);
writeFileSync(ENTITIES, entities);
// public/data matched its inputs before, and only narration changed: it still does.
if (wasFresh) writeFileSync(META_PATH, JSON.stringify({ ...META, inputs_hash: fingerprint().hash }) + "\n");
else console.warn("! public/data was already out of date before this run: run npm run data:build");

console.log(`\nUpdated ${EVENTS} and ${ENTITIES}: commit both${wasFresh ? ` (with ${META_PATH})` : ""}.`);
if (pending.length) console.log(`\nStill to upload (before the commit goes live):\n  ${pending.join("\n  ")}`);
