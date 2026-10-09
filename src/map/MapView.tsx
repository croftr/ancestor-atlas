import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useStore } from "../store";
import { BASEMAP_THEMES, STACKED_QUERY } from "../config";
import { type FeatureProps } from "../types";
import { INTERACTIVE_LAYERS, LAYER_DEFS, SOURCE_ID, timeFilter } from "./layers";
import { eventTolerance, isActive, loadData, useFeatures } from "./data";

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
    map.setPadding({ top: 0, left: 0, right: 0, bottom: inset });
    // Keep that inset in step as the window resizes (or crosses into the stacked layout).
    map.on("resize", () => {
      const bottom = bottomInset(container);
      if (bottom !== map.getPadding().bottom) map.setPadding({ ...map.getPadding(), bottom });
    });
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
    };

    const flyTo = ([w, s, e, n]: [number, number, number, number], gentle = false) => {
      // Keep the target clear of the legend (left), info card (right) and time slider (bottom).
      // On small screens those are stacked around the globe rather than over it.
      const { clientWidth: cw, clientHeight: ch } = map.getContainer();
      const stacked = window.matchMedia?.(STACKED_QUERY).matches;
      const wide = cw > 900;
      const padding = stacked
        ? { top: 16, bottom: 16, left: 16, right: 16 }
        : {
            top: Math.min(70, ch * 0.1),
            bottom: Math.min(230, ch * 0.3),
            left: wide ? 340 : 20,
            right: wide ? 420 : 20,
          };
      // The map's own padding (the slider inset) counts towards this already.
      padding.bottom = Math.max(0, padding.bottom - (map.getPadding().bottom ?? 0));
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      try {
        if (gentle) {
          // Stepping through sites: glide to the next one and keep the user's zoom (at least 3).
          const cam = map.cameraForBounds(
            [
              [w, s],
              [e, n],
            ],
            { padding, maxZoom: Math.max(map.getZoom(), 3) },
          );
          if (cam?.center) {
            map.easeTo({
              center: cam.center,
              zoom: Math.min(cam.zoom ?? map.getZoom(), Math.max(map.getZoom(), 3)),
              duration: reduceMotion ? 0 : 900,
              essential: true,
            });
            return;
          }
        }
        map.fitBounds(
          [
            [w, s],
            [e, n],
          ],
          { padding, maxZoom: 4, duration: reduceMotion ? 0 : 1600, essential: true },
        );
      } catch {
        map.flyTo({ center: [(w + e) / 2, (s + n) / 2], zoom: 2 });
      }
    };

    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: "/data/features.geojson", promoteId: "id" });
      for (const d of LAYER_DEFS) map.addLayer(d.spec);
      loaded = true;
      applyFilters();
      applyVisibility();
      applySelection();
    });

    map.on("click", (e) => {
      if (!loaded) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: INTERACTIVE_LAYERS });
      const seen = new Map<string, { props: FeatureProps; rank: number }>();
      for (const f of feats) {
        const props = f.properties as unknown as FeatureProps;
        if (seen.has(props.id)) continue;
        seen.set(props.id, { props, rank: INTERACTIVE_LAYERS.indexOf(f.layer.id) });
      }
      const sorted = [...seen.values()].sort((a, b) => a.rank - b.rank).map((x) => x.props);
      if (sorted.length === 0) useStore.getState().select(null);
      else useStore.getState().select(sorted[0].id, sorted);
    });

    for (const id of INTERACTIVE_LAYERS) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }

    const unsubscribe = useStore.subscribe((state, prev) => {
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
      if (state.flyTo && state.flyTo !== prev.flyTo) {
        const { bbox, gentle } = state.flyTo;
        // On small screens the info card opening resizes the globe; frame the target in the new size.
        if (window.matchMedia?.(STACKED_QUERY).matches)
          requestAnimationFrame(() => {
            map.resize();
            flyTo(bbox, gentle);
          });
        else flyTo(bbox, gentle);
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
      cancelAnimationFrame(raf);
      map.remove();
    };
  }, []);

  // Make sure the data is fetched even if the map fails to start.
  useEffect(() => {
    loadData();
  }, []);

  const anyActive = features.some((f) => enabled[f.category] && isActive(f, year));
  const showEmpty = features.length > 0 && !anyActive;

  return (
    <div className="map-wrap">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {showEmpty && (
        <div className="empty-state">No mapped entities at this point in time.</div>
      )}
    </div>
  );
}

