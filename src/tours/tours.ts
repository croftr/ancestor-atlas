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
 * on the title card in place of the blurb. A stop with a `note` is a book stop: the globe turns to its
 * entity (and `site`) at its year, and the note (what the book makes of that place) takes the card's
 * place, read aloud, with its pictures; the entity's own card is not opened. Book stops and ordinary stops
 * mix freely, in date order, and play alike. A note belongs to the stop, so cards read the same in every
 * tour. `draft`: the notes are not yet checked against the book.
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
  /** The stop's name, if not its site's label (or, without a site, the entity's name). */
  title?: string;
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
export const announcementText = (t: Pick<Tour, "title">) => (t.title.endsWith(".") ? t.title : `${t.title}.`);

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
    // Book stops (with a note) and the atlas's own cards, mixed in date order. Notes drafted from reviews and the
    // published evidence (docs/book-tours.md); Rob checks each against the book.
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
      { entity: "neanderthal", year: -429_999, site: "neanderthal@1" },
      {
        entity: "schoningen-spears",
        note: { text: "Wragg Sykes argues that the stone tools that survive show only part of what Neanderthals made. Most of what they made was wood, and has rotted away. Schöningen is the rare exception: spruce and pine spears some 300,000 years old, shaped and balanced for hunting horses by a lakeshore.", title: "Schöningen", narration: { src: "narration/books/kindred/stop-2-v1.mp3", credit: "AI-generated narration", text_hash: "65229ba9ac" }, images: [{ url: "/images/books/kindred/2-1.webp", credit: "P. Pfarr (Lower Saxony State Office for Heritage), CC BY-SA 3.0 de, via Wikimedia Commons", caption: "Excavator Hartmut Thieme explaining Spear VI, still lying where it was found at Schöningen", source: "https://commons.wikimedia.org/wiki/File:Schöningen_Speer_VI_©_P._Pfarr_NLD.jpg" }, { url: "/images/books/kindred/2-2.webp", credit: "Matthias Vogel, Jens Lehmann and Dirk Leder, CC BY 4.0, via Wikimedia Commons", caption: "Pointed split pieces of wood from Schöningen, with close-ups of their worked tips", source: "https://commons.wikimedia.org/wiki/File:Schöningen_pointed_split_woods_Lower_Palaeolithic.jpg" }] },
      },
      { entity: "schoningen-spears" },
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
      { entity: "levallois-mousterian", year: -109_999, site: "levallois-mousterian@r:cueva-de-los-aviones" },
      {
        entity: "earliest-burials",
        site: "earliest-burials@1",
        note: { text: "Some of the oldest graves anywhere are here, on Mount Carmel and near Nazareth, where early modern humans buried their dead at Skhul and Qafzeh around 100,000 years ago, with antlers, a boar's jaw and red ochre. Neanderthals lived in the same hills, at Tabun and later Kebara. Wragg Sykes looks at the many ways Neanderthals treated their own dead, from cut-marked bones to graves like those at La Chapelle and Shanidar, and at how hard a burial is to prove.", narration: { src: "narration/books/kindred/stop-5-v2.mp3", credit: "AI-generated narration", text_hash: "f05d81ee1e" }, images: [{ url: "/images/books/kindred/burials-1.webp", credit: "Rama, CC BY-SA 3.0 fr, via Wikimedia Commons", caption: "Cast of the Skhul 5 skull, an early modern human buried on Mount Carmel with a boar's jaw", source: "https://commons.wikimedia.org/wiki/File:Skhul_5_cast,_norma_frontalis.jpg" }, { url: "/images/books/kindred/burials-2.webp", credit: "Velatrix, CC0, via Wikimedia Commons", caption: "Cast of the Qafzeh 6 skull, from the burials at Qafzeh Cave near Nazareth (Natural History Museum, London)", source: "https://commons.wikimedia.org/wiki/File:Qafzeh_6_cast.jpg" }, { url: "/images/books/kindred/burials-3.webp", credit: "R Yeshurun, CC BY-SA 3.0, via Wikimedia Commons", caption: "The Nahal Me'arot cliff on Mount Carmel, with the Tabun, Jamal and el-Wad caves, where Neanderthals lived", source: "https://commons.wikimedia.org/wiki/File:Tabun-jamal-elWad_caves.jpg" }] },
      },
      { entity: "earliest-burials", site: "earliest-burials@1" },
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
        note: { text: "Ancient DNA shows that Neanderthals and modern humans met and had children more than once. Most people outside Africa carry a little Neanderthal DNA. Wragg Sykes asks why such meetings are so often imagined as violent, and why desire or attachment should seem \"more of a fairy tale than other explanations\".", title: "Meeting our ancestors", narration: { src: "narration/books/kindred/stop-10-v1.mp3", credit: "AI-generated narration", text_hash: "b4ec148cfe" }, images: [{ url: "/images/books/kindred/10-1.webp", credit: "Hajdinjak et al. (Nature 2021), CC BY 4.0, via Wikimedia Commons", caption: "Stretches of Neanderthal DNA (blue) in the genomes of early modern humans from Bacho Kiro Cave and Peștera cu Oase", source: "https://commons.wikimedia.org/wiki/File:Geographical_distribution_of_Neanderthal_archaeological_sites_and_genome-wide_distribution_of_Neanderthal_alleles_in_the_genomes_of_ancient_modern_humans.webp" }] },
      },
      { entity: "archaic-human-admixture" },
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
      { entity: "chatelperronian", year: -37_999, site: "chatelperronian@r:arcy-sur-cure-grotte-du-renne-bison" },
      {
        entity: "neanderthal-extinction",
        year: -37_999,
        site: "neanderthal-extinction@1",
        note: { text: "On the floor of this sea cave someone cut a cross-hatched pattern into the rock. Neanderthals may have lasted here longer than in most places. Wragg Sykes sees no single cause for their end, rather \"a perfect storm\" of climate swings, a crowded continent and perhaps disease. Survival depends on \"time and babies\", not on who was cleverer. Some of them live on in us.", narration: { src: "narration/books/kindred/stop-13-v1.mp3", credit: "AI-generated narration", text_hash: "25d649ad90" }, images: [{ url: "/images/books/kindred/13-1.webp", credit: "Gibmetal77, CC BY 3.0, via Wikimedia Commons", caption: "Gorham's Cave, a sea cave in the east face of the Rock of Gibraltar", source: "https://commons.wikimedia.org/wiki/File:Gorham's_Cave.jpg" }, { url: "/images/books/kindred/13-2.webp", credit: "John Cummings, CC BY-SA 3.0, via Wikimedia Commons", caption: "Looking out to the Mediterranean from inside Gorham's Cave", source: "https://commons.wikimedia.org/wiki/File:View_from_Gorham's_Cave,_Gibraltar.JPG" }] },
      },
      { entity: "neanderthal-extinction", year: -37_999, site: "neanderthal-extinction@1" },
    ],
  },
  {
    id: "1177-bc",
    title: "1177 B.C.",
    book: {
      title: "1177 B.C.: The Year Civilization Collapsed (Revised and Updated)",
      author: "Eric H. Cline",
      year: 2021,
      publisher: "Princeton University Press",
      link: "https://en.wikipedia.org/wiki/1177_B.C.:_The_Year_Civilization_Collapsed",
      cover: { url: "/images/books/1177-bc.webp", credit: "Cover © Princeton University Press" },
    },
    blurb: "Eric Cline's account of how the great civilizations of the Late Bronze Age rose together and fell together, told through the places where it happened, from the Nile to Mycenae.",
    synopsis: "For more than three centuries the eastern Mediterranean was a world of empires and trade: Egyptians and Hittites, Minoans and Mycenaeans, Canaanites and Cypriots, Assyrians and Babylonians, bound together by diplomacy, marriage and merchant ships. Then, within a few decades around 1177 BCE, it fell apart. In 1177 B.C., archaeologist Eric Cline asks why. His answer is not a single enemy but a perfect storm of drought, earthquakes, famine, invasion and collapse, spreading through a connected world. This tour follows that world from its rise to its fall.",
    closing: "The Late Bronze Age fell not to one enemy but to many troubles at once, in a world too closely bound for any part to stand alone. Cline's warning is that ours is bound more closely still.",
    // Book stops (with a note) and the atlas's own cards, mixed in date order. Notes drafted from the book's
    // published summaries and the evidence it discusses (docs/book-tours.md); Rob checks each against the book.
    music: { src: "music/tours/1177-bc-v1.mp3", credit: "Music: \"Hiraeth\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
    synopsisNarration: { src: "narration/books/1177-bc/synopsis-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "db92615e45" },
    announcement: { src: "narration/tours/1177-bc-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "16dc8e73c0" },
    closingNarration: { src: "narration/tours/1177-bc-closing-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "9ac5995c6c" },
    stops: [
      {
        entity: "fifteenth-dynasty-of-egypt",
        year: -1_549,
        note: { text: "Cline begins around 1550 BCE, when the Egyptian king Ahmose drove the Hyksos, rulers from Canaan, out of their capital Avaris in the Nile Delta and founded the New Kingdom. In the ruins of Avaris archaeologists later found wall paintings of bull-leapers in the Minoan style, an early sign of the ties between Egypt and the Aegean that run through the whole book.", narration: { src: "narration/books/1177-bc/stop-1-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "1bee910812" }, title: "Avaris", images: [{ url: "/images/books/1177-bc/1-1.webp", credit: "Georges Daressy, Public domain, via Wikimedia Commons", caption: "The pharaoh Ahmose striking down a Hyksos enemy, on a ceremonial axe from the burial of Queen Ahhotep (drawing after Daressy)", source: "https://commons.wikimedia.org/wiki/File:Pharaoh_Ahmose_I_slaying_a_Hyksos_(axe_of_Ahmose_I,_from_the_Treasure_of_Queen_Aahhotep_II)_Colorized_per_source.jpg" }, { url: "/images/books/1177-bc/1-2.webp", credit: "Metropolitan Museum of Art, CC0, via Wikimedia Commons", caption: "Head of Ahmose I, founder of Egypt's New Kingdom (Metropolitan Museum of Art)", source: "https://commons.wikimedia.org/wiki/File:Head_of_Ahmose_I_MET_DP140854.jpg" }] },
      },
      { entity: "new-kingdom-of-egypt", year: -1_499 },
      {
        entity: "canaanite-city-states",
        year: -1_478,
        site: "canaanite-city-states@2",
        note: { text: "In 1479 BCE Thutmose III marched on a coalition of Canaanite kings gathered at Megiddo, leading his army through a narrow mountain pass that his generals thought too dangerous. His scribes carved the campaign on the walls of Karnak, the first battle in history we can follow in detail. Cline, who dug at Megiddo for years, reminds us that its name lives on as Armageddon.", narration: { src: "narration/books/1177-bc/stop-3-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "9b2adeec70" }, title: "Megiddo, 1479 BCE", images: [{ url: "/images/books/1177-bc/3-1.webp", credit: "Marsupium, CC BY 4.0, via Wikimedia Commons", caption: "Statue of Thutmose III, the victor at Megiddo in 1479 BCE (Luxor Museum)", source: "https://commons.wikimedia.org/wiki/File:Statue_of_the_Thutmosis_III_CG_42054-JE_36927_-_greywacke_-_Luxor_Museum_01.jpg" }] },
      },
      { entity: "canaanite-city-states", year: -1_478, site: "canaanite-city-states@2" },
      {
        entity: "minoan-civilization",
        year: -1_449,
        note: { text: "Egyptian tombs of this time show men called Keftiu, from Crete, bringing gifts of fine vessels, metal and cloth. In the tomb of Rekhmire, vizier to Thutmose III, the painters later redrew the Keftiu's kilts in a new style. Cline reads the change as a sign that Mycenaeans from mainland Greece had taken over Crete. For him, trade and gifts like these were the glue of the age.", narration: { src: "narration/books/1177-bc/stop-5-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "aaa196de75" }, title: "Keftiu", images: [{ url: "/images/books/1177-bc/5-1.webp", credit: "Metropolitan Museum of Art, CC0, via Wikimedia Commons", caption: "Keftiu bringing gifts, painted in the tomb of Rekhmire, vizier of Thutmose III (facsimile by Nina de Garis Davies, Metropolitan Museum of Art)", source: "https://commons.wikimedia.org/wiki/File:Cretans_Bringing_Gifts,_Tomb_of_Rekhmire_MET_DT10883.jpg" }] },
      },
      { entity: "minoan-civilization", year: -1_449 },
      {
        entity: "mycenaean-greece",
        year: -1_369,
        note: { text: "Around 1370 BCE, on statue bases in the funerary temple of Amenhotep III, whose Colossi of Memnon still stand, Egyptian carvers listed places across the Aegean: Knossos, Mycenae, Nauplion, Kythera and more, in an order that reads like a voyage around Crete and Greece. Cline suggests it records an Egyptian embassy, and plaques bearing Amenhotep's name have turned up at Mycenae.", narration: { src: "narration/books/1177-bc/stop-7-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "47d9ce5dfe" }, title: "The Aegean List", images: [{ url: "/images/books/1177-bc/7-1.webp", credit: "Diego Delso, CC BY-SA 4.0, via Wikimedia Commons", caption: "The Colossi of Memnon, which stood before the funerary temple of Amenhotep III, where the Aegean List was carved", source: "https://commons.wikimedia.org/wiki/File:Colosos_de_Memnón,_Luxor,_Egipto,_2022-04-03,_DD_132.jpg" }, { url: "/images/books/1177-bc/7-2.webp", credit: "ArchaiOptix, CC BY-SA 4.0, via Wikimedia Commons", caption: "Bull-leaper wall painting from the Mycenaean palace at Tiryns, about 1250 BCE (National Archaeological Museum, Athens)", source: "https://commons.wikimedia.org/wiki/File:Wall_painting_of_taureador_from_Tiryns_-_Athens_NAM_1595.jpg" }] },
      },
      { entity: "mycenaean-greece", year: -1_369 },
      {
        entity: "amarna-letters",
        site: "amarna-letters@1",
        note: { text: "Cline reads the Amarna letters as the correspondence of a club of great powers. The kings of Egypt, Babylon, Mitanni, Assyria and the Hittites called one another brother, exchanged gifts and princesses, and complained when the gold fell short. It was, he argues, a globalized world, bound together by diplomacy, marriage and trade, so a crisis in one corner could ripple through all the rest.", narration: { src: "narration/books/1177-bc/stop-9-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "79e925d205" }, title: "A club of great powers", images: [{ url: "/images/books/1177-bc/9-1.webp", credit: "Philip Pikart, CC BY-SA 3.0, via Wikimedia Commons", caption: "Bust of Nefertiti, Akhenaten's queen, made at Amarna (Neues Museum, Berlin)", source: "https://commons.wikimedia.org/wiki/File:Nofretete_Neues_Museum.jpg" }] },
      },
      { entity: "amarna-letters", site: "amarna-letters@1" },
      {
        entity: "late-bronze-age-cyprus",
        year: -1_319,
        note: { text: "Around 1300 BCE a merchant ship went down off Uluburun, on the south coast of Turkey. Found by a sponge diver in 1982, it carried ten tons of Cypriot copper and one ton of tin, the right mix for bronze, along with Canaanite jars, glass ingots, ebony, ivory, Mycenaean pottery and a gold scarab of Nefertiti. For Cline it is the whole interconnected age in a single cargo.", narration: { src: "narration/books/1177-bc/stop-11-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "8b522b49ea" }, title: "The Uluburun shipwreck", images: [{ url: "/images/books/1177-bc/11-1.webp", credit: "Zunkir, CC BY-SA 4.0, via Wikimedia Commons", caption: "An oxhide-shaped copper ingot from the Uluburun shipwreck, about 1300 BCE (Bodrum Museum of Underwater Archaeology)", source: "https://commons.wikimedia.org/wiki/File:Uluburun_copper_ingot_oxhide_shaped.jpg" }, { url: "/images/books/1177-bc/11-2.webp", credit: "Georges Jansoone, CC BY-SA 3.0, via Wikimedia Commons", caption: "Full-size replica of the Uluburun ship (Bodrum Museum of Underwater Archaeology)", source: "https://commons.wikimedia.org/wiki/File:Turkey.Bodrum091.jpg" }, { url: "/images/books/1177-bc/11-3.webp", credit: "Zunkir, CC BY-SA 4.0, via Wikimedia Commons", caption: "A Cypriot Base Ring bowl from the Uluburun cargo (Bodrum Museum of Underwater Archaeology)", source: "https://commons.wikimedia.org/wiki/File:Uluburun_cypriot_base_ring_bowl.jpg" }] },
      },
      { entity: "late-bronze-age-cyprus", year: -1_319 },
      {
        entity: "hittites",
        year: -1_273,
        note: { text: "In 1274 BCE Ramesses II and the Hittite king Muwatalli II met at Kadesh in Syria, in one of the largest chariot battles ever fought. Ramesses carved his victory on temple walls across Egypt, but the battle was a draw. About fifteen years later the two empires signed the earliest peace treaty whose text survives, in Egyptian and in Akkadian, and later sealed it with a royal marriage.", narration: { src: "narration/books/1177-bc/stop-13-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "188393dc6c" }, title: "Kadesh, 1274 BCE", images: [{ url: "/images/books/1177-bc/13-1.webp", credit: "Diego Delso, CC BY-SA 4.0, via Wikimedia Commons", caption: "Ramesses II in his chariot at the Battle of Kadesh, relief in the Great Temple at Abu Simbel", source: "https://commons.wikimedia.org/wiki/File:Templo_de_Ramsés_II,_Abu_Simbel,_Egipto,_2022-04-02,_DD_74-76_HDR.jpg" }, { url: "/images/books/1177-bc/13-2.webp", credit: "Osama Shukir Muhammed Amin FRCP(Glasg), CC BY-SA 4.0, via Wikimedia Commons", caption: "The Hittite copy of the peace treaty between Ramesses II and Hattusili III, written in Akkadian, from Hattusa (Istanbul Archaeology Museums)", source: "https://commons.wikimedia.org/wiki/File:Kadesh_Treaty,_written_in_Akkadian._1269_BCE._From_Boğazköy,_Turkey._Clay_tablet._Museum_of_the_Ancient_Orient,_Istanbul,_Turkey.jpg" }] },
      },
      { entity: "hittites", year: -1_273 },
      {
        entity: "mycenaean-greece",
        year: -1_249,
        note: { text: "Hittite letters complain of a king of Ahhiyawa, most likely the Mycenaean Greeks, stirring up trouble in western Anatolia, and they name a city called Wilusa, which many scholars equate with Troy, Homer's Ilios. Cline, who has also written on the Trojan War, thinks Homer's story may hold memories of real conflicts from these years, though no text proves it.", narration: { src: "narration/books/1177-bc/stop-15-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "af7d77371a" }, title: "Ahhiyawa and Wilusa", images: [{ url: "/images/books/1177-bc/15-1.webp", credit: "Carole Raddato, CC BY-SA 2.0, via Wikimedia Commons", caption: "The walls of Troy, the city many scholars equate with the Hittites' Wilusa", source: "https://commons.wikimedia.org/wiki/File:Portion_of_the_legendary_walls_of_Troy_(VII),_Troy_(Ilion),_Turkey_(7446479164).jpg" }, { url: "/images/books/1177-bc/15-2.webp", credit: "Mark Landon, CC BY 4.0, via Wikimedia Commons", caption: "Wall of a great house of Troy VI, the Late Bronze Age city", source: "https://commons.wikimedia.org/wiki/File:Troy_VI_House_VI_M_southwest_wall_(1991).jpg" }] },
      },
      {
        entity: "assyria",
        year: -1_229,
        note: { text: "Assyria was on the rise. Its king Tukulti-Ninurta I claimed victory over the Hittites and captured Babylon. In reply the Hittite king Tudhaliya IV bound a vassal by treaty to stop Ahhiyawan ships from trading with Assyria, one of the earliest trade embargoes on record, says Cline. The great powers were straining against each other just as the troubles began.", narration: { src: "narration/books/1177-bc/stop-16-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "bab9de3d91" }, title: "Assyria on the rise", images: [{ url: "/images/books/1177-bc/16-1.webp", credit: "Marie-Lan Nguyen, Public domain, via Wikimedia Commons", caption: "Altar of Tukulti-Ninurta I from Assur, showing the king standing and kneeling before a god's emblem (Istanbul Archaeology Museums)", source: "https://commons.wikimedia.org/wiki/File:Altar_Tukulti-Ninurta_I_Assur_IAM.jpg" }] },
      },
      {
        entity: "late-bronze-age-collapse",
        year: -1_189,
        site: "late-bronze-age-collapse@1",
        note: { text: "In its last decades the Hittite court begged for grain. One letter calls a shipment from Ugarit a matter of life or death, and the pharaoh sent grain to keep the land of Hatti alive. Around 1190 BCE Hattusa burned, but Cline notes that its rulers seem to have left first, taking what they could carry. The empire that had fought Egypt to a standstill simply came to an end.", narration: { src: "narration/books/1177-bc/stop-17-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "2722c8408b" }, title: "Hattusa", images: [{ url: "/images/books/1177-bc/17-1.webp", credit: "Rita1234, CC BY-SA 3.0, via Wikimedia Commons", caption: "The Great Temple in the lower city of Hattusa", source: "https://commons.wikimedia.org/wiki/File:Hattusa_Lower_city_great_temple.JPG" }, { url: "/images/books/1177-bc/17-2.webp", credit: "Klaus-Peter Simon, CC BY 3.0, via Wikimedia Commons", caption: "Tudhaliya IV embraced by his god Sharruma, carved at Yazılıkaya beside Hattusa", source: "https://commons.wikimedia.org/wiki/File:Yazilikaya_B_Thudalija.jpg" }] },
      },
      {
        entity: "sea-peoples",
        year: -1_184,
        site: "sea-peoples@2",
        note: { text: "Ugarit, the great port of Syria, fell around 1185 BCE. Among its tablets is a letter from its last king, Ammurapi, to the king of Alashiya: enemy ships have come and burned his cities, while his own troops and ships are away serving the Hittites. Cline's revised edition also lays to rest a famous story, that the city's last letters were found still baking in a kiln, never sent.", narration: { src: "narration/books/1177-bc/stop-18-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "d8db97477c" }, title: "Ugarit", images: [{ url: "/images/books/1177-bc/18-1.webp", credit: "Dosseman, CC BY-SA 4.0, via Wikimedia Commons", caption: "Rooms of the royal palace at Ugarit where archives of tablets were found", source: "https://commons.wikimedia.org/wiki/File:Ugarit_Royal_Palace_archives_space_3912.jpg" }, { url: "/images/books/1177-bc/18-2.webp", credit: "Dosseman, CC BY-SA 4.0, via Wikimedia Commons", caption: "The main courtyard of the royal palace at Ugarit", source: "https://commons.wikimedia.org/wiki/File:Ugarit_Royal_Palace_main_courtyard_3907.jpg" }] },
      },
      {
        entity: "late-bronze-age-collapse",
        year: -1_179,
        site: "late-bronze-age-collapse@2",
        note: { text: "At Pylos, the palace of King Nestor in Homer, fire destroyed everything around 1180 BCE and baked hard the clay tablets of its final year. They record rowers being called up and watchers posted along the coast. It is tempting to read a kingdom bracing for attack, but Cline warns that the tablets never say what the watchers were watching for.", narration: { src: "narration/books/1177-bc/stop-19-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "195290007f" }, title: "Pylos", images: [{ url: "/images/books/1177-bc/19-1.webp", credit: "Synesis17, Public domain, via Wikimedia Commons", caption: "The bathtub in the Palace of Nestor at Pylos", source: "https://commons.wikimedia.org/wiki/File:Bathtub-of-nestor.jpg" }, { url: "/images/books/1177-bc/19-2.webp", credit: "Peulle, CC BY-SA 4.0, via Wikimedia Commons", caption: "The base of the throne in the Palace of Nestor", source: "https://commons.wikimedia.org/wiki/File:Palace_of_Nestor_throne_base_(1).jpg" }] },
      },
      {
        entity: "sea-peoples",
        year: -1_176,
        site: "sea-peoples@1",
        note: { text: "This is where the book begins. In the eighth year of Ramesses III, which Cline dates to 1177 BCE, the pharaoh's temple walls tell of foreign peoples who conspired in their islands and swept all before them, from Hatti to Alashiya, until Ramesses defeated them on land and in the Nile Delta. Cline takes the year as a symbol: the moment a whole world began to end.", narration: { src: "narration/books/1177-bc/stop-20-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "73e26a1596" }, title: "Medinet Habu, 1177 BCE", images: [{ url: "/images/books/1177-bc/20-1.webp", credit: "Vyacheslav Argenberg, CC BY 4.0, via Wikimedia Commons", caption: "The first pylon of Ramesses III's temple at Medinet Habu", source: "https://commons.wikimedia.org/wiki/File:Thebes,_Medinet_Habu,_Egypt,_Temple_of_Ramesses_III,_First_Pylon.jpg" }, { url: "/images/books/1177-bc/20-2.webp", credit: "Carl Richard Lepsius, Public domain, via Wikimedia Commons", caption: "Ramesses III leading captive Sea Peoples before the gods, relief at Medinet Habu (drawing by Lepsius)", source: "https://commons.wikimedia.org/wiki/File:Medinet_Habu_Ramses_III._Tempel_Erster_Hof_(Lepsius)_01.jpg" }] },
      },
      { entity: "sea-peoples", site: "sea-peoples@1" },
      {
        entity: "elam",
        year: -1_157,
        note: { text: "Even Babylon was not spared. Around 1158 BCE the Elamite king Shutruk-Nakhunte raided Mesopotamia and carried trophies home to Susa, among them the stele of Hammurabi's laws, where French archaeologists found it in 1901. Within a few years the long-ruling Kassite dynasty of Babylon had fallen.", narration: { src: "narration/books/1177-bc/stop-22-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "e562a717a8" }, title: "Elam and Babylon", images: [{ url: "/images/books/1177-bc/22-1.webp", credit: "Mbzt, CC BY 3.0, via Wikimedia Commons", caption: "The stele of Hammurabi's laws, carried off to Susa by the Elamites (Louvre)", source: "https://commons.wikimedia.org/wiki/File:P1050763_Louvre_code_Hammurabi_face_rwk.JPG" }] },
      },
      {
        entity: "late-bronze-age-collapse",
        year: -1_149,
        site: "late-bronze-age-collapse@3",
        note: { text: "So what happened? Cline rejects a single culprit. A run of earthquakes struck Mycenae, Tiryns and other cities; pollen from the Sea of Galilee points to a long drought; there were famines, raiders, and perhaps revolts. Any one of these might have been survived. Together, in a world so tightly linked, they made what he calls a perfect storm, a systems collapse that spread from kingdom to kingdom.", narration: { src: "narration/books/1177-bc/stop-23-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "7f81fc2d94" }, title: "A perfect storm", images: [{ url: "/images/books/1177-bc/23-1.webp", credit: "George E. Koronaios, CC BY-SA 4.0, via Wikimedia Commons", caption: "The Cyclopean walls of Tiryns, one of the Mycenaean citadels damaged by earthquakes", source: "https://commons.wikimedia.org/wiki/File:The_Cyclopean_Walls_of_Tiryns.jpg" }] },
      },
      { entity: "late-bronze-age-collapse", site: "late-bronze-age-collapse@3" },
      {
        entity: "phoenicia",
        year: -1_099,
        note: { text: "Not everyone lost. In the centuries that followed, Cline shows, Phoenician cities such as Byblos, Tyre and Sidon rose to carry trade and their alphabet across the Mediterranean, Neo-Hittite kingdoms ruled from cities like Carchemish, and Philistines and Israelites settled in Canaan. Greece took centuries to recover and learn to write again, but from the wreckage the Iron Age world was born.", narration: { src: "narration/books/1177-bc/stop-25-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "e4482af2a3" }, title: "Out of the ashes", images: [{ url: "/images/books/1177-bc/25-1.webp", credit: "O.Mustafin, Public domain, via Wikimedia Commons", caption: "Sarcophagus of Ahiram, king of Byblos (National Museum of Beirut)", source: "https://commons.wikimedia.org/wiki/File:Ahiram_Sarcophagus_1.JPG" }, { url: "/images/books/1177-bc/25-2.webp", credit: "Onceinawhile, CC BY-SA 4.0, via Wikimedia Commons", caption: "The inscription on Ahiram's sarcophagus, one of the earliest in the Phoenician alphabet (National Museum of Beirut)", source: "https://commons.wikimedia.org/wiki/File:National_Museum_of_Beirut_–_Ahiram_sarcophagus_inscription_2.jpg" }, { url: "/images/books/1177-bc/25-3.webp", credit: "Dosseman, CC BY-SA 4.0, via Wikimedia Commons", caption: "Warriors carved at Carchemish, capital of a Neo-Hittite kingdom, 10th–9th century BCE (Museum of Anatolian Civilizations, Ankara)", source: "https://commons.wikimedia.org/wiki/File:Ankara_Anatolian_Civilizations_Carchemish_orthostats_Long_Wall_Warriors_in_2011_01.jpg" }] },
      },
      { entity: "phoenicia", year: -1_099 },
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
    // Book stops are about a place, not the entity's card.
    const index = tour.stops.findIndex((s) => s.entity === entityId && !s.note);
    if (index >= 0) hits.push({ tour, index });
  }
  return hits;
}
