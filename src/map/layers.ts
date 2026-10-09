import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import type { Category } from "../types";

export const SOURCE_ID = "features";

/** Map images for the category icons drawn on species and event markers (added in MapView). */
export const ICON_IMAGE = { species: "icon-species", culture: "icon-culture", event: "icon-event" } as const;
/** CSS px of those icons on the map. */
export const MAP_ICON_PX = 14;

/**
 * Culture sites come in hundreds, so they stay small dots until zoomed in this far (where they
 * spread apart); then they become pot badges like species and events. The selected site is
 * always a badge.
 */
const CULTURE_ICON_ZOOM = 4.5;

/** The category icon centred on a marker: fixed to the screen, never hidden by collisions. */
const iconLayer = (id: string, image: string, opacity?: ExpressionSpecification): LayerSpecification => ({
  id,
  type: "symbol",
  source: SOURCE_ID,
  ...(opacity && { paint: { "icon-opacity": opacity } }),
  layout: {
    "icon-image": image,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "icon-pitch-alignment": "viewport",
    "icon-rotation-alignment": "viewport",
  },
});

/** Features of `category` on the map at `year`; `tolerance` widens the window (events). */
export function timeFilter(category: Category, year: number, tolerance = 0): ExpressionSpecification {
  return [
    "all",
    ["==", ["get", "category"], category],
    ["<=", ["get", "start_year"], year + tolerance],
    [">=", ["get", "end_year"], year - tolerance],
  ];
}

const selected: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];

export interface LayerDef {
  category: Category;
  spec: LayerSpecification;
}

// Bottom to top.
export const LAYER_DEFS: LayerDef[] = [
  {
    category: "civilization",
    spec: {
      id: "civ-fill",
      type: "fill",
      source: SOURCE_ID,
      paint: { "fill-color": ["coalesce", ["get", "color"], "#ef476f"], "fill-opacity": ["case", selected, 0.6, 0.3] },
    },
  },
  {
    category: "civilization",
    spec: {
      id: "civ-line",
      type: "line",
      source: SOURCE_ID,
      paint: { "line-color": ["coalesce", ["get", "line_color"], "#ef476f"], "line-width": 1.5 },
    },
  },
  {
    category: "culture",
    spec: {
      id: "culture-heat",
      type: "heatmap",
      source: SOURCE_ID,
      paint: {
        "heatmap-weight": ["coalesce", ["get", "weight"], 0.8],
        "heatmap-intensity": 1,
        "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, 18, 3, 60, 6, 300],
        "heatmap-opacity": 0.75,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(6,214,160,0)",
          0.2,
          "rgba(6,214,160,0.2)",
          0.6,
          "#06d6a0",
          1,
          "#e0fff4",
        ],
      },
    },
  },
  {
    category: "culture",
    spec: {
      id: "culture-dots",
      type: "circle",
      source: SOURCE_ID,
      paint: {
        // Small dots zoomed out; badge-sized discs (carrying the pot icon) zoomed in or selected.
        "circle-radius": ["step", ["zoom"], ["case", selected, 13, 4], CULTURE_ICON_ZOOM, ["case", selected, 13, 11]],
        "circle-color": "#06d6a0",
        "circle-stroke-color": ["step", ["zoom"], "#ffffff", CULTURE_ICON_ZOOM, ["case", selected, "#ffffff", "#0b3d30"]],
        "circle-stroke-width": ["step", ["zoom"], ["case", selected, 3, 1], CULTURE_ICON_ZOOM, ["case", selected, 3, 2]],
        "circle-opacity": ["case", selected, 1, 0.9],
      },
    },
  },
  {
    category: "culture",
    spec: iconLayer("culture-icons", ICON_IMAGE.culture, ["step", ["zoom"], ["case", selected, 1, 0], CULTURE_ICON_ZOOM, 1]),
  },
  {
    category: "species",
    spec: {
      id: "species-circles",
      type: "circle",
      source: SOURCE_ID,
      paint: {
        // Big enough to carry the species icon (the badge before a name, as a marker).
        "circle-radius": ["case", selected, 13, 11],
        "circle-color": "#ffd166",
        "circle-stroke-color": ["case", selected, "#ffffff", "#1a1a1a"],
        "circle-stroke-width": ["case", selected, 3, 2],
      },
    },
  },
  { category: "species", spec: iconLayer("species-icons", ICON_IMAGE.species) },
  // Events on top: a soft halo and a ringed disc in the event colour, carrying the event icon.
  {
    category: "event",
    spec: {
      id: "event-halo",
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": ["case", selected, 26, 20],
        "circle-color": "#c39bff",
        "circle-opacity": 0.22,
        "circle-blur": 0.6,
      },
    },
  },
  {
    category: "event",
    spec: {
      id: "event-dots",
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": ["case", selected, 13, 11],
        "circle-color": "#c39bff",
        "circle-stroke-color": ["case", selected, "#ffffff", "#2a1450"],
        "circle-stroke-width": ["case", selected, 3, 2.5],
      },
    },
  },
  { category: "event", spec: iconLayer("event-icons", ICON_IMAGE.event) },
];

export const INTERACTIVE_LAYERS = ["event-dots", "species-circles", "culture-dots", "civ-fill"];
