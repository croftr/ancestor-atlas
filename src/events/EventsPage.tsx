import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE, TIMELINE_ERAS } from "../config";
import { useData } from "../map/data";
import { navigate, useOpenEvent } from "../route";
import { useStore } from "../store";
import { formatRange } from "../time/scale";
import { eraIndexOf, erasFor, firstSentence, shortDate, type Era } from "../timeline/layout";
import type { Entity } from "../types";
import { refLink } from "../ui/refs";
import EventImage from "./EventImage";
import EventMedia from "./EventMedia";
import ListenButton from "../audio/ListenButton";
import { CategoryBadge } from "../ui/CategoryIcon";
import Totals from "../browse/Totals";
import { useSectionNav } from "../browse/useSectionNav";
import TourStopLinks from "../tours/TourStopLinks";
import { videoCount } from "../youtube";
import "./events-page.css";
import "../browse/browse.css";

const yearOf = (e: Entity) => e.year ?? e.start_year;
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Events page (#/events): every event by era as picture tiles; one opens in a detail view (#/events/<id>). Only the
 * search and the era chips stay pinned; the chips jump to an era and follow the scroll.
 */
export default function EventsPage() {
  const data = useData();
  const openId = useOpenEvent();
  const [query, setQuery] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

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

  const q = fold(query.trim());
  const shown = useMemo(
    () =>
      byEra
        .map((s) => ({ ...s, events: q ? s.events.filter((e) => fold(`${e.name} ${e.description ?? ""} ${e.date_text ?? ""}`).includes(q)) : s.events }))
        .filter((s) => s.events.length > 0),
    [byEra, q],
  );
  const { barRef, chipsRef, active, jump } = useSectionNav(pageRef, [shown]);

  if (!data) return <div className="events-page"><div className="ev-loading muted">Loading…</div></div>;

  const open = openId ? events.find((e) => e.id === openId) : undefined;
  const visible = shown.flatMap((s) => s.events);

  return (
    <div ref={pageRef} className="events-page br-page" style={{ "--accent": CATEGORY_STYLE.event.color } as CSSProperties}>
      <header className="ev-header br-intro">
        <div className="ev-title">
          <h1 className="cat-title">
            <CategoryBadge category="event" decorative />
            Events
          </h1>
          <span className="muted ev-count">
            {q
              ? `Showing ${visible.length} of ${events.length}`
              : events.length ? formatRange(yearOf(events[0]), Math.max(...events.map((e) => e.end_year))) : ""}
          </span>
        </div>
        <Totals
          items={[
            { label: "Events", value: events.length },
            { label: "Eras", value: byEra.filter((s) => s.events.length > 0).length },
            { label: "Places on the map", value: events.reduce((n, e) => n + (data.featuresOf.get(e.id)?.length ?? 0), 0) },
            { label: "Videos & audio", value: events.reduce((n, e) => n + (e.media?.length ?? 0), 0) },
          ]}
        />
      </header>
      {/* Only the search and the era chips stay at the top; the title and counts scroll away. */}
      <div ref={barRef} className="br-sticky">
        <div className="br-search">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              pageRef.current?.scrollTo({ top: 0 });
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              } else if (e.key === "Enter" && visible[0]) navigate("events", visible[0].id);
            }}
            placeholder="Search events"
            aria-label="Search events by name, description or date"
          />
        </div>
        <nav ref={chipsRef} className="ev-filters" aria-label="Jump to an era">
          {shown.map(({ era, events: list }) => (
            <button
              key={era.label}
              data-chip={era.label}
              className={`chip${active === era.label ? " active" : ""}`}
              aria-current={active === era.label ? "true" : undefined}
              onClick={() => jump(era.label)}
            >
              {era.label} <span className="ev-chip-count">{list.length}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="ev-main">
        {shown.length === 0 && (
          <div className="cu-empty">
            <p>No event matches “{query.trim()}”.</p>
            <button className="chip" onClick={() => setQuery("")}>Clear search</button>
          </div>
        )}
        {shown.map(({ era, events: list }) => (
          <section key={era.label} data-section={era.label} className="ev-section" aria-labelledby={`era-${era.label}`}>
            <h2 id={`era-${era.label}`}>
              {era.label}{" "}
              <span className="muted">
                {formatRange(Math.round(era.start), Math.round(era.end))} · {list.length} event{list.length === 1 ? "" : "s"}
              </span>
            </h2>
            <ul className="ev-grid">
              {list.map((e) => (
                <li key={e.id}>
                  <button className="ev-tile" onClick={() => navigate("events", e.id)}>
                    <span className="ev-tile-pic">
                      <EventImage event={e} />
                      {e.media && e.media.length > 0 && <span className="ev-tile-flag">{videoCount(e.media.length)}</span>}
                    </span>
                    <span className="ev-tile-date" title={e.date_text}>{e.date_text && shortDate(e.date_text)}</span>
                    <span className="ev-tile-name">{e.name}</span>
                    <span className="ev-tile-summary">{firstSentence(e.description)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {open && <EventDetail event={open} events={visible.includes(open) ? visible : events} era={eras[eraOf(open)]} />}
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
        <EventMedia key={event.id} event={event} />
        <div className="ev-detail-body">
          {era && <div className="ev-detail-era">{era.label}</div>}
          <h2 id="ev-detail-name" className="cat-title">
            <CategoryBadge category="event" />
            <span>{event.name}</span>
          </h2>
          <div className="ev-detail-date">{event.date_text}</div>
          <ListenButton entity={event} />
          <p>{event.description}</p>

          {related.length > 0 && (
            <div className="related">
              <div className="muted">Related:</div>
              <div className="also">
                {related.map((r) => (
                  <button key={r.id} className="chip" onClick={() => showOnGlobe(r.id)} title={`${formatRange(r.start_year, r.end_year)}: show on the globe`}>
                    <CategoryBadge category={r.category} size={16} />
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <TourStopLinks entityId={event.id} />

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
