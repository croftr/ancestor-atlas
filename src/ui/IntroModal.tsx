import { useEffect, useMemo, useRef, useState } from "react";
import { mediaUrl } from "../config";
import { useStore } from "../store";
import { useData } from "../map/data";
import type { Category } from "../types";
import { CategoryBadge } from "./CategoryIcon";
import { CardIcon } from "./CardParts";
import "./intro-modal.css";

/** The videos, newest first (the first plays when the dialog opens). Keys in the media bucket. */
const VIDEOS = [
  // Made Oct 2026 with scripts/promo (docs/promo-video.md).
  { key: "events/promo-video-v2.mp4", label: "Trailer", length: "1:22", aria: "Ancestor Atlas trailer" },
  { key: "events/promo-video.mp4", label: "First intro", length: "1:52", aria: "Ancestor Atlas first intro video" },
];

const n = (v: number) => v.toLocaleString("en-US");

/** What the atlas holds, one line per category, counted from the data (fixed numbers went stale as it grew). */
function highlights(counts: Record<Category, { entities: number; sites: number }> | null) {
  const c = (cat: Category) => counts?.[cat];
  const sp = c("species");
  const cu = c("culture");
  const ci = c("civilization");
  const ev = c("event");
  return [
    {
      category: "species" as const,
      title: "Human evolution",
      text: sp ? `${n(sp.entities)} species at ${n(sp.sites)} fossil sites, from the first upright apes to us.` : "Our ancestors and relatives, from the first upright apes to us.",
    },
    {
      category: "culture" as const,
      title: "Archaeological cultures",
      text: cu ? `${n(cu.entities)} cultures at ${n(cu.sites)} sites, many of them radiocarbon-dated.` : "Toolmakers, hunters and the first farmers, many of their sites radiocarbon-dated.",
    },
    {
      category: "civilization" as const,
      title: "Early civilizations",
      text: ci ? `${n(ci.entities)} states and empires with their territories, across the ancient world to 1 CE.` : "States and empires with their territories, across the ancient world to 1 CE.",
    },
    {
      category: "event" as const,
      title: "Events and inventions",
      text: ev ? `${n(ev.entities)} moments, from the first stone tools to paper, with pictures and narration.` : "Major moments, from the first stone tools to paper, with pictures and narration.",
    },
  ];
}

export default function IntroModal() {
  const setIntroOpen = useStore((s) => s.setIntroOpen);
  const data = useData();
  const counts = useMemo(() => {
    if (!data) return null;
    const out = { species: { entities: 0, sites: 0 }, culture: { entities: 0, sites: 0 }, civilization: { entities: 0, sites: 0 }, event: { entities: 0, sites: 0 } };
    // Groups (Ancient Egypt) are counted through their members, as on the Civilizations page.
    for (const e of data.entities) if (!e.group) out[e.category].entities += 1;
    for (const f of data.features) out[f.category].sites += 1;
    return out;
  }, [data]);
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
          title="Close (Esc)"
        >
          <CardIcon name="close" size={16} />
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
            {highlights(counts).map((h) => (
              <div key={h.category} className="intro-feat">
                <CategoryBadge category={h.category} size={30} decorative />
                <div>
                  <strong>{h.title}</strong>
                  <span>{h.text}</span>
                </div>
              </div>
            ))}
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
