import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { isActive, unionBBox, useData } from "../map/data";
import { posToYear, yearToPos } from "../time/scale";
import { tourById } from "./tours";
import { holdSeconds, stopYear } from "./summary";
import TitleCard from "./TitleCard";
import EndCard from "./EndCard";
import { EPILOGUE_MS, MUSIC_FADE_S, MUSIC_HOLD_MS, trailPoints } from "./epilogue";
import { useWakeLock } from "./useWakeLock";
import { pictureIndexAt, preloadPictures } from "./tourPicture";
import {
  narrationState,
  pauseNarration,
  playNarration,
  preloadNarration,
  primeNarration,
  resumeNarration,
  stopNarration,
} from "../audio/narration";
import { pauseMusic, primeMusic, startMusic, stopMusic } from "../audio/music";

/** From a tap: lets the tour's sound play (narration and music), then starts the tour. */
export function beginTour(start: () => void) {
  primeNarration();
  primeMusic();
  start();
}

/** Ending the tour from the end card (or Escape): the music, still playing, fades this slowly. */
const END_FADE_S = 4;

/** After a narration ends, the card stays up this long before the tour moves on. */
const AFTER_NARRATION_MS = 1_500;
/**
 * The title card: the announcement starts ANNOUNCE_DELAY_MS after the card appears and the music comes in
 * as it ends; the card stays AFTER_ANNOUNCEMENT_MS more. Without an announcement (or if it fails to
 * load): the card stays INTRO_MS and the music comes in after MUSIC_DELAY_MS.
 */
const ANNOUNCE_DELAY_MS = 1_500;
const AFTER_ANNOUNCEMENT_MS = 2_000;
const INTRO_MS = 6_000;
const MUSIC_DELAY_MS = 3_000;

/** Slider travel between stops: as fast as normal play (the whole track in 60 s), within these bounds. */
const TRAVEL_MS_PER_TRACK = 60_000;
const MIN_TRAVEL_MS = 1_500;
const MAX_TRAVEL_MS = 6_000;
/** When the next stop is behind the slider (a tour's first stop), start this far before it. */
const PRE_ROLL = 0.02;

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Plays the tour in the store: for each stop, play the slider forward to its year with the card
 * closed, then turn the globe to it, open its card and hold; then on to the next. Pausing freezes
 * the clock; only the tour bar's pause button (or Space) pauses.
 */
