import DataLoading from "../ui/DataLoading";
import { useMemo, useState, type CSSProperties } from "react";
import { useData } from "../map/data";
import { formatYear } from "../time/scale";
import { CATEGORY_STYLE } from "../config";
import { CategoryBadge } from "../ui/CategoryIcon";
import Totals from "../browse/Totals";
import { TOURS, type Tour } from "./tours";
import { watchTour } from "./watchTour";
import { coverPictures, minutes, narrated, stopsOf, type StopSummary } from "./summary";
import { ToursIcon } from "../ui/SideNav";
import { shareLink, tourShareUrl } from "../share";

/** A stop's picture, or its category's badge on a tinted tile. */
function StopPicture({ stop, className }: { stop: StopSummary; className: string }) {
  const tint = CATEGORY_STYLE[stop.entity.category].color;
  return (
    <span className={`${className}${stop.entity.category === "event" ? " is-event" : ""}`} style={{ "--tint": tint } as CSSProperties}>
      {stop.picture ? (
        <img src={stop.picture.url} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />
      ) : (
        <CategoryBadge category={stop.entity.category} decorative />
      )}
    </span>
  );
}

/** Share a tour: the phone's share sheet, else copy the link ("Link copied"). */
function ShareTour({ tour }: { tour: Tour }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="tp-share"
      aria-live="polite"
      onClick={async () => {
        if (await shareLink(tour.title, tourShareUrl(tour.id))) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

function TourCard({ tour, stops, mins }: { tour: Tour; stops: StopSummary[]; mins: number }) {
  const cover = coverPictures(stops);
  const book = tour.book;
  const first = stops[0];
  const last = stops.at(-1);
  return (
    <article className="tp-card" aria-labelledby={`tp-${tour.id}`}>
      <button className="tp-cover" onClick={() => watchTour(tour.id)} aria-label={`Watch ${tour.title}`}>
        {book?.cover ? (
          // A book tour shows the book: whole, over a blurred copy of itself.
          <span className="tp-book-cover" style={{ "--cover": `url(${book.cover.url})` } as CSSProperties} title={book.cover.credit}>
            <img src={book.cover.url} alt={`Cover of ${book.title}`} loading="lazy" />
          </span>
        ) : (
          <span className={`tp-mosaic n${cover.length}`}>
            {cover.map((s) => (
              <StopPicture key={s.index} stop={s} className="tp-cell" />
            ))}
          </span>
        )}
        <span className="tp-play" aria-hidden>
          <svg viewBox="0 0 16 16" width="22" height="22">
            <path d="M4.5 2.5v11L13.5 8z" fill="currentColor" />
          </svg>
        </span>
      </button>
      <div className="tp-body">
        <h2 id={`tp-${tour.id}`}>
          {tour.title}
          {tour.draft && <span className="book-draft" title="Draft: the notes are not yet checked against the book">Draft</span>}
        </h2>
        {tour.book && (
          <div className="tp-book">
            <cite>{tour.book.title}</cite> by {tour.book.author} ({tour.book.year}) ·{" "}
            <a href={tour.book.link} target="_blank" rel="noreferrer">
              about the book
            </a>
          </div>
        )}
        {first?.year != null && last?.year != null && (
          <div className="tp-span muted">
            {formatYear(first.year)} to {formatYear(last.year)}
          </div>
        )}
        <p className="tp-blurb">{tour.blurb}</p>
        <div className="tp-meta">
          <span>{stops.length} stops</span>
          <span>about {mins} min</span>
          {narrated(stops) && (!tour.book || tour.stops.every((s) => s.note?.narration)) && <span>narrated</span>}
          {tour.book && <span>notes from the book</span>}
          {tour.music && <span>with music</span>}
        </div>
        <div className="tp-actions">
          <button className="tp-watch" onClick={() => watchTour(tour.id)}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
              <path d="M4.5 2.5v11L13.5 8z" fill="currentColor" />
            </svg>
            Watch the tour
          </button>
          <ShareTour tour={tour} />
        </div>
      </div>
      <details className="tp-stops">
        <summary>The stops, or start from one</summary>
        <ol>
          {stops.map((s) => (
            <li key={s.index}>
              <button onClick={() => watchTour(tour.id, s.index)} title={`Start the tour at stop ${s.index + 1}: ${s.name}`}>
                <StopPicture stop={s} className="tp-thumb" />
                <span className="tp-stop-text">
                  <span className="tp-stop-name">
                    <span className="tp-stop-n">{s.index + 1}</span> {s.name}
                  </span>
                  {s.book && <span className="tp-stop-book">From the book</span>}
                  {s.year != null && <span className="tp-stop-year muted">{formatYear(s.year)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

/**
 * Tours page (#/tours): every guided tour as a card (a cover from its stops' pictures, what it
 * covers, how long it runs), to watch from the start or from any stop; book tours in a section of their own. The time bar's Tours menu
 * is the quick way in from the globe.
 */
export default function ToursPage() {
  const data = useData();
  const tours = useMemo(
    () => (data ? TOURS.map((t) => ({ tour: t, stops: stopsOf(t, data), mins: minutes(t, data) })) : []),
    [data],
  );

  if (!data) return <div className="events-page"><div className="ev-loading muted"><DataLoading /></div></div>;

  const totalStops = tours.reduce((n, t) => n + t.stops.length, 0);
  const totalMins = tours.reduce((n, t) => n + t.mins, 0);

  return (
    <div className="events-page br-page tp-page" style={{ "--accent": "#c39bff" } as CSSProperties}>
      <header className="ev-header br-intro">
        <div className="ev-title">
          <h1 className="cat-title">
            <span className="tp-title-icon">{ToursIcon}</span>
            Tours
          </h1>
          <span className="muted ev-count">sit back and watch: the globe plays itself, with narration and music</span>
        </div>
        <Totals
          items={[
            { label: "Tours", value: tours.length },
            { label: "Stops", value: totalStops },
            { label: "Minutes in all", value: totalMins, title: "Rough running time: each narration plus the travel between stops" },
          ]}
        />
      </header>
      <main className="ev-main tp-main">
        {tours.filter((t) => !t.tour.book).map(({ tour, stops, mins }) => (
          <TourCard key={tour.id} tour={tour} stops={stops} mins={mins} />
        ))}
        {tours.some((t) => t.tour.book) && (
          <>
            <div className="tp-section">
              <h2>Book tours</h2>
              <p className="muted">
                A book on the deep past, told through its places: what the book says about each, then the place on the
                globe.
              </p>
            </div>
            {tours.filter((t) => t.tour.book).map(({ tour, stops, mins }) => (
              <TourCard key={tour.id} tour={tour} stops={stops} mins={mins} />
            ))}
          </>
        )}
        <p className="muted tp-note">
          The pause button on the tour bar (or Space) pauses a tour; the arrow keys step between stops and Escape ends it.
          Touching the globe or the card does not stop it.
        </p>
      </main>
    </div>
  );
}
