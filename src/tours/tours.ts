import type { Category } from "../types";

/**
 * Guided tours: the globe plays forward and stops at each entity in turn, turning to it and opening
 * its card. A stop lands on `year` if given, else the entity's best year (an event's `year`).
 * `hold` is how long the card stays up, in seconds (default: from the length of its description).
 * `layers`: the categories shown during the tour (default: all); the viewer's own come back after.
 * Stops run oldest first. src/tours/tours.test.ts checks every stop lands on something visible.
 */
export interface TourStop {
  entity: string;
  year?: number;
  hold?: number;
}

export interface Tour {
  id: string;
  title: string;
  blurb: string;
  layers?: Category[];
  stops: TourStop[];
}

export const TOURS: Tour[] = [
  {
    id: "events-and-inventions",
    title: "Events and inventions",
    blurb: "From the first stone tools to paper: the breakthroughs that shaped the human story.",
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
];

export const tourById = (id: string) => TOURS.find((t) => t.id === id);
