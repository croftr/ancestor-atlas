import { STEPS, segmentOfBce } from "../time/scale";

/**
 * Things seen in the sky, drawn on the star background while the slider is near them (sky/SkyObjects.tsx)
 * and named in the climate panel ("In the sky"). Hand-picked and kept in the app, like the routes and the
 * interbreeding episodes; only what a source dates (Rob's rule: when unsure, leave it out). Left out on
 * purpose (Nov 2026): Caesar's Comet (its existence is unresolved), Hipparchus's nova (the 134 BCE date is
 * legend), the eclipse of Thales (date and kind disputed), auroras of the Laschamp event and Miyake storms
 * (the events are dated, the auroras are only inferred), Halley's computed returns before 240 BCE.
 *
 * The star background is not a real sky, so objects sit at fixed places on it, not where they were seen.
 */

export interface SkyEvent {
  id: string;
  kind: "supernova" | "comet";
  name: string;
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
    source: HALLEY,
  },
];

/** Where each kind sits on the background, in % of its width and height: upper sky, clear of the globe. */
export const SKY_PLACE: Record<SkyEvent["kind"], [x: number, y: number]> = {
  supernova: [69, 11],
  comet: [29, 12],
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
