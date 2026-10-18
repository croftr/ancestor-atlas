import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "../config";
import { useStore } from "../store";
import "./intro-modal.css";

/** The videos, newest first (the first plays when the dialog opens). Keys in the media bucket. */
const VIDEOS = [
  // Made Oct 2026 with scripts/promo (docs/promo-video.md).
  { key: "events/promo-video-v2.mp4", label: "Trailer", length: "1:22", aria: "Ancestor Atlas trailer" },
  { key: "events/promo-video.mp4", label: "First intro", length: "1:52", aria: "Ancestor Atlas first intro video" },
];

export default function IntroModal() {
  const setIntroOpen = useStore((s) => s.setIntroOpen);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(0);
  const video = VIDEOS[shown];

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIntroOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIntroOpen]);

  return (
    <div
      className="intro-overlay"
      onClick={(e) => e.target === e.currentTarget && setIntroOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
    >
      <div className="intro-modal panel">
        <button
          ref={closeRef}
          className="intro-close"
          onClick={() => setIntroOpen(false)}
          aria-label="Close intro video"
        >
          ✕
        </button>

        <div className="intro-player">
          <video
            key={video.key}
            src={mediaUrl(video.key)}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={video.aria}
          />
        </div>

        <div className="intro-videos" role="group" aria-label="Choose a video">
          {VIDEOS.map((v, i) => (
            <button key={v.key} className="intro-video-btn" aria-pressed={i === shown} onClick={() => setShown(i)}>
              {v.label} <span className="muted">{v.length}</span>
            </button>
          ))}
        </div>

        <div className="intro-body">
          <h2 id="intro-title" className="intro-title">
            Ancestor Atlas
          </h2>
          <p className="intro-tagline muted">
            An interactive journey through deep time — exploring human evolution, prehistoric fossil sites, archaeological cultures, and early civilizations across a 3D globe.
          </p>

          <div className="intro-highlights">
            <div className="intro-feat">
              <span className="intro-feat-icon" aria-hidden>⏳</span>
              <div>
                <strong>Deep-Time Slider</strong>
                <span className="muted">Scrub across 7 million years of prehistory and ancient history.</span>
              </div>
            </div>
            <div className="intro-feat">
              <span className="intro-feat-icon" aria-hidden>🦴</span>
              <div>
                <strong>Hominin Evolution</strong>
                <span className="muted">Track 24 species across hundreds of verified fossil sites.</span>
              </div>
            </div>
            <div className="intro-feat">
              <span className="intro-feat-icon" aria-hidden>🪨</span>
              <div>
                <strong>Archaeological Cultures</strong>
                <span className="muted">Over 2,300 calibrated radiocarbon-dated sites from XRONOS.</span>
              </div>
            </div>
            <div className="intro-feat">
              <span className="intro-feat-icon" aria-hidden>🏛️</span>
              <div>
                <strong>Early Civilizations</strong>
                <span className="muted">Explore territorial boundaries of 200+ ancient states and empires.</span>
              </div>
            </div>
          </div>

          <div className="intro-footer">
            <button className="intro-start-btn" onClick={() => setIntroOpen(false)}>
              Start Exploring
            </button>
            <span className="muted intro-free-tag">100% Free & Open Source</span>
          </div>
        </div>
      </div>
    </div>
  );
}
