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
  "modern-humans-emerge":
    "Scientific museum paleoart illustration of early Homo sapiens standing upon a high cliff overlook, locked static camera with no camera movement or zoom. Keep the two-line text title 'Emergence of Modern Humans' at the top, the cliff edge, and the landscape composition completely still and unchanged. The morning sun glows over the distant valley horizon, casting warm golden dawn light across the river valley, while a gentle breeze softly sways the humans' hair and garments. The tall central hunter stands proud looking toward the sunrise, his chest rising and falling with a subtle calm breath. In the left foreground, the woman gently tilts the sharp stone spearhead in her hands, catching the golden morning sunlight along its flaked edge. The other hunters on the cliff make subtle, natural posture shifts as they survey the valley below.",
  "earliest-burials":
    "Scientific museum paleoart illustration of early intentional burial in a Paleolithic cave, locked static camera with no camera movement or zoom. Keep the two-line text title 'First Intentional Burials' at the top, the cave arch, the distant rolling hills, the setting sun, and the landscape composition completely still and unchanged. In the center, the kneeling man wearing a hide tunic makes a very slow, reverent motion gently lowering the red deer antlers across the burial pit, while the kneeling woman beside him carefully places pieces of red ochre on the cave floor. The person curled in the pit remains completely still in eternal sleep. The surrounding mourners wearing leather tunics maintain their solemn poses with subtle, calm breathing and slight natural posture shifts, as a faint evening breeze gently stirs their hair.",
  "symbolic-culture":
    "Scientific museum paleoart illustration of Middle Stone Age symbolic culture at Blombos Cave, locked static camera with no camera movement or zoom. Keep the text title 'Early Symbolic Culture' at the top, the cave overhang rock wall, the sun on the horizon, the sky, and the overall composition completely still and unchanged. In the foreground, the seated craftsman holds the pointed stone tool and makes delicate, rhythmic engraving motions carving geometric cross-hatch lines into the red ochre stone slab. Beside him, the seated woman gently threads perforated marine shell beads onto her string necklace with subtle, careful hand movements. Across the coastal background, gentle ocean waves steadily roll and break with soft white foam along the shore, while warm golden sunset light glimmers across the rippling sea surface.",
  "bow-and-arrow":
    "Scientific museum paleoart illustration of the invention of the bow and arrow in the African savanna, locked static camera with no camera movement or zoom. Keep the two-line text title 'Invention of the Bow and Arrow' at the top, the rock cliff shelter, the sunset on the horizon, the acacia trees, and the valley landscape completely still and unchanged. In the center, the campfire flames flicker and dance naturally within the stone hearth ring with warm glowing embers and faint rising sparks. On the right, the standing archer in hide wraps holds his drawn bow steady with concentrated focus, his posture firm with subtle natural breathing. On the left, the seated hunter in hide wraps gently inspects and adjusts the fletching on the arrow in his hands. In the distance below, the winding river shimmers with gentle golden ripples in the evening light.",
  "archaic-human-admixture":
    "Scientific museum paleoart illustration of peaceful coexistence and admixture between modern humans and Neanderthals in a Eurasian mountain valley, locked static camera with no camera movement or zoom. Keep the two-line text title 'Archaic Human Admixture (Neanderthal & Denisovan Interbreeding)' at the top, the rocky mountain cliffs, the sun setting on the horizon, the pine trees, and the landscape composition completely still and unchanged. In the center, the campfire flames flicker and dance naturally within the stone hearth ring, casting warm flickering firelight and small rising embers. The family seated on the boulder wearing hide tunics and leather wraps hold their positions with calm, gentle breathing as the parents softly smile. On the left, the hunters in hide garments make a subtle, gentle gesture sharing a food bowl. In the background, the mountain river gently ripples and shimmers with golden reflections in the sunset light.",
  "eyed-needle-clothing":
    "Scientific museum paleoart illustration of Upper Paleolithic tailored clothing production, locked static camera with no camera movement or zoom. Keep the two-line text title 'Eyed Needles and Tailored Clothing' at the top, the hide tent walls and framing furs, the twilight mountain sky outside, and the overall composition completely still and unchanged. Outside the tent entrance, the campfire flames flicker and dance naturally within the stone circle, casting warm flickering firelight and soft shifting shadows into the shelter. In the foreground, the seated seamstress in a tailored fur parka rhythmically and delicately stitches the thick animal pelt with her polished bone needle, pulling the sinew thread through with steady, gentle hand motions as she breathes calmly.",
  "kalambo-falls-wood":
    "Scientific museum paleoart illustration of Lower Paleolithic woodworking at Kalambo Falls, locked static camera with no camera movement or zoom. Keep the two-line text title 'Earliest Wooden Structure' at the top, the lush framing forest canopy, and the overall composition completely still and unchanged. In the background, the grand Kalambo waterfall flows smoothly down the vertical gorge cliff with a soft misty spray rising, while river water ripples gently along the muddy banks. In the foreground, the seated hominin rhythmically scrapes and shapes the notched wooden log with his stone handaxe, while the hominin on the right levers the damp earth with a wooden digging stick. In the midground, the figures along the wooden walkway make subtle, natural movements as they assemble the timber platform.",
  "schoningen-spears":
    "Scientific museum paleoart illustration of Lower Paleolithic spear crafting at Schöningen, locked static camera with no camera movement or zoom. Keep the two-line text title 'Wooden Hunting Spears' at the top, the sky, the morning sun over the trees, and the overall composition completely still and unchanged. In the foreground, the seated hunter in hide wraps rhythmically and carefully scrapes the wooden spear shaft with a sharp stone flake, fine wood shavings dropping as he shapes the tip. The other crouching hunters in leather wraps stay virtually motionless in the reeds, holding their wooden spears ready as they watch the lakeshore. Across the calm lake, the water gently ripples with subtle golden light reflections, while marsh grasses and cattails sway softly in a gentle breeze. On the far shore, the distant herd of wild horses makes subtle natural movements, slowly grazing along the water's edge.",
  "acheulean-handaxes":
    "Scientific museum paleoart illustration of Acheulean toolmaking in the East African Rift, locked static camera with no camera movement or zoom. Keep the two-line text title 'Acheulean Handaxe Technology' at the top, the sky, the sun over the distant hills, the acacia trees, and the landscape completely still and unchanged. The prominent seated hominin holds up the symmetrical teardrop handaxe in his hands, gently tilting and inspecting its sharp bifacial edges in the sunset light. On the left, the two seated knappers make controlled, rhythmic striking motions with their hammerstones, chipping stone flakes from their cores. The savanna grass in the background sways softly in the evening breeze.",
  "out-of-africa-dmanisi":
    "Scientific museum paleoart illustration of the Dmanisi archaeological site in the southern Caucasus, locked static camera with no camera movement or zoom. Keep the two-line text title 'Out of Africa I: The Dmanisi Hominins' at the top, the sky, the sun over the snow-capped mountains, and the rocky landscape completely still and unchanged. On the left, the crouching hominin knaps a stone tool with deliberate, gentle strikes of his hammerstone against the cobble. On the right, the group of hominins make subtle, natural movements as they dress the small deer with sharp stone flakes while the elder watches attentively. In the background, the river in the gorge below flows and ripples gently in the sunset light while the distant animals shift slightly.",
  "oldowan-tools":
    "Scientific museum paleoart illustration of early hominin toolmaking in the East African savanna, locked static camera with no camera movement or zoom. Keep the two-line text title 'Systematic Oldowan Flake Tools' at the top, the sky, the setting sun on the horizon, the acacia trees, and the landscape completely still and unchanged. In the center, the seated hominin makes a controlled knapping motion, striking the core stone with his hammerstone. In the right foreground, the hominin subtly tilts and turns the sharp stone flake in his hand to inspect the sharp edge. In the background, the river water ripples softly in the sunset light while the distant figures make gentle, subtle movements by the water.",
  "lomekwian-tools":
    "Scientific museum paleoart illustration of the Lomekwi archaeological site in Kenya, locked static camera with no camera movement or zoom. Keep the two-line text title 'Earliest Stone Tool Production' at the top, the sky, the setting sun on the horizon, the rock shelter, and the trees completely still and unchanged. In the center, the seated hominin rhythmically strikes the stone core on the anvil with his hammerstone, chipping away sharp flakes with tiny stone chips bouncing off. On the left, the seated hominins subtly inspect the flaked tools in their hands. On the right, the crouching hominin shifts slightly while sorting through the river cobbles, while the distant river ripples softly in the sunset light.",
  "laetoli-footprints":
    "Scientific living painting cinemagraph of the Laetoli volcanic plain in Tanzania, locked static camera with no camera movement or zoom. Keep the serif title 'THE LAETOLI FOOTPRINTS' at the top, the sky, and the overall composition completely still and unchanged. On the horizon, the crater of Mount Sadiman gently vents a soft, continuous plume of grey volcanic smoke drifting into the golden sky. Across the cracked volcanic ash plain, a gentle evening breeze carries faint wisps of volcanic dust, while a delicate, soft drizzle of rain falls, causing tiny glistening light reflections to shimmer inside the damp footprint impressions.",
  "hominin-divergence":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the two-line text title 'Divergence of the Hominin Lineage' at the top, the sky, the setting sun on the horizon, the trees, and the landscape composition completely still and unchanged. On the right, the bipedal hominins walk slowly forward through the savanna grass with subtle, natural strides, while the tall grass around their legs sways gently in the breeze. On the left, the chimpanzee-like apes make subtle, gentle movements shifting their weight and turning their heads naturally. In the center, gentle golden ripples and light reflections continuously shimmer and flow along the winding river surface.",
  clovis:
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. The six Paleo-Indian hunters in the foreground remain completely motionless and frozen in their silent ambush crouch, their bodies, arms, and spears completely still without moving. Across the stream, all four Columbian mammoths in the herd move naturally: walking slowly along the grassy riverbank, swinging their trunks to graze, flapping their ears, and turning their heads and curved tusks. The shallow stream ripples and flows gently, tall grass sways softly in the breeze, and thin smoke drifts upward from the distant hide-tent campfires.",
  "sahul-seafaring":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the text title 'Seafaring to Sahul' at the top, the sky, the setting sun on the horizon, and the coastline cliffs on the right completely still and unchanged. On the bamboo raft, the two humans holding paddles on the left and right make a subtle, slow, gentle paddling motion in the water while the two seated figures in the middle stay still, and the bamboo raft glides very slowly forward toward the coast. Gentle golden waves and ripples move softly across the water surface around the raft.",
  "great-pyramid":
    "Living painting cinemagraph of a historical illustration, locked static camera with no camera movement or zoom. Keep the text title 'The Great Pyramid of Giza' at the top, the sky, the sun on the horizon, the pyramid, and the two standing overseers on the lower right completely still and unchanged. On the wooden ramp, the four Egyptian workers slowly step forward and haul the heavy white limestone block steadily up the ramp toward the Great Pyramid, leaning into the taut ropes in front and pushing the wooden cart from behind as its wheels slowly turn, while the second team further up the ramp also moves slowly forward toward the pyramid.",
  "control-of-fire":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the text title 'First Controlled Use of Fire' at the top, the rock cave arch, the dusk sky, and the sun on the horizon completely still and unchanged. In the stone hearth at the centre, the campfire flames dance and flicker naturally with glowing sparks and embers floating gently upward, casting warm flickering firelight across the cave floor and the five seated hominins. The hominin on the left makes a very subtle, gentle motion tending the fire with his wooden stick while the other seated hominins remain seated and still, watching the flames.",
  "copper-smelting":
    "Living painting cinemagraph of a historical illustration, locked static camera with no camera movement or zoom. Keep the text title 'Extractive Metallurgy and Smelting' at the top, the sky, the sun on the horizon, and the background huts and trees completely still and unchanged. In the foreground, glowing golden-orange molten copper flows continuously from the tilted clay crucible held in the smith's tongs into the stone axe mould below, with small glowing sparks, heat shimmer, and thin wisps of smoke rising from the mould. On the right, bright flames dance inside the stone furnace while the second worker makes a subtle, steady motion stoking the glowing coals with his long rod.",
  "figurative-cave-art":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the text title 'First Figurative Cave Art' at the top, the cave rock wall, the painted wild pig and painted figures on the wall, and the distant karst valley and sun completely still and unchanged. Both human figures hold their exact poses completely still without moving their arms or hands. On the right, the bright flame of the handheld torch flickers, dances, and sways naturally with small rising sparks, casting warm flickering firelight and softly shifting shadows across the two humans and the ochre cave painting on the rock wall.",
  "dog-domestication":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the text title 'Domestication of the Dog' at the top, the sky, the sun on the horizon, and the hide tents completely still and unchanged. In the foreground, the seated hunter gently strokes the head of the dog beside him while both adult dogs pant softly and wag their tails. On the left, the playful puppy bounces and wags its tail in front of the smiling child, while the river in the middle ground ripples gently.",
  "iron-age":
    "Living painting cinemagraph of a historical illustration, locked static camera with no camera movement or zoom. Keep the text title 'Bloomery Iron (The Iron Age)' at the top, the stone walls, the sky, and the sun on the horizon completely still and unchanged. In the foreground, the muscular blacksmith hammers the glowing red-hot iron bloom on the anvil while his assistant holds it steady with long tongs, sending bright orange sparks flying outward with each strike. Behind them on the left, flames and glowing embers rise from the top and base of the conical clay bloomery furnace as the workers pump the bellows.",
  "horse-domestication":
    "Living painting cinemagraph of a historical illustration, locked static camera with no camera movement or zoom. Keep the text title 'DOMESTICATION OF THE HORSE' at the top, the sky, the hills, and the riverside wooden houses completely still and unchanged. Across the steppe, the mounted horseman in the centre, the two horses pulling the spoked wooden chariot on the right, and the herd of horses on the left run forward through the tall grass with manes and tails flowing, kicking up light dust behind their hooves and chariot wheels, while white smoke drifts from the cottage chimneys in the background.",
  sintashta:
    "Living painting cinemagraph of a historical paleoart illustration, locked static camera with no camera movement or zoom. Keep the circular fortified timber-and-earth settlement, the steppe hills, and the two standing Bronze Age warriors in the right foreground completely still and unchanged. From the conical smelting furnaces and hearths inside the circular town, plumes of white smoke rise and drift steadily across the sky in the steppe wind. In the foreground, the two harnessed chariot horses hitched to the spoked wooden chariot shift their weight, toss their heads slightly, and swish their tails and manes in the breeze while cattle graze quietly in the pastures.",
  "bronze-age":
    "Living painting cinemagraph of a historical illustration, locked static camera with no camera movement or zoom. Keep the text title 'The Bronze Age' at the top, the stone workshop walls, the standing worker in the background, and the kneeling smith's body, hands, tongs, and tilted clay crucible completely still in their exact position without morphing. The thin golden-orange stream of molten bronze pouring from the crucible into the stone sword mould shimmers with a bright metallic glow and sends a few tiny, subtle golden sparks hopping gently off the stone mould, without any explosion or large smoke cloud. In the background on the left, the orange fire inside the workshop forge flickers warmly, while the sailboats in the distant harbour glide very slowly across the shimmering water.",
  "first-pottery":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the text title 'Invention of Pottery' at the top, the sky, the sun, the rocky cliffs, the trees, and all four human figures completely still in their exact poses. In the centre middle ground, the low campfire around the clay pots flickers gently with warm orange flames that stay low around the pots without any black smoke column or flying debris rising into the sky. In the right foreground, the kneeling potter makes a very subtle, gentle motion with his fingers along the rim of the coiled clay pot while the river behind him ripples softly.",
  "sea-peoples":
    "Living painting cinemagraph of a historical illustration, locked static camera with no camera movement or zoom. Keep the text title 'Invasion of the Sea Peoples' at the top and all foreground warriors, weapons, shields, women, children, and oxen completely still and unchanged in their exact poses. In the right background, bright orange flames flicker and thick dark smoke billows upward from the burning fortified coastal citadel on the hill. On the left, white-crested sea waves roll and wash onto the beach while the wooden warships under sail rock gently on the water and small flames and smoke rise from the beach campfire.",
  "birth-of-agriculture":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the two-line text title 'The Birth of Agriculture' at the top, the sky, the clouds, the rising sun on the horizon, and the distant rolling hills completely still and unchanged with no smoke or dust. Across the foreground and middle ground, the golden wheat stalks sway in gentle, continuous rhythmic waves in the morning breeze while the harvesters in the field make a subtle reaping motion among the grain.",
  "earliest-musical-instruments":
    "Living painting cinemagraph of a paleoart illustration, locked static camera with no camera movement or zoom. Keep the text title 'Earliest Musical Instruments (Paleolithic Bone Flutes)' at the top, the rock shelter overhang, the snowy mountains, and the seated listeners around the fire completely still and unchanged. In the foreground, the young Paleolithic musician holds the vulture-bone flute steady at his lips and gently moves his fingers over the flute holes. Behind him, the campfire flames flicker and dance warmly with rising sparks, casting warm flickering light across the circle, while the distant mammoth herd walks slowly across the snowy valley.",
  "cucuteni-trypillia":
    "Living painting cinemagraph of a historical paleoart illustration, locked static camera with no camera movement or zoom. Keep the kneeling woman painting the spiral ceramic pot in the foreground, the two standing villagers behind her, the painted vessels on the right, and the concentric rings of timber houses completely still and unchanged. In the upper right background, bright orange flames leap and a tall plume of dark smoke billows upward into the sky from the burning house in the ring-settlement. On the left, white smoke drifts upward from the dome-shaped pottery kiln, while the river in the valley shimmers gently.",
  carthage:
    "Living painting cinemagraph of a historical architectural illustration, locked static camera with no camera movement or zoom. Keep the circular stone Cothon harbour buildings, the central island pavilion, the city walls, the distant mountains, and the figures on the foreground terrace completely still and unchanged. The turquoise water inside the circular naval harbour and outer basin shimmers with gentle ripples as the Punic galleys in the harbour entrance channel glide slowly forward through the water with oars dipping rhythmically and soft white wakes trailing behind them, while ships under sail move gently on the open sea.",
};

