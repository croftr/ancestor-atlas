import type { CSSProperties } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { CardIcon } from "../ui/CardParts";
import type { Tour } from "./tours";

/**
 * A book tour's note on the stop (docs/book-tours.md): what the book makes of this place, in the info
 * card's place and dress, once the globe has turned there and before the place's own card opens. The
 * book's cover is its picture. Continue opens the card straight away.
 */
export default function BookNote({ tour }: { tour: Tour }) {
  const data = useData();
  const shown = useStore((s) => s.tour?.note === true);
  const index = useStore((s) => s.tour?.index ?? 0);
  const skipNote = useStore((s) => s.skipNote);
  const stop = tour.stops[index];
  const book = tour.book;
  if (!shown || !stop?.note || !book) return null;
  const entity = data?.entityById.get(stop.entity);
  const site = stop.site ? data?.featureById.get(stop.site)?.label : undefined;
  return (
    <aside key={index} className="panel info-panel book-note-card" aria-label={`From the book: ${site ?? entity?.name ?? ""}`}>
      <div className="info-head">
        <div className="card-head">
          <span className="book-badge" aria-hidden="true">
            <CardIcon name="page" size={20} />
          </span>
          <div className="card-head-text">
            <div className="card-eyebrow-row">
              <div className="card-eyebrow book-eyebrow">
                <span>From the book</span>
                {stop.note.chapter && (
                  <>
                    <span className="card-eyebrow-sep" aria-hidden="true">·</span>
                    <span>{stop.note.chapter}</span>
                  </>
                )}
                {tour.draft && (
                  <span className="book-draft" title="Draft: not yet checked against the book">
                    Draft
                  </span>
                )}
              </div>
            </div>
            <h2 className="card-title">{site ?? entity?.name}</h2>
            <div className="card-sub">{site && entity ? entity.name : `${book.title}, ${book.author}`}</div>
          </div>
        </div>
      </div>
      {book.cover && (
        <>
          <div className="info-media book-note-media" style={{ "--cover": `url(${book.cover.url})` } as CSSProperties}>
            <img src={book.cover.url} alt={`Cover of ${book.title}`} />
          </div>
          <div className="muted image-credit">{book.cover.credit}</div>
        </>
      )}
      <p className="card-desc">{stop.note.text}</p>
      <div className="book-note-source">
        <cite>{book.title}</cite> by {book.author} ({book.publisher}, {book.year})
      </div>
      <a className="card-readmore" href={book.link} target="_blank" rel="noreferrer">
        About the book
        <CardIcon name="external" size={14} />
      </a>
      <button className="book-note-continue" onClick={skipNote}>
        Continue
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path fill="currentColor" d="M11 3h2v10h-2zM3 3v10l7-5z" />
        </svg>
      </button>
    </aside>
  );
}
