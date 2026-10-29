import type { CSSProperties } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { minutes } from "./summary";
import type { Tour } from "./tours";

/**
 * The title card before a tour's first stop: its name, blurb and length over the globe as it turns
 * to the first place, while the announcement reads them out. A book tour shows the book and its synopsis
 * in place of the blurb. Fades in and out over its hold (frozen
 * while paused); Skip goes straight to the first stop.
 */
export default function TitleCard({ tour }: { tour: Tour }) {
  const data = useData();
  const holdMs = useStore((s) => s.tour?.holdMs ?? 0);
  const paused = useStore((s) => s.tour?.paused ?? false);
  const skipIntro = useStore((s) => s.skipIntro);
  if (!holdMs) return null;
  return (
    <div className="tour-title-wrap">
      <div
        className="tour-title-card"
        role="status"
        style={{ animationDuration: `${holdMs}ms`, animationPlayState: paused ? "paused" : "running" } as CSSProperties}
      >
        <div className="tour-title-kicker">
          {tour.book ? "Book tour" : "Guided tour"}
          {tour.draft && <span className="book-draft" title="Draft: the notes are not yet checked against the book">Draft</span>}
        </div>
        {tour.book?.cover && (
          <img className="book-title-cover" src={tour.book.cover.url} alt={`Cover of ${tour.book.title}`} title={tour.book.cover.credit} />
        )}
        <h2 className="tour-title-name">{tour.title}</h2>
        {tour.book && (
          <div className="book-title-by">
            {tour.book.author} · {tour.book.publisher}, {tour.book.year}
          </div>
        )}
        <p className={`tour-title-blurb${tour.synopsis ? " book-synopsis" : ""}`}>{tour.synopsis ?? tour.blurb}</p>
        <div className="tour-title-meta">
          {tour.stops.length} stops{data && ` · about ${minutes(tour, data)} min`}
        </div>
        {/* The music's credit (CC BY): here, and in the tour bar's music button tooltip. */}
        {tour.music && <div className="tour-title-credit">{tour.music.credit}</div>}
        <button className="tour-title-skip" onClick={skipIntro}>
          Skip intro
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M11 3h2v10h-2zM3 3v10l7-5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
