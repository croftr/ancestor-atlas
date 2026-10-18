// Animate species portraits for guided tours, from public/images/species/<id>.webp to 4:3 silent MP4s in the bucket:
//   npm run video:species -- <id> [<id>…]          generate for these species (a new version if one exists)
//   npm run video:species -- --tour <tour id>      every species stop on a tour without a video yet (batches need --yes)
//   npm run video:species -- <id> --file <mp4>     use a raw MP4 you already generated instead
// Options: --yes, --no-upload (prepare only; prints the aws s3 cp command), --model <veo-model>.
//
// Per species: Google Veo image-to-video from its portrait in public/images/species/<id>.webp (cached in
// data/build/video/raw by prompt and model, so a re-run after a failed upload costs nothing), cropped from
// Veo's 16:9 frame back to 4:3 (640x480) to match the portrait pixel-for-pixel with audio stripped (-an),
// uploaded to video/species/<id>-v<n>.mp4 (a new key every time: the bucket caches for a year), then the
// entity's `video` is set in data/curated/entities.yaml and public/data/entities.json: commit both.
// Needs GEMINI_API_KEY in .env.local.
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { BUCKET, REGION } from "../audio/encode.ts";
import { fingerprint, META_PATH } from "../lib/fingerprint.ts";
import { textHash } from "../lib/text-hash.ts";
import { TOURS, tourById } from "../../src/tours/tours.ts";

const CURATED_ENTITIES = "data/curated/entities.yaml";
const CURATED_EVENTS = "data/curated/events.yaml";
const ENTITIES = "public/data/entities.json";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "models/veo-3.1-fast-generate-preview";

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

const fileArg = option("--file");
const tourArg = option("--tour");
const modelArg = option("--model") ?? DEFAULT_MODEL;
const model = modelArg.startsWith("models/") ? modelArg : `models/${modelArg}`;
const promptArg = option("--prompt");
const credit = option("--credit") ?? "AI-generated video (Google Veo)";
const ids = args.filter((a, i) => !a.startsWith("--") && !["--file", "--tour", "--model", "--credit", "--prompt"].includes(args[i - 1]));

const FOLDER: Record<string, string> = { event: "events", species: "species", culture: "cultures", civilization: "civilizations" };

const SCENE_PROMPTS: Record<string, string> = {
  clovis:
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. The six Paleo-Indian hunters in the foreground remain completely motionless and frozen in their silent ambush crouch, their bodies, arms, and spears completely still without moving. Across the stream, all four Columbian mammoths in the herd move naturally: walking slowly along the grassy riverbank, swinging their trunks to graze, flapping their ears, and turning their heads and curved tusks. The shallow stream ripples and flows gently, tall grass sways softly in the breeze, and thin smoke drifts upward from the distant hide-tent campfires.",
  "sahul-seafaring":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the text title 'Seafaring to Sahul' at the top, the sky, the setting sun on the horizon, and the coastline cliffs on the right completely still and unchanged. On the bamboo raft, the two humans holding paddles on the left and right make a subtle, slow, gentle paddling motion in the water while the two seated figures in the middle stay still, and the bamboo raft glides very slowly forward toward the coast. Gentle golden waves and ripples move softly across the water surface around the raft.",
  "great-pyramid":
    "Living painting cinemagraph of a historical illustration, locked static camera with no camera movement or zoom. Keep the text title 'The Great Pyramid of Giza' at the top, the sky, the sun on the horizon, the pyramid, and the two standing overseers on the lower right completely still and unchanged. On the wooden ramp, the four Egyptian workers slowly step forward and haul the heavy white limestone block steadily up the ramp toward the Great Pyramid, leaning into the taut ropes in front and pushing the wooden cart from behind as its wheels slowly turn, while the second team further up the ramp also moves slowly forward toward the pyramid.",
};

interface CuratedEntity {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  image_caption?: string;
  video?: { src: string; credit: string };
}

