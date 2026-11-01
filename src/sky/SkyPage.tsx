import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useHash } from "../route";
import { useStore } from "../store";
import { firstSentence } from "../timeline/layout";
import Totals from "../browse/Totals";
import { useSectionNav } from "../browse/useSectionNav";
import { CardIcon } from "../ui/CardParts";
import { SKY_EVENTS, SKY_KIND_NAME, SKY_KIND_PLURAL, SKY_STYLE, skyById, type SkyEvent, type SkyKind } from "./sky";
import { SkyBadge, SkyPicture, skyNote } from "./SkyCard";

/** A line under each kind's heading (written for the page). */
const KIND_BLURB: Record<SkyKind, string> = {
  supernova: "Stars that blew up near enough to blaze out in the night sky, some found only in iron dust on the sea floor.",
  nova: "Stars that appeared where none had been, written down by astronomers in Greece and China.",
  comet: "Comets that people saw and recorded, and returns worked out from their orbits.",
  eclipse: "Eclipses of the Sun in ancient writings, matched to their days by astronomy.",
  aurora: "Northern and southern lights far from the poles, when Earth's magnetic shield was weak or the Sun threw out great storms.",
  conjunction: "Planets meeting in the sky.",
};

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** The card's line: the first sentence, or more when that is only a few words ("Halley's Comet back again."). */
const summaryOf = (e: SkyEvent) => {
  const first = firstSentence(e.description);
  return first.length < 60 ? e.description : first;
};
/** Oldest first. */
const byDate = (a: SkyEvent, b: SkyEvent) => a.start_year - b.start_year;
const openOf = (hash: string): string | null => {
  const m = hash.replace(/^#\/?/, "").match(/^sky\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};
const go = (id?: string) => {
  window.location.hash = id ? `#/sky/${encodeURIComponent(id)}` : "#/sky";
};

/**
 * In the sky (#/sky, "#/sky/<id>" with one open): every sky object (sky/sky.ts) by kind, oldest first, each
 * with its drawing, date, how sure the date is and a line of description; a card opens the detail view, whose
 * "Show in the sky" moves the slider to it and opens its card on the globe. Like the Cities page: only the
 * search and the kind chips stay pinned.
 */
export default function SkyPage() {
  const openId = openOf(useHash());
  const [query, setQuery] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);
  const q = fold(query.trim());

  const sections = useMemo(
    () =>
      SKY_KIND_PLURAL.map(([kind, title]) => ({
        id: kind,
        title,
        items: SKY_EVENTS.filter((e) => e.kind === kind)
          .filter((e) => !q || fold(`${e.name} ${e.date_text} ${e.certainty ?? ""} ${e.description} ${title}`).includes(q))
          .sort(byDate),
      })).filter((s) => s.items.length > 0),
    [q],
  );
  const { barRef, chipsRef, active, jump } = useSectionNav(pageRef, [sections]);

  const visible = sections.flatMap((s) => s.items);
  const doubtful = SKY_EVENTS.filter((e) => e.certainty).length;
  const open = skyById(openId);

  return (
    <div ref={pageRef} className="events-page br-page cu-page sky-page" style={{ "--accent": SKY_STYLE.color } as CSSProperties}>
      <header className="ev-header br-intro">
        <div className="ev-title">
          <h1 className="cat-title">
            <SkyBadge size={26} />
            In the sky
          </h1>
          <span className="muted ev-count">{q ? `Showing ${visible.length} of ${SKY_EVENTS.length}` : "What people could have seen overhead"}</span>
        </div>
        <Totals
          items={[
            { label: "In the sky", value: SKY_EVENTS.length },
            { label: "Kinds", value: SKY_KIND_PLURAL.filter(([k]) => SKY_EVENTS.some((e) => e.kind === k)).length },
            { label: "Dates in doubt", value: doubtful, title: "Tagged Disputed, Legend, Date uncertain and so on" },
          ]}
        />
      </header>
      <div ref={barRef} className="br-sticky">
        <div className="br-search">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Search the sky"
            aria-label="Search sky objects by name, date or description"
          />
        </div>
        <nav ref={chipsRef} className="ev-filters cu-chips" aria-label="Jump to a kind">
          {sections.map((s) => (
            <button
              key={s.id}
              data-chip={s.id}
              className={`chip${active === s.id ? " active" : ""}`}
              aria-current={active === s.id ? "true" : undefined}
              onClick={() => jump(s.id)}
            >
              {s.title} <span className="ev-chip-count">{s.items.length}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="ev-main cu-main">
        {sections.length === 0 && (
          <div className="cu-empty">
            <p>Nothing in the sky matches “{query.trim()}”.</p>
            <button className="chip" onClick={() => setQuery("")}>Clear search</button>
          </div>
        )}
        {sections.map((s) => (
          <section key={s.id} data-section={s.id} className="cu-stage sky-section" aria-labelledby={`sky-${s.id}`}>
            <header className="sky-section-head">
              <h2 id={`sky-${s.id}`}>{s.title}</h2>
              <p className="muted">{KIND_BLURB[s.id]}</p>
            </header>
            <ul className="cu-grid">
              {s.items.map((e) => (
                <li key={e.id}>
                  <button className="cu-card" onClick={() => go(e.id)}>
                    <span className="cu-card-img sky-thumb">
                      <SkyPicture e={e} />
                    </span>
                    <span className="cu-card-body">
                      <span className="cu-card-name">{e.name}</span>
                      <span className="cu-card-date">
                        {e.date_text}
                        {e.certainty && <span className="sky-certainty">{e.certainty}</span>}
                      </span>
                      <span className="cu-card-summary">{summaryOf(e)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      {open && <SkyDetail e={open} order={visible.includes(open) ? visible : [...SKY_EVENTS].sort(byDate)} />}
    </div>
  );
}

/** One sky object, over the page (the browse pages' detail view): picture, head, Show in the sky, text, source. */
function SkyDetail({ e, order }: { e: SkyEvent; order: SkyEvent[] }) {
  const showSky = useStore((s) => s.showSky);
  const closeRef = useRef<HTMLButtonElement>(null);
  const i = order.indexOf(e);
  const prev = i > 0 ? order[i - 1] : undefined;
  const next = i >= 0 && i < order.length - 1 ? order[i + 1] : undefined;
  useEffect(() => closeRef.current?.focus({ preventScroll: true }), [e.id]);
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (ev.key === "Escape") go();
      else if (ev.key === "ArrowLeft" && prev) go(prev.id);
      else if (ev.key === "ArrowRight" && next) go(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  return (
    <div className="ev-overlay" onClick={(ev) => ev.target === ev.currentTarget && go()}>
      <article className="ev-detail br-detail panel sky-detail" role="dialog" aria-modal="true" aria-labelledby="sky-detail-name">
        <button ref={closeRef} className="ev-close" onClick={() => go()} aria-label="Close" title="Close (Esc)">
          <CardIcon name="close" size={16} />
        </button>
        <div className="ev-detail-media">
          <SkyPicture e={e} />
        </div>
        <div className="ev-detail-body">
          <div className="card-head" style={{ "--cat": SKY_STYLE.color } as CSSProperties}>
            <SkyBadge />
            <div className="card-head-text">
              <div className="card-eyebrow-row">
                <div className="card-eyebrow">
                  <span>In the sky</span>
                  <span className="card-eyebrow-sep" aria-hidden="true">·</span>
                  <span>{SKY_KIND_NAME[e.kind]}</span>
                </div>
              </div>
              <h2 id="sky-detail-name" className="card-title">{e.name}</h2>
              <div className="card-sub">
                <span>{e.date_text}</span>
                {e.certainty && <span className="sky-certainty">{e.certainty}</span>}
              </div>
            </div>
          </div>
          <div className="ev-actions">
            <button
              className="tl-btn primary"
              onClick={() => {
                showSky(e.id);
                window.location.hash = "#/";
              }}
            >
              <CardIcon name="globe" size={16} />
              Show in the sky
            </button>
          </div>
          <p className="card-desc">{e.description}</p>
          <p className="muted sky-detail-note">{skyNote(e)}</p>
          <p className="sky-detail-source">
            Source:{" "}
            <a href={e.source.url} target="_blank" rel="noreferrer">
              {e.source.label}
            </a>
          </p>
          <nav className="sky-detail-nav" aria-label="Other sky objects">
            {prev ? (
              <button className="chip" onClick={() => go(prev.id)}>
                ← {prev.name}, {prev.date_text}
              </button>
            ) : (
              <span />
            )}
            {next && (
              <button className="chip" onClick={() => go(next.id)}>
                {next.name}, {next.date_text} →
              </button>
            )}
          </nav>
        </div>
      </article>
    </div>
  );
}
