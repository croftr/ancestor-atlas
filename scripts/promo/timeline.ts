// The promo video's timeline (docs/promo-video.md): music, shots and voiceover lines. Read by the other
// scripts in scripts/promo/, so a change here re-times the narration, music and edit together.
// Working files live in data/build/promo/ (gitignored); source clips and the music in data/raw/promo/ (gitignored).

/**
 * The music: "The Miracle of Flight" by Scott Buckley (CC BY 4.0, 3:32, about 119 BPM), with one join.
 * Its accents fall every 6 beats (UNIT, about 3.03 s; `npx tsx scripts/promo/beats.ts` finds them).
 * The track's quiet opening plays under the cold open, rise and all, then crossfades over one unit into the full
 * section, both on the beat grid, and plays on to the composer's own ending: the final chord lands at 73.3 s in
 * the video, on the end card, and rings out under it. (A hard cut on the title, then a boom and a riser over
 * a gap, all sounded wrong to Rob, 18 Oct 2026; the opening's own rise into a crossfade was his idea.)
 */
export const MUSIC = {
  url: "https://www.scottbuckley.com.au/library/wp-content/uploads/2020/08/sb_themiracleofflight.mp3",
  file: "data/raw/promo/music/sb_themiracleofflight.mp3",
  credit: "\"The Miracle of Flight\" by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au",
  /** Track time of the first accent used (beat #1). */
  grid: 0.186,
  beat: 0.50428,
  /** The join: the full section is fully in at track time CUT_FROM, playing from track time CUT_TO. */
  cutFrom: 12.794,
  cutTo: 136.861,
  /** Seconds before CUT_FROM that the crossfade starts (one unit). */
  crossfade: 3.026,
};

export interface Sfx {
  /** Video time of the sound's attack (its leading silence is trimmed), or with `endAt`, of its end. */
  at: number;
  /** Place the sound so it ends here instead (a riser into a hit); its trailing silence is trimmed. */
  endAt?: boolean;
  prompt: string;
  seconds: number;
  /** Level in the mix (1 = as generated). */
  gain: number;
}

/** Sound effects (ElevenLabs sound generation), cached by prompt in data/build/promo/sfx. */
export const SFX: Sfx[] = [];

export const UNIT = 6 * MUSIC.beat;
/** Video time of accent `n` (0 = the start of the video's first full unit, 0.69 s; 3 = the title hit). */
export const accent = (n: number) => MUSIC.grid + MUSIC.beat + n * UNIT;

/** Video length: the final chord's ring-out, faded over the last FADE_S. */
export const LENGTH_S = 82;
export const FADE_S = 2.5;

export interface Shot {
  /** Shot number in docs/promo-video.md. */
  n: number;
  /** Video time the shot starts (an accent); it runs to the next shot. */
  at: number;
  what: string;
}

export const SHOTS: Shot[] = [
  { n: 1, at: 0, what: "Footprints in volcanic ash (generated A)" },
  { n: 2, at: accent(1), what: "Hand stencil (generated B)" },
  { n: 3, at: accent(2), what: "Fire to stars (generated C), into the app's starfield" },
  { n: 4, at: accent(3), what: "Title over the globe" },
  { n: 5, at: accent(4), what: "Time slider sweep, species spreading" },
  { n: 6, at: accent(6), what: "Ice sheets and falling seas" },
  { n: 7, at: accent(8), what: "Out of Africa routes" },
  { n: 8, at: accent(9), what: "Interbreeding lines" },
  { n: 9, at: accent(10), what: "Family tree" },
  { n: 10, at: accent(11), what: "Thousands of sites" },
  { n: 11, at: accent(13), what: "Civilizations" },
  { n: 12, at: accent(14), what: "Ancient DNA" },
  { n: 13, at: accent(15), what: "Tours page and title card" },
  { n: 14, at: accent(16), what: "A narrated tour stop" },
  { n: 15, at: accent(18), what: "Picture viewer and the gold thread" },
  { n: 16, at: accent(20), what: "Sources and museum photos" },
  { n: 17, at: accent(24), what: "End card: ancestoratlas.com" },
];

export interface Line {
  shot: number;
  /** Seconds from the start of the video when the line starts. */
  at: number;
  text: string;
  /** What the narrator is given to read, when it differs from the text (a web address, say). */
  spoken?: string;
  /** How it is read, when not as the app's narration (the cold open is slower, with more weight). */
  delivery?: Delivery;
}

export interface Delivery {
  /** ElevenLabs model (default: the app's narration model). */
  model?: string;
  /** Voice settings over the voice's saved ones (speed 0.7–1.2, style 0–1); not for eleven_v3. */
  speed?: number;
  style?: number;
  /** eleven_v3 direction tags put before the text, e.g. "[slowly]". */
  tag?: string;
}

/** Two ways to read the cold open, to compare by ear (`audio.ts --opening <name>`); the first is used. */
export const OPENINGS: Record<string, Delivery> = {
  v3: { model: "eleven_v3", tag: "[serious] [slowly]" }, // Rob's pick, 18 Oct 2026
  slow: { speed: 0.82, style: 0.2 },
};
const opening = Object.values(OPENINGS)[0];

const shotAt = (n: number) => SHOTS.find((s) => s.n === n)!.at;

