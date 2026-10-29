import { useState, type CSSProperties } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { CardIcon } from "../ui/CardParts";
import { PictureNav, creditLine } from "../ui/PictureNav";
import type { Picture } from "./tourPicture";
import type { Tour } from "./tours";

/**
 * A book tour's note on the stop (docs/book-tours.md): what the book makes of this place, in the info
 * card's place and dress, once the globe has turned there and before the place's own card opens. The
 * book's cover comes first, then the note's pictures of the place take turns while it is read (or the
 * viewer steps through them). Continue opens the card straight away.
 */
export default function BookNote({ tour }: { tour: Tour }) {
  const shown = useStore((s) => s.tour?.note === true);
  const index = useStore((s) => s.tour?.index ?? 0);
  const stop = tour.stops[index];
  if (!shown || !stop?.note || !tour.book) return null;
  return <NoteCard key={index} tour={tour} index={index} />;
}

function NoteCard({ tour, index }: { tour: Tour; index: number }) {
  const data = useData();
  const skipNote = useStore((s) => s.skipNote);
  const timed = useStore((s) => s.tour?.notePicture ?? 0);
  // Stepped by hand, the pictures stay where the viewer put them for this stop.
  const [manual, setManual] = useState<number | null>(null);
  const stop = tour.stops[index];
  const book = tour.book!;
  const note = stop.note!;
  const pictures: Picture[] = [
    ...(book.cover ? [{ url: book.cover.url, credit: book.cover.credit, caption: `Cover of ${book.title}` }] : []),
    ...(note.images ?? []),
  ];
  const current = Math.min(manual ?? timed, pictures.length - 1);
  const picture = pictures[current];
  const isCover = !!book.cover && current === 0;
  const entity = data?.entityById.get(stop.entity);
  const site = stop.site ? data?.featureById.get(stop.site)?.label : undefined;
  return (
    <aside className="panel info-panel book-note-card" aria-label={`From the book: ${site ?? entity?.name ?? ""}`}>
      <div className="info-head">
        <div className="card-head">
          <span className="book-badge" aria-hidden="true">
            <CardIcon name="page" size={20} />
          </span>
          <div className="card-head-text">
            <div className="card-eyebrow-row">
              <div className="card-eyebrow book-eyebrow">
                <span>From the book</span>
                {note.chapter && (
                  <>
                    <span className="card-eyebrow-sep" aria-hidden="true">·</span>
                    <span>{note.chapter}</span>
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
      {picture && (
        <>
          <div className={`info-media book-note-media${isCover ? " is-cover" : ""}`} style={{ "--cover": `url(${picture.url})` } as CSSProperties}>
            <img key={picture.url} className={current > 0 ? "picture-in" : undefined} src={picture.url} alt={picture.caption ?? ""} />
            <PictureNav
              count={pictures.length}
              current={current}
              onPrev={() => setManual((current - 1 + pictures.length) % pictures.length)}
              onNext={() => setManual((current + 1) % pictures.length)}
              onSelect={setManual}
            />
          </div>
          <div className="muted image-credit">{isCover ? picture.credit : creditLine(picture.credit, picture.caption, picture.source)}</div>
        </>
      )}
      <p className="card-desc">{note.text}</p>
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
