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
import { cardWidthPx } from "../ui/cardWidth";

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

/**
 * Large screens: the width the info card covers on the right, kept as the map's right padding so
 * the globe centres in the space left of it (and follows its resize handle). During a tour the
 * inset stays while the card is closed between stops, so the globe doesn't slide to and fro.
 */
function rightInset(state: ReturnType<typeof useStore.getState>): number {
  if (window.matchMedia?.(STACKED_QUERY).matches) return 0;
  const open = state.selectedId !== null || state.groupId !== null || state.tour !== null;
  return open ? cardWidthPx(state.cardWidth) : 0;
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
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": theme.bg } },
          { id: "land-fill", type: "fill", source: "land", paint: { "fill-color": theme.fill } },
          {
            id: "land-line",
            type: "line",
            source: "land",
            paint: { "line-color": theme.line, "line-width": 0.8 },
          },
        ],
      },
    });
    map.setPadding({ top: 0, left: 0, right: rightInset(useStore.getState()), bottom: inset });
    // Keep the insets in step as the window resizes (or crosses into the stacked layout).
    map.on("resize", () => {
      const bottom = bottomInset(container);
      const right = rightInset(useStore.getState());
      const p = map.getPadding();
      if (bottom !== p.bottom || right !== p.right) map.setPadding({ ...p, bottom, right });
    });
    // The card opening, closing or being resized: glide the globe to the centre of the space left
    // (at once while dragging, so it follows the handle). Not in the middle of a flight, which
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
            left: wide ? 340 : 20,
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
      map.addSource(SOURCE_ID, { type: "geojson", data: "/data/features.geojson", promoteId: "id" });
      map.addSource(ANCHOR_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      for (const d of LAYER_DEFS) map.addLayer(d.spec);
      loaded = true;
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
      if (sorted.length === 0) useStore.getState().select(null);
      else useStore.getState().select(sorted[0].id, sorted);
    });

    for (const id of INTERACTIVE_LAYERS) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
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
      if (state.year !== prev.year) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(applyFilters);
      }
      if (state.enabled !== prev.enabled) applyVisibility();
      if (state.selectedId !== prev.selectedId) applySelection();
    });

    return () => {
      unsubscribe();
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

