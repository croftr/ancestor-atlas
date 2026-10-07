import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_STYLE, TIMELINE_ERAS } from "../config";
import { useData } from "../map/data";
import { navigate, useOpenEvent } from "../route";
import { useStore } from "../store";
import { formatRange } from "../time/scale";
import { eraIndexOf, erasFor, firstSentence, type Era } from "../timeline/layout";
import type { Entity } from "../types";
import { refLink } from "../ui/refs";
import EventImage from "./EventImage";
import "./events-page.css";

const yearOf = (e: Entity) => e.year ?? e.start_year;

/** Events page (#/events): every event by era as picture tiles; one opens in a detail view (#/events/<id>). */
export default function EventsPage() {
  const data = useData();
  const openId = useOpenEvent();
  const [eraFilter, setEraFilter] = useState<number | null>(null);

  const events = useMemo(
    () => (data?.entities ?? []).filter((e) => e.category === "event").sort((a, b) => yearOf(a) - yearOf(b)),
    [data],
  );
  const eras = useMemo(() => (data ? erasFor(data.entities, TIMELINE_ERAS) : []), [data]);
  const eraOf = (e: Entity) => eraIndexOf(eras, { start: yearOf(e), end: yearOf(e) });
  const byEra = useMemo(() => {
    const m = eras.map((era) => ({ era, events: [] as Entity[] }));
    for (const e of events) m[eraIndexOf(eras, { start: yearOf(e), end: yearOf(e) })]?.events.push(e);
    return m;
  }, [eras, events]);

  if (!data) return <div className="events-page"><div className="ev-loading muted">Loading…</div></div>;

  const open = openId ? events.find((e) => e.id === openId) : undefined;
  const shown = byEra.filter((s, i) => s.events.length > 0 && (eraFilter === null || eraFilter === i));

  return (
    <div className="events-page">
      <header className="ev-header">
        <div className="ev-title">
          <img src="/logo-128.webp" alt="" width={30} height={30} />
          <h1>Events</h1>
          <span className="muted ev-count">{events.length} moments, from 7 million years ago to 1 CE</span>
        </div>
        <div className="ev-filters" role="group" aria-label="Filter by era">
          <button className={`chip${eraFilter === null ? " active" : ""}`} aria-pressed={eraFilter === null} onClick={() => setEraFilter(null)}>
            All eras
          </button>
          {byEra.map(({ era, events: list }, i) =>
            list.length ? (
              <button
                key={era.label}
                className={`chip${eraFilter === i ? " active" : ""}`}
                aria-pressed={eraFilter === i}
                onClick={() => setEraFilter(eraFilter === i ? null : i)}
              >
                {era.label} <span className="ev-chip-count">{list.length}</span>
              </button>
            ) : null,
          )}
        </div>
      </header>

      <main className="ev-main">
        {shown.map(({ era, events: list }) => (
          <section key={era.label} className="ev-section" aria-labelledby={`era-${era.label}`}>
            <h2 id={`era-${era.label}`}>
              {era.label} <span className="muted">{formatRange(Math.round(era.start), Math.round(era.end))}</span>
            </h2>
            <ul className="ev-grid">
              {list.map((e) => (
                <li key={e.id}>
                  <button className="ev-tile" onClick={() => navigate("events", e.id)}>
                    <EventImage event={e} />
                    <span className="ev-tile-date">{e.date_text}</span>
                    <span className="ev-tile-name">{e.name}</span>
                    <span className="ev-tile-summary">{firstSentence(e.description)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {open && <EventDetail event={open} events={events} era={eras[eraOf(open)]} />}
    </div>
  );
}

/** One event, over the page: picture, text, places and sources, links out; ←/→ step through events. */
function EventDetail({ event, events, era }: { event: Entity; events: Entity[]; era?: Era }) {
  const data = useData()!;
  const focusEntity = useStore((s) => s.focusEntity);
  const i = events.findIndex((e) => e.id === event.id);
  const prev = i > 0 ? events[i - 1] : undefined;
  const next = i < events.length - 1 ? events[i + 1] : undefined;
  const places = data.featuresOf.get(event.id) ?? [];
  const related = (event.related_ids ?? []).flatMap((r) => data.entityById.get(r) ?? []);
  const dateRef = refLink(places[0]?.date_source);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [event.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate("events");
      else if (e.key === "ArrowLeft" && prev) navigate("events", prev.id);
      else if (e.key === "ArrowRight" && next) navigate("events", next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const showOnGlobe = (id: string) => {
    focusEntity(id);
    navigate("globe");
  };

  return (
    <div className="ev-overlay" onClick={(e) => e.target === e.currentTarget && navigate("events")}>
      <article className="ev-detail panel" role="dialog" aria-modal="true" aria-labelledby="ev-detail-name">
        <button ref={closeRef} className="ev-close" onClick={() => navigate("events")} aria-label="Close">
          ✕
        </button>
        <div className="ev-detail-media">
          <EventImage event={event} className="large" />
          {event.image_credit && <div className="muted image-credit">{event.image_credit}</div>}
        </div>
        <div className="ev-detail-body">
          {era && <div className="ev-detail-era">{era.label}</div>}
          <h2 id="ev-detail-name">{event.name}</h2>
          <div className="ev-detail-date">{event.date_text}</div>
          <p>{event.description}</p>

          {related.length > 0 && (
            <div className="related">
              <div className="muted">Related:</div>
              <div className="also">
                {related.map((r) => (
                  <button key={r.id} className="chip" onClick={() => showOnGlobe(r.id)} title={`${formatRange(r.start_year, r.end_year)}: show on the globe`}>
                    <span className="related-dot" style={{ background: r.color ?? CATEGORY_STYLE[r.category].color }} />
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ev-places">
            <div className="muted">{places.length === 1 ? "Place" : "Places"}:</div>
            <ul>
              {places.map((p) => {
                const coord = refLink(p.coord_source);
                return (
                  <li key={p.id}>
                    {p.label}
                    {coord?.href && (
                      <>
                        {" "}
                        <a className="muted" href={coord.href} target="_blank" rel="noreferrer">({coord.label})</a>
                      </>
                    )}
                    {p.notes && <div className="muted ev-place-note">{p.notes}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="muted ev-sources">
            {dateRef && (
              <>
                Date checked against{" "}
                {dateRef.href ? <a href={dateRef.href} target="_blank" rel="noreferrer">{dateRef.label}</a> : dateRef.label}
              </>
            )}
            {event.wikipedia_url && (
              <>
                {dateRef ? " · " : ""}
                <a href={event.wikipedia_url} target="_blank" rel="noreferrer">Read more</a>
              </>
            )}
          </div>

          <div className="ev-actions">
            <button className="tl-btn" onClick={() => showOnGlobe(event.id)}>Show on globe</button>
            <button className="tl-btn" onClick={() => navigate("timeline", event.id)}>See on timeline</button>
          </div>

          <nav className="ev-stepper" aria-label="Other events">
            <button className="tl-btn" disabled={!prev} onClick={() => prev && navigate("events", prev.id)} title={prev?.name}>
              ‹ <span className="ev-step-name">{prev?.name ?? "Earlier"}</span>
            </button>
            <span className="muted">{i + 1} of {events.length}</span>
            <button className="tl-btn" disabled={!next} onClick={() => next && navigate("events", next.id)} title={next?.name}>
              <span className="ev-step-name">{next?.name ?? "Later"}</span> ›
            </button>
          </nav>
        </div>
      </article>
    </div>
  );
}