const curated = parseYaml(readFileSync(CURATED_ENTITIES, "utf8")) as CuratedEntity[];
const curatedEvents = (parseYaml(readFileSync(CURATED_EVENTS, "utf8")) as Omit<CuratedEntity, "category">[]).map((e) => ({
  ...e,
  category: "event",
}));
const byId = new Map([...curated, ...curatedEvents].map((e) => [e.id, e]));

let targets: CuratedEntity[] = [];
if (tourArg) {
  const tour = tourArg === "all" ? null : (tourById(tourArg) ?? fail(`no tour ${tourArg}`));
  const stops = tour ? tour.stops : TOURS.flatMap((t) => t.stops);
  const seen = new Set<string>();
  for (const s of stops) {
    if (seen.has(s.entity)) continue;
    seen.add(s.entity);
    const e = byId.get(s.entity);
    if (e?.category === "species" && e.image_url && !e.video) targets.push(e);
  }
} else if (ids.length) {
  targets = ids.map((id) => {
    const e = byId.get(id) ?? fail(`no entity ${id} in ${CURATED_ENTITIES} or ${CURATED_EVENTS}`);
    if (!FOLDER[e.category]) fail(`${id} has unsupported category ${e.category}`);
    if (!e.image_url) fail(`${id} has no image_url`);
    return e;
  });
} else {
  fail("usage: npm run video:species -- <id> [<id>…] | --tour <tour id>|all [--yes] [--no-upload] [--file <mp4>]");
}

if (targets.length === 0) fail("nothing to do: every target entity already has a video");
if (fileArg && targets.length !== 1) fail("--file is for a single entity id");
console.log(`${targets.length} video(s) to prepare: ${targets.map((t) => t.id).join(", ")}`);
if (targets.length > 1 && !flag("--yes")) {
  console.log("Run again with --yes to go ahead (Veo charges video generation by the second).");
  process.exit(0);
}

const durationFor = (e: CuratedEntity) => (e.category === "species" ? 4 : 8);

const modelFor = (e: CuratedEntity) =>
  option("--model") ? model : e.category === "species" ? DEFAULT_MODEL : "models/veo-3.1-generate-preview";

const promptFor = (e: CuratedEntity) =>
  promptArg ??
  SCENE_PROMPTS[e.id] ??
  (e.category === "species"
    ? `3D museum paleoart bust reconstruction of ${e.name} against a solid dark studio background. Locked static camera, no camera movement. The hominin slowly blinks its eyes once, shifts its gaze slightly, and makes a very subtle, gentle head turn of a few degrees with a natural slight breath. Keep facial proportions, hair texture, and studio lighting strictly identical to the starting frame.`
    : `Painted historical paleoart illustration brought to life: ${e.image_caption ?? e.name}. Locked static camera, no camera movement, no zoom, no cut. Every person and animal in the scene moves naturally and continuously: animals walking, grazing, and shifting weight, people actively performing their tasks and shifting posture, wind moving grass and garments, water rippling, and smoke drifting. Keep the painted illustration style, composition, and framing identical to the starting frame.`);

