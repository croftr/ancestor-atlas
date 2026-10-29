import type { CSSProperties } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { navigate } from "../route";
import { formatYear } from "../time/scale";
import { stopMusic } from "../audio/music";
import { minutes, stopsOf } from "./summary";
import { closingAt, reachedAt, spanWords } from "./epilogue";
import { beginTour } from "./TourPlayer";
import type { Tour } from "./tours";

/** Starting the tour again from the end card: the music still playing makes way this quickly. */
const RESTART_FADE_S = 2;

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
    <path d={d} fill="currentColor" fillRule="evenodd" />
  </svg>
);
const ICON = {
  again: "M8 2.5a5.5 5.5 0 1 1-5.2 3.7l1.4.5A4 4 0 1 0 8 4v2L4.5 3.25 8 .5z",
  tours: "M2 3h12v10H2zM3.3 4.2v1.3h1.3V4.2zm0 3.1v1.4h1.3V7.3zm0 3.2v1.3h1.3v-1.3zm8.1-6.3v1.3h1.3V4.2zm0 3.1v1.4h1.3V7.3zm0 3.2v1.3h1.3v-1.3zM5.8 4.2v7.6h4.4V4.2z",
  globe: "M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm-1 1.6A5 5 0 0 0 3.1 7H5a10 10 0 0 1 2-3.9zm2 0A10 10 0 0 1 11 7h1.9A5 5 0 0 0 9 3.1zM8 3.6A8.5 8.5 0 0 0 6.5 7h3A8.5 8.5 0 0 0 8 3.6zM3.1 8.5A5 5 0 0 0 7 12.9a10 10 0 0 1-2-4.4zm3.4 0A8.5 8.5 0 0 0 8 12.4a8.5 8.5 0 0 0 1.5-3.9zm4.5 0a10 10 0 0 1-2 4.4 5 5 0 0 0 3.9-4.4z",
};

/**
 * The end of a tour (its epilogue): over the globe as it draws the journey again, in the card's place.
 * Each stop's picture lights up as the thread on the globe reaches it (epilogue.ts keeps both on one
 * schedule); a picture goes back to that stop. Then: watch again, more tours, or explore. Closes when
 * the tour ends by itself, after the outro (TourPlayer.tsx), unless the viewer chooses first.
 */
export default function EndCard({ tour }: { tour: Tour }) {
  const data = useData();
  const paused = useStore((s) => s.tour?.paused ?? false);
  const tourGo = useStore((s) => s.tourGo);
  if (!data) return null;
  const stops = stopsOf(tour, data);
  const years = stops.flatMap((s) => (s.year === null ? [] : [s.year]));
  const span = years.length > 1 ? Math.max(...years) - Math.min(...years) : 0;
  const n = tour.stops.length;
  const end = () => useStore.getState().stopTour();

  return (
    <section className={`tour-end${paused ? " paused" : ""}`} aria-label={`End of the tour: ${tour.title}`}>
      <div className="tour-end-kicker">Journey's end</div>
      {tour.book?.cover && <img className="tour-end-cover" src={tour.book.cover.url} alt={`Cover of ${tour.book.title}`} title={tour.book.cover.credit} />}
      <h2 className="tour-end-title">{tour.title}</h2>
      {tour.book && <p className="tour-end-by">{tour.book.author}</p>}
      <p className="tour-end-span">
        {span > 0 && <>{spanWords(span)} in </>}about {minutes(tour, data)} minutes
      </p>
      <ol className="tour-end-strip">
        {stops.map((s, i) => (
          <li key={s.index} style={{ "--at": `${reachedAt(s.index, n)}ms` } as CSSProperties}>
            <button
              onClick={() => tourGo(s.index)}
              title={`${i + 1}. ${s.entity.name}${s.year === null ? "" : ` · ${formatYear(s.year)}`}: watch from here`}
              aria-label={`Back to stop ${i + 1}, ${s.entity.name}`}
            >
              {s.picture ? <img src={s.picture.url} alt="" loading="lazy" /> : <span className="tour-end-blank" />}
              <span className="tour-end-num">{i + 1}</span>
            </button>
          </li>
        ))}
      </ol>
      {/* Appears once the thread is drawn, as the narrator (if any) begins to read it. */}
      {tour.closing && (
        <p className="tour-end-closing" style={{ animationDelay: `${closingAt(n)}ms` }}>
          {tour.closing}
        </p>
      )}
      <div className="tour-end-actions">
        <button
          className="tour-end-primary"
          onClick={() => {
            stopMusic(RESTART_FADE_S);
            beginTour(() => useStore.getState().startTour(tour.id));
          }}
        >
          <Icon d={ICON.again} /> Watch again
        </button>
        <button
          onClick={() => {
            end();
            navigate("tours");
          }}
        >
          <Icon d={ICON.tours} /> More tours
        </button>
        <button onClick={end}>
          <Icon d={ICON.globe} /> Explore the globe
        </button>
      </div>
      {tour.book && (
        <div className="tour-end-credit">
          From <cite>{tour.book.title}</cite> by {tour.book.author} ({tour.book.publisher}, {tour.book.year}).{" "}
          <a href={tour.book.link} target="_blank" rel="noreferrer">
            About the book
          </a>
        </div>
      )}
      {tour.music && <div className="tour-end-credit">{tour.music.credit}</div>}
    </section>
  );
}
