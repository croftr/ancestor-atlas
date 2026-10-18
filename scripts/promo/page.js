// Injected with clock.js: helpers for the shot scripts (shots.ts), as window.__promo.
(() => {
  // The time slider's scale (src/time/scale.ts): position 0..1 against years before 1 CE.
  const BCE = [10_000_000, 1_000_000, 100_000, 10_000, 3_000, 0];
  const POS = [0, 0.15, 0.35, 0.55, 0.75, 1];
  const lerp = (xs, ys, x) => {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i]) return ys[i - 1] + ((ys[i] - ys[i - 1]) * (x - xs[i - 1])) / (xs[i] - xs[i - 1]);
    }
    return ys[ys.length - 1];
  };
  const posOf = (year) => lerp(BCE.slice().reverse(), POS.slice().reverse(), 1 - year);
  const yearAt = (pos) => 1 - lerp(POS, BCE, pos);
  window.__promo = {
    posOf,
    yearAt,
    /** The year a fraction `u` of the way from `from` to `to`, moving evenly along the slider. */
    sweep: (from, to, u) => yearAt(posOf(from) + (posOf(to) - posOf(from)) * u),
    easeInOut: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
    easeOut: (u) => 1 - (1 - u) ** 3,
    /** Hide parts of the interface for a shot (kept in the layout, so the globe doesn't move). */
    hide: (selectors) => {
      const style = document.createElement("style");
      style.textContent = `${selectors.join(",")} { visibility: hidden !important; }`;
      document.head.append(style);
    },
  };
})();
