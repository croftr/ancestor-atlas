import { useEffect, useRef } from "react";
import { mediaUrl } from "../config";
import { useStore } from "../store";

/**
 * A tour's intro video, before its title card: over the globe, with its own sound (the tour's music
 * waits). Pausing the tour pauses it; a tap on it pauses or plays (where the browser would not start
 * it with sound, it waits paused for that tap). Ends, fails to load or Skip: on to the title card.
 */
export default function IntroVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const paused = useStore((s) => s.tour?.paused ?? false);
  const { skipIntro, pauseTour } = useStore.getState();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => useStore.getState().pauseTour(true));
  }, [paused]);

  // The tour bar's progress: the length of the video.
  const onMeta = () => {
    const ms = (ref.current?.duration ?? 0) * 1000;
    if (Number.isFinite(ms) && ms > 0) useStore.setState((s) => (s.tour ? { tour: { ...s.tour, phase: "hold", holdMs: ms } } : {}));
  };

  return (
    <div className="tour-video">
      <video
        ref={ref}
        src={mediaUrl(src)}
        playsInline
        preload="auto"
        onLoadedMetadata={onMeta}
        onEnded={skipIntro}
        onError={skipIntro}
        onClick={() => {
          const v = ref.current;
          if (!v) return;
          if (v.paused) {
            v.play().catch(() => {}); // straight from the tap, so it may play with sound
            pauseTour(false);
          } else pauseTour(true);
        }}
      />
      {paused && (
        <span className="tour-video-paused" aria-hidden>
          <svg viewBox="0 0 16 16" width="28" height="28">
            <path fill="currentColor" d="M4.5 2.5v11L13.5 8z" />
          </svg>
        </span>
      )}
      <button className="tour-title-skip tour-video-skip" onClick={skipIntro}>
        Skip intro
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path fill="currentColor" d="M11 3h2v10h-2zM3 3v10l7-5z" />
        </svg>
      </button>
    </div>
  );
}
