// The promo's app shots (docs/promo-video.md), filmed by film.ts. Each function runs inside the page (sent as
// source, so it may use only its arguments): `ctx.store` is the app's Zustand store, `ctx.map` the MapLibre map,
// `ctx.film` the virtual clock and `ctx.promo` the helpers in page.js. `frame(ctx, t, u)` runs every frame, with
// `t` the seconds into the shot and `u` the fraction of it; cue times are seconds into the shot. Camera moves are
// set frame by frame (jumpTo), so they never depend on the app's own animation timing.

export interface Ctx {
  store: any;
  map: any;
  film: { now: number; step(ms: number): Promise<void>; settle(): Promise<void> };
  promo: any;
}

export interface AppShot {
  /** Page to open (default the globe, "#/"). */
  hash?: string;
  /** localStorage before the app loads (settings it remembers). */
  storage?: Record<string, string>;
  /** Parts of the interface to hide (CSS selectors). */
  hide?: string[];
  /** Before filming: the state the shot opens on. */
  setup?: (ctx: Ctx) => unknown;
  /** Seconds to let the setup settle before the first frame (default 2). */
  warmup?: number;
  /** Seconds into the shot; a negative time runs during the warm-up, that long before the first frame. */
  cues?: { at: number; run: (ctx: Ctx) => unknown }[];
  frame?: (ctx: Ctx, t: number, u: number) => unknown;
  /** Length in seconds; by default the shot's length in timeline.ts plus a handle. */
  seconds?: number;
}

/** Everything but the globe. */
const BARE = [".side-nav", ".search", ".legend-dock", ".time-slider"];
/** The globe with the time slider and rail, as someone exploring sees it. */
const EXPLORE = [".search", ".legend-dock"];

