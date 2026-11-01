import { create } from "zustand";

/**
 * Which sky object's details are open (sky/SkyObjects.tsx, SkyHits): kept apart from the main store so the
 * store can open one (stepping through what is on the globe now, `stepNow`) without an import cycle.
 */
export const useSkyOpen = create<{ open: string | null; setOpen: (id: string | null) => void }>((set) => ({
  open: null,
  setOpen: (open) => set({ open }),
}));
