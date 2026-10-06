import { create } from "zustand";
import { CATEGORIES, type Category, type EntityProps } from "./types";
import { snapYear } from "./time/scale";

interface AppState {
  year: number;
  enabled: Record<Category, boolean>;
  selectedId: string | null;
  hits: EntityProps[];
  playing: boolean;
  setYear(y: number): void;
  toggleCategory(c: Category): void;
  select(id: string | null, hits?: EntityProps[]): void;
  setPlaying(p: boolean): void;
}

export const useStore = create<AppState>((set) => ({
  year: -1_799_999,
  enabled: Object.fromEntries(CATEGORIES.map((c) => [c, true])) as Record<Category, boolean>,
  selectedId: null,
  hits: [],
  playing: false,
  setYear: (y) => set({ year: snapYear(y) }),
  toggleCategory: (c) => set((s) => ({ enabled: { ...s.enabled, [c]: !s.enabled[c] } })),
  select: (id, hits) => set((s) => ({ selectedId: id, hits: id === null ? [] : (hits ?? s.hits) })),
  setPlaying: (p) => set({ playing: p }),
}));
