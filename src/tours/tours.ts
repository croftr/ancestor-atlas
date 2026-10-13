import type { Category } from "../types";

/**
 * Guided tours: the globe plays forward and stops at each entity in turn, turning to it and opening
 * its card. A stop lands on `year` if given, else the entity's best year (an event's `year`).
 * `hold` is how long the card stays up, in seconds (default: from the length of its description).
 * `layers`: the categories shown during the tour (default: all); the viewer's own come back after.
 * `music`: background track, a bucket key (music/tours/<id>-v<n>.mp3; set by `npm run audio:music`).
 * `announcement`: the title card's voice-over, reading announcementText (narration/tours/<id>-v<n>.mp3;
 * set by `npm run audio:narrate -- --announce <id>`; `text_hash` is that text's fingerprint when recorded).
 * Stops run oldest first. src/tours/tours.test.ts checks every stop lands on something visible.
 */
export interface TourStop {
  entity: string;
  year?: number;
  site?: string;
  hold?: number;
}

export interface Tour {
  id: string;
  title: string;
  blurb: string;
  layers?: Category[];
  music?: { src: string; credit: string };
  announcement?: { src: string; credit: string; text_hash: string };
  /** Played before the title card: a bucket key (intro/tours/<id>-v<n>.mp4; set by `npm run video:intro`). */
  intro?: { video: string; credit?: string };
  stops: TourStop[];
}

/** What the title card's announcement says: the tour's title (the blurb is only shown). */
export const announcementText = (t: Pick<Tour, "title">) => `${t.title}.`;

