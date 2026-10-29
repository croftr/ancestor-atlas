import type { Category, ExtraImage } from "../types";
import type { DnaColour } from "../dna/haplogroups";
/** Every event id, oldest first; written by `npm run data:build` (scripts/build-data.ts). */
import EVENT_IDS from "./event-ids.json";

/**
 * Guided tours: the globe plays forward and stops at each entity in turn, turning to it and opening
 * its card. A stop lands on `year` if given, else the entity's best year (an event's `year`).
 * `hold` is how long the card stays up, in seconds (default: from the length of its description).
 * `layers`: the categories shown during the tour (default: all); the viewer's own come back after.
 * `dna`: show the ancient DNA layer during the tour, coloured by "y", "mt" or "plain".
 * `paleo`: show the coastlines and ice sheets of the time during the tour (map/paleo.ts).
 * `music`: background track, a bucket key (music/tours/<id>-v<n>.mp3; set by `npm run audio:music`).
 * `announcement`: the title card's voice-over, reading announcementText (narration/tours/<id>-v<n>.mp3;
 * set by `npm run audio:narrate -- --announce <id>`; `text_hash` is that text's fingerprint when recorded).
 * `closing`: a line or two for the end card, after the last stop; `closingNarration` reads it in the epilogue
 * (narration/tours/<id>-closing-v<n>.mp3; `npm run audio:narrate -- --closing <id>|all`).
 * Stops run oldest first. src/tours/tours.test.ts checks every stop lands on something visible.
 *
 * Book tours (docs/book-tours.md): `book` names the book, `synopsis` is shown (and `synopsisNarration` read)
 * on the title card in place of the blurb, and each stop's `note` says what the book makes of it, shown
 * over the globe (and read) before the card opens. A note belongs to the stop, not the entity, so cards
 * read the same in every tour. `draft`: the notes are not yet checked against the book.
 */
export interface TourStop {
  entity: string;
  year?: number;
  site?: string;
  hold?: number;
  note?: BookNote;
}

export interface BookNote {
  text: string;
  /** Where the book says it, e.g. "Chapter 7"; left out until checked against the book. */
  chapter?: string;
  narration?: { src: string; credit: string; text_hash: string };
  /**
   * Pictures of the place, after the book's cover, taking turns while the note is read (`at` as for
   * `extra_images`; else spread evenly). public/images/books/<tour id>/<stop n>-<k>.webp.
   */
  images?: ExtraImage[];
}

export interface Book {
  title: string;
  author: string;
  year: number;
  publisher: string;
  /** A page about the book (the publisher's, or its Wikipedia article). */
  link: string;
  /** The front cover (public/images/books/<id>.webp, 600 px wide): the tour's picture on the Tours page, menu and title card. */
  cover?: { url: string; credit: string };
}

export interface Tour {
  id: string;
  title: string;
  blurb: string;
  layers?: Category[];
  /** Turn the ancient DNA layer on for the tour, coloured this way (the viewer's own setting comes back after). */
  dna?: DnaColour;
  /** Turn the coastlines and ice sheets of the time on for the tour (the viewer's own setting comes back after). */
  paleo?: true;
  music?: { src: string; credit: string };
  announcement?: { src: string; credit: string; text_hash: string };
  closing?: string;
  closingNarration?: { src: string; credit: string; text_hash: string };
  book?: Book;
  synopsis?: string;
  synopsisNarration?: { src: string; credit: string; text_hash: string };
  draft?: true;
  stops: TourStop[];
}

/** What the title card's announcement says: the tour's title (the blurb is only shown). */
export const announcementText = (t: Pick<Tour, "title">) => `${t.title}.`;

/** Played at the end of every tour, straight after the closing line is read; the music fades away under it. */
export const OUTRO = "music/tours/outro-v1.mp3";