export const LINES: Line[] = [
  { shot: 1, at: 0.5, text: "Seven million years.", delivery: opening },
  { shot: 2, at: shotAt(2) + 0.2, text: "Ten thousand generations.", delivery: opening },
  { shot: 3, at: shotAt(3) + 0.3, text: "One story.", delivery: opening },
  { shot: 4, at: shotAt(4) + 0.5, text: "This is Ancestor Atlas.", delivery: opening },
  { shot: 5, at: shotAt(5) + 0.7, text: "The whole human story, on one living globe." },
  { shot: 6, at: shotAt(6) + 0.4, text: "Watch the ice sheets grow and the seas fall." },
  { shot: 7, at: shotAt(7) + 0.2, text: "Follow our ancestors out of Africa," },
  { shot: 8, at: shotAt(8) + 0.2, text: "see where we met Neanderthals and Denisovans," },
  { shot: 9, at: shotAt(9) + 0.6, text: "trace the family tree," },
  { shot: 10, at: shotAt(10) + 0.3, text: "and explore thousands of real sites, from the first stone tools…" },
  { shot: 11, at: shotAt(11) + 0.1, text: "…to the empires of the ancient world." },
  { shot: 12, at: shotAt(12) + 0.4, text: "Even ancient DNA." },
  { shot: 13, at: shotAt(13) + 0.3, text: "Or sit back, and take a guided tour." },
  { shot: 14, at: shotAt(14) + 1.2, text: "Narrated journeys across time…" },
  { shot: 15, at: shotAt(15) + 0.3, text: "…from our first steps to the first cities." },
  { shot: 16, at: shotAt(16) + 0.6, text: "Every site sourced. Every date cited. Built on real research, for curious minds of every age." },
  {
    shot: 17,
    at: shotAt(17) + 0.8,
    text: "Ancestor Atlas. Explore it free, at ancestoratlas.com.",
    spoken: "Ancestor Atlas. Explore it free, at ancestor atlas dot com.",
  },
];

/** Narration speed-up applied after recording (1 = as the app's tours read). */
export const TEMPO = 1;

/** On-screen text (titles.ts draws it, edit.ts fades it in and out over `from`..`to`). */
export interface Text {
  id: string;
  kind: "title" | "caption" | "end";
  text: string;
  sub?: string;
  from: number;
  to: number;
}

const during = (n: number, lead = 0.35, tail = 0.35): { from: number; to: number } => {
  const i = SHOTS.findIndex((s) => s.n === n);
  return { from: SHOTS[i].at + lead, to: (SHOTS[i + 1]?.at ?? LENGTH_S) - tail };
};

export const TEXTS: Text[] = [
  { id: "title", kind: "title", text: "Ancestor Atlas", ...during(4, 0.5, 0.25) },
  { id: "million", kind: "caption", text: "7 million years", ...during(5) },
  { id: "ice", kind: "caption", text: "The Ice Ages", ...during(6) },
  { id: "africa", kind: "caption", text: "Out of Africa", ...during(7) },
  { id: "species", kind: "caption", text: "26 human species", ...during(9) },
  { id: "sites", kind: "caption", text: "5,000+ sites", from: shotAt(10) + 0.35, to: shotAt(10) + 3.6 },
  { id: "civs", kind: "caption", text: "200 civilizations", ...during(11) },
  { id: "dna", kind: "caption", text: "Ancient DNA", ...during(12) },
  { id: "cited", kind: "caption", text: "Every date cited", from: shotAt(16) + 0.35, to: shotAt(16) + 5.7 },
  {
    id: "end",
    kind: "end",
    text: "ancestoratlas.com",
    sub:
      "Explore the human story, free<br><span style=\"font-size:18px;opacity:.75\">Music: “The Miracle of Flight” by Scott Buckley (CC BY 4.0) · " +
      "Narration: AI-generated (ElevenLabs)</span>",
    from: shotAt(17) + 0.1,
    to: LENGTH_S,
  },
];

/**
 * The picture, shot by shot: a source clip from `in` (seconds), at `speed`. Generated clips are in data/raw/promo/gen,
 * app shots in data/build/promo/shots (film.ts). Parts of a shot (15a, 15b) split its time evenly.
 */
export interface Clip {
  shot: number;
  src: string;
  in?: number;
  speed?: number;
  /** Seconds this clip dissolves into the next (taken from the start of the next). */
  dissolve?: number;
}

export const CLIPS: Clip[] = [
  { shot: 1, src: "data/raw/promo/gen/a-footprints.mp4", in: 6.0 },
  { shot: 2, src: "data/raw/promo/gen/b-hand-stencil.mp4", in: 5.2 },
  { shot: 3, src: "data/raw/promo/gen/c-fire-to-stars.mp4", in: 1.0, speed: 2, dissolve: 0.6 },
  ...[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((n) => ({ shot: n, src: `data/build/promo/shots/${n}.mp4` })),
  { shot: 15, src: "data/build/promo/shots/15a.mp4" },
  { shot: 15, src: "data/build/promo/shots/15b.mp4" },
  { shot: 16, src: "data/build/promo/shots/16a.mp4" },
  { shot: 16, src: "data/build/promo/shots/16b.mp4" },
  { shot: 17, src: "data/build/promo/shots/17.mp4" },
];