export const TOURS: Tour[] = [
  {
    id: "events-and-inventions",
    title: "Events and inventions",
    blurb: "From the first stone tools to paper: the breakthroughs that shaped the human story.",
    music: { src: "music/tours/events-and-inventions-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/events-and-inventions-v2.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "11a7f7e233" },
    stops: [
      { entity: "hominin-divergence" },
      { entity: "lomekwian-tools" },
      { entity: "oldowan-tools" },
      { entity: "out-of-africa-dmanisi" },
      { entity: "acheulean-handaxes" },
      { entity: "control-of-fire" },
      { entity: "modern-humans-emerge" },
      { entity: "symbolic-culture" },
      { entity: "sahul-seafaring" },
      { entity: "archaic-human-admixture" },
      { entity: "figurative-cave-art" },
      { entity: "earliest-musical-instruments" },
      { entity: "peopling-of-the-americas" },
      { entity: "first-pottery" },
      { entity: "dog-domestication" },
      { entity: "gobekli-tepe" },
      { entity: "birth-of-agriculture" },
      { entity: "copper-smelting" },
      { entity: "invention-of-the-wheel" },
      { entity: "bronze-age" },
      { entity: "development-of-writing" },
      { entity: "great-pyramid" },
      { entity: "indus-cities" },
      { entity: "alphabetic-script" },
      { entity: "code-of-hammurabi" },
      { entity: "iron-age" },
      { entity: "sea-peoples" },
      { entity: "minted-coinage" },
      { entity: "papermaking" },
    ],
  },
  {
    id: "human-evolution",
    title: "Human evolution",
    blurb: "Seven million years of our family tree: the first upright apes, the first toolmakers, and the many kinds of human who shared the world with ours.",
    layers: ["species", "event"],
    music: { src: "music/tours/human-evolution-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/human-evolution-v2.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "c754f74f96" },
    stops: [
      { entity: "sahelanthropus", year: -6_999_999, site: "sahelanthropus@1" },
      { entity: "ardipithecus-ramidus", year: -4_399_999, site: "ardipithecus-ramidus@1" },
      { entity: "australopithecus-afarensis", year: -3_199_999, site: "australopithecus-afarensis@3" },
      { entity: "homo-habilis", year: -2_299_999, site: "homo-habilis@3" },
      { entity: "paranthropus-boisei", year: -1_899_999, site: "paranthropus-boisei@2" },
      { entity: "homo-erectus", year: -1_799_999, site: "homo-erectus@1" },
      { entity: "homo-antecessor", year: -849_999, site: "homo-antecessor@1" },
      { entity: "homo-heidelbergensis", year: -599_999, site: "homo-heidelbergensis@2" },
      { entity: "neanderthal", year: -429_999, site: "neanderthal@1" },
      { entity: "homo-sapiens", year: -309_999, site: "homo-sapiens@1" },
      { entity: "homo-naledi", year: -289_999, site: "homo-naledi@1" },
      { entity: "denisovan", year: -159_999, site: "denisovan@1" },
      { entity: "homo-floresiensis", year: -79_999, site: "homo-floresiensis@1" },
      { entity: "archaic-human-admixture" },
      { entity: "peopling-of-the-americas" },
    ],
  },
  {
    id: "out-of-africa",
    title: "Out of Africa",
    blurb: "How our ancestors left Africa and reached every continent, from the first steps into Asia to the peopling of the Americas.",
    layers: ["species", "culture", "event"],
    music: { src: "music/tours/out-of-africa-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/out-of-africa-v2.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "cce3d2ec85" },
    intro: { video: "intro/tours/out-of-africa-v1.mp4" },
    stops: [
      { entity: "out-of-africa-dmanisi" },
      { entity: "homo-sapiens", year: -309_999, site: "homo-sapiens@1" },
      { entity: "symbolic-culture" },
      { entity: "sahul-seafaring" },
      { entity: "archaic-human-admixture" },
      { entity: "figurative-cave-art" },
      { entity: "aurignacian", year: -39_999, site: "aurignacian@1" },
      { entity: "peopling-of-the-americas" },
      { entity: "clovis", year: -10_999, site: "clovis@2" },
    ],
  },
  {
    id: "ice-age-artists",
    title: "Ice Age artists and toolmakers",
    blurb: "From the first sharp flakes of stone to the painted caves of the Ice Age: how our ancestors learned to make tools, ornaments, music and art.",
    layers: ["culture", "event"],
    music: { src: "music/tours/ice-age-artists-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/ice-age-artists-v2.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "086e08cb08" },
    stops: [
      { entity: "lomekwian-tools" },
      { entity: "oldowan-tools" },
      { entity: "acheulean-handaxes" },
      { entity: "middle-stone-age", year: -149_999, site: "middle-stone-age@3" },
      { entity: "levallois-mousterian", year: -89_999, site: "levallois-mousterian@r:pech-de-l-aze-iv-i-ii" },
      { entity: "symbolic-culture" },
      { entity: "figurative-cave-art" },
      { entity: "chatelperronian", year: -40_999, site: "chatelperronian@r:grotte-des-fees-chatelperron-grotte-effondree" },
      { entity: "aurignacian", year: -39_999, site: "aurignacian@1" },
      { entity: "earliest-musical-instruments" },
      { entity: "gravettian", year: -27_999, site: "gravettian@5" },
      { entity: "solutrean", year: -18_999, site: "solutrean@2" },
      { entity: "first-pottery" },
      { entity: "magdalenian", year: -12_999, site: "magdalenian@1" },
    ],
  },
  {
    id: "civilizations",
    title: "Rise and fall of civilizations",
    blurb: "From the first cities of Sumer to the Roman Empire: how the great civilizations of the ancient world rose, flourished and fell.",
    layers: ["civilization", "event"],
    music: { src: "music/tours/civilizations-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/civilizations-v2.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "eacdbe73ce" },
    stops: [
      { entity: "sumerian-city-states", year: -2_899 },
      { entity: "great-pyramid" },
      { entity: "indus-cities" },
      { entity: "akkadian-empire", year: -2_249 },
      { entity: "code-of-hammurabi" },
      { entity: "minoan-civilization", year: -1_499 },
      { entity: "new-kingdom-of-egypt", year: -1_349 },
      { entity: "hittites", year: -1_299 },
      { entity: "sea-peoples" },
      { entity: "phoenicia", year: -899 },
      { entity: "neo-assyrian-empire", year: -699 },
      { entity: "olmec-civilization", year: -599 },
      { entity: "achaemenid-empire", year: -499 },
      { entity: "greek-city-states", year: -449 },
      { entity: "macedonian-empire", year: -329 },
      { entity: "maurya-empire", year: -249 },
      { entity: "qin-dynasty", year: -209 },
      { entity: "han-dynasty", year: -99 },
      { entity: "roman-empire", year: -9 },
    ],
  },
];

export const tourById = (id: string) => TOURS.find((t) => t.id === id);
