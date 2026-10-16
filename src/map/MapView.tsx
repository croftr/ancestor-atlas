import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useStore } from "../store";
import { BASEMAP_THEMES, CATEGORY_STYLE, MINI_GLOBE, STACKED_QUERY } from "../config";
import { type FeatureProps } from "../types";
import { ANCHOR_SOURCE_ID, ICON_IMAGE, INTERACTIVE_LAYERS, LAYER_DEFS, MAP_ICON_PX, SOURCE_ID, timeFilter } from "./layers";
import { polygonAnchor } from "./anchor";
import { CATEGORY_PATH } from "../ui/CategoryIcon";
import { eventTolerance, getData, isActive, loadData, useFeatures } from "./data";
import SpaceBackground from "./SpaceBackground";
import { navWidth, stageInset } from "../ui/cardWidth";
import { loadPaleo, paleoUrl, snapshotAt } from "./paleo";
import { ROUTES } from "../routes/routes";
import { routesGeoJSON, timeline, type TimedPoint } from "../routes/geometry";
import { pathSoFar, trail, trailPoints, type LngLat, type TrailFrame } from "../tours/epilogue";
import { tourById } from "../tours/tours";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** How far from a tap (CSS px) a marker still counts as tapped: touch, and mouse. */
const TAP_SLOP_TOUCH = 14;
const TAP_SLOP_MOUSE = 6;
/** Marker layers (points), as opposed to territories. */
const POINT_LAYERS = ["event-dots", "species-circles", "culture-dots"];

/** A category icon (24×24 SVG path) in its ink colour for a marker, at the screen's pixel density. */
function iconImage(path: string, ink: string): { data: ImageData; pixelRatio: number } | null {
  const pixelRatio = Math.max(1, Math.ceil(window.devicePixelRatio || 1));
  const px = MAP_ICON_PX * pixelRatio;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.canvas.width = ctx.canvas.height = px;
  ctx.scale(px / 24, px / 24);
  ctx.fillStyle = ink; // as on the badges (CategoryBadge)
  ctx.fill(new Path2D(path), "evenodd");
  return { data: ctx.getImageData(0, 0, px, px), pixelRatio };
}

/** A route's arrowhead (pointing north; rotated by bearing), as an SDF image so each route colours it. */
function arrowImage(): { data: ImageData; pixelRatio: number } | null {
  const pixelRatio = Math.max(1, Math.ceil(window.devicePixelRatio || 1));
  const px = 18 * pixelRatio;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.canvas.width = ctx.canvas.height = px;
  ctx.scale(px / 18, px / 18);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(9, 1.5);
  ctx.lineTo(16, 16);
  ctx.lineTo(9, 12);
  ctx.lineTo(2, 16);
  ctx.closePath();
  ctx.fill();
  return { data: ctx.getImageData(0, 0, px, px), pixelRatio };
}

/** A tour's epilogue: the journey drawn again as a thread of light (tours/epilogue.ts), over the markers. */
const TRAIL_GOLD = "#ffd98a";
/** A stop's ripple as the thread reaches it: grows and fades over this long (ms). */
const RIPPLE_MS = 1_600;
/** While a tour plays, each new leg of its path is drawn over this long (ms), as the globe turns to the stop. */
const PATH_DRAW_MS = 1_800;
/** The globe's slow turn once the thread is drawn (degrees a second), and how gently the camera follows. */
const SPIN_DEG_S = 2.4;
const FOLLOW_MS = 1_100;
const FIRST_TURN_MS = 600;
const SETTLE_MS = 3_000;
const ZOOM_MS = 1_000;

/** The epilogue's thread as GeoJSON: the line, a ripple and a dot at each stop reached, and the moving head. */
function trailGeoJSON(frame: TrailFrame): GeoJSON.FeatureCollection {
  const pt = (coordinates: LngLat, properties: Record<string, unknown>): GeoJSON.Feature => ({
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties,
  });
  const line: GeoJSON.Feature[] =
    frame.line.length > 1 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: frame.line }, properties: { kind: "line" } }] : [];
  return {
    type: "FeatureCollection",
    features: [
      ...line,
      ...frame.reached.map((r) => pt(r.at, { kind: "stop", age: Math.min(r.age, RIPPLE_MS) })),
      ...(frame.head ? [pt(frame.head, { kind: "head" })] : []),
    ],
  };
}

/** Route layers, under the markers. */
const ROUTE_LAYERS = ["route-casing", "route-line", "route-head"];

/**
 * Large screens: the height the time slider covers at the bottom of the map. Kept as the map's
 * padding, so the globe centres in the open space above the slider instead of behind it.
 * Small screens stack the slider below the map, so nothing is covered.
 */
