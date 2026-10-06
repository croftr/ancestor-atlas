import { create } from "zustand";
import { CATEGORIES, type Category, type FeatureProps } from "./types";
import { snapYear, stepYear } from "./time/scale";
import { getData } from "./map/data";

interface AppState {
  year: number;
  enabled: Record<Category, boolean>;
  selectedId: string | null;
  hits: FeatureProps[];
  /** Entity whose group view is open (a group has no feature to select). */
  groupId: string | null;
  playing: boolean;
  setYear(y: number): void;
  toggleCategory(c: Category): void;
  select(id: string | null, hits?: FeatureProps[]): void;
  openGroup(entityId: string): void;
  /** Set the slider to the entity's start and select its earliest feature. */
  jumpTo(entityId: string): void;
  setPlaying(p: boolean): void;
}

export const useStore = create<AppState>((set) => ({
  year: -1_799_999,
  enabled: Object.fromEntries(CATEGORIES.map((c) => [c, true])) as Record<Category, boolean>,
  selectedId: null,
  hits: [],
  groupId: null,
  playing: false,
  setYear: (y) => set({ year: snapYear(y) }),
  toggleCategory: (c) => set((s) => ({ enabled: { ...s.enabled, [c]: !s.enabled[c] } })),
  select: (id, hits) =>
    set((s) => ({ selectedId: id, groupId: null, hits: id === null ? [] : (hits ?? s.hits) })),
  openGroup: (entityId) => set({ selectedId: null, hits: [], groupId: entityId }),
  jumpTo: (entityId) => {
    const f = getData()?.featuresOf.get(entityId)?.[0];
    if (!f) return;
    let year = snapYear(f.start_year);
    if (year < f.start_year) year = stepYear(year, 1);
    if (year > f.end_year) year = f.start_year; // very short feature between slider steps
    set((s) => ({
      year,
      enabled: { ...s.enabled, [f.category]: true },
      selectedId: f.id,
      groupId: null,
      hits: [f],
    }));
  },
  setPlaying: (p) => set({ playing: p }),
}));
