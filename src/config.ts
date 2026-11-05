import type { EraIconName } from "./ui/EraIcon";

// `ink`: a dark shade of `color` for the icon and outline on a category badge or map marker
// (softer than black; each at least 4:1 contrast against `color`).
export const CATEGORY_STYLE = {
  species: { label: "Species", color: "#c8a96a", ink: "#3a2a0c", shape: "Point sites" },
  culture: { label: "Cultures", color: "#6f9f8b", ink: "#102e25", shape: "Fuzzy zones" },
  civilization: { label: "Civilizations", color: "#b5615c", ink: "#2c0d0c", shape: "Territories" },
  city: { label: "Cities", color: "#86a3bb", ink: "#14283a", shape: "Towns and cities" },
  event: { label: "Events", color: "#a897b4", ink: "#2b2036", shape: "Moments" },
} as const;

// Era jump chips under the time slider, each tied to an event in events.yaml: the chip jumps to the event's year
// (snapped to the slider), so the event is always on the globe when you land. Oldest first. `icon` names a pictogram
// in ui/EraIcon.tsx and `tint` colours it (one quiet bone tone for all).
export const ERA_PRESETS: { label: string; event: string; icon: EraIconName; tint: string }[] = [
  { label: "First hominins", event: "hominin-divergence", icon: "skull", tint: "#bdb7a8" },
  { label: "First tools", event: "lomekwian-tools", icon: "handaxe", tint: "#bdb7a8" },
  { label: "Out of Africa", event: "out-of-africa-dmanisi", icon: "migration", tint: "#bdb7a8" },
  { label: "Fire", event: "control-of-fire", icon: "fire", tint: "#bdb7a8" },
  { label: "Modern humans", event: "modern-humans-emerge", icon: "footprints", tint: "#bdb7a8" },
  { label: "Cave art", event: "figurative-cave-art", icon: "cave-animal", tint: "#bdb7a8" },
  { label: "First farmers", event: "birth-of-agriculture", icon: "wheat", tint: "#bdb7a8" },
  { label: "Bronze Age", event: "bronze-age", icon: "dagger", tint: "#bdb7a8" },
  { label: "Pyramids", event: "great-pyramid", icon: "pyramid", tint: "#bdb7a8" },
  { label: "Coinage", event: "minted-coinage", icon: "coin", tint: "#bdb7a8" },
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
  /** Ice sheets of the time (map/paleo.ts). */
  ice: string;
}

export const BASEMAP_THEMES: Record<string, BasemapTheme> = {
  slate: { label: "Slate", bg: "#3b4f66", fill: "#8d9bab", line: "#c3ccd6", ice: "#e8eff6" },
  atlas: { label: "Atlas", bg: "#a9c6d9", fill: "#ece3c8", line: "#9c8f69", ice: "#ffffff" },
  natural: { label: "Natural", bg: "#8fb3c4", fill: "#b9c79a", line: "#6f8a5c", ice: "#f2f7fa" },
  dusk: { label: "Dusk", bg: "#1b2a38", fill: "#a9a48f", line: "#6b6754", ice: "#d9dfe3" },
  night: { label: "Night", bg: "#0a1424", fill: "#2a3652", line: "#5b6f96", ice: "#9fb2d1" },
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

/** The small globe at the top left while the picture viewer is open (map/MapView.tsx, ui/PictureViewer.tsx). */
export const MINI_GLOBE = { left: 20, top: 20, size: 168 };
