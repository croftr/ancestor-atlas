export const CATEGORY_STYLE = {
  species: { label: "Species", color: "#ffd166", shape: "Point sites" },
  culture: { label: "Cultures", color: "#06d6a0", shape: "Fuzzy zones" },
  civilization: { label: "Civilizations", color: "#ef476f", shape: "Territories" },
  event: { label: "Events", color: "#c39bff", shape: "Moments" },
} as const;

// Era jump chips. Years are astronomical.
export const ERA_PRESETS = [
  { label: "Sahelanthropus", year: -6_499_999 },
  { label: "Lucy", year: -3_199_999 },
  { label: "First tools", year: -2_499_999 },
  { label: "Out of Africa", year: -1_799_999 },
  { label: "Neanderthals", year: -199_999 },
  { label: "Cave art", year: -29_999 },
  { label: "Natufian", year: -12_999 },
  { label: "First farmers", year: -4_999 },
  { label: "Bronze Age", year: -2_249 },
  { label: "Persia", year: -499 },
  { label: "1 CE", year: 1 },
];

// Timeline eras: the chunks the timeline's Earlier / Later buttons step through, oldest first.
// Each runs from its start to the next one's start (the last to 1 CE); the first starts at the
// beginning of the axis. Sized to what is in them, so each is readable when it fills the screen.
// "first-civilization" starts the era where the earliest civilization in the data begins.
const bce = (years: number) => 1 - years; // astronomical year of "N BCE"
export type EraStart = number | null | "first-civilization";
export const TIMELINE_ERAS: { label: string; start: EraStart }[] = [
  { label: "Earliest hominins", start: null }, // ~7.5–3 Ma: Sahelanthropus to Lucy
  { label: "Early Homo", start: bce(3_000_000) }, // Oldowan, Acheulean, H. erectus
  { label: "Neanderthals & early sapiens", start: bce(500_000) }, // Middle Stone Age, Mousterian
  { label: "Late Ice Age", start: bce(50_000) }, // Aurignacian to Clovis
  { label: "Neolithic", start: bce(10_000) }, // first farmers
  { label: "Civilizations", start: "first-civilization" }, // states and empires (c. 3,400 BCE on)
];

export interface BasemapTheme {
  label: string;
  bg: string;
  fill: string;
  line: string;
}

export const BASEMAP_THEMES: Record<string, BasemapTheme> = {
  slate: { label: "Slate", bg: "#3b4f66", fill: "#8d9bab", line: "#c3ccd6" },
  atlas: { label: "Atlas", bg: "#a9c6d9", fill: "#ece3c8", line: "#9c8f69" },
  natural: { label: "Natural", bg: "#8fb3c4", fill: "#b9c79a", line: "#6f8a5c" },
  dusk: { label: "Dusk", bg: "#1f3a54", fill: "#d9c9a3", line: "#8a7b57" },
  night: { label: "Night", bg: "#0a1424", fill: "#2a3652", line: "#5b6f96" },
};

export const DEFAULT_BASEMAP = "dusk";