interface CuratedEntity {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  image_caption?: string;
  video?: { src: string; credit: string };
}

const curated = (parseYaml(readFileSync(CURATED_ENTITIES, "utf8")) as CuratedEntity[]).map((e) => ({
  ...e,
  category: e.category ?? "civilization",
}));
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
  const filterArgs =
    category === "event"
      ? [
          "-filter_complex",
          "[0:v]crop=ih:ih,scale=720:720:flags=lanczos,split[vid][first];[first]trim=end_frame=1,loop=-1:size=1,setpts=N/FRAME_RATE/TB,crop=720:280:0:0,format=yuva420p,geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)':a='if(gt(Y,255),255*(280-Y)/25,255)'[top];[vid][top]overlay=0:0:shortest=1",
        ]
      : ["-vf", "crop=ih*4/3:ih,scale=640:480:flags=lanczos"];
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
      ...filterArgs,
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
  const isPretty = text.includes('  "id":');
  const list = JSON.parse(text) as any[];
  const item = list.find((e) => e.id === id);
  if (!item) fail(`${id} not in ${ENTITIES}`);
  item.video = video;
  if (isPretty) {
    return JSON.stringify(list, null, 2) + "\n";
  }
  return "[\n" + list.map((e) => JSON.stringify(e)).join(",\n") + "\n]\n";
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
