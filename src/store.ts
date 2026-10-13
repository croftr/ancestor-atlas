import { create } from "zustand";
import { CATEGORIES, type Category, type FeatureProps } from "./types";
import { snapYear } from "./time/scale";
import { getData, isActive, unionBBox, type BBox } from "./map/data";
import { bestYear, navOrder, sliderYearFor } from "./search/search";
import { BASEMAP_THEMES, DEFAULT_BASEMAP } from "./config";
import { tourById } from "./tours/tours";

const BASEMAP_KEY = "history-globe.basemap";

function loadBasemap(): string {
  try {
    const v = localStorage.getItem(BASEMAP_KEY);
    if (v && BASEMAP_THEMES[v]) return v;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_BASEMAP;
}

const isIntroHash = () =>
  typeof window !== "undefined" && /^(#\/?(intro|about))$/i.test(window.location.hash);

interface AppState {
  year: number;
  enabled: Record<Category, boolean>;
  selectedId: string | null;
  hits: FeatureProps[];
  /** Entity whose group view is open (a group has no feature to select). */
  groupId: string | null;
  playing: boolean;
  basemap: string;
  introOpen: boolean;
  /** Camera request for the map; a new object each time so repeated requests still fire. */
  /** `gentle`: pan there without zooming out (stepping through sites). */
  /** `turn`: rotate the globe to it without zooming in (era chips). */
  flyTo: { bbox: BBox; gentle?: boolean; turn?: boolean } | null;
  /**
   * The guided tour playing, if any (tours/tours.ts; run by tours/TourPlayer.tsx). `travel`: play the
   * slider forward to this stop rather than cutting to it. `phase` and `holdMs` drive the tour bar.
   * `restore`: the viewer's layers before the tour, put back when it ends.
   */
  tour: {
    id: string;
    index: number;
    travel: boolean;
    paused: boolean;
    phase: "travel" | "hold";
    holdMs: number;
    restore: Record<Category, boolean>;
  } | null;
  setYear(y: number): void;
  toggleCategory(c: Category): void;
  select(id: string | null, hits?: FeatureProps[]): void;
  openGroup(entityId: string): void;
  /** Set the slider to the entity's start and select its earliest feature. */
  jumpTo(entityId: string): void;
  /**
   * Show an entity from anywhere (search): open its card, move the slider to when most of it is
   * on the map, and fly the globe to it.
   */
  focusEntity(entityId: string): void;
  /**
   * Move the slider to `year` (default: the entity's best year) and turn the globe to the entity's
   * features on the map then; `open` also opens the card. Used by the era chips and tours.
   */
  showEntity(entityId: string, opts?: { year?: number; open?: boolean }): void;
  startTour(id: string): void;
  /** End the tour and put the viewer's layers back. */
  stopTour(): void;
  pauseTour(paused: boolean): void;
  /** Cut straight to a stop (Back / Next). */
  tourGo(index: number): void;
  /** Select the next/previous feature of the selected entity (moving the slider if needed). */
  stepFeature(dir: 1 | -1): void;
  setPlaying(p: boolean): void;
  setBasemap(name: string): void;
  setIntroOpen(open: boolean): void;
}

export const useStore = create<AppState>((set, get) => ({
  year: -1_799_999,
  enabled: Object.fromEntries(CATEGORIES.map((c) => [c, true])) as Record<Category, boolean>,
  selectedId: null,
  hits: [],
  groupId: null,
  playing: false,
  basemap: loadBasemap(),
  introOpen: isIntroHash(),
  flyTo: null,
  tour: null,
  setYear: (y) => set((s) => ({ year: snapYear(y), ...(s.tour && { tour: { ...s.tour, paused: true } }) })),
  toggleCategory: (c) => set((s) => ({ enabled: { ...s.enabled, [c]: !s.enabled[c] } })),
  setIntroOpen: (open) => {
    if (!open && isIntroHash()) {
      window.location.hash = "#/";
    }
    set({ introOpen: open });
  },
  select: (id, hits) =>
    set((s) => ({ selectedId: id, groupId: null, hits: id === null ? [] : (hits ?? s.hits) })),
  openGroup: (entityId) => set({ selectedId: null, hits: [], groupId: entityId }),
  jumpTo: (entityId) => {
    const d = getData();
    const f = d?.featuresOf.get(entityId)?.[0];
    if (!f) return;
    const bbox = d!.bboxOf.get(f.id);
    set((s) => ({
      year: sliderYearFor(f),
      enabled: { ...s.enabled, [f.category]: true },
      selectedId: f.id,
      groupId: null,
      hits: [f],
      flyTo: bbox ? { bbox } : s.flyTo,
    }));
  },
  focusEntity: (entityId) => {
    const d = getData();
    const entity = d?.entityById.get(entityId);
    if (!d || !entity) return;
    // A group has no features of its own: use its children's.
    const features = entity.group
      ? (d.childrenOf.get(entityId) ?? [])
          .flatMap((k) => d.featuresOf.get(k.id) ?? [])
          .sort((a, b) => a.start_year - b.start_year)
      : (d.featuresOf.get(entityId) ?? []);
    const best = bestYear(features);
    const boxes = (best?.active ?? []).flatMap((f): BBox[] => {
      const b = d.bboxOf.get(f.id);
      return b ? [b] : [];
    });
    const bbox = unionBBox(boxes);
    set((s) => ({
      playing: false,
      ...(best && {
        year: best.year,
        enabled: { ...s.enabled, ...Object.fromEntries(best.active.map((f) => [f.category, true])) },
      }),
      ...(entity.group || !best
        ? { selectedId: null, hits: [], groupId: entityId }
        : { selectedId: best.active[0].id, hits: best.active, groupId: null }),
      flyTo: bbox ? { bbox } : s.flyTo,
    }));
  },
  showEntity: (entityId, opts = {}) => {
    const d = getData();
    const entity = d?.entityById.get(entityId);
    if (!d || !entity) return;
    const features = d.featuresOf.get(entityId) ?? [];
    const year = snapYear(opts.year ?? entity.year ?? bestYear(features)?.year ?? entity.start_year);
    const on = features.filter((f) => isActive(f, year));
    const bbox = unionBBox(
      on.flatMap((f): BBox[] => {
        const b = d.bboxOf.get(f.id);
        return b ? [b] : [];
      }),
    );
    set((s) => ({
      playing: false,
      year,
      enabled: { ...s.enabled, [entity.category]: true },
      ...(opts.open && on.length > 0 && { selectedId: on[0].id, hits: on, groupId: null }),
      flyTo: bbox ? { bbox, turn: true } : s.flyTo,
    }));
  },
  startTour: (id) => {
    const t = tourById(id);
    if (!t) return;
    set((s) => ({
      playing: false,
      selectedId: null,
      hits: [],
      groupId: null,
      enabled: t.layers ? (Object.fromEntries(CATEGORIES.map((c) => [c, t.layers!.includes(c)])) as Record<Category, boolean>) : s.enabled,
      tour: { id, index: 0, travel: true, paused: false, phase: "travel", holdMs: 0, restore: s.tour?.restore ?? s.enabled },
    }));
  },
  stopTour: () => set((s) => (s.tour ? { tour: null, enabled: s.tour.restore } : {})),
  pauseTour: (paused) => set((s) => (s.tour && s.tour.paused !== paused ? { tour: { ...s.tour, paused } } : {})),
  tourGo: (index) =>
    set((s) => {
      const t = s.tour && tourById(s.tour.id);
      if (!s.tour || !t || index < 0 || index >= t.stops.length) return {};
      return { tour: { ...s.tour, index, travel: false, phase: "travel", holdMs: 0 } };
    }),
  stepFeature: (dir) => {
    const d = getData();
    const s = get();
    const cur = s.hits.find((h) => h.id === s.selectedId);
    const all = cur && d?.featuresOf.get(cur.entity_id);
    if (!d || !cur || !all || all.length < 2) return;
    const order = navOrder(all, d.bboxOf);
    const i = order.findIndex((f) => f.id === cur.id);
    const next = order[(i + dir + order.length) % order.length];
    const bbox = d.bboxOf.get(next.id);
    const onNow = next.start_year <= s.year && s.year <= next.end_year;
    set({
      playing: false,
      year: onNow ? s.year : sliderYearFor(next),
      enabled: { ...s.enabled, [next.category]: true },
      selectedId: next.id,
      groupId: null,
      hits: [next],
      flyTo: bbox ? { bbox, gentle: true } : s.flyTo,
    });
  },
  setPlaying: (p) => set((s) => ({ playing: p, ...(p && s.tour && { tour: null, enabled: s.tour.restore }) })),
  setBasemap: (name) => {
    if (!BASEMAP_THEMES[name]) return;
    try {
      localStorage.setItem(BASEMAP_KEY, name);
    } catch {
      /* storage unavailable */
    }
    set({ basemap: name });
  },
}));
