import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { isActive, unionBBox, useData } from "../map/data";
import { posToYear, yearToPos } from "../time/scale";
import { OUTRO, tourById } from "./tours";
import { holdSeconds, readingSeconds, stopYear } from "./summary";
import TitleCard from "./TitleCard";
import BookNote from "./BookNote";
import EndCard from "./EndCard";
import { AFTER_CLOSING_MS, closingAt, MUSIC_FADE_S, MUSIC_HOLD_MS, OUTRO_GAP_MS } from "./epilogue";
import TimeGap from "./TimeGap";
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
import { pauseAmbience, preloadAmbience, startAmbience, stopAmbience } from "../audio/ambience";
import { AMBIENCE } from "./ambience";

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
/** A book tour leaves more room after each narration, and more again where the voice changes (a book stop
 * to a card or back), so the two voices don't run into each other. */
const BOOK_AFTER_NARRATION_MS = 2_500;
const VOICE_CHANGE_MS = 2_000;
/**
 * The title card: the announcement starts ANNOUNCE_DELAY_MS after the card appears and the music comes in
 * as it ends; the card stays AFTER_ANNOUNCEMENT_MS more. Without an announcement (or if it fails to
 * load): the card stays INTRO_MS and the music comes in after MUSIC_DELAY_MS.
 */