async function generateRaw(e: CuratedEntity): Promise<string> {
  const prompt = promptFor(e);
  const entityModel = modelFor(e);
  const durationSeconds = durationFor(e);
  const cachePath = `data/build/video/raw/${e.id}-${textHash(`${entityModel}:${durationSeconds}:${prompt}`)}.mp4`;
  if (existsSync(cachePath)) return cachePath;
  const apiKey = process.env.GEMINI_API_KEY || fail("set GEMINI_API_KEY in .env.local");
  const imgPath = `public${e.image_url}`;
  if (!existsSync(imgPath)) fail(`missing image ${imgPath}`);
  const imgBytes = readFileSync(imgPath).toString("base64");

  const startRes = await fetch(`${API_BASE}/${entityModel}:predictLongRunning?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt, image: { bytesBase64Encoded: imgBytes, mimeType: "image/webp" } }],
      parameters: { durationSeconds },
    }),
  });
  if (!startRes.ok) throw new Error(`Veo start (${startRes.status}): ${(await startRes.text()).slice(0, 400)}`);
  const op = (await startRes.json()) as { name: string };
  for (let poll = 0; poll < 90; poll++) {
    await new Promise((r) => setTimeout(r, 5_000));
    const pollRes = await fetch(`${API_BASE}/${op.name}?key=${encodeURIComponent(apiKey)}`);
    if (!pollRes.ok) throw new Error(`Veo poll (${pollRes.status}): ${(await pollRes.text()).slice(0, 300)}`);
    const data = (await pollRes.json()) as any;
    if (!data.done) continue;
    if (data.error) throw new Error(`Veo error: ${JSON.stringify(data.error)}`);
    const uri: string | undefined =
      data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ?? data.response?.videos?.[0]?.uri;
    if (!uri) throw new Error(`Veo finished without a video URI: ${JSON.stringify(data.response).slice(0, 400)}`);
    const dlUrl = uri.includes("?") ? `${uri}&key=${encodeURIComponent(apiKey)}` : `${uri}?key=${encodeURIComponent(apiKey)}`;
    const dlRes = await fetch(dlUrl);
    if (!dlRes.ok) throw new Error(`Veo download (${dlRes.status}): ${(await dlRes.text()).slice(0, 200)}`);
    mkdirSync("data/build/video/raw", { recursive: true });
    writeFileSync(cachePath, Buffer.from(await dlRes.arrayBuffer()));
    return cachePath;
  }
  throw new Error("Veo timed out after 7.5 minutes");
}

/**
 * Veo outputs a 16:9 (1280x720) video with the source image pillarboxed in the middle and a synthetic
 * audio track. Crop the centre 1:1 (events) or 4:3 (species/cultures/civilizations) frame back and strip
 * audio so frame 0 matches the WebP illustration.
 */
function encodeVideo(input: string, out: string, category: string, imagePath?: string): number {
  mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
  const vf = category === "event" ? "crop=ih:ih,scale=720:720:flags=lanczos" : "crop=ih*4/3:ih,scale=640:480:flags=lanczos";
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      input,
      "-an",
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      out,
    ],
    { stdio: "inherit" },
  );

  if (imagePath && existsSync(out)) {
    // Overwrite the still image with frame 0 of the final cropped video so the transition is 100% seamless
    execFileSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        out,
        "-vframes",
        "1",
        "-vf",
        "select=eq(n\\,0)",
        "-c:v",
        "libwebp",
        "-lossless",
        "0",
        "-q:v",
        "90",
        imagePath,
      ],
      { stdio: "inherit" },
    );
  }

  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], { encoding: "utf8" }));
}

const uploadArgs = (out: string, key: string) => [
  "s3", "cp", out, `s3://${BUCKET}/${key}`, "--content-type", "video/mp4",
  "--cache-control", "public, max-age=31536000, immutable", "--region", REGION, "--only-show-errors",
];
const uploadCommand = (out: string, key: string) =>
  `aws s3 cp ${out} s3://${BUCKET}/${key} --content-type video/mp4 --cache-control "public, max-age=31536000, immutable" --region ${REGION}`;

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

function setYaml(text: string, id: string, line: string, file = CURATED_ENTITIES): string {
  const lines = text.split("\n");
  const start = lines.indexOf(`- id: ${id}`);
  if (start < 0) fail(`no entry ${id} in ${file}`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith("- id:"));
  if (end < 0) end = lines.length;
  const block = lines.slice(start, end);
  const at = block.findIndex((l) => l.startsWith("  video:"));
  if (at >= 0) block[at] = line;
  else {
    const ic = block.findIndex((l) => l.startsWith("  image_credit:"));
    if (ic < 0) fail(`${id}: no image_credit line in ${file}`);
    block.splice(ic + 1, 0, line);
  }
  lines.splice(start, end - start, ...block);
  return lines.join("\n");
}

function setEntity(text: string, id: string, video: { src: string; credit: string }): string {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.includes(`"id":${JSON.stringify(id)},`));
  if (i < 0) fail(`${id} not in ${ENTITIES}`);
  const comma = lines[i].endsWith(",");
  const { video: _old, ...rest } = JSON.parse(comma ? lines[i].slice(0, -1) : lines[i]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    out[k] = v;
    if (k === "image_credit") out.video = video;
  }
  if (!("video" in out)) out.video = video;
  lines[i] = JSON.stringify(out) + (comma ? "," : "");
  return lines.join("\n");
}

