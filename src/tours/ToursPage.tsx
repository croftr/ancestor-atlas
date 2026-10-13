import { useMemo, type CSSProperties } from "react";
import { useData } from "../map/data";
import { navigate } from "../route";
import { useStore } from "../store";
import { formatYear } from "../time/scale";
import { CATEGORY_STYLE } from "../config";
import { CategoryBadge } from "../ui/CategoryIcon";
import Totals from "../browse/Totals";
import { TOURS, type Tour } from "./tours";
import { beginTour } from "./TourPlayer";
import { coverPictures, minutes, narrated, stopsOf, type StopSummary } from "./summary";
import { ToursIcon } from "../ui/SideNav";
import "../events/events-page.css";
import "../browse/browse.css";
import "./tours-page.css";

/** From a tap: start the tour (at stop `index`) and go to the globe to watch it. */
export function watchTour(id: string, index = 0) {
  beginTour(() => useStore.getState().startTour(id, { index }));
  navigate("globe");
}

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

function TourCard({ tour, stops, mins }: { tour: Tour; stops: StopSummary[]; mins: number }) {
  const cover = coverPictures(stops);
  const first = stops[0];
  const last = stops.at(-1);
  return (
    <article className="tp-card" aria-labelledby={`tp-${tour.id}`}>
      <button className="tp-cover" onClick={() => watchTour(tour.id)} aria-label={`Watch ${tour.title}`}>
        <span className={`tp-mosaic n${cover.length}`}>
          {cover.map((s) => (
            <StopPicture key={s.index} stop={s} className="tp-cell" />
          ))}
        </span>
        <span className="tp-play" aria-hidden>
          <svg viewBox="0 0 16 16" width="22" height="22">
            <path d="M4.5 2.5v11L13.5 8z" fill="currentColor" />
          </svg>
        </span>
      </button>
      <div className="tp-body">
        <h2 id={`tp-${tour.id}`}>{tour.title}</h2>
        {first?.year != null && last?.year != null && (
          <div className="tp-span muted">
            {formatYear(first.year)} to {formatYear(last.year)}
          </div>
        )}
        <p className="tp-blurb">{tour.blurb}</p>
        <div className="tp-meta">
          <span>{stops.length} stops</span>
          <span>about {mins} min</span>
          {narrated(stops) && <span>narrated</span>}
          {tour.music && <span>with music</span>}
        </div>
        <button className="tp-watch" onClick={() => watchTour(tour.id)}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
            <path d="M4.5 2.5v11L13.5 8z" fill="currentColor" />
          </svg>
          Watch the tour
        </button>
      </div>
      <details className="tp-stops">
        <summary>The stops, or start from one</summary>
        <ol>
          {stops.map((s) => (
            <li key={s.index}>
              <button onClick={() => watchTour(tour.id, s.index)} title={`Start the tour at stop ${s.index + 1}: ${s.entity.name}`}>
                <StopPicture stop={s} className="tp-thumb" />
                <span className="tp-stop-text">
                  <span className="tp-stop-name">
                    <span className="tp-stop-n">{s.index + 1}</span> {s.entity.name}
                  </span>
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
 * covers, how long it runs), to watch from the start or from any stop. The time bar's Tours menu
 * is the quick way in from the globe.
 */
export default function ToursPage() {
  const data = useData();
  const tours = useMemo(
    () => (data ? TOURS.map((t) => ({ tour: t, stops: stopsOf(t, data), mins: minutes(t, data) })) : []),
    [data],
  );

  if (!data) return <div className="events-page"><div className="ev-loading muted">Loading…</div></div>;

  const totalStops = tours.reduce((n, t) => n + t.stops.length, 0);
  const totalMins = tours.reduce((n, t) => n + t.mins, 0);

  return (
    <div className="events-page br-page tp-page" style={{ "--accent": "#c39bff" } as CSSProperties}>
      <header className="ev-header">
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
        {tours.map(({ tour, stops, mins }) => (
          <TourCard key={tour.id} tour={tour} stops={stops} mins={mins} />
        ))}
        <p className="muted tp-note">
          Touch the globe or the card to pause a tour and look around; the arrow keys step between stops, Space pauses and
          Escape ends it.
        </p>
      </main>
    </div>
  );
}