const ANNOUNCE_DELAY_MS = 1_500;
/** Without the outro (blocked or missing), the tour's title stays this long before the tour ends. */
const FINALE_MS = 5_000;
const AFTER_ANNOUNCEMENT_MS = 2_000;
/** A book tour's title card: the pause between the title read out and the synopsis. */
const BETWEEN_CLIPS_MS = 800;
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
    // The title read by the usual narrator, then a book tour's synopsis (its own voice), one after the
    // other; an unrecorded synopsis holds the card for reading time.
    const clips = [tour.announcement, tour.synopsisNarration].filter((c) => c !== undefined);
    const introMs = tour.synopsis ? Math.max(INTRO_MS, readingSeconds(tour.synopsis) * 1000) : INTRO_MS;
    const readMs = tour.synopsis && !tour.synopsisNarration ? introMs : 0; // the least the card stays, read
    let holdMs = clips.length ? ANNOUNCE_DELAY_MS + introMs : introMs;
    // Music comes in as the last clip ends; a book tour starts with it (Rob's call, 29 Oct 2026), under the readings.
    let musicAt = tour.book ? 0 : clips.length ? Infinity : MUSIC_DELAY_MS;
    let playing = -1; // the clip started last
    let ended = -1; // the clip finished (or failed) last
    let nextAt = ANNOUNCE_DELAY_MS;
    const failed = new Set<number>();
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
    const announce = (i: number, startedAt: number) =>
      playNarration(clips[i].src)
        .then((seconds) => {
          if (cancelled || !Number.isFinite(seconds)) throw new Error("no length");
          if (useStore.getState().tour?.paused) pauseNarration();
          // An estimate for the card and the progress bar (another clip to come: a rough one); set exactly when the last ends.
          const after = i + 1 < clips.length ? BETWEEN_CLIPS_MS + INTRO_MS : AFTER_ANNOUNCEMENT_MS;
          holdMs = Math.max(readMs, startedAt + seconds * 1000 + after);
          patchTour({ phase: "hold", holdMs });
        })
        .catch(() => {
          if (!cancelled) failed.add(i); // blocked or missing: on as if it had been read
        });
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = useStore.getState();
      if (!s.tour) return;
      if (!s.tour.paused) elapsed += now - last;
      last = now;
      const n = narrationState();
      if (playing >= 0 && ended < playing && (failed.has(playing) || (n.src === clips[playing].src && (n.ended || n.failed)))) {
        ended = playing;
        if (playing + 1 < clips.length) nextAt = elapsed + BETWEEN_CLIPS_MS;
        else {
          musicAt = Math.min(musicAt, elapsed);
          holdMs = Math.max(readMs, elapsed + AFTER_ANNOUNCEMENT_MS);
          patchTour({ phase: "hold", holdMs });
        }
      }
      if (ended === playing && playing + 1 < clips.length && elapsed >= nextAt) {
        playing++;
        announce(playing, elapsed);
      }
      if (!s.tour.musicIn && elapsed >= musicAt) patchTour({ musicIn: true });
      const reading = n.playing && clips.some((c) => c.src === n.src);
      if (elapsed >= holdMs && !reading && ended === clips.length - 1) {
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
    // A book tour's note is a stop of its own (BookNote.tsx): the globe turns to its place and the note
    // is shown in the card's place and read, with its pictures, instead of the entity's card.
    const note = stop.note;
    const voice = note ? note.narration : entity.narration;
    // Held for the narration if there is one (set once it starts), else for reading time.
    let holdMs = (note ? readingSeconds(note.text) : holdSeconds(stop, entity.description)) * 1000;
    let cancelled = false;
    const nextStop = tour.stops[index + 1];
    const nextEntity = nextStop && data.entityById.get(nextStop.entity);
    const nextVoice = nextStop?.note ? nextStop.note.narration : nextEntity?.narration;
    const after = !tour.book
      ? AFTER_NARRATION_MS
      : BOOK_AFTER_NARRATION_MS + (nextStop && !!nextStop.note !== !!note ? VOICE_CHANGE_MS : 0);
    if (voice) preloadNarration(voice.src);
    if (nextVoice) preloadNarration(nextVoice.src);
    if (!note) preloadPictures(entity);
    if (nextEntity && !nextStop.note) preloadPictures(nextEntity);
    for (const x of [...(note?.images ?? []), ...(nextStop?.note?.images ?? [])]) new Image().src = x.url;
    // The stop's ambient sound, if it has one (tours/ambience.ts), comes in as its card opens.
    const sound = note ? undefined : AMBIENCE[entity.id]?.sound;
    const nextSound = nextEntity && !nextStop.note ? AMBIENCE[nextEntity.id]?.sound : undefined;
    if (sound) preloadAmbience(sound.src);
    if (nextSound) preloadAmbience(nextSound.src);
    const patchTour = (p: Partial<NonNullable<ReturnType<typeof useStore.getState>["tour"]>>) =>
      useStore.setState((s) => (s.tour ? { tour: { ...s.tour, ...p } } : {}));
    // Extra pictures take turns on the card (or the note's on the note) during the hold (tourPicture.ts); never stepping back.
    // A note's first picture leads (the book's cover is the card's badge, not in the rotation); the rest follow.
    const extras = note ? note.images?.slice(1) : entity.extra_images;
    let picture = 0;
    patchTour(note ? { notePicture: 0 } : { picture: { entity: entity.id, index: 0 } });

    let from = yearToPos(useStore.getState().year);
    const to = yearToPos(target);
    if (from > to) {
      from = Math.max(0, to - PRE_ROLL);
      useStore.setState({ year: posToYear(from) });
    }
    const travelMs = travel && to > from ? Math.min(MAX_TRAVEL_MS, Math.max(MIN_TRAVEL_MS, (to - from) * TRAVEL_MS_PER_TRACK)) : 0;

    const arrive = () => {
      if (note) {
        // Turn to the place with no card open; the note takes the card's place.
        useStore.getState().select(null);
        useStore.getState().showEntity(stop.entity, { year: target, site: stop.site });
      } else useStore.getState().showEntity(stop.entity, { year: target, open: true, site: stop.site });
      patchTour({ phase: "hold", holdMs, gap: undefined, note: note ? true : undefined });
      if (sound) startAmbience(sound.src);
      if (voice && !stop.hold)
        playNarration(voice.src)
          .then((seconds) => {
            if (cancelled || !Number.isFinite(seconds)) return;
            if (useStore.getState().tour?.paused) pauseNarration();
            holdMs = seconds * 1000 + after;
            patchTour({ holdMs });
          })
          .catch(() => {}); // blocked or missing: the reading-time hold stands
    };
    if (travelMs > 0) {
      useStore.getState().select(null);
      // How long has passed since the stop before (shown over the globe while the slider travels).
      const before = index > 0 ? stopYear(tour.stops[index - 1], data) : null;
      patchTour({ phase: "travel", holdMs, gap: before === null ? undefined : Math.max(0, target - before), note: undefined });
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
      } else if (extras?.length) {
        const videoEndMs = !note && entity.video ? (entity.category === "species" ? 5_500 : 9_500) : 0;
        if (elapsed >= videoEndMs && pictureIndexAt(extras, elapsed, holdMs) > picture) {
          picture = pictureIndexAt(extras, elapsed, holdMs);
          patchTour(note ? { notePicture: picture } : { picture: { entity: entity.id, index: picture } });
        }
      }
      if (arrived && elapsed >= holdMs && !(narrationState().playing && narrationState().src === voice?.src)) {
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
      stopAmbience();
    };
  }, [data, id, index, travel, intro, epilogue]);

  // The epilogue: close the card and let the globe draw the journey again (map/MapView.tsx) under
  // the end card; once it is drawn, the closing line is read (if narrated) over the music. The music
  // plays on until AFTER_CLOSING_MS past the line (at least MUSIC_HOLD_MS), then fades out, and after a
  // moment's silence the outro plays, and the tour's title comes up over the globe with it
  // (TourFinale.tsx); when the outro has finished the tour ends by itself.
  useEffect(() => {
    if (!data || id === undefined || !epilogue) return;
    const tour = tourById(id);
    if (!tour) return;
    const patchTour = (p: { phase?: "hold"; holdMs?: number; musicOut?: boolean; musicIn?: boolean }) =>
      useStore.setState((s) => (s.tour ? { tour: { ...s.tour, ...p } } : {}));
    useStore.getState().select(null);
    useStore.getState().setPictureViewer(false);
    const voice = tour.closing ? tour.closingNarration : undefined;
    if (voice) preloadNarration(voice.src);
    preloadNarration(OUTRO);
    const speakAt = closingAt(tour.stops.length);
    // Lengths (s) as they become known, for the tour bar's estimate of the end.
    let voiceS = voice ? 10 : 0;
    let outroS = 6;
    let spoken = false;
    let voiceFailed = false;
    let lineEnd: number | null = null; // when the closing line ended (or would have)
    let outroAt = Infinity; // set when the music stops
    let outro = false;
    let outroFailed = false;
    let outroStart: number | null = null; // when the outro began playing
    let finaleAt: number | null = null; // when the title came up
    const fadeAt = (end: number) => Math.max(MUSIC_HOLD_MS, end + AFTER_CLOSING_MS);
    const hold = () => {
      const start = outroAt < Infinity ? outroAt : fadeAt(lineEnd ?? speakAt + voiceS * 1000) + MUSIC_FADE_S * 1000 + OUTRO_GAP_MS;
      patchTour({ phase: "hold", holdMs: start + outroS * 1000 });
    };
    hold();
    patchTour({ musicIn: true });
    let cancelled = false;
    let elapsed = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = useStore.getState();
      if (!s.tour) return;
      if (!s.tour.paused) elapsed += now - last;
      last = now;
      if (voice && !spoken && elapsed >= speakAt) {
        spoken = true;
        playNarration(voice.src)
          .then((seconds) => {
            if (cancelled || !Number.isFinite(seconds)) return;
            if (useStore.getState().tour?.paused) pauseNarration();
            voiceS = seconds;
            hold();
          })
          .catch(() => (voiceFailed = true)); // blocked or missing: on as if it had been read
      }
      const n = narrationState();
      if (lineEnd === null) {
        const read = voice ? spoken && (voiceFailed || (n.src === voice.src && (n.ended || n.failed))) : elapsed >= speakAt;
        if (read) lineEnd = elapsed;
      }
      // The music fades out, then a moment's silence (OUTRO_GAP_MS), then the outro.
      if (!s.tour.musicOut && lineEnd !== null && elapsed >= fadeAt(lineEnd)) {
        patchTour({ musicOut: true });
        stopMusic(MUSIC_FADE_S);
        outroAt = elapsed + MUSIC_FADE_S * 1000 + OUTRO_GAP_MS;
        hold();
      }
      if (!outro && elapsed >= outroAt) {
        outro = true;
        playNarration(OUTRO)
          .then((seconds) => {
            if (cancelled || !Number.isFinite(seconds)) return;
            if (useStore.getState().tour?.paused) pauseNarration();
            outroS = seconds;
            outroStart = elapsed;
          })
          .catch(() => (outroFailed = true));
      }
      if (outro && n.src === OUTRO && n.failed) outroFailed = true;
      // The title as the outro starts (or where it would have); the tour ends with the outro.
      if (finaleAt === null && (outroFailed || outroStart !== null)) {
        finaleAt = elapsed;
        useStore.setState({ tourFinale: { title: tour.title, key: Date.now() } });
      }
      const outroOver = outroFailed ? finaleAt !== null && elapsed >= finaleAt + FINALE_MS : n.src === OUTRO && n.ended;
      if (finaleAt !== null && outroOver) return useStore.getState().stopTour();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopNarration();
    };
  }, [data, id, epilogue]);

  // Pausing the tour pauses its narration and music; the music fades out when the tour ends.
  const paused = useStore((s) => s.tour?.paused);
  useEffect(() => {
    if (paused === undefined) return;
    if (paused) pauseNarration();
    else resumeNarration();
    pauseAmbience(paused);
  }, [paused]);
  // Keep the screen on while the tour plays (not while paused, or waiting behind its Start button).
  useWakeLock(id !== undefined && paused === false && !gate);
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
  if (!gate)
    return intro ? (
      <TitleCard tour={tour} />
    ) : epilogue ? (
      <EndCard tour={tour} />
    ) : (
      <>
        <TimeGap />
        {tour.book && <BookNote tour={tour} />}
      </>
    );
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
