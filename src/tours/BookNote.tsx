import type { CSSProperties } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import type { Tour } from "./tours";

/**
 * A book tour's note on the stop (docs/book-tours.md): what the book makes of this place, over the globe
 * once it has turned there and before the card opens. Fades in and out over its hold (frozen while
 * paused); Continue opens the card straight away.
 */
export default function BookNote({ tour }: { tour: Tour }) {
  const data = useData();
  const shown = useStore((s) => s.tour?.note === true);
  const index = useStore((s) => s.tour?.index ?? 0);
  const holdMs = useStore((s) => s.tour?.holdMs ?? 0);
  const paused = useStore((s) => s.tour?.paused ?? false);
  const skipNote = useStore((s) => s.skipNote);
  const stop = tour.stops[index];
  if (!shown || !stop?.note || !tour.book || !holdMs) return null;
  const entity = data?.entityById.get(stop.entity);
  const site = stop.site ? data?.featureById.get(stop.site)?.label : undefined;
  return (
    <div className="tour-title-wrap book-note-wrap">
      <figure
        key={index}
        className="tour-title-card book-note"
        role="status"
        style={{ animationDuration: `${holdMs}ms`, animationPlayState: paused ? "paused" : "running" } as CSSProperties}
      >
        <div className="tour-title-kicker">
          From the book{stop.note.chapter && ` · ${stop.note.chapter}`}
          {tour.draft && <span className="book-draft" title="Draft: not yet checked against the book">Draft</span>}
        </div>
        <div className="book-note-place">
          {site ?? entity?.name}
          {site && entity && <span> · {entity.name}</span>}
        </div>
        <blockquote className="book-note-text">{stop.note.text}</blockquote>
        <figcaption className="book-note-source">
          <cite>{tour.book.title}</cite>, {tour.book.author}
        </figcaption>
        <button className="tour-title-skip" onClick={skipNote}>
          Continue
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M11 3h2v10h-2zM3 3v10l7-5z" />
          </svg>
        </button>
      </figure>
    </div>
  );
}
