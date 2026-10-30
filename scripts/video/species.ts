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
  "neanderthal-extinction":
    "Scientific museum paleoart illustration of the final Neanderthal refugium on the Iberian coast, locked static camera with no camera movement or zoom. Keep the two-line text title 'Extinction of the Neanderthals' at the top, the cave arch framing, the coastal cliffs, and the purple twilight sky completely still and unchanged. In the foreground, the three Neanderthals wearing fur cloaks and hide tunics stand solemnly looking out over the sea, their postures holding steady with subtle, calm chest breathing as a gentle coastal breeze softly moves their hair and fur garments. In the bay below, the ocean water ripples and rolls gently with soft white surf against the rocks. On the distant headland across the water, the small campfires flicker warmly with delicate wisps of smoke drifting upward into the evening sky.",
  "peopling-of-the-americas":
    "Scientific museum paleoart illustration of the initial human migration into the Americas along the Pacific coastal route, locked static camera with no camera movement or zoom. Keep the two-line text title 'Peopling of the Americas' at the top, the glacier, the snow-capped mountains, the glowing sun, and the overall composition completely still and unchanged. In the foreground, the travelers dressed in tailored fur parkas and winter boots walk slowly forward along the rocky shore with steady, natural strides, carrying their spears and travel packs. On the right, the canoeist gently dips his paddle into the water, gliding smoothly as soft waves and ripples lap against the gravel beach and kelp. In the tundra plain, the distant woolly mammoths slowly plod along the glacial margin while the two bison graze quietly.",
  "quaternary-megafauna-extinction":
    "Scientific museum paleoart illustration of Late Pleistocene megafauna, locked static camera with no camera movement or zoom. Keep the two-line text title 'Late Pleistocene Megafauna Extinction' at the top, the glacier, the snow-capped mountains, the glowing sun, and the overall composition completely still and unchanged. In the foreground, the shaggy woolly mammoth steps slowly across the tundra plain, swinging its trunk gently and turning its massive curved tusks. On the rocky ledge, the sabre-toothed cat twitches its tail and subtly shifts its predatory stance. In the lower right, the giant ground sloth slowly strips leaves from the bushes with its clawed forepaws. Across the steppe, tundra grasses sway gently in the cold breeze while the three distant hunters in hide tunics watch quietly from the hillside.",
  "gobekli-tepe":
    "Scientific museum paleoart illustration of Pre-Pottery Neolithic monumental construction at Göbekli Tepe, locked static camera with no camera movement or zoom. Keep the three-line text title 'Monumental Architecture at Göbekli Tepe' at the top, the massive carved T-shaped megaliths, the stone enclosure walls, the rising sun on the horizon, and the rolling landscape completely still and unchanged. Inside the circular enclosure, the sculptors wearing tunics make gentle, rhythmic tapping motions with stone chisels against the limestone pillars, with tiny specks of stone dust floating off. In the background, the woman carrying a woven tray steps slowly across the sanctuary terrace, while warm golden morning sunlight glows across the temple floor and a gentle breeze softly stirs the workers' tunics.",
  "cattle-and-pigs":
    "Scientific museum paleoart illustration of early cattle and pig domestication in the Neolithic Near East, locked static camera with no camera movement or zoom. Keep the two-line text title 'Domestication of Cattle and Pigs' at the top, the thatched stone houses, the fences, the morning sun over the hills, and the landscape composition completely still and unchanged. In the foreground, the domestic cattle slowly step forward, swish their tails, and turn their horned heads naturally as the herdsman in a tunic guides them with a gentle hand. On the right, the bristled pigs and piglets root along the dirt path and twitch their snouts as the kneeling woman softly strokes them. In the village background, a thin column of white smoke drifts steadily upward from the cooking hearth, while the winding river surface ripples gently in the morning sun.",
  "maize-and-squash":
    "Scientific museum paleoart illustration of early plant domestication at Guilá Naquitz Cave in Oaxaca, locked static camera with no camera movement or zoom. Keep the two-line text title 'Squash and Maize in Mesoamerica' at the top, the limestone cave entrance, the mountain cliffs, the sunlit valley, and the overall composition completely still and unchanged. In the foreground, the kneeling farmer in a woven tunic gently handles and inspects the striped green squash among the vine leaves. On the right, the standing woman holding the woven basket stands serene with subtle, calm breathing, while a gentle mountain breeze softly sways the green teosinte stalks in her basket, her hair, and the hem of her tunic. Across the arid hillside, the squash leaves and prickly pear cacti subtly sway in the warm morning air.",
  "rice-and-millet":
    "Scientific museum paleoart illustration of early rice and millet farming in Neolithic China, locked static camera with no camera movement or zoom. Keep the text title 'Rice and Millet in China' at the top, the misty karst limestone mountains, the thatched round huts, the morning sun, and the landscape composition completely still and unchanged. In the flooded paddies on the left, the farmers in tunics and conical hats make gentle, rhythmic planting motions, pressing green rice shoots into the flooded mud with soft ripples spreading across the water surface. On the right, the dense golden stalks of ripe millet sway in continuous gentle waves in the breeze. In the center, the winding river flows with subtle surface ripples in the golden dawn light as faint morning mist drifts through the valley.",
  "new-guinea-farming":
    "Scientific museum paleoart illustration of early wetland agriculture at Kuk Swamp in the New Guinea highlands, locked static camera with no camera movement or zoom. Keep the text title 'Farming in New Guinea' at the top, the misty rainforest mountains, the thatched huts, and the landscape composition completely still and unchanged. In the center, the farmers wearing woven grass skirts make rhythmic, steady digging motions with their long wooden digging sticks, clearing damp mud from the drainage channel as fresh water flows and ripples along the ditch network. In the left foreground, the woman wearing a fiber dress gently tends the broad green taro leaves. A soft highland breeze causes the large banana fronds and tall sugarcane stalks to sway gently, while morning mist drifts slowly along the mountain slopes.",
  "dairying":
    "Scientific museum paleoart illustration of early Neolithic dairy farming and milk processing, locked static camera with no camera movement or zoom. Keep the text title 'The First Milk' at the top, the thatched timber house, the wattle fences, the pasture hills, and the overall composition completely still and unchanged. In the foreground, the seated woman in a linen tunic rhythmically and gently milks the cow, sending a thin white stream of milk into the earthenware bowl below. The brown dairy cow stands calmly, softly swishing its tail and shifting its weight. On the right, the farmer in a belted tunic holds the ceramic strainer steady as white milk pours smoothly into the large clay jar. In the distant green pastures, the sheep and calves graze quietly in the gentle sunny breeze.",
  "andean-domestication":
    "Scientific museum paleoart illustration of early Andean agriculture and pastoralism at Lake Titicaca, locked static camera with no camera movement or zoom. Keep the two-line text title 'Potatoes and Llamas in the Andes' at the top, the snow-capped mountain peaks, the deep blue lake, the stone huts, and the landscape composition completely still and unchanged. In the foreground, the farmer in a woven tunic gently loosens the soil with a wooden digging spade, while the seated women carefully gather colorful harvested potatoes into woven baskets. On the right, the llamas and alpacas graze calmly in the golden pasture, shifting their long necks, twitching their ears, and swishing their tails. Across the Altiplano, the tall golden grasses and striped textile mantles sway softly in the crisp Andean mountain wind.",
  "chinchorro-mummies":
    "Scientific museum paleoart illustration of Chinchorro mortuary mummification on the Atacama coast, locked static camera with no camera movement or zoom. Keep the two-line text title 'Chinchorro Mummies' at the top, the timber-and-reed shelter posts, the desert coastal cliffs, and the sunset sky completely still and unchanged. Under the shelter, the seated artisan in leather wraps on the left delicately paints the sculpted clay facial mask with fine, careful brushstrokes. The artisan on the right carefully tightens and threads the totora reed binding cords over the wrapped ancestor lying peacefully on the reed mat. In the coastal background, gentle ocean waves steadily roll and break with soft white foam along the sandy beach as warm golden evening light glistens across the sea.",
  "invention-of-the-wheel":
    "Scientific museum paleoart illustration of early wheel-and-axle craftsmanship in ancient Mesopotamia, locked static camera with no camera movement or zoom. Keep the text title 'Invention of the Wheel' at the top, the mudbrick ziggurat and buildings, the sun on the horizon, and the overall composition completely still and unchanged. In the foreground, the two bearded wheelwrights in woven tunics make controlled, rhythmic tapping motions with their adzes to shape the heavy wooden wheel and axle. In the midground, the two horned oxen hitched to the four-wheeled pottery wagon subtly shift their weight, swish their tails, and lower their heads slightly. Along the canal bank, the date palm fronds sway gently in the breeze while the water surface shimmers with soft golden ripples.",
  "development-of-writing":
    "Scientific museum paleoart illustration of early cuneiform writing in ancient Sumer, locked static camera with no camera movement or zoom. Keep the two-line text title 'Development of Written Language' at the top, the arched colonnade, the mudbrick ziggurat, the sun on the horizon, and the overall composition completely still and unchanged. At the worktable, the bearded Sumerian scribe in a white linen tunic makes delicate, precise hand movements with his reed stylus, pressing wedge-shaped cuneiform marks into the soft clay tablet while breathing calmly. On the right, the young apprentice in a tunic watches attentively, blinking once and making a subtle, natural nod. In the background on the right, the date palm fronds sway gently in the warm evening breeze.",
  "sorghum-and-millet":
    "Scientific museum paleoart illustration of early sorghum and pearl millet agriculture in ancient Africa, locked static camera with no camera movement or zoom. Keep the two-line text title 'Sorghum and Pearl Millet in Africa' at the top, the thatched shade structure, the distant rocky inselberg mountains, the acacia trees, and the overall composition completely still and unchanged. Beneath the shade structure on the left, the kneeling woman in a woven tunic rhythmically pushes the hand stone back and forth across the flat stone quern to grind grain into flour, while the seated women behind her gently shake their round woven winnowing baskets. On the right, the farmers in woven wraps make careful harvesting motions with their curved sickles as the tall red sorghum heads and golden pearl millet stalks sway softly in the warm savanna breeze.",
  "caral-supe":
    "Scientific museum paleoart illustration of the ancient Sacred City of Caral in Peru, locked static camera with no camera movement or zoom. Keep the two-line text title 'Sacred City of Caral' at the top completely still and unchanged. In the left foreground, the ceremonial musicians in patterned woven tunics actively play their carved bone flutes, moving their fingers, swaying their heads and shoulders rhythmically to the music as their patterned garments shift softly in the breeze. On the stone steps at the right, the builders in woven wraps heave and adjust the heavy woven reed shicra bags of river stones on their shoulders, while the people gathered around the circular plaza gesture and turn toward one another. In the valley on the left, the winding Supe River flows with bright, glistening ripples while golden clouds drift slowly across the sky.",
  "indus-cities":
    "Scientific museum paleoart illustration of Mohenjo-daro in the Indus Valley, locked static camera with no camera movement or zoom. Keep the two-line text title 'Planned Cities of the Indus Valley' at the top completely still and unchanged. Along both sides of the brick street, lively streams of water flow and rush steadily down the open brick drainage channels with bright, continuous ripples and reflections. In the right foreground, the kneeling craftsman actively lifts and fits the curved terracotta drain tile into the water channel with both hands. In the street, the bearded man holding a clay pot and the woman beside him gesture with their hands and nod in animated conversation, while on the left the inspector in a white tunic gestures toward the open brick drain and the couple by the doorway talk together.",
  "alphabetic-script":
    "Scientific museum paleoart illustration of the Proto-Sinaitic script at the Serabit el-Khadim turquoise mines in Sinai, locked static camera with no camera movement or zoom. Keep the two-line text title 'Invention of the Alphabetic Script' at the top, the sandstone canyon cliffs, the sun on the horizon, the carved ox-head, house, and eye symbols, and the overall composition completely still and unchanged. In the foreground, the bearded carver in a white linen kilt makes careful, precise hand movements with his metal chisel, etching fine lines into the sandstone rock face beside the woven basket of gleaming turquoise stones. On the right, the standing worker in a belted white tunic points attentively toward the inscription, making a subtle, natural nod as warm desert light shimmers softly.",
  "code-of-hammurabi":
    "Scientific museum paleoart illustration of the public stele of the Code of Hammurabi in ancient Babylon, locked static camera with no camera movement or zoom. Keep the two-line text title 'The Code of Hammurabi' at the top, the central black diorite stele with its carved relief and cuneiform columns, the walled mudbrick ziggurats, the sun on the horizon, and the overall composition completely still and unchanged. Around the base of the stele, the gathered Babylonian citizens and elders in woven tunics and draped robes converse calmly about the inscribed laws, making subtle, natural hand gestures and slight head nods. On the right foreground, the bearded scribe holding the small clay tablet glances between his tablet and the stele as warm golden sunlight gleams softly on the polished black diorite stone.",
  "poverty-point":
    "Scientific museum paleoart illustration of the monumental earthworks of Poverty Point in Louisiana, locked static camera with no camera movement or zoom. Keep the two-line text title 'Earthworks of Poverty Point' at the top, the concentric curving earthen ridges, the bird-shaped Mound A in the distance, the sun on the horizon, and the overall composition completely still and unchanged. In the foreground, the stone-lined hearth fire flickers and dances warmly as the kneeling villagers in fringed tunics gently shape and place the grooved clay cooking balls around the embers. On the right, the seated toolmaker makes careful, rhythmic pressure-flaking motions with his antler tool to shape a stone point. Along the winding bayou, the water surface shimmers with soft golden ripples while Spanish moss on the cypress trees sways gently in the breeze.",
  "chicken-domestication":
    "Scientific museum paleoart illustration of early chicken domestication at a stilt-house village in Southeast Asia, locked static camera with no camera movement or zoom. Keep the two-line text title 'Domestication of the Chicken' at the top completely still and unchanged. Perched on the bamboo fence at the left, the colorful red junglefowl rooster actively turns its head, blinks, and rustles its glossy tail and golden neck feathers. In the right foreground, the speckled hens and small yellow chicks walk and peck livelily at the scattered grain on the ground. In the midground, the crouching villagers in woven wraps rake and smooth the grain across the woven drying mats as the broad green banana leaves and jungle foliage sway gently in the warm tropical breeze.",
  "lapita-voyaging":
    "Scientific museum paleoart illustration of an Austronesian Lapita outrigger sailing canoe in the Pacific Ocean, locked static camera with no camera movement or zoom. Keep the two-line text title 'Lapita Ocean Voyaging' at the top completely still and unchanged. Across the ocean, turquoise waves and golden sunset reflections roll and swell rhythmically beneath the wooden outrigger canoe and its outrigger float, with white sea foam splashing softly along the hull. The two large triangular woven pandanus sails billow and flex gently in the sea breeze. At the bow on the right, the standing navigator in a woven wrap steers steadily with his long wooden paddle, while the women in the center tend the small pink pigs in the bamboo pen and secure the dentate-stamped clay pots, and white seabirds glide smoothly across the sky.",
  "nok-terracotta":
    "Scientific museum paleoart illustration of Nok terracotta sculpting and iron smelting in West Africa, locked static camera with no camera movement or zoom. Keep the two-line text title 'Nok Terracotta Sculpture' at the top completely still and unchanged. In the left foreground, the seated Nok sculptor in a draped tunic and bead necklace makes smooth, deliberate hand movements with his smoothing stone, shaping the braided clay coiffure of the terracotta head on the worktable. In the midground on the right, bright orange flames flicker lively inside the cylindrical clay bloomery furnace with wisps of pale smoke rising from the top chimney, while the smith in a woven wrap rhythmically pumps the long handle of the leather bellows.",
  "first-olympic-games":
    "Scientific museum paleoart illustration of the ancient Olympic Games at Olympia in Greece, locked static camera with no camera movement or zoom. Keep the two-line text title 'Ancient Olympic Games' at the top completely still and unchanged. On the left foreground, the Greek discus thrower in a white kilt pivots his shoulders and extends his arm in a poised, controlled athletic motion while holding the bronze discus. Along the sandy stadium track in the center, the four runners in short tunics pump their arms and stride rhythmically forward. On the right, the bearded judge in a crimson cloak raises the green olive wreath with a gentle nod, while olive tree branches sway softly in the sunny breeze.",
  "minted-coinage":
    "Scientific museum paleoart illustration of early electrum coin minting at Sardis in the Kingdom of Lydia, locked static camera with no camera movement or zoom. Keep the two-line text title 'Standardized Minted Coinage' at the top completely still and unchanged. On the left foreground, the Lydian minter in a belted tunic and amber sash makes controlled, rhythmic striking motions with his iron hammer against the cylindrical die punch over the glowing electrum coin on the iron anvil. On the right, the young official in a draped robe holds up a stamped lion coin between his fingers, tilting it slightly so it gleams in the golden sunlight while the brass balance scale on the table sways gently.",
  "unification-of-china":
    "Scientific museum paleoart illustration of the Qin unification of China under Qin Shi Huang, locked static camera with no camera movement or zoom. Keep the two-line text title 'Unification of China' at the top, the flags and banners on the left, the distant mountains, and the Great Wall completely still and unchanged. At the wooden table in the foreground, the four Qin scholars and officials in silk robes converse and gesture naturally with their hands, pointing across the unrolled Small Seal script scrolls, handling the round bronze Ban Liang coins, and checking the small balance scale. In the midground, the three brown chariot horses subtly shift their heads, blink, and twitch their ears while the armored guards stand at attention holding their halberds steady.",
  "papermaking":
    "Scientific museum paleoart illustration of early Han Dynasty papermaking in ancient China, locked static camera with no camera movement or zoom. Keep the two-line text title 'Invention of Papermaking' at the top completely still and unchanged. At the large wooden water vat in the center, the Han craftsman in a belted tunic lifts the rectangular bamboo screen from the milky pulp bath as streams and droplets of water cascade and drip steadily back into the rippling vat below. On the right, the assistant in a blue tunic carefully smooths the damp white sheet of freshly made paper onto the vertical bamboo drying wall, while green bamboo stalks sway softly in the morning breeze.",
  "silk-road":
    "Scientific museum paleoart illustration of a Han Dynasty Silk Road caravan departing a desert fortress gate toward the snow-capped mountains, locked static camera with no camera movement or zoom. Keep the two-line text title 'Opening of the Silk Road' at the top completely still and unchanged. In the foreground, the Han envoy in a grey silk robe and the Central Asian merchant in a fur-trimmed coat walk steadily forward side by side, gesturing in conversation. Beside them on the left, the two-humped Bactrian camel laden with colorful rolled bolts of silk strides rhythmically across the sand, while on the right the chestnut Ferghana horse steps livelily with its mane and tail flowing in the desert breeze.",
  aurignacian:
    "Scientific museum paleoart illustration of an Upper Paleolithic Aurignacian cave shelter in Ice Age Europe, locked static camera with no camera movement or zoom. Keep the rocky cave arch, the painted bison and ibex on the rock wall, and the overall composition completely still and unchanged. In the center foreground, the stone-ringed campfire and the wall torch flicker and dance warmly with glowing embers. On the left foreground, the seated carver in fur-trimmed hide clothing makes careful, rhythmic tapping motions to shape the pale ivory figurine in his hand. On the right foreground, the seated musician in fur clothing gently moves his fingers along the bone flute as he plays. At the left cave wall, the standing artist blows a fine mist of red ochre through the tube over his hand stencil, while outside the cave entrance the distant reindeer walk slowly across the snowy valley.",
  "middle-stone-age":
    "Scientific museum paleoart illustration of Middle Stone Age humans in a South African coastal cave shelter, locked static camera with no camera movement or zoom. Keep the rocky cave arch and the overall composition completely still and unchanged. On the left foreground, the seated craftsman in a hide wrap rhythmically rubs the grinding stone back and forth across the flat stone slab to grind bright red ochre powder. In the center, the kneeling artisan in a hide tunic makes careful, steady engraving motions with a pointed stone tool, carving geometric lines into the red ochre block. On the right foreground, the kneeling toolmaker in a hide wrap makes delicate pressure-flaking motions to shape the stone spear point in his hands. Outside the cave entrance, turquoise ocean waves roll and break with white surf against the coastal rocks while the three hunters carrying spears walk slowly along the cliffside path.",
  "levallois-mousterian":
    "Scientific museum paleoart illustration of Neanderthals making Mousterian stone tools and scraping hides at a rock shelter, locked static camera with no camera movement or zoom. Keep the rocky cliff shelter wall and the overall composition completely still and unchanged. On the left foreground, the kneeling bearded toolmaker in a hide wrap makes controlled, rhythmic striking motions with his hammerstone to flake the flint tool on the stone anvil. On the right, the seated woman in a stitched leather tunic rhythmically scrapes and dresses the animal pelt across her lap with a flint side-scraper. In the lower right foreground, glowing red embers pulse warmly inside the stone-ringed hearth as a steady column of pale grey smoke rises and drifts upward, while in the valley on the left the river shimmers softly and the distant wild horses graze on the grassy bank.",
  chatelperronian:
    "Scientific museum paleoart illustration of a Châtelperronian rock shelter camp in Ice Age Europe, locked static camera with no camera movement or zoom. Keep the rocky cliff overhang and the overall composition completely still and unchanged. On the left foreground, the seated toolmaker in a stitched leather tunic makes careful pressure-flaking motions with an antler tool to shape the curved stone knife in his hands. In the center foreground, the seated artisan in a fur cloak makes delicate rotary drilling motions with a pointed stone awl to pierce an animal tooth ornament. On the right foreground, the kneeling woman in a fur wrap rhythmically rubs the grinding stone back and forth across the flat stone slab to grind red ochre powder. In the midground, bright orange flames flicker and dance in the campfires with pale smoke drifting upward, while the winding river on the right shimmers gently.",
  gravettian:
    "Scientific museum paleoart illustration of a Gravettian mammoth-hunter winter camp with mammoth-bone dwellings, locked static camera with no camera movement or zoom. Keep the mammoth-bone huts, the snowy mountains, and the overall composition completely still and unchanged. On the left foreground, the seated bearded sculptor in a fur parka gently shapes and smooths the small clay figurine in his hands. On the right foreground, the kneeling woman in a fur-trimmed parka carefully threads pale ivory beads onto the necklace cord in her hands. In the center foreground, bright orange flames flicker and dance inside the stone-ringed campfire and inside the small domed clay kiln with pale smoke rising, while in the distant snowy plain on the right the woolly mammoths walk slowly forward.",
  solutrean:
    "Scientific museum paleoart illustration of a Solutrean winter camp beneath the Rock of Solutré, locked static camera with no camera movement or zoom. Keep the rocky cliff crag, the rock shelter overhang, and the overall composition completely still and unchanged. In the center foreground, the seated bearded toolmaker in a fur parka makes careful, steady pressure-flaking motions with an antler tool against the edge of the large laurel-leaf stone point in his hands. On the right foreground, the seated woman in a hooded fur parka rhythmically stitches and pulls sinew thread with a bone needle in her hands. On the left midground, the hunters in fur coats and their brown horse walk slowly forward along the snowy trail toward the camp, while on the right bright orange flames flicker and dance in the campfires with pale smoke drifting upward.",
  magdalenian:
    "Scientific museum paleoart illustration of a Magdalenian reindeer-hunter camp beside a limestone cliff and river, locked static camera with no camera movement or zoom. Keep the tall limestone cliff, the conical hide tents, and the overall composition completely still and unchanged. In the lower right foreground, the fisherman in a hooded tunic wades in the rippling river water and thrusts his barbed antler harpoon toward the leaping silver salmon with a lively splash. On the left foreground, the two standing hunters in hooded fur parkas holding a spear-thrower and spear shift their posture and turn their heads slightly. In the right midground, the four seated artisans around the flickering campfire rhythmically grind red and yellow ochre pigments and engrave a bone plaque, while in the left background the herd of reindeer and wild horses wades steadily across the shallow, rippling river.",
  yamnaya:
    "Scientific museum paleoart illustration of a Yamnaya kurgan burial ritual and wagon encampment on the Pontic-Caspian steppe, locked static camera with no camera movement or zoom. Keep the carved stone stela on the right, the timber-lined grave pit, and the overall composition completely still and unchanged. In the center foreground, the kneeling bearded elder in a fur cloak extends his hand over the pit as a steady stream of bright red ochre powder pours and trickles from his fingers. Across the foreground and midground, tall golden feathergrass sways in continuous gentle waves in the steppe breeze while the standing mourners in tunics watch solemnly. In the midground, the horned oxen hitched to the covered wooden wagons shift their weight and turn their heads, while the two horsemen ride slowly across the grassland beside the grazing cattle and sheep.",
  afanasievo:
    "Scientific museum paleoart illustration of an Afanasievo pastoralist settlement in an alpine valley of the Altai Mountains, locked static camera with no camera movement or zoom. Keep the snow-capped mountain peaks, the timber log houses, and the overall composition completely still and unchanged. On the left foreground, the kneeling woman in a fur-trimmed tunic gently shapes and smooths the rim of the herringbone-patterned clay pot with both hands. In the center foreground, the seated craftsman in a fur-collared coat tilts and polishes the gleaming copper dagger blade in his hands. On the right midground, the two hunters in fur-trimmed coats walk steadily forward along the grassy bank carrying an ibex on a wooden pole, while the mountain river flows with lively white ripples and the horse, cattle, and sheep graze quietly in the meadow.",
  "corded-ware":
    "Scientific museum paleoart illustration of a Corded Ware pastoralist settlement and ceremonial gathering in northern Europe, locked static camera with no camera movement or zoom. Keep the earth trench in the foreground, the thatched timber houses on the right, and the overall composition completely still and unchanged. On the left foreground, the kneeling bearded craftsman in a belted tunic gently holds and tilts the cord-impressed clay beaker with both hands, while the kneeling man opposite him in a belted tunic extends his hand calmly and the standing women in wool dresses and amber necklaces nod gently. Across the green pasture in the midground, the horned cattle, woolly sheep, and brown horses graze and shift naturally, while the oxen hitched to the covered four-wheeled wooden wagons step slowly forward.",
  "bell-beaker":
    "Scientific museum paleoart illustration of a Bell Beaker settlement and copper-working camp in Bronze Age Europe, locked static camera with no camera movement or zoom. Keep the red bell-shaped pottery vessels on the left, the distant thatched roundhouses, and the overall composition completely still and unchanged. In the center foreground, the kneeling bearded smith in a woven tunic rhythmically polishes and shapes the gleaming copper dagger blade over the glowing charcoal hearth, where orange embers pulse warmly. Beside him on the right, the standing archer in a belted tunic and stone wrist-guard gently inspects the feathered arrow in his hands while the woman in a woven dress and gold ornaments watches attentively. On the chalk mound in the left midground, the workers in tunics carry woven baskets of white chalk to build the round barrow.",
  unetice:
    "Scientific museum paleoart illustration of an Early Bronze Age Únětice hilltop stronghold in central Europe, locked static camera with no camera movement or zoom. Keep the timber palisade fence, the earthen barrow mound on the right, and the overall composition completely still and unchanged. On the left foreground, the two bearded nobles in woven tunics and wool cloaks hold up the bronze and gold Nebra Sky Disc together, tilting it slightly so the gold inlays gleam in the sunlight as they converse and nod. In the center midground, bright orange flames flicker inside the circular stone furnace with pale smoke rising as the smith on the left pumps the leather bellows and the smith on the right pours a glowing orange stream of molten bronze into the stone mold, while the elder on the right gestures toward the bronze axes and halberd on the table.",
  andronovo:
    "Scientific museum paleoart illustration of a Bronze Age Andronovo pastoralist and metalworking settlement on the Eurasian steppe, locked static camera with no camera movement or zoom. Keep the rocky outcrop with carved petroglyphs on the right, the timber log houses, and the overall composition completely still and unchanged. On the left foreground, the two harnessed bay horses hitched to the spoked wooden chariot shift their weight, turn their heads slightly, and swish their tails as the charioteer in an embroidered tunic holds the reins steady. On the right foreground, bright orange flames flicker inside the stone furnace with pale smoke rising as the assistant pumps the leather bellows and the smith pours a glowing stream of molten bronze into the stone mold, while cattle, sheep, and horses graze across the green river valley.",
  "linear-pottery":
    "Scientific museum paleoart illustration of an Early Neolithic Linearbandkeramik (LBK) farming village, locked static camera with no camera movement or zoom. Keep the monumental timber longhouses with thatched roofs, the post fences, and the overall composition completely still and unchanged. In the left foreground, the craftsman in a tunic makes steady, rhythmic back-and-forth grinding motions sharpening the stone shoe-last adze against the flat whetstone slab with glistening water. In the center, the kneeling farmer in a tunic rhythmically rolls the stone hand quern back and forth across the stone saddle quern to crush golden grains into flour. On the right, the two women in linen dresses make delicate, steady incising motions with wooden styluses carving linear spiral bands into the smooth clay pots beside the gently flickering cooking fire. In the fenced pasture on the left, the dairy cows, pigs, and sheep graze calmly as wheat stalks sway gently in the breeze.",
  "bantu-farmers":
    "Scientific museum paleoart illustration of an early Bantu-speaking farming and metalworking village in sub-Saharan Africa, locked static camera with no camera movement or zoom. Keep the thatched roundhouses, the acacia trees, the distant green hills, and the overall composition completely still and unchanged. In the right foreground, bright orange flames flicker inside the bloomery furnace with a steady plume of pale smoke rising, while the smith rhythmically pumps the leather bellows and the blacksmith in a leather apron raises and strikes his hammer against the glowing orange iron bloom on the stone anvil with bright sparks. On the left foreground, the artisans in woven wraps make smooth, gentle burnishing motions shaping the rounded clay pottery jars beside the campfire flames. In the midground fields, the tall stalks of pearl millet and sorghum sway softly in the savanna breeze while the herd of goats shifts and grazes quietly.",
  lapita:
    "Scientific museum paleoart illustration of an Austronesian Lapita seafaring settlement on a tropical Pacific island, locked static camera with no camera movement or zoom. Keep the thatched stilt houses on the left, the tropical volcanic mountains, and the overall composition completely still and unchanged. In the foreground, the seated women in woven fiber wraps make delicate, rhythmic hand motions pressing comb-like dentate stamps into the reddish clay bowls to create geometric patterns. On the right, the large double-hulled outrigger voyaging canoe with triangular woven pandanus sails gently bobs and sways in the turquoise lagoon water, where soft white surf laps continuously along the sandy beach. Along the beach, the villagers walk steadily carrying woven baskets of breadfruit and guiding small spotted pigs under the swaying coconut palms.",
  azilian:
    "Scientific museum paleoart illustration of an Azilian hunter-gatherer camp beside a mountain river in post-glacial Europe, locked static camera with no camera movement or zoom. Keep the rock cliff overhang on the left, the distant misty mountains, and the overall composition completely still and unchanged. In the left foreground, the seated hunter in fur clothing makes delicate, steady brushstrokes painting red ochre dots and stripes onto the smooth river pebbles in front of him. In the right foreground, the seated craftsman in a tunic makes careful, rhythmic scraping motions with a flint burin to carve barbs into a bone harpoon. Beside the river, the clear water flows with gentle ripples, while on the right the two hunters walk steadily forward along the grassy bank carrying a red deer on a wooden pole and the campfire by the cave shelter flickers with a thin plume of pale smoke.",
  maglemosian:
    "Scientific museum paleoart illustration of a Mesolithic Maglemosian lake camp in northern Europe, locked static camera with no camera movement or zoom. Keep the bark-covered huts on the brushwood platform, the pine forest, and the overall composition completely still and unchanged. In the foreground on the right, the seated hunter in a tunic rhythmically binds feather fletchings and flint points onto the arrow in his hands, while the hunting dog sitting beside him calmly watches with subtle breaths and head turns. On the left, the hunter wading in the shallow lake makes poised, gentle motions with his fishing leister into the water where soft ripples spread, and the wooden dugout canoe gently bobs among the lily pads. Across the calm misty lake, warm sunset light reflects on the water surface while smoke drifts from the platform campfire and the distant elk stands peacefully on the far shore.",
  ertebolle:
    "Scientific museum paleoart illustration of an Ertebølle coastal hunter-gatherer settlement in Mesolithic southern Scandinavia, locked static camera with no camera movement or zoom. Keep the large oyster shell midden on the left, the conical birch-bark huts, and the overall composition completely still and unchanged. In the dugout canoe on the left, the two fishermen handle freshly caught silver fish and gently dip their wooden paddle as soft ripples lap against the rocky shoreline and the wicker fish traps. In the right foreground, the seated craftsman in a tunic makes steady scraping motions shaping a bone tool on the log while the standing archer holding a wooden bow surveys the shoreline. In the midground, a steady plume of pale smoke rises from the stone campfire as the woman gently turns the fish grilling on the rack under the tall green oak and pine trees.",
  epigravettian:
    "Scientific museum paleoart illustration of an Epigravettian Mediterranean camp in southern Europe, locked static camera with no camera movement or zoom. Keep the limestone cliffs on the left, the hide-covered tents, and the overall composition completely still and unchanged. In the left foreground, the three seated craftsmen in leather tunics make careful knapping and carving motions using flint tools to shape wooden spear shafts. On the right, the seated women in woven tunics rhythmically weave fiber baskets and tend the fish grilling over the stone-ringed campfire, where bright orange flames flicker and pale smoke rises gently. In the foreground, dried fish and mammoth ivory carvings rest on the animal pelt, while in the distance the turquoise Mediterranean sea glistens with soft ripples under the morning sun.",
  natufian:
    "Scientific museum paleoart illustration of a Natufian stone-house village in the Levant, locked static camera with no camera movement or zoom. Keep the circular drystone houses with conical thatch roofs, the olive trees, the rolling hills, and the overall composition completely still and unchanged. In the left foreground, the two seated women wearing dentalium shell headdresses and tunics rhythmically raise and press heavy stone pestles into deep limestone mortars to grind wild grain into flour. On the right foreground, the standing farmer in a tunic holds a curved bone sickle and sheaf of golden wheat, his posture firm with subtle natural breathing. In the center, bright embers and a delicate column of pale smoke drift upward from the stone hearth ring as the domestic dog lies calmly beside it, while along the winding stone path the hunters walk steadily carrying a gazelle.",
  capsian:
    "Scientific museum paleoart illustration of a Capsian hunter-gatherer encampment in the Maghreb, locked static camera with no camera movement or zoom. Keep the large snail-shell mound, the domed brushwood huts, and the overall composition completely still and unchanged. In the left foreground, the seated women in woven tunics make delicate, rhythmic engraving motions with pointed stone tools, carving geometric patterns into the smooth ostrich eggshells in their hands. In the right foreground, the seated flintknappers make controlled, rhythmic striking motions with hammerstones to detach fine microlith blades from the flint cores. In the midground, bright orange embers glow warmly in the stone-ringed hearths with delicate wisps of pale smoke rising, while the distant hunters walk slowly along the arid hillside path.",
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
