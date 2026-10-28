import { useLayoutEffect, type RefObject } from "react";

const GAP = 16;

/**
 * Keeps the time bar clear of the left column (legend, climate and ancient DNA panels; called by ui/Legend.tsx with
 * the column). On a window short enough for the column to reach down beside the bar, the bar slid under the panels,
 * year and all; now --left-clear on the app (the column's reach past the rail, plus a gap) narrows the bar from both
 * ends by that much (ui/sidenav.css), so it stays centred beside the rail as before. Tall windows never need it;
 * small screens (`active` false), where the panels stack in a column, neither.
 */
export function useSliderClearance(dock: RefObject<HTMLElement | null>, active: boolean) {
  useLayoutEffect(() => {
    const column = dock.current;
    const app = column?.closest<HTMLElement>(".app");
    const bar = app?.querySelector<HTMLElement>(".time-slider");
    if (!column || !app || !bar) return;
    const set = (px: number) => {
      const value = `${Math.round(px)}px`;
      if (app.style.getPropertyValue("--left-clear") !== value) app.style.setProperty("--left-clear", value);
    };
    if (!active) {
      set(0);
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = bar.getBoundingClientRect().top;
        const navW = parseFloat(getComputedStyle(app).getPropertyValue("--nav-w")) || 0;
        let clear = 0;
        for (const panel of column.querySelectorAll<HTMLElement>(":scope > .panel")) {
          const r = panel.getBoundingClientRect();
          if (r.height > 0 && r.bottom + GAP > top) clear = Math.max(clear, r.right - navW + GAP);
        }
        set(clear);
      });
    };
    // The panels change height with the year (and as they open and close); the bar with its width.
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    observer.observe(bar);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      app.style.removeProperty("--left-clear");
    };
  }, [dock, active]);
}
