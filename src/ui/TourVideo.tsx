import { useEffect, useRef, useState } from "react";
import { pauseAmbience, preloadAmbience, startAmbience, stopAmbience } from "../audio/ambience";
import { narrationState } from "../audio/narration";
import { mediaUrl } from "../config";
import { useStore } from "../store";
import { AMBIENCE } from "../tours/ambience";

/** Delay after the picture is shown (on a tour: after the stop's card opens) before the video starts. */
const START_DELAY_MS = 1_000;

const mountedBySrc = new Map<string, number>();

/**
 * Animated video layered over the entity's main picture wherever it is shown (card, picture
 * viewer, browse page). Preloads during the first second, then plays muted once and stays on its last
 * frame, accompanied by the entity's ambient sound (if any). On a tour the second counts from the stop's
 * hold, and pausing the tour pauses the video. If the clip is not in the bucket yet or fails to load,
 * the static picture underneath remains visible.
 */
export default function TourVideo({ src }: { src: string }) {
  const touring = useStore((s) => s.tour !== null);
  const phase = useStore((s) => s.tour?.phase);
  const paused = useStore((s) => s.tour?.paused);
  const ref = useRef<HTMLVideoElement>(null);
  const remaining = useRef(START_DELAY_MS);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [localFallback, setLocalFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  const entityId = src.match(/\/([a-z0-9-]+)-v\d+\.mp4$/)?.[1];
  const sound = entityId ? AMBIENCE[entityId]?.sound : undefined;

  useEffect(() => {
    remaining.current = START_DELAY_MS;
    setStarted(false);
    setVisible(false);
    setLocalFallback(false);
    setFailed(false);
    if (sound) preloadAmbience(sound.src);
  }, [src, sound]);

  useEffect(() => {
    mountedBySrc.set(src, (mountedBySrc.get(src) ?? 0) + 1);
    return () => {
      const next = (mountedBySrc.get(src) ?? 1) - 1;
      if (next <= 0) mountedBySrc.delete(src);
      else mountedBySrc.set(src, next);
      if (next <= 0 && sound && !useStore.getState().tour && !narrationState().playing) {
        stopAmbience();
      }
    };
  }, [src, sound]);

  useEffect(() => {
    if (started || failed || (touring && (phase !== "hold" || paused))) return;
    const t0 = performance.now();
    const timer = window.setTimeout(() => {
      remaining.current = 0;
      setStarted(true);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - t0));
    };
  }, [started, failed, touring, phase, paused]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !started || failed) return;
    if (paused) el.pause();
    else if (!el.ended) el.play().catch(() => {});
  }, [started, paused, failed, localFallback]);

  useEffect(() => {
    if (!started || failed || touring || !sound) return;
    pauseAmbience(false);
    startAmbience(sound.src, { muteable: false, delay: 0, hold: 6 });
  }, [started, failed, touring, sound]);

  if (failed) return null;

  return (
    <video
      ref={ref}
      className={`tour-video${visible ? " visible" : ""}`}
      src={localFallback ? `/data/build/${src}` : mediaUrl(src)}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      onPlaying={() => setVisible(true)}
      onError={() => {
        if (import.meta.env.DEV && !localFallback) setLocalFallback(true);
        else setFailed(true);
      }}
    />
  );
}
