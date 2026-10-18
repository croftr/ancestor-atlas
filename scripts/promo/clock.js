// Injected into the page before the app loads (scripts/promo/film.ts): the page's clock, timers and animation
// frames run on a virtual time that only moves when the film script steps it, so every frame is drawn at
// exactly its moment however long it takes to render. CSS and Web Animations are paused and seeked to the
// same time. Network, workers and decoding still run in real time; `settle` waits for them between frames.
(() => {
  const real = {
    now: performance.now.bind(performance),
    setTimeout: window.setTimeout.bind(window),
    fetch: window.fetch.bind(window),
  };
  let t = real.now();
  const dateOffset = Date.now() - t;
  const RealDate = Date;

  performance.now = () => t;
  class FilmDate extends RealDate {
    constructor(...a) {
      if (a.length === 0) super(t + dateOffset);
      else super(...a);
    }
    static now() {
      return Math.floor(t + dateOffset);
    }
  }
  window.Date = FilmDate;
  // esbuild's keepNames helper, used by shot functions written in TypeScript and sent here as source.
  window.__name = (f) => f;

  let seq = 0;
  const timers = new Map();
  window.setTimeout = (fn, ms = 0, ...args) => {
    const id = ++seq;
    timers.set(id, { at: t + Math.max(0, Number(ms) || 0), fn, args, seq: id });
    return id;
  };
  window.setInterval = (fn, ms = 0, ...args) => {
    const id = ++seq;
    const every = Math.max(1, Number(ms) || 0);
    timers.set(id, { at: t + every, fn, args, every, seq: id });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);

  let frames = new Map();
  let frameSeq = 0;
  window.requestAnimationFrame = (fn) => {
    const id = ++frameSeq;
    frames.set(id, fn);
    return id;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);

  let inflight = 0;
  window.fetch = (...a) => {
    inflight++;
    return real.fetch(...a).finally(() => inflight--);
  };

  const started = new WeakMap();
  const seekAnimations = () => {
    for (const a of document.getAnimations()) {
      if (!started.has(a)) {
        started.set(a, t - (Number(a.currentTime) || 0));
        a.pause();
      }
      a.currentTime = t - started.get(a);
    }
  };

  const runTimers = (until) => {
    for (;;) {
      let next;
      for (const x of timers.values()) if (x.at <= until && (!next || x.at < next.at || (x.at === next.at && x.seq < next.seq))) next = x;
      if (!next) break;
      t = Math.max(t, next.at);
      if (next.every) next.at += next.every;
      else timers.delete(next.seq);
      try {
        if (typeof next.fn === "function") next.fn(...next.args);
      } catch (e) {
        console.error(e);
      }
    }
    t = until;
  };
  const runFrames = () => {
    const due = frames;
    frames = new Map();
    for (const fn of due.values()) {
      try {
        fn(t);
      } catch (e) {
        console.error(e);
      }
    }
  };
  const wait = (ms) => new Promise((r) => real.setTimeout(r, ms));

  window.__film = {
    get now() {
      return t;
    },
    /** Move time on by `ms`: timers due, then one animation frame. */
    async step(ms) {
      runTimers(t + ms);
      await wait(0);
      runFrames();
      seekAnimations();
      await wait(0);
    },
    /**
     * Let real-time work finish before the frame is taken: fetches, React's renders and the map's tiles (its
     * workers). Then draw once more at the same moment, so what arrived is on screen.
     */
    async settle(maxMs = 3000) {
      const map = () => window.__map;
      const start = real.now();
      const end = start + maxMs;
      let why = "";
      for (;;) {
        await wait(4);
        why = inflight > 0 ? "fetch" : map() && !map().isStyleLoaded() ? "style" : map() && !map().areTilesLoaded() ? "tiles" : "";
        if (!why || real.now() > end) break;
        // The map only finishes taking in new data when it draws: let it, at the same moment.
        if (why !== "fetch") runFrames();
      }
      await wait(0);
      runFrames();
      seekAnimations();
      await wait(0);
      return { ms: Math.round(real.now() - start), why };
    },
  };
})();
