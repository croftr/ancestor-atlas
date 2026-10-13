import type { EraIconName } from "./ui/EraIcon";

// `ink`: a dark shade of `color` for the icon and outline on a category badge or map marker
// (softer than black; each at least 4:1 contrast against `color`).
export const CATEGORY_STYLE = {
  species: { label: "Species", color: "#ffd166", ink: "#5a3a0c", shape: "Point sites" },
  culture: { label: "Cultures", color: "#06d6a0", ink: "#0a4535", shape: "Fuzzy zones" },
  civilization: { label: "Civilizations", color: "#ef476f", ink: "#4a0b1d", shape: "Territories" },
  event: { label: "Events", color: "#c39bff", ink: "#3a1a6b", shape: "Moments" },
} as const;

// Era jump chips under the time slider, each tied to an event in events.yaml: the chip jumps to the event's year
// (snapped to the slider), so the event is always on the globe when you land. Oldest first. `icon` names a pictogram
// in ui/EraIcon.tsx and `tint` colours it (earthy tones: bone, flint, ochre, wheat, bronze, marble).
export const ERA_PRESETS: { label: string; event: string; icon: EraIconName; tint: string }[] = [
  { label: "First hominins", event: "hominin-divergence", icon: "skull", tint: "#e6dcc4" },
  { label: "First tools", event: "lomekwian-tools", icon: "handaxe", tint: "#b9c1cc" },
  { label: "Out of Africa", event: "out-of-africa-dmanisi", icon: "migration", tint: "#e8a865" },
  { label: "Fire", event: "control-of-fire", icon: "fire", tint: "#ff9a4d" },
  { label: "Modern humans", event: "modern-humans-emerge", icon: "footprints", tint: "#d9b48a" },
  { label: "Cave art", event: "figurative-cave-art", icon: "cave-animal", tint: "#e0794f" },
  { label: "First farmers", event: "birth-of-agriculture", icon: "wheat", tint: "#f0c85a" },
  { label: "Bronze Age", event: "bronze-age", icon: "dagger", tint: "#d39a5b" },
  { label: "Pyramids", event: "great-pyramid", icon: "pyramid", tint: "#e9e2d2" },
  { label: "Coinage", event: "minted-coinage", icon: "coin", tint: "#e0b94f" },
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

/** Small screens: the globe's panels stack in a column around it (index.css uses the same width). */
export const STACKED_QUERY = "(max-width: 900px)";

// Videos and audio live in S3, not the repo. Media `src` values are keys in this bucket; a full
// https URL is used as is. Override with VITE_MEDIA_BASE (e.g. a CloudFront domain) without
// touching the data.
export const MEDIA_BASE = (
  (import.meta.env.VITE_MEDIA_BASE as string | undefined) ?? "https://robs-ancestors-atlas.s3.eu-west-2.amazonaws.com"
).replace(/\/+$/, "");
export const mediaUrl = (src: string) => (/^https?:\/\//.test(src) ? src : `${MEDIA_BASE}/${src.replace(/^\/+/, "")}`);
