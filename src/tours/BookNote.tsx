import { useState, type CSSProperties } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { STACKED_QUERY } from "../config";
import { CardIcon } from "../ui/CardParts";
import CardResizer from "../ui/CardResizer";
import PictureViewer from "../ui/PictureViewer";
import { PictureNav, creditLine } from "../ui/PictureNav";
import { useMediaQuery } from "../ui/useMediaQuery";
import type { Picture } from "./tourPicture";
import type { Tour } from "./tours";

/**
 * A book tour's note on the stop (docs/book-tours.md): what the book makes of this place, in the info
 * card's place and dress, once the globe has turned there and before the place's own card opens. The
 * book's cover is its badge; the note's pictures of the place take turns while it is read (or the viewer
 * steps through them). A note without pictures shows the cover in the frame instead. It is a stop of its own and behaves like the info card: its left edge drags
 * to resize it (desktop), a tap on the picture opens the full-screen viewer, and ✕ closes it (the tour
 * plays on).
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
  const viewerOpen = useStore((s) => s.pictureViewer);
  const setViewerOpen = useStore((s) => s.setPictureViewer);
  const stacked = useMediaQuery(STACKED_QUERY);
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);
  const stop = tour.stops[index];
  const book = tour.book!;
  const note = stop.note!;
  const pictures: Picture[] = note.images?.length
    ? note.images
    : book.cover
      ? [{ url: book.cover.url, credit: book.cover.credit, caption: `Cover of ${book.title}` }]
      : [];
  const current = Math.min(manual ?? timed, pictures.length - 1);
  const picture = pictures[current];
  const isCover = !note.images?.length;
  const entity = data?.entityById.get(stop.entity);
  const feature = stop.site ? data?.featureById.get(stop.site) : undefined;
  const site = feature?.label;
  const title = note.title ?? site ?? entity?.name ?? "";
  // The viewer steps its own copy of the pictures in a tour; keyed to this note, not the entity's card.
  const viewer = viewerOpen && entity && pictures.length > 0 && (
    <PictureViewer
      entity={{ ...entity, id: `${tour.id}:note:${index}`, name: title, video: undefined }}
      date={feature?.date_text ?? entity.date_text ?? ""}
      pictures={pictures}
      index={current}
      onIndex={setManual}
      miniGlobe={!stacked}
    />
  );
  return (
    <>
    {viewer}
    {!stacked && <CardResizer panel={panelEl} />}
    <aside ref={setPanelEl} className="panel info-panel book-note-card" aria-label={`From the book: ${title}`}>
      <div className="info-head">
        <div className="card-head">
          {/* The book's cover in the badge's place: a tall rectangle beside the eyebrow, name and date. */}
          {book.cover ? (
            <img className="book-badge-cover" src={book.cover.url} alt="" aria-hidden="true" />
          ) : (
            <span className="book-badge" aria-hidden="true">
              <CardIcon name="page" size={20} />
            </span>
          )}
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
              <div className="card-tools">
                <button className="card-tool close" onClick={skipNote} aria-label="Close" title="Close (the tour plays on)">
                  <CardIcon name="close" size={16} />
                </button>
              </div>
            </div>
            <h2 className="card-title">{title}</h2>
            {title !== entity?.name && entity && <div className="card-sub">{entity.name}</div>}
            <div className="book-head-by">
              <cite>{book.title}</cite> · {book.author}
            </div>
          </div>
        </div>
      </div>
      {picture && (
        <>
          <div
            className={`info-media book-note-media pv-open${isCover ? " is-cover" : ""}`}
            style={{ "--cover": `url(${picture.url})` } as CSSProperties}
            onClick={() => setViewerOpen(true)}
          >
            <img key={picture.url} className={current > 0 ? "picture-in" : undefined} src={picture.url} alt={picture.caption ?? ""} />
            <button
              className="pv-open-hint"
              onClick={(e) => {
                e.stopPropagation();
                setViewerOpen(true);
              }}
              aria-label="View pictures full screen"
              title="View full screen"
            >
              <svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true">
                <path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5 7 5M1.5 10.5 5 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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
      <blockquote className="card-desc book-note-text">{note.text}</blockquote>
      <div className="book-note-source">
        <cite>{book.title}</cite> by {book.author} ({book.publisher}, {book.year})
      </div>
      <a className="card-readmore" href={book.link} target="_blank" rel="noreferrer">
        About the book
        <CardIcon name="external" size={14} />
      </a>
    </aside>
    </>
  );
}
