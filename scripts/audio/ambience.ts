// Ambient sound for tour stops, from the prompts in src/tours/ambience.ts to loops in the bucket:
//   npm run audio:ambience                 every entry without a sound, or whose prompt changed (batches need --yes)
//   npm run audio:ambience -- <id> [<id>…] just these (again, if they have one: a new version)
// Options: --yes, --no-upload (prepare only), --seconds <n> (loop length, default 22).
//
// Per entry: ElevenLabs sound generation of the prompt as a seamless loop (cached in
// data/build/audio/sfx by prompt and settings, so a re-run after a failed upload costs nothing),
// loudness-normalised stereo MP3 (the app plays it quietly), uploaded to
// ambience/<category>/<id>-v<n>.mp3 (a new key every time: the bucket caches for a year), then the
// entry's `sound` is set in src/tours/ambience.ts: commit it. Needs ELEVENLABS_API_KEY in .env.local,
// with the Sound Effects permission.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { textHash } from "../lib/text-hash.ts";
import { AMBIENCE } from "../../src/tours/ambience.ts";
import { BUCKET, REGION, encode, uploadArgs, uploadCommand } from "./encode.ts";

const FILE = "src/tours/ambience.ts";
const ENTITIES = "public/data/entities.json";
const API = "https://api.elevenlabs.io/v1";
const MODEL = "eleven_text_to_sound_v2";
/** How closely the sound follows the prompt (0–1): a little freedom sounds more natural. */
const PROMPT_INFLUENCE = 0.4;
const FOLDER: Record<string, string> = { event: "events", species: "species", culture: "cultures", civilization: "civilizations" };

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const option = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};
const seconds = Number(option("--seconds") ?? 22);
const ids = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--seconds");
const apiKey = process.env.ELEVENLABS_API_KEY || fail("set ELEVENLABS_API_KEY in .env.local");

const category = new Map<string, string>(
  readFileSync(ENTITIES, "utf8")
    .split("\n")
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l.replace(/,$/, "")) as { id: string; category: string })
    .map((e) => [e.id, e.category]),
);
for (const id of [...ids, ...Object.keys(AMBIENCE)]) if (!category.has(id)) fail(`no entity ${id} in ${ENTITIES}`);
for (const id of ids) if (!AMBIENCE[id]) fail(`${id} has no entry in ${FILE}: add its prompt first`);

const stale = (id: string) => !AMBIENCE[id].sound || AMBIENCE[id].sound!.prompt_hash !== textHash(AMBIENCE[id].prompt);
const targets = ids.length ? ids : Object.keys(AMBIENCE).filter(stale);
if (targets.length === 0) fail("nothing to do: every entry has a sound for its prompt");
console.log(`${targets.length} sound(s) of ${seconds} s to generate`);
if (targets.length > 1 && !flag("--yes")) {
  for (const id of targets) console.log(`  ${id}: ${AMBIENCE[id].prompt}`);
  console.log("Run again with --yes to go ahead (ElevenLabs charges sound generation by the second).");
  process.exit(0);
}

/** The prompt as a seamless loop, cached by prompt and settings. */
async function generate(id: string): Promise<string> {
  const prompt = AMBIENCE[id].prompt;
  const path = `data/build/audio/sfx/${id}-${textHash(`${MODEL}:${PROMPT_INFLUENCE}:${seconds}:${prompt}`)}.mp3`;
  if (existsSync(path)) return path;
  const res = await fetch(`${API}/sound-generation?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ text: prompt, duration_seconds: seconds, prompt_influence: PROMPT_INFLUENCE, loop: true, model_id: MODEL }),
  });
  if (!res.ok) throw new Error(`ElevenLabs sound-generation: ${res.status} ${(await res.text()).slice(0, 300)}`);
  mkdirSync("data/build/audio/sfx", { recursive: true });
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

/** Upload to a key that must not exist yet. False if it could not (the command to run is printed). */
function upload(out: string, key: string): boolean {
  if (flag("--no-upload")) return false;
  const head = spawnSync("aws", ["s3api", "head-object", "--bucket", BUCKET, "--key", key, "--region", REGION], { encoding: "utf8" });
  if (head.status === 0) fail(`s3://${BUCKET}/${key} already exists (keys are never overwritten)`);
  if (!/Not Found|404/.test(head.stderr)) {
    console.error(`! could not reach S3 (${head.stderr.trim().split("\n").at(-1)}); log in to AWS, or upload by hand:`);
    return false;
  }
  execFileSync("aws", uploadArgs(out, key), { stdio: "inherit" });
  return true;
}

/** Set an entry's `sound` line in ambience.ts (straight after its prompt), keeping the file's layout. */
function setSound(text: string, id: string, line: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l === `  "${id}": {` || l === `  ${id}: {`);
  if (start < 0) fail(`no entry ${id} in ${FILE}`);
  const end = lines.findIndex((l, i) => i > start && l === "  },");
  const at = lines.slice(start, end).findIndex((l) => l.startsWith("    sound:"));
  if (at >= 0) lines[start + at] = line;
  else lines.splice(end, 0, line);
  return lines.join("\n");
}

let file = readFileSync(FILE, "utf8");
const pending: string[] = [];
const credit = "AI-generated sound (ElevenLabs)";
for (const id of targets) {
  const version = Number(AMBIENCE[id].sound?.src.match(/-v(\d+)\.mp3$/)?.[1] ?? 0) + 1;
  const key = `ambience/${FOLDER[category.get(id)!]}/${id}-v${version}.mp3`;
  const out = `data/build/audio/${key}`;
  let source: string;
  try {
    source = await generate(id);
  } catch (err) {
    console.error(`✗ ${id}: ${(err as Error).message}\n  Stopping here; the sounds above are kept. Run the same command again later for the rest.`);
    break;
  }
  const length = encode(source, out, { channels: 2, kbps: 96 });
  const uploaded = upload(out, key);
  console.log(`${uploaded ? "✓" : "…"} ${id}: ${key} (${length.toFixed(1)} s)${uploaded ? "" : " not uploaded"}`);
  if (!uploaded) pending.push(uploadCommand(out, key));
  file = setSound(file, id, `    sound: { src: "${key}", credit: "${credit}", prompt_hash: "${textHash(AMBIENCE[id].prompt)}" },`);
  writeFileSync(FILE, file); // after each, so a stop part way keeps what is done
}
console.log(`\nUpdated ${FILE}: commit it.`);
if (pending.length) console.log(`\n${pending.length} sound(s) still to upload: npm run audio:upload (with your AWS login)`);