export const TOURS: Tour[] = [
  {
    id: "events-and-inventions",
    title: "Events and inventions",
    closing: "None of these was a single moment. Each was learned, taught and handed on by people whose names we will never know, over more than a hundred thousand generations.",
    blurb: "From the first stone tools to paper: the breakthroughs that shaped the human story.",
    music: { src: "music/tours/events-and-inventions-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/events-and-inventions-v4.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "11a7f7e233" },
    closingNarration: { src: "narration/tours/events-and-inventions-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "8964ee6826" },
    // Every event, so a new one joins the tour with the next data build.
    stops: EVENT_IDS.map((entity) => ({ entity })),
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
      { entity: "laetoli-footprints" },
      { entity: "australopithecus-afarensis", year: -3_199_999, site: "australopithecus-afarensis@3" },
      { entity: "homo-habilis", year: -2_299_999, site: "homo-habilis@3" },
      { entity: "paranthropus-boisei", year: -1_899_999, site: "paranthropus-boisei@2" },
      { entity: "homo-erectus", year: -1_799_999, site: "homo-erectus@1" },
      { entity: "control-of-fire" },
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
    closing: "No one set out to cross the world; each generation only moved to the next valley, the next coast, the next horizon. Yet step by step, one African species found a way to live in every corner of the Earth.",
    blurb: "How our ancestors left Africa and reached every continent, from the first steps into Asia to the peopling of the Americas.",
    layers: ["species", "culture", "event"],
    music: { src: "music/tours/out-of-africa-v2.mp3", credit: "Music: \"Apeman Suite\" by Paul Lawler" },
    announcement: { src: "narration/tours/out-of-africa-v3.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "cce3d2ec85" },
    closingNarration: { src: "narration/tours/out-of-africa-closing-v2.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "21aed7481a" },
    stops: [
      { entity: "out-of-africa-dmanisi" },
      { entity: "homo-sapiens", year: -309_999, site: "homo-sapiens@1" },
      { entity: "symbolic-culture" },
      { entity: "sahul-seafaring" },
      { entity: "archaic-human-admixture" },
      { entity: "figurative-cave-art" },
      { entity: "aurignacian", year: -39_999, site: "aurignacian@1" },
      { entity: "peopling-of-the-americas" },
      { entity: "clovis", year: -10_999, site: "clovis@4" },
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
      { entity: "kalambo-falls-wood" },
      { entity: "schoningen-spears" },
      { entity: "middle-stone-age", year: -149_999, site: "middle-stone-age@3" },
      { entity: "earliest-burials" },
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
  {
    id: "words-and-ideas",
    title: "Words, numbers and ideas",
    closing: "Spoken words vanish on the breath. Written down, they let the dead speak to the living across thousands of years.",
    blurb: "From the first carved signs and clay tablets to the alphabet, written laws, coinage and paper: how humans learned to store and share thought across time.",
    layers: ["culture", "civilization", "event"],
    announcement: { src: "narration/tours/words-and-ideas-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "11ed7e8232" },
    closingNarration: { src: "narration/tours/words-and-ideas-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "23cee7acf7" },
    music: { src: "music/tours/words-and-ideas-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    stops: [
      { entity: "symbolic-culture" },
      { entity: "earliest-musical-instruments" },
      { entity: "gobekli-tepe" },
      { entity: "sumerian-city-states", year: -3_349 },
      { entity: "development-of-writing" },
      { entity: "indus-cities" },
      { entity: "alphabetic-script" },
      { entity: "code-of-hammurabi" },
      { entity: "phoenicia", year: -899 },
      { entity: "minted-coinage" },
      { entity: "greek-city-states", year: -449 },
      { entity: "papermaking" },
    ],
  },
  {
    id: "wheels-sails-and-metals",
    title: "Wheels, sails and metals",
    closing: "Every tool changed the reach of human hands. With wheel, sail and furnace, distant peoples became neighbours.",
    blurb: "From the first sea crossings and copper furnaces to bronze, chariots, iron and maritime trade: the technologies and networks that bound the ancient world together.",
    layers: ["culture", "civilization", "event"],
    announcement: { src: "narration/tours/wheels-sails-and-metals-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "e9f27b3ecf" },
    closingNarration: { src: "narration/tours/wheels-sails-and-metals-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "5ba7edfd95" },
    music: { src: "music/tours/wheels-sails-and-metals-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    stops: [
      { entity: "sahul-seafaring" },
      { entity: "first-pottery" },
      { entity: "copper-smelting" },
      { entity: "cucuteni-trypillia", year: -4_299, site: "cucuteni-trypillia@x:scanteia" },
      { entity: "invention-of-the-wheel" },
      { entity: "bronze-age" },
      { entity: "great-pyramid" },
      { entity: "horse-domestication" },
      { entity: "sintashta", year: -1_949, site: "sintashta@x:bulanovo" },
      { entity: "minoan-civilization", year: -1_499 },
      { entity: "lapita", year: -1_399, site: "lapita@1" },
      { entity: "iron-age" },
      { entity: "sea-peoples" },
      { entity: "carthage", year: -269 },
    ],
  },
  {
    id: "first-americans",
    title: "The first Americans",
    closing: "They came from Asia over land that is now sea. Cut off from the rest of the world, their descendants invented farming, cities and writing all over again.",
    blurb: "From the first footprints in North America to the cities of Mesoamerica: how the peoples of two continents, cut off from the rest of the world, found their own way to farming, monuments and writing.",
    layers: ["culture", "civilization", "event"],
    paleo: true,
    music: { src: "music/tours/first-americans-v1.mp3", credit: "Music: \"Memories Of Stone\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/first-americans-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "1db51fda15" },
    closingNarration: { src: "narration/tours/first-americans-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "a58ba22355" },
    stops: [
      { entity: "peopling-of-the-americas" },
      { entity: "clovis", year: -11_050, site: "clovis@4" },
      { entity: "quaternary-megafauna-extinction", site: "quaternary-megafauna-extinction@1" },
      { entity: "maize-and-squash" },
      { entity: "andean-domestication" },
      { entity: "chinchorro-mummies" },
      { entity: "caral-supe" },
      { entity: "poverty-point" },
      { entity: "olmec-civilization", year: -599 },
      { entity: "zapotec-civilization", year: -299 },
      { entity: "mayan-city-states", year: -99 },
      { entity: "teotihuacan", year: -9 },
    ],
  },
  {
    id: "when-the-ice-melted",
    title: "When the ice melted",
    closing: "In ten thousand years the ice sheets melted and the sea rose more than a hundred metres. The shores where Ice Age people lived now lie far under the waves.",
    blurb: "From the coldest days of the last Ice Age to the coasts of today: how people lived through the great warming, as the ice sheets melted, forests spread and the rising sea drowned whole landscapes.",
    layers: ["culture", "event"],
    paleo: true,
    music: { src: "music/tours/when-the-ice-melted-v1.mp3", credit: "Music: \"Permafrost\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    announcement: { src: "narration/tours/when-the-ice-melted-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "c75d236edf" },
    closingNarration: { src: "narration/tours/when-the-ice-melted-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "2a2d812d57" },
    stops: [
      { entity: "first-pottery" },
      { entity: "epigravettian", year: -16_999, site: "epigravettian@r:paglicci" },
      { entity: "magdalenian", year: -13_999, site: "magdalenian@4" },
      { entity: "dog-domestication" },
      { entity: "natufian", year: -11_999, site: "natufian@4" },
      { entity: "azilian", year: -9_999, site: "azilian@x:miron" },
      { entity: "gobekli-tepe" },
      { entity: "maglemosian", year: -8_899, site: "maglemosian@x:starr-carr" },
      { entity: "capsian", year: -6_999, site: "capsian@x:el-mekta" },
      { entity: "ertebolle", year: -4_499, site: "ertebolle@x:erteb-lle" },
    ],
  },
  {
    id: "kindred",
    title: "Kindred",
    book: {
      title: "Kindred: Neanderthal Life, Love, Death and Art",
      author: "Rebecca Wragg Sykes",
      year: 2020,
      publisher: "Bloomsbury Sigma",
      link: "https://en.wikipedia.org/wiki/Kindred:_Neanderthal_Life,_Love,_Death_and_Art",
      cover: { url: "/images/books/kindred.webp", credit: "Cover © Bloomsbury Sigma" },
    },
    blurb: "Rebecca Wragg Sykes's portrait of the Neanderthals, told through the places where the evidence was found, from their earliest days to their last.",
    synopsis: "For over a century Neanderthals stood for the brutish cave man. In Kindred, archaeologist Rebecca Wragg Sykes pulls together a generation of new evidence to show a very different people. Across some 350,000 years, from Wales to the borders of China, they made sophisticated tools from stone, wood and birch tar, hunted everything from mammoths to seabirds, cared for the injured, handled their dead, and met and had children with our own ancestors. This tour visits the places where that evidence was found, from their earliest days to their last.",
    closing: "Not brutes and not a failed version of us: in Kindred, Neanderthals are another way of being human, and in our DNA part of them came along.",
    // Drafts from reviews and the published evidence (docs/book-tours.md); Rob checks each against the book.
    synopsisNarration: { src: "narration/books/kindred/synopsis-v1.mp3", credit: "AI-generated narration", text_hash: "7ff691a095" },
    announcement: { src: "narration/tours/kindred-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "61fbdc978a" },
    music: { src: "music/tours/kindred-v1.mp3", credit: "Music: \"Hiraeth\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    closingNarration: { src: "narration/tours/kindred-closing-v1.mp3", credit: "AI-generated narration", text_hash: "83476b7474" },
    stops: [
      {
        entity: "neanderthal",
        year: -429_999,
        site: "neanderthal@1",
        note: { text: "At the bottom of a deep shaft in the Atapuerca hills lie the bones of at least twenty-eight people from about 430,000 years ago, the earliest known on the Neanderthal line. Their DNA links them to Neanderthals. How so many ended up there, and whether they were placed there on purpose, is still argued over.", narration: { src: "narration/books/kindred/stop-1-v1.mp3", credit: "AI-generated narration", text_hash: "22b26160b3" }, images: [{ url: "/images/books/kindred/1-1.webp", credit: "Dorieo, CC BY-SA 4.0, via Wikimedia Commons", caption: "Cast of a skull from the Sima de los Huesos, one of at least 28 people found at the bottom of the shaft", source: "https://commons.wikimedia.org/wiki/File:Réplicas_de_cráneo_adulto_(Agamenón)._Sima_de_los_Huesos.jpg" }, { url: "/images/books/kindred/1-2.webp", credit: "Nohemi Sala et al. (PLoS ONE 2015), CC BY 4.0, via Wikimedia Commons", caption: "Cranium 17 from the Sima de los Huesos, with two matching fractures over the left eye", source: "https://commons.wikimedia.org/wiki/File:Sima_de_los_Huesos_-_Cranium_17.png" }, { url: "/images/books/kindred/1-3.webp", credit: "Dorieo, CC BY-SA 4.0, via Wikimedia Commons", caption: "Cast of an adult man's pelvis from the Sima de los Huesos, found in 1994", source: "https://commons.wikimedia.org/wiki/File:Pelvis_masculina_(Elvis)._Sima_de_los_Huesos.jpg" }] },
      },
      {
        entity: "schoningen-spears",
        note: { text: "Wragg Sykes argues that the stone tools that survive show only part of what Neanderthals made. Most of what they made was wood, and has rotted away. Schöningen is the rare exception: spruce and pine spears some 300,000 years old, shaped and balanced for hunting horses by a lakeshore.", narration: { src: "narration/books/kindred/stop-2-v1.mp3", credit: "AI-generated narration", text_hash: "65229ba9ac" }, images: [{ url: "/images/books/kindred/2-1.webp", credit: "P. Pfarr (Lower Saxony State Office for Heritage), CC BY-SA 3.0 de, via Wikimedia Commons", caption: "Excavator Hartmut Thieme explaining Spear VI, still lying where it was found at Schöningen", source: "https://commons.wikimedia.org/wiki/File:Schöningen_Speer_VI_©_P._Pfarr_NLD.jpg" }, { url: "/images/books/kindred/2-2.webp", credit: "Matthias Vogel, Jens Lehmann and Dirk Leder, CC BY 4.0, via Wikimedia Commons", caption: "Pointed split pieces of wood from Schöningen, with close-ups of their worked tips", source: "https://commons.wikimedia.org/wiki/File:Schöningen_pointed_split_woods_Lower_Palaeolithic.jpg" }] },
      },
      {
        entity: "neanderthal",
        year: -129_999,
        site: "neanderthal@2",
        note: { text: "Krapina has hundreds of Neanderthal bones from about 130,000 years ago, more than any other site, many with cut marks. The book takes cannibalism seriously but asks the reader to weigh other readings, including the care of the dead. Eight white-tailed eagle talons from the site, cut and polished, may have been worn as jewellery.", narration: { src: "narration/books/kindred/stop-3-v1.mp3", credit: "AI-generated narration", text_hash: "9b36f097a3" }, images: [{ url: "/images/books/kindred/3-1.webp", credit: "Luka Mjeda (Radovčić et al., PLoS ONE 2015), CC BY 4.0, via Wikimedia Commons", caption: "White-tailed eagle talons from Krapina, about 130,000 years old, with cut marks that suggest they were worn", source: "https://commons.wikimedia.org/wiki/File:Neandertal_Jewelry_(from_PLoS).jpg" }, { url: "/images/books/kindred/3-2.webp", credit: "Divna Jaksic, public domain, via Wikimedia Commons", caption: "Models of Neanderthals at the Hušnjakovo find site in Krapina, Croatia", source: "https://commons.wikimedia.org/wiki/File:Krapina_-_Hušnjakovo_01.jpg" }] },
      },
      {
        entity: "levallois-mousterian",
        year: -109_999,
        site: "levallois-mousterian@r:cueva-de-los-aviones",
        note: { text: "On the coast near Cartagena, Neanderthals collected seashells about 115,000 years ago, pierced some and coloured them with red and yellow pigments. If the dates hold, these ornaments are older than any known from our own species in Europe, a strong sign that the urge to adorn was not ours alone.", narration: { src: "narration/books/kindred/stop-4-v1.mp3", credit: "AI-generated narration", text_hash: "b0ab8a28e8" }, images: [{ url: "/images/books/kindred/4-1.webp", credit: "P4K1T0, CC BY-SA 3.0, via Wikimedia Commons", caption: "Cueva de los Aviones, a sea cave under the Fuerte de Navidad in the bay of Cartagena, Spain", source: "https://commons.wikimedia.org/wiki/File:Cueva_de_los_Aviones.JPG" }] },
      },
      {
        entity: "earliest-burials",
        site: "earliest-burials@1",
        note: { text: "Some of the oldest graves anywhere are here, on Mount Carmel and near Nazareth, where early modern humans buried their dead at Skhul and Qafzeh around 100,000 years ago, with antlers, a boar's jaw and red ochre. Neanderthals lived in the same hills, at Tabun and later Kebara. Wragg Sykes looks at the many ways Neanderthals treated their own dead, from cut-marked bones to graves like those at La Chapelle and Shanidar, and at how hard a burial is to prove.", narration: { src: "narration/books/kindred/stop-5-v2.mp3", credit: "AI-generated narration", text_hash: "f05d81ee1e" }, images: [{ url: "/images/books/kindred/burials-1.webp", credit: "Rama, CC BY-SA 3.0 fr, via Wikimedia Commons", caption: "Cast of the Skhul 5 skull, an early modern human buried on Mount Carmel with a boar's jaw", source: "https://commons.wikimedia.org/wiki/File:Skhul_5_cast,_norma_frontalis.jpg" }, { url: "/images/books/kindred/burials-2.webp", credit: "Velatrix, CC0, via Wikimedia Commons", caption: "Cast of the Qafzeh 6 skull, from the burials at Qafzeh Cave near Nazareth (Natural History Museum, London)", source: "https://commons.wikimedia.org/wiki/File:Qafzeh_6_cast.jpg" }, { url: "/images/books/kindred/burials-3.webp", credit: "R Yeshurun, CC BY-SA 3.0, via Wikimedia Commons", caption: "The Nahal Me'arot cliff on Mount Carmel, with the Tabun, Jamal and el-Wad caves, where Neanderthals lived", source: "https://commons.wikimedia.org/wiki/File:Tabun-jamal-elWad_caves.jpg" }] },
      },
      {
        entity: "neanderthal",
        year: -69_999,
        site: "neanderthal@21",
        note: { text: "Shanidar 1 lived for years with a crushed eye socket, a withered arm and a damaged leg, which he could hardly have survived without help. Shanidar is also the cave of the \"flower burial\", now in doubt: the pollen may have been brought in by burrowing animals or bees. Wragg Sykes uses such cases to show how the record of injuries and care has been read and reread.", narration: { src: "narration/books/kindred/stop-5-v1.mp3", credit: "AI-generated narration", text_hash: "5deea95c37" }, images: [{ url: "/images/books/kindred/5-1.webp", credit: "JosephV at English Wikipedia, CC BY-SA 3.0, via Wikimedia Commons", caption: "Shanidar Cave in the Zagros Mountains of Iraqi Kurdistan, with two people crouching at its mouth for scale", source: "https://commons.wikimedia.org/wiki/File:Erbil_governorate_shanidar_cave.jpg" }, { url: "/images/books/kindred/5-2.webp", credit: "Khoshhat, CC BY-SA 4.0, via Wikimedia Commons", caption: "Shanidar Cave on Bradost Mountain, Erbil Governorate", source: "https://commons.wikimedia.org/wiki/File:Shanidar_Cave1.jpg" }] },
      },
      {
        entity: "neanderthal",
        year: -68_999,
        site: "neanderthal@20",
        note: { text: "Far to the east, in a cave in the mountains of Uzbekistan, a Neanderthal child was found in 1938 among ibex horns. Whether the horns were set around the child on purpose is still argued over. It is one of the sites that take Neanderthal country from France to Central Asia.", narration: { src: "narration/books/kindred/stop-6-v1.mp3", credit: "AI-generated narration", text_hash: "d4ab440703" }, images: [{ url: "/images/books/kindred/6-1.webp", credit: "Stanislav Kozlovskiy, CC BY 3.0, via Wikimedia Commons", caption: "Skull of the Neanderthal child from Teshik-Tash (State Museum of History of Uzbekistan)", source: "https://commons.wikimedia.org/wiki/File:Skull_of_Teshik-Tash_Boy.jpg" }, { url: "/images/books/kindred/6-2.webp", credit: "Ryan Somma, CC BY-SA 2.0, via Wikimedia Commons", caption: "Cast of the Teshik-Tash child's skull at the Smithsonian's Hall of Human Origins", source: "https://commons.wikimedia.org/wiki/File:Teshik-Task._Homo_neanderthalensis_child.jpg" }] },
      },
      {
        entity: "levallois-mousterian",
        year: -59_999,
        site: "levallois-mousterian@r:abric-romani",
        note: { text: "Under this rock shelter, layer after layer of hearths survive, with the imprints of wooden objects. The book reads homes like this from the traces of fireplaces: where people sat, worked and slept, and how often the same small band came back.", narration: { src: "narration/books/kindred/stop-7-v1.mp3", credit: "AI-generated narration", text_hash: "4bcb1cfcbb" }, images: [{ url: "/images/books/kindred/7-1.webp", credit: "Teogomez, CC BY-SA 4.0, via Wikimedia Commons", caption: "Excavation at the Abric Romaní rock shelter, Capellades, Catalonia", source: "https://commons.wikimedia.org/wiki/File:Abric_romaní.jpg" }, { url: "/images/books/kindred/7-2.webp", credit: "Thilo Parg, CC BY-SA 4.0, via Wikimedia Commons", caption: "Copy of a wooden tool from the Abric Romaní, known from the hollow its wood left in the deposit", source: "https://commons.wikimedia.org/wiki/File:Abric_Romani_wooden_tool.jpg" }] },
      },
      {
        entity: "neanderthal",
        year: -58_999,
        site: "neanderthal@7",
        note: { text: "The \"Old Man\" found here in 1908 was rebuilt as a stooped brute and fixed the cave-man image for decades. Wragg Sykes traces how mistakes like this shaped what we thought of Neanderthals. He had in fact lost most of his teeth and had arthritis, and recent digs suggest he was laid in a pit dug for him.", narration: { src: "narration/books/kindred/stop-8-v1.mp3", credit: "AI-generated narration", text_hash: "454df08a4e" }, images: [{ url: "/images/books/kindred/8-1.webp", credit: "V. Mourre, CC BY-SA 3.0, via Wikimedia Commons", caption: "The Bouffia Bonneval at La Chapelle-aux-Saints, where the Old Man was found in 1908", source: "https://commons.wikimedia.org/wiki/File:Bouffia_Bonneval_1.jpg" }, { url: "/images/books/kindred/8-2.webp", credit: "Pflege24, CC BY-SA 4.0, via Wikimedia Commons", caption: "Casts of the La Chapelle-aux-Saints skull with reconstructions of his face (Brussels)", source: "https://commons.wikimedia.org/wiki/File:Homme_de_Chapelle-aux-saints.jpg" }] },
      },
      {
        entity: "neanderthal",
        year: -54_999,
        site: "neanderthal@5",
        note: { text: "Kebara 2 kept the small hyoid bone of the throat, and its shape matches ours. The book argues that Neanderthals were very likely able to speak.", narration: { src: "narration/books/kindred/stop-9-v1.mp3", credit: "AI-generated narration", text_hash: "d9d6c8aa16" }, images: [{ url: "/images/books/kindred/9-1.webp", credit: "Velatrix, CC0, via Wikimedia Commons", caption: "Copy of the Kebara 2 skeleton as it was found in 1983 (Natural History Museum, London)", source: "https://commons.wikimedia.org/wiki/File:Kebara_2_skeleton_replica.jpg" }, { url: "/images/books/kindred/9-2.webp", credit: "Thilo Parg, CC BY-SA 4.0, via Wikimedia Commons", caption: "The hyoid bone of Kebara 2, about 60,000 years old, shaped like our own (Neanderthal Museum, Mettmann)", source: "https://commons.wikimedia.org/wiki/File:Zungenbein_Homo_neanderthalensis_Kebara_a.jpg" }] },
      },
      {
        entity: "archaic-human-admixture",
        note: { text: "Ancient DNA shows that Neanderthals and modern humans met and had children more than once. Most people outside Africa carry a little Neanderthal DNA. Wragg Sykes asks why such meetings are so often imagined as violent, and why desire or attachment should seem \"more of a fairy tale than other explanations\".", narration: { src: "narration/books/kindred/stop-10-v1.mp3", credit: "AI-generated narration", text_hash: "b4ec148cfe" }, images: [{ url: "/images/books/kindred/10-1.webp", credit: "Hajdinjak et al. (Nature 2021), CC BY 4.0, via Wikimedia Commons", caption: "Stretches of Neanderthal DNA (blue) in the genomes of early modern humans from Bacho Kiro Cave and Peștera cu Oase", source: "https://commons.wikimedia.org/wiki/File:Geographical_distribution_of_Neanderthal_archaeological_sites_and_genome-wide_distribution_of_Neanderthal_alleles_in_the_genomes_of_ancient_modern_humans.webp" }] },
      },
      {
        entity: "neanderthal",
        year: -39_999,
        site: "neanderthal@r:feldhofer-grotte",
        note: { text: "In 1856 quarrymen cleared bones from a small cave here, and the Neanderthals got their name. A century and a half later, archaeologists found the old spoil heaps and pieces of the same skeleton. The book tells the story of discovery, of bones scattered, lost and found again.", narration: { src: "narration/books/kindred/stop-11-v1.mp3", credit: "AI-generated narration", text_hash: "80d48ef81a" }, images: [{ url: "/images/books/kindred/11-1.webp", credit: "Hans Weingartz, CC BY-SA 2.0 de, via Wikimedia Commons", caption: "The skullcap found in the Feldhofer Cave in 1856 (Rhineland Museum, Bonn)", source: "https://commons.wikimedia.org/wiki/File:Neander1.jpg" }, { url: "/images/books/kindred/11-2.webp", credit: "Walter Koch, CC BY-SA 3.0, via Wikimedia Commons", caption: "The river Düssel in the Neander valley, by the site of the Feldhofer Cave", source: "https://commons.wikimedia.org/wiki/File:Duessel-im-Neandertal.jpg" }] },
      },
      {
        entity: "chatelperronian",
        year: -37_999,
        site: "chatelperronian@r:arcy-sur-cure-grotte-du-renne-bison",
        note: { text: "Late in their time, Neanderthals here made Châtelperronian tools along with pierced teeth and ornaments of bone. Some researchers think they copied newly arrived modern humans. Others think the layers were mixed. Still others think these were their own ideas.", narration: { src: "narration/books/kindred/stop-12-v1.mp3", credit: "AI-generated narration", text_hash: "196650b395" }, images: [{ url: "/images/books/kindred/12-1.webp", credit: "Thilo Parg, CC BY-SA 4.0, via Wikimedia Commons", caption: "The Grotte du Renne at Arcy-sur-Cure, Burgundy", source: "https://commons.wikimedia.org/wiki/File:Grotte_du_Renne_d'Arcy-sur-Cure_1.jpg" }, { url: "/images/books/kindred/12-2.webp", credit: "Thilo Parg, CC BY-SA 4.0, via Wikimedia Commons", caption: "Neanderthal remains from Arcy-sur-Cure: two jaws from the Grotte de la Hyène (1, 2), and a tooth and ear bone from the Châtelperronian layers of the Grotte du Renne (3, 4)", source: "https://commons.wikimedia.org/wiki/File:Arcy-sur-Cure_Grotte_de_la_Hyène_Neanderthals_1.jpg" }] },
      },
      {
        entity: "neanderthal-extinction",
        year: -37_999,
        site: "neanderthal-extinction@1",
        note: { text: "On the floor of this sea cave someone cut a cross-hatched pattern into the rock. Neanderthals may have lasted here longer than in most places. Wragg Sykes sees no single cause for their end, rather \"a perfect storm\" of climate swings, a crowded continent and perhaps disease. Survival depends on \"time and babies\", not on who was cleverer. Some of them live on in us.", narration: { src: "narration/books/kindred/stop-13-v1.mp3", credit: "AI-generated narration", text_hash: "25d649ad90" }, images: [{ url: "/images/books/kindred/13-1.webp", credit: "Gibmetal77, CC BY 3.0, via Wikimedia Commons", caption: "Gorham's Cave, a sea cave in the east face of the Rock of Gibraltar", source: "https://commons.wikimedia.org/wiki/File:Gorham's_Cave.jpg" }, { url: "/images/books/kindred/13-2.webp", credit: "John Cummings, CC BY-SA 3.0, via Wikimedia Commons", caption: "Looking out to the Mediterranean from inside Gorham's Cave", source: "https://commons.wikimedia.org/wiki/File:View_from_Gorham's_Cave,_Gibraltar.JPG" }] },
      },
    ],
  },
];

export const tourById = (id: string) => TOURS.find((t) => t.id === id);

export interface TourStopRef {
  tour: Tour;
  /** 0-based stop index in `tour.stops`. */
  index: number;
}

/** Guided tours that stop at `entityId`, with the stop index for each. */
export function toursOfEntity(entityId: string): TourStopRef[] {
  const hits: TourStopRef[] = [];
  for (const tour of TOURS) {
    const index = tour.stops.findIndex((s) => s.entity === entityId);
    if (index >= 0) hits.push({ tour, index });
  }
  return hits;
}
