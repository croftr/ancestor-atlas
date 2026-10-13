import { useEffect } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { bestYear } from "../search/search";
import { posToYear, snapYear, yearToPos } from "../time/scale";
import { tourById, type TourStop } from "./tours";
import type { Data } from "../map/data";
import { narrationState, pauseNarration, playNarration, preloadNarration, resumeNarration, stopNarration } from "../audio/narration";

/** After a narration ends, the card stays up this long before the tour moves on. */
const AFTER_NARRATION_MS = 1_500;

/** Slider travel between stops: as fast as normal play (the whole track in 60 s), within these bounds. */
const TRAVEL_MS_PER_TRACK = 60_000;
const MIN_TRAVEL_MS = 1_500;
const MAX_TRAVEL_MS = 6_000;
/** When the next stop is behind the slider (a tour's first stop), start this far before it. */
const PRE_ROLL = 0.02;

/** Seconds a card stays up: about reading speed for its description, within 8–22 s. */
export function holdSeconds(stop: TourStop, description: string): number {
  if (stop.hold) return stop.hold;
  const words = description.split(/\s+/).filter(Boolean).length;
  return Math.min(22, Math.max(8, 4 + words / 4.5));
}

export function stopYear(stop: TourStop, d: Data): number | null {
  const e = d.entityById.get(stop.entity);
  if (!e) return null;
  return snapYear(stop.year ?? e.year ?? bestYear(d.featuresOf.get(stop.entity) ?? [])?.year ?? e.start_year);
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Plays the tour in the store: for each stop, play the slider forward to its year with the card
 * closed, then turn the globe to it, open its card and hold; then on to the next. Pausing freezes
 * the clock. Touching the globe or the card pauses (the viewer has taken over).
 */
export default function TourPlayer() {
  const data = useData();
  const id = useStore((s) => s.tour?.id);
  const index = useStore((s) => s.tour?.index);
  const travel = useStore((s) => s.tour?.travel);

  useEffect(() => {
    if (!data || id === undefined || index === undefined) return;
    const tour = tourById(id);
    const stop = tour?.stops[index];
    const target = stop && stopYear(stop, data);
    if (!tour || !stop || target === null || target === undefined) {
      useStore.getState().stopTour();
      return;
    }
    const entity = data.entityById.get(stop.entity)!;
    // Held for the narration if there is one (set once it starts), else for reading time.
    let holdMs = holdSeconds(stop, entity.description) * 1000;
    let cancelled = false;
    const nextEntity = tour.stops[index + 1] && data.entityById.get(tour.stops[index + 1].entity);
    if (nextEntity?.narration) preloadNarration(nextEntity.narration.src);
    const patchTour = (p: Partial<NonNullable<ReturnType<typeof useStore.getState>["tour"]>>) =>
      useStore.setState((s) => (s.tour ? { tour: { ...s.tour, ...p } } : {}));

    let from = yearToPos(useStore.getState().year);
    const to = yearToPos(target);
    if (from > to) {
      from = Math.max(0, to - PRE_ROLL);
      useStore.setState({ year: posToYear(from) });
    }
    const travelMs = travel && to > from ? Math.min(MAX_TRAVEL_MS, Math.max(MIN_TRAVEL_MS, (to - from) * TRAVEL_MS_PER_TRACK)) : 0;

    const arrive = () => {
      useStore.getState().showEntity(stop.entity, { year: target, open: true });
      patchTour({ phase: "hold", holdMs });
      if (entity.narration && !stop.hold)
        playNarration(entity.narration.src)
          .then((seconds) => {
            if (cancelled || !Number.isFinite(seconds)) return;
            if (useStore.getState().tour?.paused) pauseNarration();
            holdMs = seconds * 1000 + AFTER_NARRATION_MS;
            patchTour({ holdMs });
          })
          .catch(() => {}); // blocked or missing: the reading-time hold stands
    };
    if (travelMs > 0) {
      useStore.getState().select(null);
      patchTour({ phase: "travel", holdMs });
    } else arrive();

    let elapsed = 0;
    let arrived = travelMs === 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const s = useStore.getState();
      if (!s.tour) return;
      if (!s.tour.paused) elapsed += dt;
      if (!arrived) {
        if (elapsed >= travelMs) {
          arrived = true;
          elapsed = 0;
          arrive();
        } else if (!s.tour.paused) {
          useStore.setState({ year: posToYear(from + (to - from) * ease(elapsed / travelMs)) });
        }
      } else if (elapsed >= holdMs && !(narrationState().playing && narrationState().src === entity.narration?.src)) {
        if (index + 1 < tour.stops.length) patchTour({ index: index + 1, travel: true });
        else useStore.getState().stopTour(); // the last card stays open
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopNarration();
    };
  }, [data, id, index, travel]);

  // Pausing the tour pauses its narration.
  const paused = useStore((s) => s.tour?.paused);
  useEffect(() => {
    if (paused === undefined) return;
    if (paused) pauseNarration();
    else resumeNarration();
  }, [paused]);

  // The viewer taking hold of the globe or the card pauses the tour.
  useEffect(() => {
    if (id === undefined) return;
    const onDown = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest(".map-wrap, .info-panel")) useStore.getState().pauseTour(true);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("wheel", onDown, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("wheel", onDown, true);
    };
  }, [id]);

  return null;
}