const META = JSON.parse(readFileSync(META_PATH, "utf8"));
const wasFresh = META.inputs_hash === fingerprint().hash;
let yamlText = readFileSync(CURATED_ENTITIES, "utf8");
let eventsYamlText = readFileSync(CURATED_EVENTS, "utf8");
let entitiesText = readFileSync(ENTITIES, "utf8");
const pending: string[] = [];

for (const e of targets) {
  const version = Number(e.video?.src.match(/-v(\d+)\.mp4$/)?.[1] ?? 0) + 1;
  const key = `video/${FOLDER[e.category]}/${e.id}-v${version}.mp4`;
  const out = `data/build/${key}`;
  let rawPath: string;
  try {
    if (fileArg) {
      const prompt = promptFor(e);
      const entityModel = modelFor(e);
      const durationSeconds = durationFor(e);
      rawPath = `data/build/video/raw/${e.id}-${textHash(`${entityModel}:${durationSeconds}:${prompt}`)}.mp4`;
      mkdirSync("data/build/video/raw", { recursive: true });
      copyFileSync(fileArg, rawPath);
    } else {
      rawPath = await generateRaw(e);
    }
  } catch (err) {
    console.error(`✗ ${e.id}: ${(err as Error).message}\n  Stopping here; the videos above are kept.`);
    break;
  }
  const imgPath = e.category === "species" && e.image_url?.startsWith("/") ? `public${e.image_url}` : undefined;
  const seconds = encodeVideo(rawPath, out, e.category, imgPath);
  const kb = (statSync(out).size / 1024).toFixed(0);
  const uploaded = upload(out, key);
  console.log(`${uploaded ? "✓" : "…"} ${e.id}: ${key} (${seconds.toFixed(1)} s, ${kb} KB)${uploaded ? "" : " not uploaded"}`);
  if (!uploaded) pending.push(uploadCommand(out, key));
  const video = { src: key, credit };
  if (e.category === "event") {
    eventsYamlText = setYaml(eventsYamlText, e.id, `  video: { src: ${key}, credit: ${JSON.stringify(credit)} }`, CURATED_EVENTS);
  } else {
    yamlText = setYaml(yamlText, e.id, `  video: { src: ${key}, credit: ${JSON.stringify(credit)} }`, CURATED_ENTITIES);
  }
  entitiesText = setEntity(entitiesText, e.id, video);
}

writeFileSync(CURATED_ENTITIES, yamlText);
writeFileSync(CURATED_EVENTS, eventsYamlText);
writeFileSync(ENTITIES, entitiesText);
if (wasFresh) writeFileSync(META_PATH, JSON.stringify({ ...META, inputs_hash: fingerprint().hash }) + "\n");
else console.warn("! public/data was already out of date before this run: run npm run data:build");

console.log(`\nUpdated ${CURATED_ENTITIES}, ${CURATED_EVENTS}, ${ENTITIES}${wasFresh ? `, ${META_PATH}` : ""}: commit them.`);
if (pending.length) {
  console.log(`\nUpload to S3 (new key, never overwrite):\n  ${pending.join("\n  ")}`);
}
