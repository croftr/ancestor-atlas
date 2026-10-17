import type { Category } from "../types";
import type { DnaColour } from "../dna/haplogroups";

/**
 * Guided tours: the globe plays forward and stops at each entity in turn, turning to it and opening
 * its card. A stop lands on `year` if given, else the entity's best year (an event's `year`).
 * `hold` is how long the card stays up, in seconds (default: from the length of its description).
 * `layers`: the categories shown during the tour (default: all); the viewer's own come back after.
 * `dna`: show the ancient DNA layer during the tour, coloured by "y", "mt" or "plain".
 * `music`: background track, a bucket key (music/tours/<id>-v<n>.mp3; set by `npm run audio:music`).
 * `announcement`: the title card's voice-over, reading announcementText (narration/tours/<id>-v<n>.mp3;
 * set by `npm run audio:narrate -- --announce <id>`; `text_hash` is that text's fingerprint when recorded).
 * `closing`: a line or two for the end card, after the last stop; `closingNarration` reads it in the epilogue
 * (narration/tours/<id>-closing-v<n>.mp3; `npm run audio:narrate -- --closing <id>|all`).
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
  /** Turn the ancient DNA layer on for the tour, coloured this way (the viewer's own setting comes back after). */
  dna?: DnaColour;
  music?: { src: string; credit: string };
  announcement?: { src: string; credit: string; text_hash: string };
  closing?: string;
  closingNarration?: { src: string; credit: string; text_hash: string };
  stops: TourStop[];
}

/** What the title card's announcement says: the tour's title (the blurb is only shown). */
export const announcementText = (t: Pick<Tour, "title">) => `${t.title}.`;

/** Played at the end of every tour, straight after the closing line is read; the music fades away under it. */
export const OUTRO = "music/tours/outro-v1.mp3";
/** When the outro's last note sounds (ms into outro-v1): the tour's title comes up then (TourFinale.tsx). */
export const OUTRO_LAST_NOTE_MS = 2_750;

export const TOURS: Tour[] = [
  {
    id: "events-and-inventions",
    title: "Events and inventions",
    closing: "None of these was a single moment. Each was learned, taught and handed on by people whose names we will never know, over more than a hundred thousand generations.",
    blurb: "From the first stone tools to paper: the breakthroughs that shaped the human story.",
    music: { src: "music/tours/events-and-inventions-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/events-and-inventions-v4.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "11a7f7e233" },
    closingNarration: { src: "narration/tours/events-and-inventions-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "8964ee6826" },
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
    closing: "For most of this story, several kinds of human shared the Earth. Today only one of them is left to look back on the others.",
    blurb: "Seven million years of our family tree: the first upright apes, the first toolmakers, and the many kinds of human who shared the world with ours.",
    layers: ["species", "event"],
    music: { src: "music/tours/human-evolution-v2.mp3", credit: "Music: \"Apeman Suite\" by Paul Lawler" },
    announcement: { src: "narration/tours/human-evolution-v4.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "c754f74f96" },
    closingNarration: { src: "narration/tours/human-evolution-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "1b16a01764" },
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
    closing: "Everyone alive today descends from these journeys. The map we have just crossed is a family tree.",
    blurb: "How our ancestors left Africa and reached every continent, from the first steps into Asia to the peopling of the Americas.",
    layers: ["species", "culture", "event"],
    music: { src: "music/tours/out-of-africa-v2.mp3", credit: "Music: \"Apeman Suite\" by Paul Lawler" },
    announcement: { src: "narration/tours/out-of-africa-v3.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "cce3d2ec85" },
    closingNarration: { src: "narration/tours/out-of-africa-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "56adc2ccb1" },
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
    closing: "Their hands are still on the cave walls. Across forty thousand years and more, they are still telling us they were here.",
    blurb: "From the first sharp flakes of stone to the painted caves of the Ice Age: how our ancestors learned to make tools, ornaments, music and art.",
    layers: ["culture", "event"],
    music: { src: "music/tours/ice-age-artists-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/ice-age-artists-v4.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "086e08cb08" },
    closingNarration: { src: "narration/tours/ice-age-artists-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "e27fb66e5f" },
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
    closing: "Every empire on this map fell. What outlasted them were the things they shared: writing, roads, laws, ideas and stories.",
    blurb: "From the first cities of Sumer to the Roman Empire: how the great civilizations of the ancient world rose, flourished and fell.",
    layers: ["civilization", "event"],
    music: { src: "music/tours/civilizations-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/civilizations-v3.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "eacdbe73ce" },
    closingNarration: { src: "narration/tours/civilizations-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "0e830f7708" },
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
  {
    id: "steppe-migration",
    title: "Out of the steppe",
    closing: "Within two thousand years, the descendants of the steppe herders had reached from Ireland to India. Their languages still carry the traces, and so do our genomes.",
    blurb: "How herders from the grasslands north of the Black Sea spread across Europe and Asia, traced in their graves and their ancient DNA.",
    layers: ["culture", "event"],
    dna: "y",
    announcement: { src: "narration/tours/steppe-migration-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "accd7da6dd" },
    closingNarration: { src: "narration/tours/steppe-migration-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "2e073949b3" },
    music: { src: "music/tours/steppe-migration-v2.mp3", credit: "Music: \"good-dungeon-music\" (credit to confirm)" },
    stops: [
      { entity: "invention-of-the-wheel" },
      { entity: "yamnaya", year: -2_999, site: "yamnaya@x:lopatino" },
      { entity: "afanasievo", year: -2_979, site: "afanasievo@x:river-kuyum" },
      { entity: "corded-ware", year: -2_499, site: "corded-ware@x:esperstedt" },
      { entity: "bell-beaker", year: -2_299, site: "bell-beaker@x:amesbury" },
      { entity: "unetice", year: -1_999, site: "unetice@x:esperstedt" },
      { entity: "sintashta", year: -1_949, site: "sintashta@x:bulanovo" },
      { entity: "andronovo", year: -1_599, site: "andronovo@x:kytmanovo" },
    ],
  },
  {
    id: "domestication",
    title: "Taming the wild",
    closing: "Farming was invented again and again, on almost every continent. Nearly everything we eat today was first grown or herded by the people of these few places.",
    blurb: "How people in many parts of the world, each on their own, turned wild plants and animals into crops and herds, from the first dogs to the chicken.",
    layers: ["culture", "event"],
    announcement: { src: "narration/tours/domestication-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "3a87d8574b" },
    closingNarration: { src: "narration/tours/domestication-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "97d12fd67f" },
    music: { src: "music/tours/domestication-v3.mp3", credit: "Music: \"Expedition\" by Alex-Productions (onsound.eu), CC BY 3.0" },
    stops: [
      { entity: "dog-domestication" },
      { entity: "birth-of-agriculture" },
      { entity: "cattle-and-pigs" },
      { entity: "maize-and-squash" },
      { entity: "rice-and-millet" },
      { entity: "new-guinea-farming" },
      { entity: "dairying" },
      { entity: "andean-domestication" },
      { entity: "linear-pottery", year: -5_299, site: "linear-pottery@x:bylany" },
      { entity: "sorghum-and-millet" },
      { entity: "bantu-farmers", year: -2_499, site: "bantu-farmers@1" },
      { entity: "horse-domestication" },
      { entity: "chicken-domestication" },
      { entity: "lapita", year: -1_399, site: "lapita@1" },
    ],
  },
];

export const tourById = (id: string) => TOURS.find((t) => t.id === id);
