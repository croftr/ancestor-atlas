import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useStore } from "../store";
import { BASEMAP_THEMES } from "../config";
import { type FeatureProps } from "../types";
import { INTERACTIVE_LAYERS, LAYER_DEFS, SOURCE_ID, timeFilter } from "./layers";
import { isActive, loadData, useFeatures } from "./data";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const features = useFeatures();
  const year = useStore((s) => s.year);
  const enabled = useStore((s) => s.enabled);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme = BASEMAP_THEMES[useStore.getState().basemap];
    const map = new maplibregl.Map({
      container,
      center: [30, 20],
      zoom: 1.6,
      maxZoom: 6, // no point zooming into detail the basemap (and the data) doesn't have
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
    map.addControl(new maplibregl.NavigationControl(), "top-right");
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
      for (const d of LAYER_DEFS) map.setFilter(d.spec.id, timeFilter(d.category, year));
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
      const { clientWidth: cw, clientHeight: ch } = map.getContainer();
      const wide = cw > 900;
      const padding = {
        top: Math.min(70, ch * 0.1),
        bottom: Math.min(230, ch * 0.3),
        left: wide ? 340 : 20,
        right: wide ? 420 : 20,
      };
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
      if (state.flyTo && state.flyTo !== prev.flyTo) flyTo(state.flyTo.bbox, state.flyTo.gentle);
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
    <>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {showEmpty && (
        <div className="empty-state">No mapped entities at this point in time.</div>
      )}
    </>
  );
}

