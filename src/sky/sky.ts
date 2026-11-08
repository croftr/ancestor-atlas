import { STEPS, segmentOfBce, snapYear, stepYear } from "../time/scale";

/**
 * Things seen in the sky, drawn on the star background while the slider is near them (sky/SkyObjects.tsx)
 * and named in the climate panel ("In the sky"). Hand-picked and kept in the app, like the routes and the
 * interbreeding episodes. Every one has a source, but unlike things on the ground the sky may carry
 * doubtful dates and claims (Rob's call, 1 Nov 2026), as long as `certainty` says so: the panels show it.
 *
 * The star background is not a real sky, so objects sit at fixed places on it, not where they were seen.
 */

export type SkyKind = "supernova" | "nova" | "comet" | "eclipse" | "aurora" | "conjunction";

/** What each kind is called in the panels. */
export const SKY_KIND_NAME: Record<SkyKind, string> = {
  supernova: "Supernova",
  nova: "New star",
  comet: "Comet",
  eclipse: "Eclipse of the Sun",
  aurora: "Aurora",
  conjunction: "Planets",
};

export interface SkyEvent {
  id: string;
  kind: SkyKind;
  name: string;
  /** Shown as a tag when the date or the thing itself is in doubt ("Date uncertain", "Disputed", "Legend"). */
  certainty?: string;
  /** An eclipse that left a ring of the Sun showing. */
  annular?: boolean;
  /** How the date reads in the panel. */
  date_text: string;
  description: string;
  /** Astronomical years: when it shows. */
  start_year: number;
  end_year: number;
  /**
   * A span is a time in which something happened at an unknown moment (the iron-60 waves): drawn as a
   * star that flares now and then, never as one shining for a million years.
   */
  span?: boolean;
  /** Where on Earth the sighting or its story belongs (lon, lat), so a tour turns the globe there. */
  place?: [lon: number, lat: number];
  narration?: { src: string; credit: string; text_hash: string };
  source: { label: string; url: string };
}

const WALLNER = {
  label: "Wallner et al. 2016, Recent near-Earth supernovae probed by global deposition of interstellar radioactive 60Fe, Nature 532: 69–72",
  url: "https://doi.org/10.1038/nature17196",
};

const BREITSCHWERDT = {
  label: "Breitschwerdt et al. 2016, The locations of recent supernovae near the Sun from modelling 60Fe transport, Nature 532: 73–76",
  url: "https://doi.org/10.1038/nature17424",
};

const VELA = {
  label: "Wikipedia: Vela supernova remnant (revision 1370791294)",
  url: "https://en.wikipedia.org/w/index.php?title=Vela_supernova_remnant&oldid=1370791294",
};

const HALLEY = {
  label: "Wikipedia: Halley's Comet (revision 1381440286)",
  url: "https://en.wikipedia.org/w/index.php?title=Halley%27s_Comet&oldid=1381440286",
};

