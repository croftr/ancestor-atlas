import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import type { Category } from "../types";

export const SOURCE_ID = "features";

export function timeFilter(category: Category, year: number): ExpressionSpecification {
  return [
    "all",
    ["==", ["get", "category"], category],
    ["<=", ["get", "start_year"], year],
    [">=", ["get", "end_year"], year],
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
];

export const INTERACTIVE_LAYERS = ["species-circles", "culture-dots", "civ-fill"];
