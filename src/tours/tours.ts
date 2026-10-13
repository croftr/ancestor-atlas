import type { Category } from "../types";

/**
 * Guided tours: the globe plays forward and stops at each entity in turn, turning to it and opening
 * its card. A stop lands on `year` if given, else the entity's best year (an event's `year`).
 * `hold` is how long the card stays up, in seconds (default: from the length of its description).
 * `layers`: the categories shown during the tour (default: all); the viewer's own come back after.
 * `music`: background track, a bucket key (music/tours/<id>-v<n>.mp3; set by `npm run audio:music`).
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
  stops: TourStop[];
}

export const TOURS: Tour[] = [
  {
    id: "events-and-inventions",
    title: "Events and inventions",
    blurb: "From the first stone tools to paper: the breakthroughs that shaped the human story.",
    music: { src: "music/tours/events-and-inventions-v1.mp3", credit: "Music: \"Adrift Among Infinite Stars\" by Scott Buckley (scottbuckley.com.au), CC BY 4.0" },
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
];

export const tourById = (id: string) => TOURS.find((t) => t.id === id);