const wiki = (title: string, rev: number) => ({
  label: `Wikipedia: ${title.replace(/_/g, " ")} (revision ${rev})`,
  url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&oldid=${rev}`,
});

const GEMINGA = wiki("Geminga", 1379837902);
const HIPPARCHUS = wiki("Hipparchus", 1373939794);
const BETHLEHEM = wiki("Star_of_Bethlehem", 1379525700);
const CAESAR = wiki("Caesar's_Comet", 1378126591);
const SWIFT_TUTTLE = wiki("Comet_Swift–Tuttle", 1380754652);
const KREUTZ = wiki("Kreutz_sungrazer", 1377881201);
const HALE_BOPP = wiki("Comet_Hale–Bopp", 1382376250);
const ECLIPSES = wiki("List_of_solar_eclipses_in_antiquity", 1359032899);
const ASSYRIAN = wiki("Assyrian_eclipse", 1373241066);
const THALES = wiki("Eclipse_of_Thales", 1378907867);
const MIYAKE = wiki("Miyake_event", 1375607928);
const GRAHAM_HINTZ = {
  label: "Graham & Hintz, reported by BYU Physics and Astronomy: Halley's comet first observed by ancient Greeks?",
  url: "https://physics.byu.edu/department/news/89",
};
const COOPER = {
  label: "Cooper et al. 2021, A global environmental crisis 42,000 years ago, Science 371: 811–818",
  url: "https://doi.org/10.1126/science.abb8677",
};

/** Years ago (counted back from 1950) as an astronomical year. */
const ka = (k: number) => Math.round(1950 - k * 1000);
/** A year BCE as an astronomical year. */
const bce = (y: number) => 1 - y;

export const SKY_EVENTS: SkyEvent[] = [
  {
    id: "supernovae-late-miocene",
    kind: "supernova",
    name: "Nearby supernovae",
    date_text: "Sometime 8.7–6.5 million years ago",
    description:
      "Iron-60 is made in exploding stars, and deep-sea crusts and sediments from every ocean hold a wave of it from 8.7 to 6.5 million years ago. At least one star blew up within a few hundred light years of Earth: for weeks or months a new star would have stood out in the night sky. When exactly is not known.",
    start_year: -7_999_999,
    end_year: ka(6500),
    span: true,
    place: [18.5, 16.2],
    narration: { src: "narration/sky/supernovae-late-miocene-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "6185e851d7" },
    source: WALLNER,
  },
  {
    id: "supernovae-pliocene",
    kind: "supernova",
    name: "Nearby supernovae",
    date_text: "Sometime 3.2–1.5 million years ago",
    description:
      "A second, larger wave of iron-60 from exploding stars reached the ocean floor between 3.2 and 1.5 million years ago. Modelling of how it travelled points to two supernovae about 300 light years away, about 2.3 and 1.5 million years ago, among the stars now in the Scorpius–Centaurus group. Each would have been a brilliant new star for weeks or months, seen by the early members of our own genus.",
    start_year: ka(3200),
    end_year: ka(1500),
    span: true,
    place: [35.9, -1.8],
    narration: { src: "narration/sky/supernovae-pliocene-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "9736f35390" },
    source: BREITSCHWERDT,
  },
  {
    id: "vela-supernova",
    kind: "supernova",
    name: "The Vela supernova",
    date_text: "About 11,000 years ago",
    description:
      "A star about 900 light years away, in the southern constellation Vela, exploded about 11,000 years ago, as the Ice Age ended and the first farmers settled in the Near East. For months it would have been a dazzling new star in the southern sky. Its expanding remains, the Vela supernova remnant, still glow there today.",
    start_year: ka(11.5),
    end_year: ka(10.5),
    place: [38.9, 37.2],
    narration: { src: "narration/sky/vela-supernova-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "6545a47d0c" },
    source: VELA,
  },
  {
    id: "halley-240-bce",
    kind: "comet",
    name: "Halley's Comet",
    date_text: "240 BCE",
    description:
      "The first certain record of Halley's Comet: China's Records of the Grand Historian (Shiji) describe a comet that appeared in the east and moved north. It comes back about every 76 years.",
    start_year: bce(240),
    end_year: bce(240),
    place: [108.9, 34.3],
    narration: { src: "narration/sky/halley-240-bce-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "c393c4a455" },
    source: HALLEY,
  },
  {
    id: "halley-164-bce",
    kind: "comet",
    name: "Halley's Comet",
    date_text: "164 BCE",
    description:
      "Halley's Comet back again. The only surviving record of this return is on two broken Babylonian clay tablets, recognised in the British Museum in 1984.",
    start_year: bce(164),
    end_year: bce(164),
    place: [44.4, 32.5],
    source: HALLEY,
  },
  {
    id: "halley-87-bce",
    kind: "comet",
    name: "Halley's Comet",
    date_text: "87 BCE",
    description:
      "Halley's Comet again. Babylonian astronomers wrote on their tablets that it was seen \"day beyond day\" for a month.",
    start_year: bce(87),
    end_year: bce(87),
    place: [44.4, 32.5],
    source: HALLEY,
  },
  {
    id: "halley-12-bce",
    kind: "comet",
    name: "Halley's Comet",
    date_text: "12 BCE",
    description:
      "Han dynasty astronomers followed Halley's Comet from August to October as it passed within 24 million km of Earth. In Rome, Cassius Dio later wrote of a comet that foretold the death of Agrippa.",
    start_year: bce(12),
    end_year: bce(12),
    place: [108.9, 34.3],
    source: HALLEY,
  },
  // Added 1 Nov 2026, when doubtful dates became welcome in the sky (with `certainty`).
  {
    id: "geminga-supernova",
    kind: "supernova",
    name: "The Geminga supernova",
    certainty: "Date uncertain",
    date_text: "About 300,000 years ago",
    description:
      "A massive star about 800 light years away exploded about 300,000 years ago (some estimates say 340,000), around the time the earliest Homo sapiens lived in Africa. Its collapsed core, the Geminga pulsar, still spins today. It was once thought to have blown the hot, thin bubble of gas the Sun sits in; other supernovae now look more likely.",
    start_year: ka(345),
    end_year: ka(295),
    place: [-8.9, 31.9],
    narration: { src: "narration/sky/geminga-supernova-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "e0e72b5e4a" },
    source: GEMINGA,
  },
  {
    id: "hipparchus-nova",
    kind: "nova",
    name: "Hipparchus's new star",
    certainty: "Date uncertain",
    date_text: "Around 135 BCE",
    description:
      "Pliny the Elder wrote that the Greek astronomer Hipparchus saw \"a new star that was produced in his own age\", and that it moved him to count and map the stars, so that later generations could tell whether any appeared or vanished. His catalogue, of about 850 stars, dates from about 135 BCE; Pliny gives no year for the star itself.",
    start_year: bce(140),
    end_year: bce(130),
    place: [28.2, 36.4],
    narration: { src: "narration/sky/hipparchus-nova-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "90e6690672" },
    source: HIPPARCHUS,
  },
  {
    id: "han-new-stars",
    kind: "nova",
    name: "The Han astronomers' new stars",
    certainty: "Comet or nova?",
    date_text: "5 and 4 BCE",
    description:
      "The Book of Han records a new object in about 5 BCE that was watched for over seventy days, perhaps without moving, and another in April 4 BCE. Whether they were comets or novae is not known. Both have been put forward as the Star of Bethlehem.",
    start_year: bce(5),
    end_year: bce(4),
    place: [108.9, 34.3],
    source: BETHLEHEM,
  },
  {
    id: "hale-bopp-2215-bce",
    kind: "comet",
    name: "Comet Hale–Bopp",
    certainty: "Computed date",
    date_text: "About 2215 BCE",
    description:
      "The great comet of 1997 last came round about 4,200 years earlier, in roughly 2215 BCE, worked out from its orbit. It may have been seen in Egypt under Pepi II: a text in his pyramid names a \"long-haired\" star as the pharaoh's companion in the sky, though nothing ties it to this comet for certain.",
    start_year: bce(2215),
    end_year: bce(2215),
    place: [31.2, 29.8],
    narration: { src: "narration/sky/hale-bopp-2215-bce-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "c33c2ee055" },
    source: HALE_BOPP,
  },
  {
    id: "halley-466-bce",
    kind: "comet",
    name: "Halley's Comet?",
    certainty: "Possible sighting",
    date_text: "466 BCE",
    description:
      "Halley's Comet came round in 466 BCE, and some think the Greeks saw it: ancient writers tell of a comet in the year a meteorite fell at Aegospotami, which one study matched to Halley's return. A Chinese record of 467 BCE may be it too. There is too little to be sure.",
    start_year: bce(466),
    end_year: bce(466),
    place: [26.6, 40.4],
    source: GRAHAM_HINTZ,
  },
  {
    id: "great-comet-371-bce",
    kind: "comet",
    name: "The great comet of 371 BCE",
    date_text: "371 BCE",
    description:
      "Aristotle and the historian Ephorus both saw this great comet. Ephorus said he watched it break in two, which later writers doubted. It may be the parent of the Kreutz sungrazers, the family of comets that skim the Sun, among them the great comet of 1106.",
    start_year: bce(371),
    end_year: bce(371),
    place: [22.1, 38.2],
    source: KREUTZ,
  },
  {
    id: "swift-tuttle-322-bce",
    kind: "comet",
    name: "Comet Swift–Tuttle",
    certainty: "Probably seen",
    date_text: "322 BCE",
    description:
      "The comet whose dust gives us the Perseid meteors each August was probably bright enough to see with the naked eye when it came round in 322 BCE.",
    start_year: bce(322),
    end_year: bce(322),
    place: [23.7, 38.0],
    source: SWIFT_TUTTLE,
  },
  {
    id: "swift-tuttle-69-bce",
    kind: "comet",
    name: "Comet Swift–Tuttle",
    date_text: "69 BCE",
    description:
      "Chinese astronomers recorded the comet whose dust gives us the Perseid meteors: the earliest known sighting of it. It comes back about every 133 years.",
    start_year: bce(69),
    end_year: bce(69),
    place: [108.9, 34.3],
    source: SWIFT_TUTTLE,
  },
  {
    id: "caesars-comet",
    kind: "comet",
    name: "Caesar's Comet",
    certainty: "Disputed",
    date_text: "44 BCE",
    description:
      "Four months after Julius Caesar was murdered, a comet shone for seven days during the games held in his honour, and Romans took it for his soul rising to join the gods. Augustus made it an emblem of his rule. Chinese astronomers saw a comet that May. Some historians doubt it was ever there, since the Roman account rests on one late writer.",
    start_year: bce(44),
    end_year: bce(44),
    place: [12.5, 41.9],
    narration: { src: "narration/sky/caesars-comet-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "9dbf7c53f9" },
    source: CAESAR,
  },
  {
    id: "eclipse-hsi-ho",
    kind: "eclipse",
    annular: true,
    name: "The eclipse of Hsi and Ho",
    certainty: "Legend",
    date_text: "22 October 2137 BCE",
    description:
      "Chinese tradition tells of two court astronomers, Hsi and Ho, put to death for failing to predict an eclipse of the Sun. An annular eclipse of 22 October 2137 BCE has been matched to the story.",
    start_year: bce(2137),
    end_year: bce(2137),
    place: [112.5, 35.6],
    source: ECLIPSES,
  },
  {
    id: "eclipse-mursili",
    kind: "eclipse",
    name: "Mursili's eclipse",
    certainty: "Possible match",
    date_text: "24 June 1312 BCE",
    description:
      "A Hittite oracle text speaks of a sign from the Sun god in the reign of King Mursili II. If it was the total eclipse of 24 June 1312 BCE, it would fix Hittite history to the year.",
    start_year: bce(1312),
    end_year: bce(1312),
    place: [34.6, 40.0],
    narration: { src: "narration/sky/eclipse-mursili-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "48756fae74" },
    source: ECLIPSES,
  },
  {
    id: "eclipse-double-dawn",
    kind: "eclipse",
    annular: true,
    name: "China's \"double dawn\"",
    certainty: "Possible match",
    date_text: "21 April 899 BCE",
    description:
      "The Bamboo Annals say that at Zheng the Sun rose twice. An eclipse just after sunrise would do it: day breaks, darkens, and breaks again. An annular eclipse of 21 April 899 BCE fits.",
    start_year: bce(899),
    end_year: bce(899),
    place: [109.2, 34.5],
    source: ECLIPSES,
  },
  {
    id: "eclipse-assyrian",
    kind: "eclipse",
    name: "The Assyrian eclipse",
    date_text: "15 June 763 BCE",
    description:
      "The Assyrian list of yearly officials notes, for the year of Bur-Sagale: \"In the month Simanu an eclipse of the Sun took place.\" It was the total eclipse of 15 June 763 BCE, seen in northern Assyria, and it pins the dates of the ancient Near East for centuries around it.",
    start_year: bce(763),
    end_year: bce(763),
    place: [43.1, 36.4],
    narration: { src: "narration/sky/eclipse-assyrian-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "0258c17394" },
    source: ASSYRIAN,
  },
  {
    id: "eclipse-archilochus",
    kind: "eclipse",
    name: "Archilochus' eclipse",
    date_text: "6 April 648 BCE",
    description:
      "The Greek poet Archilochus wrote of Zeus making night out of noon and hiding the light of the Sun: the total eclipse of 6 April 648 BCE, the earliest eclipse in Greek writing.",
    start_year: bce(648),
    end_year: bce(648),
    place: [25.2, 37.1],
    source: ECLIPSES,
  },
  {
    id: "eclipse-thales",
    kind: "eclipse",
    name: "The eclipse of Thales",
    certainty: "Disputed",
    date_text: "28 May 585 BCE",
    description:
      "Herodotus tells how day turned suddenly to night in the middle of a battle between the Lydians and the Medes, who made peace; Thales was said to have foretold it. It is usually matched to the total eclipse of 28 May 585 BCE, but the date, the place, and whether anyone could have predicted it are all argued over.",
    start_year: bce(585),
    end_year: bce(585),
    place: [34.0, 39.0],
    narration: { src: "narration/sky/eclipse-thales-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "6ea36d183c" },
    source: THALES,
  },
  {
    id: "eclipse-xerxes",
    kind: "eclipse",
    annular: true,
    name: "Xerxes' eclipse",
    certainty: "Date uncertain",
    date_text: "480 or 478 BCE",
    description:
      "Herodotus says the Sun vanished as Xerxes set out to invade Greece. No eclipse was visible there in the year he gives; annular eclipses of 2 October 480 and 17 February 478 BCE are the candidates.",
    start_year: bce(480),
    end_year: bce(478),
    place: [28.0, 38.5],
    source: ECLIPSES,
  },
  {
    id: "eclipse-thucydides",
    kind: "eclipse",
    annular: true,
    name: "Thucydides' eclipse",
    date_text: "3 August 431 BCE",
    description:
      "In the first summer of the Peloponnesian War the Sun was eclipsed, and Thucydides wrote it down. Pericles is said to have calmed his frightened men with it.",
    start_year: bce(431),
    end_year: bce(431),
    place: [23.7, 38.0],
    source: ECLIPSES,
  },
  {
    id: "aurora-laschamp",
    kind: "aurora",
    name: "Auroras of the Laschamp event",
    certainty: "Inferred",
    date_text: "About 42,000–41,500 years ago",
    description:
      "Earth's magnetic field flipped over and fell to a fraction of its strength. With the shield down, the study that dated it says, people all over the world would have seen auroras shimmering across the sky. Its authors also suggested harsher sunlight drove people into caves, perhaps prompting cave art, but that is much doubted.",
    start_year: ka(42.2),
    end_year: ka(41.5),
    place: [4.4, 44.4],
    narration: { src: "narration/sky/aurora-laschamp-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "6d5f1af8b7" },
    source: COOPER,
  },
  {
    id: "miyake-12350-bce",
    kind: "aurora",
    name: "A great solar storm",
    certainty: "Unconfirmed",
    date_text: "12,350 BCE",
    description:
      "Tree rings from the French Alps record a burst of radiation from the Sun far bigger than any storm of modern times. Storms like it light auroras far from the poles, so people in the Ice Age world would likely have seen the sky glow red and green. It has not yet been found in wood from other regions.",
    start_year: bce(12350),
    end_year: bce(12350),
    place: [5.9, 44.6],
    source: MIYAKE,
  },
  {
    id: "miyake-7176-bce",
    kind: "aurora",
    name: "A great solar storm",
    certainty: "Auroras inferred",
    date_text: "7176 BCE",
    description:
      "A spike of radiocarbon in tree rings marks a storm from the Sun in 7176 BCE, far stronger than anything seen in the age of telescopes. It would very likely have lit auroras far from the poles, over the first farming villages.",
    start_year: bce(7176),
    end_year: bce(7176),
    place: [32.8, 37.7],
    narration: { src: "narration/sky/miyake-7176-bce-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "e6ef6a2b04" },
    source: MIYAKE,
  },
  {
    id: "miyake-5410-bce",
    kind: "aurora",
    name: "A great solar storm",
    certainty: "Unconfirmed",
    date_text: "5410 BCE",
    description:
      "Tree rings may record a great storm from the Sun in 5410 BCE, which would have lit auroras far from the poles. It still needs confirming.",
    start_year: bce(5410),
    end_year: bce(5410),
    place: [24.0, 46.0],
    source: MIYAKE,
  },
  {
    id: "miyake-5259-bce",
    kind: "aurora",
    name: "A great solar storm",
    certainty: "Auroras inferred",
    date_text: "5259 BCE",
    description:
      "Tree rings record a burst of radiation from the Sun in 5259 BCE. A storm that size would very likely have lit auroras far from the poles.",
    start_year: bce(5259),
    end_year: bce(5259),
    place: [11.0, 47.0],
    source: MIYAKE,
  },
  {
    id: "miyake-664-bce",
    kind: "aurora",
    name: "A great solar storm",
    certainty: "Auroras inferred",
    date_text: "664–663 BCE",
    description:
      "Tree rings record a great storm from the Sun in 664–663 BCE, in the last century of the Assyrian empire. A storm that size would very likely have lit auroras far from the poles.",
    start_year: bce(664),
    end_year: bce(663),
    place: [43.1, 36.4],
    source: MIYAKE,
  },
  {
    id: "jupiter-venus-2-bce",
    kind: "conjunction",
    name: "Jupiter and Venus together",
    date_text: "17 June 2 BCE",
    description:
      "The two brightest planets passed so close, near the star Regulus, that they would have looked almost like a single star in the evening sky. It came at the end of a run of conjunctions in 3–2 BCE, and is one of the explanations offered for the Star of Bethlehem.",
    start_year: bce(2),
    end_year: bce(2),
    place: [35.2, 31.7],
    narration: { src: "narration/sky/jupiter-venus-2-bce-v1.mp3", credit: "AI-generated narration (ElevenLabs)", text_hash: "bfac3f6daa" },
    source: BETHLEHEM,
  },
];

/** Where each kind sits on the background, in % of its width and height: upper sky, clear of the globe. */
export const SKY_PLACE: Record<SkyKind, [x: number, y: number]> = {
  supernova: [69, 11],
  nova: [69, 11],
  comet: [29, 12],
  eclipse: [84, 24],
  aurora: [88, 6], // the glow spans the top of the sky; its button sits here, clear of the search bar
  conjunction: [31, 32], // left of the globe, clear of the left-hand panels
};

/**
 * Whether it shows at the slider's year: inside its window or within one slider step of it, so a
 * one-year comet is still there at the stops either side (10 years apart in the last 3,000 years).
 */
export function skyShownAt(e: SkyEvent, year: number): boolean {
  const step = STEPS[segmentOfBce(1 - year)];
  return e.start_year - step <= year && year <= e.end_year + step;
}

export const skyAt = (year: number): SkyEvent[] => SKY_EVENTS.filter((e) => skyShownAt(e, year));

/** The sky's colours, like a category's (config.ts CATEGORY_STYLE): the badge, the page's accent. */
export const SKY_STYLE = { label: "In the sky", color: "#9db4ff", ink: "#16245a" } as const;

/** What each kind is called in a list ("Comets"), in the order the Sky page shows them. */
export const SKY_KIND_PLURAL: [SkyKind, string][] = [
  ["supernova", "Supernovae"],
  ["nova", "New stars"],
  ["comet", "Comets"],
  ["eclipse", "Eclipses of the Sun"],
  ["aurora", "Auroras"],
  ["conjunction", "Planets"],
];

export const skyById = (id: string | null): SkyEvent | undefined => (id ? SKY_EVENTS.find((e) => e.id === id) : undefined);

/**
 * The slider stop to show it at ("Show in the sky"): its year, or the middle of a span, snapped to the
 * slider and nudged to a neighbouring stop if snapping left the window.
 */
export function skyYear(e: SkyEvent): number {
  const mid = e.span ? Math.round((e.start_year + e.end_year) / 2) : e.start_year;
  const y = snapYear(mid);
  if (skyShownAt(e, y)) return y;
  for (const dir of [1, -1] as const) {
    const n = stepYear(y, dir);
    if (skyShownAt(e, n)) return n;
  }
  return y;
}
