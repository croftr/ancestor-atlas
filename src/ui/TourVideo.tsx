import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "../config";
import { useStore } from "../store";

/** Delay after the picture is shown (on a tour: after the stop's card opens) before the video starts. */
const START_DELAY_MS = 1_000;

/**
 * Animated portrait video layered over the entity's main picture wherever it is shown (card, picture
 * viewer, species page). Preloads during the first second, then plays muted once and stays on its last
 * frame. On a tour the second counts from the stop's hold, and pausing the tour pauses the video. If the
 * clip is not in the bucket yet or fails to load, the static picture underneath remains visible.
 */
export default function TourVideo({ src }: { src: string }) {
  const touring = useStore((s) => s.tour !== null);
  const phase = useStore((s) => s.tour?.phase);
  const paused = useStore((s) => s.tour?.paused);
  const ref = useRef<HTMLVideoElement>(null);
  const remaining = useRef(START_DELAY_MS);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    remaining.current = START_DELAY_MS;
    setStarted(false);
    setVisible(false);
    setFailed(false);
  }, [src]);

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
  }, [started, paused, failed]);

  if (failed) return null;

  return (
    <video
      ref={ref}
      className={`tour-video${visible ? " visible" : ""}`}
      src={mediaUrl(src)}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      onPlaying={() => setVisible(true)}
      onError={() => setFailed(true)}
    />
  );
}