function bottomInset(el: HTMLElement): number {
  if (window.matchMedia?.(STACKED_QUERY).matches) return 0;
  const slider = document.querySelector(".time-slider");
  if (!slider) return 0;
  return Math.max(0, Math.round(el.getBoundingClientRect().bottom - slider.getBoundingClientRect().top));
}

/** Large screens: the nav rail covering the map's left edge, kept as its left padding. */
function leftInset(): number {
  return window.matchMedia?.(STACKED_QUERY).matches ? 0 : navWidth();
}

/**
 * Large screens: the room kept for the info card on the right, as the map's right padding: a
 * default-width card's, so the globe stays put while the card is dragged wider (`stageInset`), and
 * moves only when the card's edge comes close to its centre. During a tour the
 * inset stays while the card is closed between stops, so the globe doesn't slide to and fro.
 */
function rightInset(state: ReturnType<typeof useStore.getState>): number {
  if (window.matchMedia?.(STACKED_QUERY).matches) return 0;
  const open = state.selectedId !== null || state.groupId !== null || state.tour !== null;
  return open ? stageInset(state.cardWidth) : 0;
}

/** What a route is and where it comes from, when it is tapped. */
function routePopup(route: (typeof ROUTES)[number]): maplibregl.Popup {
  const el = document.createElement("div");
  const h = document.createElement("strong");
  h.textContent = route.name;
  const p = document.createElement("p");
  p.textContent = route.description;
  const note = document.createElement("div");
  note.className = "muted";
  note.append("Joins dated sites on the globe (each card has its source); the line between them is a sketch. Route: ");
  const a = document.createElement("a");
  a.href = route.source.url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = route.source.label;
  note.append(a);
  el.append(h, p, note);
  return new maplibregl.Popup({ className: "route-popup", maxWidth: "320px", focusAfterOpen: false }).setDOMContent(el);
}

const MINI_MS = 600;

/**
 * Shrinks the map into a small round window (or puts it back): no second map, just the same one
 * scaled down by the GPU and clipped to a circle around the globe, above the picture viewer. The
 * camera is untouched, so the globe comes back exactly as it was. Follows the camera while small
 * (a tour's flight may still be landing when the viewer opens).
 */
function miniGlobe(map: maplibregl.Map, wrap: HTMLElement) {
  let on = false;
  let settle = 0;
  const place = () => {
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const { left = 0, right = 0, top = 0, bottom = 0 } = map.getPadding();
    // The globe is centred in the padded area; its radius in px is 512 · 2^zoom / 2π.
    const cx = left + (w - left - right) / 2;
    const cy = top + (h - top - bottom) / 2;
    const radius = (512 * 2 ** map.getZoom()) / (2 * Math.PI);
    // Zoomed in, the globe overflows the screen: show a round window on its middle instead.
    const r = Math.min(radius * 1.02, 0.45 * Math.min(w, h));
    const k = MINI_GLOBE.size / 2 / r;
    const tx = MINI_GLOBE.left + MINI_GLOBE.size / 2 - cx * k;
    const ty = MINI_GLOBE.top + MINI_GLOBE.size / 2 - cy * k;
    wrap.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    wrap.style.clipPath = `circle(${r}px at ${cx}px ${cy}px)`;
  };
  const onMove = () => on && place();
  map.on("move", onMove);
  map.on("resize", onMove);
  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const set = (next: boolean) => {
    if (next === on) return;
    on = next;
    clearTimeout(settle);
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const all = `circle(${Math.hypot(w, h)}px at ${w / 2}px ${h / 2}px)`;
    const ms = reduceMotion() ? 0 : MINI_MS;
    if (on) {
      // From full size (no transition), then glide into the corner.
      wrap.style.transition = "none";
      wrap.style.transformOrigin = "0 0";
      wrap.style.clipPath = all;
      wrap.classList.add("mini");
      void wrap.offsetWidth;
      wrap.style.transition = `transform ${ms}ms cubic-bezier(0.3, 0.7, 0.2, 1), clip-path ${ms}ms cubic-bezier(0.3, 0.7, 0.2, 1)`;
      place();
      // Once there, follow the camera directly.
      settle = window.setTimeout(() => (wrap.style.transition = "none"), ms);
    } else {
      // Back to full size, under the page again at once (the viewer has gone).
      wrap.classList.remove("mini");
      wrap.style.transition = `transform ${ms}ms ease, clip-path ${ms}ms ease`;
      wrap.style.transform = "";
      wrap.style.clipPath = all;
      settle = window.setTimeout(() => {
        wrap.style.transition = "";
        wrap.style.clipPath = "";
        wrap.style.transformOrigin = "";
      }, ms);
    }
  };
  return {
    set,
    dispose: () => {
      clearTimeout(settle);
      map.off("move", onMove);
      map.off("resize", onMove);
    },
  };
}