export const APP_SHOTS: Record<string, AppShot> = {
  // 4. Title: the globe turning in space, Africa coming round; the title goes over it in the edit.
  "4": {
    hide: BARE,
    setup: ({ store }) => store.getState().setYear(-300_000),
    // Bottom padding raises the globe, leaving room for the title under it.
    frame: ({ map }, t) => map.jumpTo({ center: [2 + 5 * t, 6], zoom: 2.15, padding: { top: 0, bottom: 330, left: 0, right: 0 } }),
  },

  // 5. Seven million years: the slider sweeps from the first hominins to the Ice Age; points spread from Africa.
  "5": {
    hide: EXPLORE,
    setup: ({ store }) => store.getState().setYear(-6_999_999),
    frame: ({ store, map, promo }, _t, u) => {
      store.getState().setYear(promo.sweep(-6_999_999, -60_000, promo.easeInOut(u)));
      map.jumpTo({ center: [22 + 30 * u, 12 + 6 * u], zoom: 2.2 });
    },
  },

  // 6. The ice sheets grow and the seas fall: from the last warm spell to the Last Glacial Maximum, North Atlantic.
  "6": {
    hide: [".search", ".legend", ".dna-panel"],
    setup: ({ store }) => store.getState().setYear(-77_999),
    frame: ({ store, map, promo }, _t, u) => {
      store.getState().setYear(promo.sweep(-77_999, -19_049, promo.easeInOut(u)));
      map.jumpTo({ center: [-38 + 14 * u, 40], zoom: 2.15 });
    },
  },

  // 7. Out of Africa: the routes grow as the slider moves, the globe turning east with them.
  "7": {
    hide: EXPLORE,
    setup: ({ store }) => {
      store.getState().setRoutes(true);
      store.getState().setYear(-89_999);
    },
    frame: ({ store, map, promo }, _t, u) => {
      store.getState().setYear(promo.sweep(-89_999, -39_999, u));
      map.jumpTo({ center: [40 + 45 * u, 18 - 6 * u], zoom: 2.2 });
    },
  },

  // 8. Interbreeding: Neanderthal and Denisovan gene flow into modern humans, about 50,000 years ago.
  "8": {
    hide: EXPLORE,
    setup: ({ store }) => {
      store.getState().setGeneFlow(true);
      store.getState().setYear(-49_999);
    },
    frame: ({ map }, _t, u) => map.jumpTo({ center: [52 + 28 * u, 28 - 6 * u], zoom: 2.7 }),
  },

  // 9. The family tree (species page).
  "9": {
    hash: "#/species",
    storage: { "species-layout": "tree" },
    warmup: 3,
  },

  // 10. Thousands of real sites: farming cultures spreading across Europe, then a culture card opens.
  "10": {
    hide: EXPLORE,
    setup: ({ store }) => store.getState().setYear(-6_999),
    frame: ({ store, map, promo }, t) => {
      if (t < 3.6) store.getState().setYear(promo.sweep(-6_999, -4_999, promo.easeInOut(t / 3.6)));
      map.jumpTo({ center: [16 - 2 * (t / 6.5), 47], zoom: 3.3 });
    },
    cues: [{ at: 3.8, run: ({ store }) => store.getState().showEntity("linear-pottery", { open: true, year: -4_999 }) }],
  },

  // 11. Civilizations: territories from the first cities to Rome.
  "11": {
    hide: EXPLORE,
    setup: ({ store }) => store.getState().setYear(-2_999),
    frame: ({ store, map, promo }, _t, u) => {
      store.getState().setYear(promo.sweep(-2_999, -99, u));
      map.jumpTo({ center: [30 - 8 * u, 33], zoom: 2.9 });
    },
  },

  // 12. Ancient DNA: father's lines over Europe as the steppe herders arrive.
  "12": {
    hide: [".search", ".legend", ".climate-panel"],
    storage: { "history-globe.dna-colour": "y" },
    setup: ({ store }) => {
      store.getState().setDna(true);
      store.getState().setDnaColour("y");
      store.getState().setYear(-4_999);
    },
    frame: ({ store, map, promo }, _t, u) => {
      store.getState().setYear(promo.sweep(-4_999, -1_999, u));
      map.jumpTo({ center: [18 + 6 * u, 50], zoom: 3.1 });
    },
  },

  // 13. The Tours page, then a tour's title card.
  "13": {
    hash: "#/tours",
    warmup: 3,
    cues: [
      {
        at: 1.4,
        run: ({ store }) => {
          location.hash = "#/";
          store.getState().startTour("out-of-africa");
        },
      },
    ],
  },

  // 14. A narrated tour stop: the slider travels ("… years later"), the globe turns, the card opens.
  "14": {
    warmup: 2,
    cues: [{ at: 0.1, run: ({ store }) => store.getState().startTour("out-of-africa", { index: 6 }) }],
    setup: ({ store }) => store.getState().setYear(-64_999),
  },

  // 15a. The full-screen picture viewer during a stop.
  "15a": {
    seconds: 3.5,
    warmup: 12,
    setup: ({ store }) => store.getState().startTour("out-of-africa", { index: 5 }),
    cues: [{ at: 0.2, run: ({ store }) => store.getState().setPictureViewer(true) }],
  },

  // 15b. The journey drawn as a gold thread after the last stop.
  "15b": {
    seconds: 3.5,
    warmup: 6,
    setup: ({ store }) => {
      store.getState().startTour("out-of-africa", { index: 8 });
      store.getState().tourGo(9);
    },
  },

  // 16a. A site's card, scrolling down to its dates and sources.
  "16a": {
    seconds: 6.5,
    hide: [".search"],
    setup: ({ store }) => store.getState().showEntity("linear-pottery", { open: true, year: -5_299 }),
    frame: ({ promo }, t) => {
      const sources = Array.from(document.querySelectorAll("*")).find(
        (e) => e.children.length < 6 && /^Sources( for|:)/.test(e.textContent ?? ""),
      ) as HTMLElement | undefined;
      let box = sources?.parentElement ?? null;
      while (box && !(box.scrollHeight > box.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
      if (!sources || !box) return;
      const target = Math.max(0, sources.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight * 0.45);
      box.scrollTop = target * promo.easeInOut(Math.min(1, Math.max(0, (t - 1.2) / 2.8)));
    },
  },

  // 16b. Museum photos of real artifacts, in the picture viewer (past the card's illustration).
  "16b": {
    seconds: 6.5,
    // The photos are loaded first, and the viewer opens on the first of them (the figurine).
    setup: async ({ store }) => {
      await Promise.all(["/images/extra/vinca-1.webp", "/images/extra/vinca-2.webp"].map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode();
      }));
      store.getState().showEntity("vinca", { open: true });
      store.getState().setPictureViewer(true);
    },
    warmup: 3,
    cues: [
      { at: -2, run: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })) },
      { at: 3.0, run: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })) },
    ],
  },

  // 17. End: the globe pulls back into space; the address goes over it in the edit.
  "17": {
    hide: BARE,
    setup: ({ store }) => store.getState().setYear(-7_999),
    frame: ({ map, promo }, t, u) =>
      map.jumpTo({ center: [25 + 4 * t, 20], zoom: 2.3 - 0.85 * promo.easeOut(u), padding: { top: 0, bottom: 330, left: 0, right: 0 } }),
  },
};
