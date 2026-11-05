/**
 * The highlight round the item in focus (the open card's point, or a book stop's place): a soft gold
 * glow under the markers and a cream ring with a dark casing above them all, so it reads on a crowded globe.
 * When the globe arrives there, a few rings ripple out and the glow flares, then settles to the steady
 * ring (`highlightFrame`). Drawn by MapView from the `highlight` source.
 */
import type { ExpressionSpecification, FilterSpecification, LayerSpecification } from "maplibre-gl";

export const HIGHLIGHT_SOURCE = "highlight";
export const HIGHLIGHT_GOLD = "#d8c08c";
const RING = "#fff4d6";

/** Ripples on arrival: each starts this far after the one before, and lasts `RIPPLE`. */
export const PULSES = [0, 650, 1300];
export const RIPPLE = 1_500;
/** The glow and ring flare on arrival and ease down to their steady look over this long. */
export const SETTLE = 3_200;
/** The whole arrival effect is over by then. */
export const ARRIVAL_MS = Math.max(SETTLE, PULSES[PULSES.length - 1] + RIPPLE);
/** Wait at most this long for the globe to stop moving before pulsing anyway. */
export const MAX_WAIT_MS = 6_000;

const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** The highlight `elapsed` ms after arrival (null: still travelling, so the steady look). */
export function highlightFrame(at: [number, number], elapsed: number | null): GeoJSON.FeatureCollection {
  const pt = (properties: Record<string, unknown>): GeoJSON.Feature => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: at },
    properties,
  });
  // 1 on arrival, 0 once settled.
  const boost = elapsed === null ? 0 : 1 - easeOut(Math.min(1, Math.max(0, elapsed / SETTLE)));
  const features = [pt({ kind: "glow", boost }), pt({ kind: "ring", boost })];
  if (elapsed !== null)
    for (const start of PULSES) {
      const age = elapsed - start;
      if (age >= 0 && age < RIPPLE) features.push(pt({ kind: "pulse", t: easeOut(age / RIPPLE) }));
    }
  return { type: "FeatureCollection", features };
}

const kind = (k: string): FilterSpecification => ["==", ["get", "kind"], k];
const boost = (steady: number, flare: number): ExpressionSpecification => ["+", steady, ["*", flare - steady, ["get", "boost"]]];

/** The glow goes under the markers, so it never washes over the one it marks. */
export const HIGHLIGHT_GLOW: LayerSpecification = {
  id: "highlight-glow",
  type: "circle",
  source: HIGHLIGHT_SOURCE,
  filter: kind("glow"),
  paint: {
    "circle-color": HIGHLIGHT_GOLD,
    "circle-radius": boost(30, 50),
    "circle-blur": 0.85,
    "circle-opacity": boost(0.45, 0.85),
  },
};

/** Hollow rings, so they go above every marker. Bottom to top. */
export const HIGHLIGHT_RINGS: LayerSpecification[] = [
  {
    id: "highlight-pulse",
    type: "circle",
    source: HIGHLIGHT_SOURCE,
    filter: kind("pulse"),
    paint: {
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-radius": ["interpolate", ["linear"], ["get", "t"], 0, 18, 1, 70],
      "circle-stroke-color": HIGHLIGHT_GOLD,
      "circle-stroke-width": ["interpolate", ["linear"], ["get", "t"], 0, 4, 1, 1],
      "circle-stroke-opacity": ["interpolate", ["linear"], ["get", "t"], 0, 0.95, 1, 0],
    },
  },
  // A dark casing under the ring, so it shows on pale land, on the sea and over other markers.
  {
    id: "highlight-casing",
    type: "circle",
    source: HIGHLIGHT_SOURCE,
    filter: kind("ring"),
    paint: {
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-radius": 18,
      "circle-stroke-color": "rgba(16, 18, 20, 0.7)",
      "circle-stroke-width": boost(6, 8),
    },
  },
  {
    id: "highlight-ring",
    type: "circle",
    source: HIGHLIGHT_SOURCE,
    filter: kind("ring"),
    paint: {
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-radius": 19,
      "circle-stroke-color": RING,
      "circle-stroke-width": boost(3, 5),
    },
  },
];
