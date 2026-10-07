import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import type { Category } from "../types";

export const SOURCE_ID = "features";

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
        "circle-radius": ["case", selected, 8, 4],
        "circle-color": "#06d6a0",
        "circle-stroke-color": ["case", selected, "#0b1020", "#ffffff"],
        "circle-stroke-width": ["case", selected, 3, 1],
        "circle-opacity": ["case", selected, 1, 0.9],
      },
    },
  },
  {
    category: "species",
    spec: {
      id: "species-circles",
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": ["case", selected, 10, 7],
        "circle-color": "#ffd166",
        "circle-stroke-color": "#1a1a1a",
        "circle-stroke-width": 2,
      },
    },
  },
  // Events on top: a soft halo and a ringed dot in the event colour.
  {
    category: "event",
    spec: {
      id: "event-halo",
      type: "circle",
      source: SOURCE_ID,
      paint: {
        "circle-radius": ["case", selected, 22, 16],
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
        "circle-radius": ["case", selected, 9, 7],
        "circle-color": "#c39bff",
        "circle-stroke-color": ["case", selected, "#ffffff", "#2a1450"],
        "circle-stroke-width": ["case", selected, 3, 2.5],
      },
    },
  },
];

export const INTERACTIVE_LAYERS = ["event-dots", "species-circles", "culture-dots", "civ-fill"];