/**
 * Opening zoom: on a large screen the globe fills most of the space above the time slider,
 * instead of a small ball in a sea of empty space. Phones keep 1.6, where the globe already
 * spans the width. (A globe's radius in px is 512 · 2^zoom / 2π.)
 */
function initialZoom(el: HTMLElement, inset: number): number {
  const usable = Math.min(el.clientWidth * 0.8, el.clientHeight - inset - 90);
  if (usable <= 0) return 1.6;
  const z = Math.log2((usable * Math.PI) / 512);
  return Math.min(2.4, Math.max(1.6, z));
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const features = useFeatures();
  const year = useStore((s) => s.year);
  const enabled = useStore((s) => s.enabled);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme = BASEMAP_THEMES[useStore.getState().basemap];
    const inset = bottomInset(container);
    const map = new maplibregl.Map({
      container,
      center: [30, 20],
      zoom: initialZoom(container, inset),
      maxZoom: 6, // no point zooming into detail the basemap (and the data) doesn't have
      attributionControl: false, // credits are in the side menu's Sources panel
      style: {
        version: 8,
        projection: { type: "globe" },
        sources: {
          // Stylised, undated basemap: modern coastlines only, no imagery. Terrain, vegetation,
          // farmland and coastlines all differed hugely over 10 million years.
          land: {
            type: "geojson",
            data: "/data/basemap/land.geojson",
            attribution: "Land outlines: Natural Earth (public domain)",
          },
          // The coastlines and ice sheets of the slider's year (map/paleo.ts), set as the year changes.
          paleo: { type: "geojson", data: EMPTY },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": theme.bg } },
          // Land then that is sea today, under today's land; today's coastline stays drawn across it.
          { id: "paleo-land", type: "fill", source: "paleo", filter: ["==", ["get", "kind"], "land"], paint: { "fill-color": theme.fill } },
          { id: "land-fill", type: "fill", source: "land", paint: { "fill-color": theme.fill } },
          // Sea then over today's land (land pressed down by the ice sheets, or higher seas).
          { id: "paleo-sea", type: "fill", source: "paleo", filter: ["==", ["get", "kind"], "sea"], paint: { "fill-color": theme.bg } },
          {
            id: "land-line",
            type: "line",
            source: "land",
            paint: { "line-color": theme.line, "line-width": 0.8 },
          },
          {
            id: "paleo-ice",
            type: "fill",
            source: "paleo",
            filter: ["==", ["get", "kind"], "ice"],
            paint: { "fill-color": theme.ice, "fill-opacity": 0.82 },
          },
          {
            id: "paleo-ice-line",
            type: "line",
            source: "paleo",
            filter: ["==", ["get", "kind"], "ice"],
            paint: { "line-color": theme.ice, "line-width": 1, "line-opacity": 0.9 },
          },
        ],
      },
    });
    map.setPadding({ top: 0, left: leftInset(), right: rightInset(useStore.getState()), bottom: inset });
    // Keep the insets in step as the window resizes (or crosses into the stacked layout).
    map.on("resize", () => {
      const bottom = bottomInset(container);
      const right = rightInset(useStore.getState());
      const left = leftInset();
      const p = map.getPadding();
      if (bottom !== p.bottom || right !== p.right || left !== p.left) map.setPadding({ ...p, bottom, right, left });
    });
    // The card opening or closing (or dragged close to the globe's centre): glide the globe to its
    // new centre (at once while dragging, so it follows the handle). Not in the middle of a flight, which
    // would stop it: then once it ends.
    const syncRight = (animate: boolean) => {
      const right = rightInset(useStore.getState());
      if (right === map.getPadding().right) return;
      const padding = { ...map.getPadding(), right };
      if (!animate) map.setPadding(padding);
      else if (map.isMoving()) map.once("moveend", () => syncRight(true));
      else {
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        map.easeTo({ padding, duration: reduceMotion ? 0 : 450 });
      }
    };
    // Fallback if the style-level projection is rejected.
    map.on("style.load", () => {
      try {
        map.setProjection({ type: "globe" });
      } catch {
        /* ignore */
      }
    });

    let loaded = false;
    let prevSelected: string | null = null;
    let raf = 0;

    // Migration routes: each one's timed line, built once the sites are loaded; redrawn as the year moves.
    let routeLines: { route: (typeof ROUTES)[number]; points: TimedPoint[] }[] | null = null;
    const applyRoutes = () => {
      const data = getData();
      if (!data) return;
      routeLines ??= ROUTES.flatMap((route) => {
        try {
          const points = timeline(route, (id) => {
            const f = data.features.find((x) => x.id === id);
            const b = data.bboxOf.get(id);
            return f && b ? { lon: b[0], lat: b[1], start_year: f.start_year, end_year: f.end_year } : undefined;
          });
          return [{ route, points }];
        } catch (e) {
          console.warn(e);
          return [];
        }
      });
      const { year, routes } = useStore.getState();
      (map.getSource("routes") as maplibregl.GeoJSONSource | undefined)?.setData(routes ? routesGeoJSON(routeLines, year) : EMPTY);
    };

    // Coastlines and ice sheets: swap the snapshot when the year crosses into another one.
    let paleoShown: string | null = null;
    const applyPaleo = () => {
      loadPaleo().then((index) => {
        const { year, paleo } = useStore.getState();
        const id = index && paleo ? snapshotAt(index, year) : null;
        if (id === paleoShown) return;
        paleoShown = id;
        (map.getSource("paleo") as maplibregl.GeoJSONSource | undefined)?.setData(id ? paleoUrl(id) : EMPTY);
      });
    };

    const applyFilters = () => {
      const { year } = useStore.getState();
      for (const d of LAYER_DEFS)
        map.setFilter(d.spec.id, timeFilter(d.category, year, d.category === "event" ? eventTolerance(year) : 0));
    };
    const applyVisibility = () => {
      const { enabled } = useStore.getState();
      for (const d of LAYER_DEFS)
        map.setLayoutProperty(d.spec.id, "visibility", enabled[d.category] ? "visible" : "none");
    };
    const applySelection = () => {
      const { selectedId } = useStore.getState();
      if (selectedId === prevSelected) return;
      if (prevSelected) map.setFeatureState({ source: SOURCE_ID, id: prevSelected }, { selected: false });
      if (selectedId) map.setFeatureState({ source: SOURCE_ID, id: selectedId }, { selected: true });
      prevSelected = selectedId;
      // A selected civilization gets its temple badge inside its territory.
      const geometry = selectedId ? getData()?.geometryOf.get(selectedId) : undefined;
      const props = selectedId ? getData()?.features.find((f) => f.id === selectedId) : undefined;
      const at = geometry ? polygonAnchor(geometry) : null;
      (map.getSource(ANCHOR_SOURCE_ID) as maplibregl.GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features:
          at && props
            ? [{ type: "Feature", geometry: { type: "Point", coordinates: at }, properties: { category: props.category, start_year: props.start_year, end_year: props.end_year } }]
            : [],
      });
    };

    const flyTo = ([w, s, e, n]: [number, number, number, number], gentle = false, turn = false) => {
      // Keep the target clear of the legend (left), info card (right) and time slider (bottom).
      // On small screens those are stacked around the globe rather than over it.
      const { clientWidth: cw, clientHeight: ch } = map.getContainer();
      const stacked = window.matchMedia?.(STACKED_QUERY).matches;
      const wide = cw > 900;
      // The card's inset becomes the map's padding with this flight (it may be opening with it).
      const mapPadding = { ...map.getPadding(), right: rightInset(useStore.getState()) };
      const padding = stacked
        ? // During a tour the compact card floats over the top of the globe (InfoPanel, info-compact).
          { top: useStore.getState().tour ? 150 : 16, bottom: 16, left: 16, right: 16 }
        : {
            top: Math.min(70, ch * 0.1),
            bottom: Math.min(230, ch * 0.3),
            // Clear of the legend (the rail's inset is in the map's padding already).
            left: wide ? Math.max(20, 340 - (mapPadding.left ?? 0)) : 20,
            // Clear of the card: beyond its inset, a margin; with no card, room for one.
            right: mapPadding.right > 0 ? 68 : wide ? 420 : 20,
          };
      // The map's own padding (the slider inset) counts towards this already.
      padding.bottom = Math.max(0, padding.bottom - (mapPadding.bottom ?? 0));
      // Frame the target for the new padding, then fly there while the padding moves to it.
      const camera = (maxZoom: number) => {
        const before = map.getPadding();
        map.setPadding(mapPadding);
        try {
          return map.cameraForBounds(
            [
              [w, s],
              [e, n],
            ],
            { padding, maxZoom },
          );
        } finally {
          map.setPadding(before);
        }
      };
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      try {
        if (turn) {
          // Era chips: turn the globe to the place(s), zooming out only if they don't fit.
          const cam = camera(map.getZoom());
          if (cam?.center) {
            map.easeTo({
              center: cam.center,
              zoom: Math.min(cam.zoom ?? map.getZoom(), map.getZoom()),
              padding: mapPadding,
              duration: reduceMotion ? 0 : 1400,
              essential: true,
            });
            return;
          }
        }
        if (gentle) {
          // Stepping through sites: glide to the next one and keep the user's zoom (at least 3).
          const cam = camera(Math.max(map.getZoom(), 3));
          if (cam?.center) {
            map.easeTo({
              center: cam.center,
              zoom: Math.min(cam.zoom ?? map.getZoom(), Math.max(map.getZoom(), 3)),
              padding: mapPadding,
              duration: reduceMotion ? 0 : 900,
              essential: true,
            });
            return;
          }
        }
        const cam = camera(4);
        if (cam?.center)
          map.flyTo({ center: cam.center, zoom: cam.zoom, padding: mapPadding, duration: reduceMotion ? 0 : 1600, essential: true });
        else map.flyTo({ center: [(w + e) / 2, (s + n) / 2], zoom: 2, padding: mapPadding });
      } catch {
        map.flyTo({ center: [(w + e) / 2, (s + n) / 2], zoom: 2 });
      }
    };

    map.on("load", () => {
      for (const [category, name] of Object.entries(ICON_IMAGE) as [keyof typeof ICON_IMAGE, string][]) {
        const image = iconImage(CATEGORY_PATH[category], CATEGORY_STYLE[category].ink);
        if (image) map.addImage(name, image.data, { pixelRatio: image.pixelRatio });
      }
      const arrow = arrowImage();
      if (arrow) map.addImage("route-arrow", arrow.data, { pixelRatio: arrow.pixelRatio, sdf: true });
      map.addSource("routes", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "routes",
        filter: ["!=", ["get", "head"], true],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "rgba(10, 14, 26, 0.7)", "line-width": 6.5 },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "routes",
        filter: ["!=", ["get", "head"], true],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["get", "color"], "line-width": 3.5 },
      });
      map.addLayer({
        id: "route-head",
        type: "symbol",
        source: "routes",
        filter: ["==", ["get", "head"], true],
        layout: {
          "icon-image": "route-arrow",
          "icon-size": 1.4,
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: { "icon-color": ["get", "color"], "icon-halo-color": "rgba(10, 14, 26, 0.8)", "icon-halo-width": 2 },
      });
      map.addSource(SOURCE_ID, { type: "geojson", data: "/data/features.geojson", promoteId: "id" });
      map.addSource(ANCHOR_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      for (const d of LAYER_DEFS) map.addLayer(d.spec);
      // The path a tour has taken so far: faint, under the epilogue's bright thread.
      map.addSource("tour-path", { type: "geojson", data: EMPTY });
      // A dark casing under the gold, so it shows on pale land as well as on the sea.
      map.addLayer({
        id: "path-casing",
        type: "line",
        source: "tour-path",
        filter: ["==", ["get", "kind"], "line"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "rgba(10, 14, 26, 0.55)", "line-width": 4.5 },
      });
      map.addLayer({
        id: "path-line",
        type: "line",
        source: "tour-path",
        filter: ["==", ["get", "kind"], "line"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": TRAIL_GOLD, "line-width": 2, "line-opacity": 0.95, "line-dasharray": [2, 1.6] },
      });
      map.addLayer({
        id: "path-stop",
        type: "circle",
        source: "tour-path",
        filter: ["==", ["get", "kind"], "stop"],
        paint: { "circle-color": TRAIL_GOLD, "circle-radius": 3.5, "circle-opacity": 0.85, "circle-stroke-color": "rgba(10, 14, 26, 0.7)", "circle-stroke-width": 1 },
      });
      map.addLayer({
        id: "path-head",
        type: "circle",
        source: "tour-path",
        filter: ["==", ["get", "kind"], "head"],
        paint: { "circle-color": "#fff4d6", "circle-radius": 6, "circle-blur": 1, "circle-opacity": 0.9 },
      });
      map.addSource("trail", { type: "geojson", data: EMPTY });
      const isLine: maplibregl.FilterSpecification = ["==", ["get", "kind"], "line"];
      const isStop: maplibregl.FilterSpecification = ["==", ["get", "kind"], "stop"];
      map.addLayer({
        id: "trail-glow",
        type: "line",
        source: "trail",
        filter: isLine,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": TRAIL_GOLD, "line-width": 14, "line-blur": 10, "line-opacity": 0.6 },
      });
      map.addLayer({
        id: "trail-line",
        type: "line",
        source: "trail",
        filter: isLine,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#fff4d6", "line-width": 2.8, "line-opacity": 1 },
      });
      map.addLayer({
        id: "trail-ripple",
        type: "circle",
        source: "trail",
        filter: isStop,
        paint: {
          "circle-color": "rgba(0, 0, 0, 0)",
          "circle-radius": ["interpolate", ["linear"], ["get", "age"], 0, 4, RIPPLE_MS, 30],
          "circle-stroke-color": TRAIL_GOLD,
          "circle-stroke-width": ["interpolate", ["linear"], ["get", "age"], 0, 3, RIPPLE_MS, 0.5],
          "circle-stroke-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.9, RIPPLE_MS, 0],
        },
      });
      map.addLayer({
        id: "trail-stop",
        type: "circle",
        source: "trail",
        filter: isStop,
        paint: {
          "circle-color": "#fff4d6",
          "circle-radius": ["interpolate", ["linear"], ["get", "age"], 0, 8, 500, 4.5],
          "circle-stroke-color": TRAIL_GOLD,
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "trail-head",
        type: "circle",
        source: "trail",
        filter: ["==", ["get", "kind"], "head"],
        paint: { "circle-color": "#fffaf0", "circle-radius": 9, "circle-blur": 1, "circle-opacity": 0.95 },
      });
      loaded = true;
      applyPath();
      if (useStore.getState().tour?.epilogue) startEpilogue(pathPoints);
      applyPaleo();
      loadData().then(applyRoutes);
      applyFilters();
      applyVisibility();
      applySelection();
    });

    map.on("click", (e) => {
      if (!loaded) return;
      // Markers count as hit within a finger's reach of the tap (less with a mouse), nearest
      // first; markers about equally near keep the layer order (events, species, cultures).
      // Territories need a direct hit, so a tap near a site never opens the land around it.
      const r = window.matchMedia?.("(pointer: coarse)").matches ? TAP_SLOP_TOUCH : TAP_SLOP_MOUSE;
      const { x, y } = e.point;
      const near = map.queryRenderedFeatures(
        [
          [x - r, y - r],
          [x + r, y + r],
        ],
        { layers: POINT_LAYERS },
      );
      const under = map.queryRenderedFeatures(e.point, { layers: INTERACTIVE_LAYERS.filter((l) => !POINT_LAYERS.includes(l)) });
      const seen = new Map<string, { props: FeatureProps; rank: number; dist: number }>();
      for (const f of [...near, ...under]) {
        const props = f.properties as unknown as FeatureProps;
        if (seen.has(props.id)) continue;
        let dist = 0;
        if (f.geometry.type === "Point") {
          const p = map.project(f.geometry.coordinates as [number, number]);
          dist = Math.hypot(p.x - x, p.y - y);
          if (dist > r * 1.5) continue; // a box corner, not within reach
        }
        seen.set(props.id, { props, rank: INTERACTIVE_LAYERS.indexOf(f.layer.id), dist });
      }
      const sorted = [...seen.values()]
        .sort((a, b) => Math.round(a.dist / 6) - Math.round(b.dist / 6) || a.rank - b.rank)
        .map((x) => x.props);
      if (sorted.length === 0) {
        useStore.getState().select(null);
        const route = map.queryRenderedFeatures(
          [
            [x - r, y - r],
            [x + r, y + r],
          ],
          { layers: ROUTE_LAYERS },
        )[0];
        const found = route && ROUTES.find((rt) => rt.id === route.properties.id);
        if (found) routePopup(found).setLngLat(e.lngLat).addTo(map);
      } else useStore.getState().select(sorted[0].id, sorted);
    });

    for (const id of [...INTERACTIVE_LAYERS, "route-line"]) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }

    // While a tour plays: the path so far, one leg added (drawn as the globe turns) as each stop's card
    // opens. Back / Next and starting from a later stop put it straight in place.
    let pathPoints: LngLat[] = [];
    let pathTour: string | null = null;
    let pathShown = 0;
    let pathRaf = 0;
    const setPath = (p: ReturnType<typeof pathSoFar>) => {
      const pt = (coordinates: LngLat, kind: string): GeoJSON.Feature => ({ type: "Feature", geometry: { type: "Point", coordinates }, properties: { kind } });
      (map.getSource("tour-path") as maplibregl.GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features: [
          ...(p.line.length > 1 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: p.line }, properties: { kind: "line" } } as GeoJSON.Feature] : []),
          ...p.stops.map((s) => pt(s, "stop")),
          ...(p.head ? [pt(p.head, "head")] : []),
        ],
      });
    };
    function applyPath() {
      const t = useStore.getState().tour;
      const d = getData();
      if (!t || !d) {
        if (pathTour === null) return;
        cancelAnimationFrame(pathRaf);
        pathTour = null;
        pathShown = 0;
        pathPoints = [];
        return setPath({ line: [], head: null, stops: [] });
      }
      if (t.id !== pathTour) {
        const tour = tourById(t.id);
        pathPoints = tour ? trailPoints(tour, d) : [];
        pathTour = t.id;
        pathShown = -1;
      }
      const reached = t.epilogue ? pathPoints.length : t.intro ? 0 : t.index + (t.phase === "hold" ? 1 : 0);
      if (reached === pathShown) return;
      cancelAnimationFrame(pathRaf);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const grow = reached === pathShown + 1 && reached > 1 && !reduceMotion;
      pathShown = reached;
      if (!grow) return setPath(pathSoFar(pathPoints, reached));
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / PATH_DRAW_MS);
        setPath(pathSoFar(pathPoints, reached, k));
        if (k < 1) pathRaf = requestAnimationFrame(step);
      };
      pathRaf = requestAnimationFrame(step);
    }

    // A tour's epilogue: draw its thread on the epilogue's clock (frozen while paused), with the
    // camera pulling back to the whole globe and following the thread's head, then turning slowly.
    // Touching the globe hands the camera back to the viewer; the thread draws on.
    let epilogueRaf = 0;
    let epilogueOff = () => {};
    const stopEpilogue = () => {
      cancelAnimationFrame(epilogueRaf);
      epilogueOff();
      epilogueOff = () => {};
      (map.getSource("trail") as maplibregl.GeoJSONSource | undefined)?.setData(EMPTY);
      // Small screens: give back the room the end card took at the top.
      if (map.getPadding().top) map.easeTo({ padding: { ...map.getPadding(), top: 0 }, duration: 450 });
    };
    /** Small screens: the end card floats over the top of the globe; the room below it (px from the map's top). */
    const endCardRoom = () => {
      if (!window.matchMedia?.(STACKED_QUERY).matches) return 0;
      const card = document.querySelector(".tour-end");
      return card ? Math.max(0, Math.round(card.getBoundingClientRect().bottom - container!.getBoundingClientRect().top)) : 0;
    };
    function startEpilogue(points: LngLat[]) {
      stopEpilogue();
      const path = trail(points);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const fullZoom = Math.max(1.2, initialZoom(container!, bottomInset(container!)) - 0.25);
      // The whole globe, or (small screens) as much as fits under the end card.
      const wholeGlobe = (top: number) => {
        if (!top) return fullZoom;
        const room = Math.min(container!.clientWidth * 0.92, container!.clientHeight - top - 24);
        return room > 0 ? Math.min(fullZoom, Math.log2((room * Math.PI) / 512)) : fullZoom;
      };
      let follow = !reduceMotion;
      const release = () => (follow = false);
      const events = ["mousedown", "touchstart", "wheel", "dragstart"] as const;
      for (const e of events) map.on(e, release);
      epilogueOff = () => events.forEach((e) => map.off(e, release));
      if (reduceMotion)
        requestAnimationFrame(() => {
          const top = endCardRoom();
          map.jumpTo({ zoom: wholeGlobe(top), padding: { ...map.getPadding(), top } });
        });
      let elapsed = reduceMotion ? path.end + 60_000 : 0;
      let spin = 0;
      let last = performance.now();
      const frame = (now: number) => {
        const dt = Math.min(100, now - last);
        last = now;
        const tour = useStore.getState().tour;
        if (!tour?.epilogue) return;
        const running = !tour.paused;
        if (running) elapsed += dt;
        const f = path.at(elapsed);
        (map.getSource("trail") as maplibregl.GeoJSONSource | undefined)?.setData(trailGeoJSON(f));
        // Not while the last stop's flight (or the card's padding) is still easing: it would stop it.
        if (follow && running && !map.isEasing()) {
          const c = map.getCenter();
          const z = map.getZoom();
          let lng = c.lng;
          let lat = c.lat;
          // Turn to the first stop, follow the thread's head, then settle on the last stop before turning.
          const reached = f.reached[f.reached.length - 1];
          const toward = elapsed < path.end + SETTLE_MS ? (f.head ?? reached?.at ?? points[0]) : null;
          if (toward) {
            // Keeping the globe's middle nearer the equator; quicker at first, to reach the first stop in time.
            const k = 1 - Math.exp(-dt / (reached ? FOLLOW_MS : FIRST_TURN_MS));
            lng += ((((toward[0] - lng + 180) % 360) + 360) % 360 - 180) * k;
            lat += (toward[1] * 0.6 - lat) * k;
          } else {
            // Drawn: the globe turns slowly under the thread, easing in, and comes to rest once the music has gone.
            spin += ((tour.done ? 0 : 1) - spin) * (1 - Math.exp(-dt / 2_500));
            lng -= SPIN_DEG_S * spin * (dt / 1000);
          }
          const room = endCardRoom();
          const kz = 1 - Math.exp(-dt / ZOOM_MS);
          const p = map.getPadding();
          const pTop = p.top ?? 0;
          map.jumpTo({
            center: [lng, lat],
            zoom: z + (wholeGlobe(room) - z) * kz,
            padding: { ...p, top: Math.abs(room - pTop) < 1 ? room : pTop + (room - pTop) * kz },
          });
        }
        epilogueRaf = requestAnimationFrame(frame);
      };
      epilogueRaf = requestAnimationFrame(frame);
    }

    const mini = miniGlobe(map, container.parentElement!);
    if (useStore.getState().miniGlobe) mini.set(true);

    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.miniGlobe !== prev.miniGlobe) mini.set(state.miniGlobe);
      if (state.basemap !== prev.basemap) {
        const t = BASEMAP_THEMES[state.basemap];
        map.setPaintProperty("bg", "background-color", t.bg);
        map.setPaintProperty("land-fill", "fill-color", t.fill);
        map.setPaintProperty("land-line", "line-color", t.line);
        map.setPaintProperty("paleo-land", "fill-color", t.fill);
        map.setPaintProperty("paleo-sea", "fill-color", t.bg);
        map.setPaintProperty("paleo-ice", "fill-color", t.ice);
        map.setPaintProperty("paleo-ice-line", "line-color", t.ice);
      }
      if (state.year !== prev.year || state.enabled !== prev.enabled) {
        // Auto-deselect if the selected entity is no longer visible.
        if (state.selectedId) {
          const sel = state.hits.find((h) => h.id === state.selectedId);
          if (sel && (!state.enabled[sel.category] || !isActive(sel, state.year))) {
            useStore.getState().select(null);
          }
        }
      }
      const cardChanged =
        state.cardWidth !== prev.cardWidth ||
        (state.selectedId !== null || state.groupId !== null) !== (prev.selectedId !== null || prev.groupId !== null) ||
        (state.tour !== null) !== (prev.tour !== null);
      // A flight in this same change takes the new inset with it.
      if (cardChanged && !(state.flyTo && state.flyTo !== prev.flyTo)) syncRight(!document.body.classList.contains("card-resizing"));
      if (state.flyTo && state.flyTo !== prev.flyTo) {
        const { bbox, gentle, turn } = state.flyTo;
        // On small screens the info card opening resizes the globe; frame the target in the new size.
        if (window.matchMedia?.(STACKED_QUERY).matches)
          requestAnimationFrame(() => {
            map.resize();
            flyTo(bbox, gentle, turn);
          });
        else flyTo(bbox, gentle, turn);
      }
      if (!loaded) return;
      if (state.tour !== prev.tour) {
        applyPath();
        const epilogue = state.tour?.epilogue ? state.tour.id : null;
        if (epilogue !== (prev.tour?.epilogue ? prev.tour.id : null)) {
          if (epilogue) startEpilogue(pathPoints);
          else stopEpilogue();
        }
      }
      if (state.year !== prev.year) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(applyFilters);
      }
      if (state.year !== prev.year || state.paleo !== prev.paleo) applyPaleo();
      if (state.year !== prev.year || state.routes !== prev.routes) applyRoutes();
      if (state.enabled !== prev.enabled) applyVisibility();
      if (state.selectedId !== prev.selectedId) applySelection();
    });

    return () => {
      unsubscribe();
      stopEpilogue();
      cancelAnimationFrame(pathRaf);
      mini.dispose();
      cancelAnimationFrame(raf);
      map.remove();
    };
  }, []);

  // Make sure the data is fetched even if the map fails to start; until it's here, say so.
  const [loading, setLoading] = useState<"loading" | "done" | "failed">(() => (getData() ? "done" : "loading"));
  useEffect(() => {
    loadData().then((d) => setLoading(d ? "done" : "failed"));
  }, []);

  const anyActive = features.some((f) => enabled[f.category] && isActive(f, year));
  const showEmpty = features.length > 0 && !anyActive;

  return (
    <div className="map-wrap">
      <SpaceBackground />
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {loading !== "done" && (
        <div className="empty-state loading-state" role="status">
          {loading === "loading" ? (
            <>
              <span className="loading-spinner" aria-hidden="true" /> Loading the atlas…
            </>
          ) : (
            "The atlas couldn't load. Check your connection and refresh the page."
          )}
        </div>
      )}
      {showEmpty && (
        <div className="empty-state">No mapped entities at this point in time.</div>
      )}
    </div>
  );
}