export default function TourPlayer() {
  const data = useData();
  const id = useStore((s) => s.tour?.id);
  const index = useStore((s) => s.tour?.index);
  const travel = useStore((s) => s.tour?.travel);
  const intro = useStore((s) => s.tour?.intro);
  const gate = useStore((s) => s.tour?.gate);
  const epilogue = useStore((s) => s.tour?.epilogue);

  // The title card: set the slider just before the first stop and turn the globe towards it, while
  // the announcement plays (or for INTRO_MS); then on to the first stop. Waits behind the gate.
  useEffect(() => {
    if (!data || id === undefined || !intro || gate) return;
    const tour = tourById(id);
    const stop = tour?.stops[0];
    const target = stop && stopYear(stop, data);
    if (!tour || !stop || target === null || target === undefined) {
      useStore.getState().skipIntro();
      return;
    }
    let cancelled = false;
    const announcement = tour.announcement;
    let holdMs = announcement ? ANNOUNCE_DELAY_MS + INTRO_MS : INTRO_MS;
    let musicAt = announcement ? Infinity : MUSIC_DELAY_MS; // set when the announcement ends
    let announced = false;
    let finished = false;
    const patchTour = (p: { phase?: "hold"; holdMs?: number; musicIn?: boolean }) =>
      useStore.setState((s) => (s.tour ? { tour: { ...s.tour, ...p } } : {}));
    const on = (data.featuresOf.get(stop.entity) ?? []).filter((f) => isActive(f, target) && (!stop.site || f.id === stop.site));
    const bbox = unionBBox(
      on.flatMap((f) => {
        const b = data.bboxOf.get(f.id);
        return b ? [b] : [];
      }),
    );
    useStore.getState().select(null);
    useStore.setState((s) => ({
      year: posToYear(Math.max(0, yearToPos(target) - PRE_ROLL)),
      flyTo: bbox ? { bbox, turn: true } : s.flyTo,
    }));
    patchTour({ phase: "hold", holdMs });
    const first = data.entityById.get(stop.entity);
    if (first?.narration) preloadNarration(first.narration.src);
    const announce = (src: string) =>
      playNarration(src)
        .then((seconds) => {
          if (cancelled || !Number.isFinite(seconds)) throw new Error("no length");
          if (useStore.getState().tour?.paused) pauseNarration();
          // An estimate for the card and the progress bar; set exactly when the clip ends.
          holdMs = ANNOUNCE_DELAY_MS + seconds * 1000 + AFTER_ANNOUNCEMENT_MS;
          patchTour({ phase: "hold", holdMs });
        })
        .catch(() => {
          if (!cancelled) musicAt = Math.min(musicAt, ANNOUNCE_DELAY_MS + MUSIC_DELAY_MS); // blocked or missing
        });
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = useStore.getState();
      if (!s.tour) return;
      if (!s.tour.paused) elapsed += now - last;
      last = now;
      if (announcement && !announced && elapsed >= ANNOUNCE_DELAY_MS) {
        announced = true;
        announce(announcement.src);
      }
      const n = narrationState();
      if (announced && !finished && n.src === announcement?.src && n.ended && !n.failed) {
        finished = true;
        musicAt = elapsed;
        holdMs = elapsed + AFTER_ANNOUNCEMENT_MS;
        patchTour({ phase: "hold", holdMs });
      }
      if (!s.tour.musicIn && elapsed >= musicAt) patchTour({ musicIn: true });
      if (elapsed >= holdMs && !(narrationState().playing && narrationState().src === tour.announcement?.src)) {
        s.skipIntro();
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
  }, [data, id, intro, gate]);

  useEffect(() => {
    if (!data || id === undefined || index === undefined || intro || epilogue) return;
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
    preloadPictures(entity);
    preloadPictures(nextEntity);
    const patchTour = (p: Partial<NonNullable<ReturnType<typeof useStore.getState>["tour"]>>) =>
      useStore.setState((s) => (s.tour ? { tour: { ...s.tour, ...p } } : {}));
    // Extra pictures take turns on the card during the hold (tourPicture.ts); never stepping back.
    let picture = 0;
    patchTour({ picture: { entity: entity.id, index: 0 } });

    let from = yearToPos(useStore.getState().year);
    const to = yearToPos(target);
    if (from > to) {
      from = Math.max(0, to - PRE_ROLL);
      useStore.setState({ year: posToYear(from) });
    }
    const travelMs = travel && to > from ? Math.min(MAX_TRAVEL_MS, Math.max(MIN_TRAVEL_MS, (to - from) * TRAVEL_MS_PER_TRACK)) : 0;

    const arrive = () => {
      useStore.getState().showEntity(stop.entity, { year: target, open: true, site: stop.site });
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
      } else if (entity.extra_images?.length && pictureIndexAt(entity.extra_images, elapsed, holdMs) > picture) {
        picture = pictureIndexAt(entity.extra_images, elapsed, holdMs);
        patchTour({ picture: { entity: entity.id, index: picture } });
      }
      if (arrived && elapsed >= holdMs && !(narrationState().playing && narrationState().src === entity.narration?.src)) {
        if (index + 1 < tour.stops.length) patchTour({ index: index + 1, travel: true });
        else useStore.getState().tourGo(index + 1); // the epilogue
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
  }, [data, id, index, travel, intro, epilogue]);

  // The epilogue: close the card and let the globe draw the journey again (map/MapView.tsx) under
  // the end card, while the music plays on at full level, then fades away. The end card stays.
  useEffect(() => {
    if (!data || id === undefined || !epilogue) return;
    const tour = tourById(id);
    if (!tour) return;
    const patchTour = (p: { phase?: "hold"; holdMs?: number; musicOut?: boolean; done?: boolean; musicIn?: boolean }) =>
      useStore.setState((s) => (s.tour ? { tour: { ...s.tour, ...p } } : {}));
    useStore.getState().select(null);
    useStore.getState().setPictureViewer(false);
    useStore.setState((s) => (s.tour ? { tour: { ...s.tour, trail: trailPoints(tour, data) } } : {}));
    patchTour({ phase: "hold", holdMs: EPILOGUE_MS, musicIn: true });
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = useStore.getState();
      if (!s.tour) return;
      if (!s.tour.paused) elapsed += now - last;
      last = now;
      if (!s.tour.musicOut && elapsed >= MUSIC_HOLD_MS) {
        patchTour({ musicOut: true });
        stopMusic(MUSIC_FADE_S);
      }
      if (elapsed >= EPILOGUE_MS) return patchTour({ done: true });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, id, epilogue]);

  // Pausing the tour pauses its narration and music; the music fades out when the tour ends.
  const paused = useStore((s) => s.tour?.paused);
  useEffect(() => {
    if (paused === undefined) return;
    if (paused) pauseNarration();
    else resumeNarration();
  }, [paused]);
  // Keep the screen on while the tour plays (not while paused, or waiting behind its Start button).
  const done = useStore((s) => s.tour?.done);
  useWakeLock(id !== undefined && paused === false && !gate && !done);
  const musicIn = useStore((s) => s.tour?.musicIn);
  const musicOut = useStore((s) => s.tour?.musicOut);
  useEffect(() => {
    const music = id === undefined ? undefined : tourById(id)?.music;
    if (!music || paused === undefined) return;
    if (paused) pauseMusic();
    else if (musicIn && !musicOut) startMusic(music.src);
  }, [id, paused, musicIn, musicOut]);
  // Ended from the epilogue, the music (still playing) is let go gently; mid-tour, quickly.
  // (The ref is set in an effect, so the cleanup below still sees the epilogue the tour ended in.)
  const inEpilogue = useRef(false);
  useEffect(() => () => stopMusic(inEpilogue.current ? END_FADE_S : undefined), [id]);
  useEffect(() => {
    inEpilogue.current = !!epilogue;
  }, [epilogue]);

  // Only the pause button (or Space) pauses a tour: touching the globe, the card or anything else
  // in the app leaves it playing (Rob's call, Oct 2026).

  const tour = id === undefined ? undefined : tourById(id);
  if (!tour) return null;
  if (!gate) return intro ? <TitleCard tour={tour} /> : epilogue ? <EndCard tour={tour} /> : null;
  // A tour opened from a link waits for a tap: browsers only play sound after one.
  const title = tour.title;
  return (
    <div className="tour-gate">
      <button className="tour-gate-btn" onClick={() => beginTour(useStore.getState().openGate)}>
        <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M4.5 2.5v11L13.5 8z" />
        </svg>
        <span>
          <span className="tour-gate-kicker">Guided tour</span>
          <span className="tour-gate-title">{title}</span>
        </span>
      </button>
    </div>
  );
}
