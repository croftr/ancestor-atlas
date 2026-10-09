import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { CATEGORY_STYLE } from "../config";
import { formatRange } from "../time/scale";
import { useData } from "../map/data";
import { wikipediaUrl, type Entity } from "../types";
import { asList, labNumbers, refLink, type RefLink } from "./refs";
import { navOrder } from "../search/search";
import { clearShrunkCard, navigate, peekShrunkCard, type View } from "../route";
import "./events.css";
import EventImage from "../events/EventImage";
import { STACKED_QUERY } from "../config";
import { useMediaQuery } from "./useMediaQuery";
import { videoCount } from "../youtube";
import { CategoryBadge } from "./CategoryIcon";

const Ref = ({ r }: { r: RefLink }) =>
  r.href ? <a href={r.href} target="_blank" rel="noreferrer">{r.label}</a> : <>{r.label}</>;

/** A list of references: the first few inline, the rest behind a "more" toggle. */
const RefList = ({ title, items }: { title: string; items: string[] }) =>
  items.length === 0 ? null : (
    <div className="muted">
      {title}: {items.slice(0, 3).join("; ")}
      {items.length > 3 && (
        <details>
          <summary>{items.length - 3} more</summary>
          {items.slice(3).join("; ")}
        </details>
      )}
    </div>
  );

const Swatch = ({ color }: { color?: string }) =>
  color ? <span className="swatch" style={{ background: color, borderRadius: 2 }} /> : null;

export default function InfoPanel({ view = "globe" }: { view?: View }) {
  const data = useData();
  const focusEntity = useStore((s) => s.focusEntity);
  const selectedId = useStore((s) => s.selectedId);
  const groupId = useStore((s) => s.groupId);
  const hits = useStore((s) => s.hits);
  const select = useStore((s) => s.select);
  const openGroup = useStore((s) => s.openGroup);
  const jumpTo = useStore((s) => s.jumpTo);
  const stepFeature = useStore((s) => s.stepFeature);

  // A picture that failed to load (a stand-in not added yet) is left out.
  const [brokenImage, setBrokenImage] = useState<string | null>(null);
  // Small screens: the card can shrink to give the page room: on the globe to its title (and
  // site stepper), on the timeline (where the expanded card fills the screen) to a thumbnail.
  // Arriving on the timeline via "See on timeline" starts shrunk.
  const [minimised, setMinimised] = useState(() => view === "timeline" && peekShrunkCard());
  useEffect(() => {
    if (view === "timeline") clearShrunkCard();
  }, [view]);
  // Globe on a small screen: a newly picked entity opens its card minimised, so the globe's
  // flight to it stays in view; expand it from there. Stepping through its sites keeps the state.
  const entityKey = groupId ?? hits.find((h) => h.id === selectedId)?.entity_id ?? null;
  useLayoutEffect(() => {
    if (entityKey && view === "globe" && window.matchMedia?.(STACKED_QUERY).matches) setMinimised(true);
  }, [entityKey, view]);
  const stacked = useMediaQuery(STACKED_QUERY);
  // Small screens: the card sits above the globe in a scrolling column. When the selection
  // changes while the card is scrolled out of view (say, after tapping the globe below it),
  // bring the card's top back into view.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || view !== "globe" || !window.matchMedia?.(STACKED_QUERY).matches) return;
    const top = el.getBoundingClientRect().top;
    if (top < 56 || top > window.innerHeight * 0.6) {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [selectedId, groupId, view]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useStore.getState().select(null);
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "[") useStore.getState().stepFeature(-1);
      if (e.key === "]") useStore.getState().stepFeature(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!data) return null;
  const feature = selectedId ? hits.find((h) => h.id === selectedId) : undefined;
  const entity: Entity | undefined = groupId
    ? data.entityById.get(groupId)
    : feature && data.entityById.get(feature.entity_id);
  if (!entity) return null;

  const style = CATEGORY_STYLE[entity.category];
  const parent = entity.parent_id ? data.entityById.get(entity.parent_id) : undefined;
  const kids = entity.group ? (data.childrenOf.get(entity.id) ?? []) : [];
  const others = feature
    ? hits.filter((h) => h.entity_id !== feature.entity_id && h.id !== feature.id)
        .filter((h, i, a) => a.findIndex((x) => x.entity_id === h.entity_id) === i)
    : [];
  const wikiUrl = feature?.wikipedia_phrase ? wikipediaUrl(feature.wikipedia_phrase) : entity.wikipedia_url;
  const sourceIds = [...new Set([...(feature ? [feature.source_id] : []), ...entity.source_ids])];
  // Evidence for the clicked point itself (curated and bulk sites carry per-row references).
  const coordRef = refLink(feature?.coord_source);
  const dateRef = refLink(feature?.date_source);
  const sameRef = coordRef && dateRef && coordRef.href === dateRef.href && coordRef.label === dateRef.label;
  const labs = labNumbers(feature?.source_ref);
  const featureSource = feature ? data.sourceById.get(feature.source_id) : undefined;
  const showLabel = feature?.label && feature.label !== entity.name;
  // Prev/next through every feature of this entity (sites, or territory periods for civilizations).
  const siblings = feature ? navOrder(data.featuresOf.get(feature.entity_id) ?? [], data.bboxOf) : [];
  const position = feature ? siblings.findIndex((f) => f.id === feature.id) + 1 : 0;
  const isEvent = entity.category === "event";
  const noun = entity.category === "civilization" ? "Period" : isEvent ? "Place" : "Site";
  const related = (entity.related_ids ?? []).flatMap((r) => data.entityById.get(r) ?? []);
  // Own picture; else the group's (e.g. Ancient Egypt); else a shared stand-in (picture-groups.yaml).
  // The last two say what they show.
  const picture: { url: string; name: string; credit?: string; note?: string } | undefined = isEvent
    ? undefined
    : entity.image_url
      ? { url: entity.image_url, name: entity.name, credit: entity.image_credit }
      : parent?.image_url
        ? { url: parent.image_url, name: parent.name, credit: parent.image_credit, note: `Shows ${parent.name} as a whole` }
        : entity.fallback_image
          ? { url: entity.fallback_image.url, name: entity.name, credit: entity.fallback_image.credit, note: `Shows ${entity.fallback_image.label}` }
          : undefined;
  // Recalled (not source-backed) data must never look like sourced data.
  const approximate = feature ? feature.source_id === "recall" : entity.source_ids.includes("recall");

  // Timeline on a small screen, shrunk: a thumbnail of the picture over the chart; tap to expand.
  if (view === "timeline" && stacked && minimised) {
    const thumb = isEvent ? entity.image_url : picture?.url;
    const showThumb = thumb && brokenImage !== thumb;
    return (
      <div className={`panel info-thumb${isEvent ? " square" : ""}`}>
        <button className="info-thumb-open" onClick={() => setMinimised(false)} aria-label={`Open card: ${entity.name}`} title="Open card">
          <span className="info-thumb-media" style={showThumb ? undefined : { background: entity.color ?? style.color }}>
            {showThumb && <img src={thumb} alt="" onError={() => setBrokenImage(thumb)} />}
            <svg className="info-thumb-expand" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5 7 5M1.5 10.5 5 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="info-thumb-name">{entity.name}</span>
        </button>
        <button className="info-thumb-close" onClick={() => select(null)} aria-label="Close card">✕</button>
      </div>
    );
  }
  const shrinkToThumb = view === "timeline";

  return (
    <div ref={cardRef} className={`panel info-panel${minimised ? " minimised" : ""}`}>
      <button
        className="info-min"
        onClick={() => setMinimised((m) => !m)}
        aria-expanded={!minimised}
        aria-label={shrinkToThumb ? "Shrink card" : minimised ? "Show full card" : "Minimise card"}
        title={shrinkToThumb ? "Shrink card" : minimised ? "Show full card" : "Minimise card"}
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path
            d={
              shrinkToThumb
                ? "M10.5 1.5 7 5M7 1.5V5h3.5M1.5 10.5 5 7M5 10.5V7H1.5" // arrows pointing inward
                : minimised
                  ? "M2.5 4.5 6 8l3.5-3.5"
                  : "M2.5 7.5 6 4l3.5 3.5"
            }
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>
      <button className="close" onClick={() => select(null)} aria-label="Close">✕</button>
      <div
        className="info-head"
        // Minimised, a tap on the title opens the card (links inside keep their own action).
        onClick={
          minimised
            ? (e) => {
                if (!(e.target as HTMLElement).closest("a, button")) setMinimised(false);
              }
            : undefined
        }
      >
        {parent && (
          <div className="breadcrumb">
            <button className="link" onClick={() => openGroup(parent.id)}>{parent.name}</button> › {entity.name}
          </div>
        )}
        <h2 className="cat-title">
          <CategoryBadge category={entity.category} />
          <span>{entity.name}</span>
        </h2>
        <div className="muted">{isEvent && entity.date_text ? entity.date_text : formatRange(entity.start_year, entity.end_year)}</div>
      </div>
      <div className="view-link">
        {view === "timeline" ? (
          <button
            className="link"
            onClick={() => {
              focusEntity(entity.id);
              navigate("globe");
            }}
          >
            Show on globe →
          </button>
        ) : (
          <button className="link" onClick={() => navigate("timeline", entity.id)}>
            See on timeline →
          </button>
        )}
        {isEvent && (
          <>
            {" · "}
            <button className="link" onClick={() => navigate("events", entity.id)}>
              {entity.media?.length ? `Event page (${videoCount(entity.media.length)}) →` : "Event page →"}
            </button>
          </>
        )}
        {entity.category === "culture" && (
          <>
            {" · "}
            <button className="link" onClick={() => navigate("cultures", entity.id)}>
              {entity.media?.length ? `Culture page (${videoCount(entity.media.length)}) →` : "Culture page →"}
            </button>
          </>
        )}
        {entity.category === "civilization" && (
          <>
            {" · "}
            <button className="link" onClick={() => navigate("civilizations", entity.id)}>
              {entity.media?.length ? `Civilization page (${videoCount(entity.media.length)}) →` : "Civilization page →"}
            </button>
          </>
        )}
      </div>
      {feature && siblings.length > 1 && (
        <div className="feature-nav" role="group" aria-label={`${noun}s of ${entity.name}`}>
          <button
            className="feature-nav-btn"
            onClick={() => stepFeature(-1)}
            aria-label={`Previous ${noun.toLowerCase()}`}
            title={`Previous ${noun.toLowerCase()} ( [ )`}
          >
            <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
              <path d="M7.5 2 3.5 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="feature-nav-mid" aria-live="polite">
            <div className="feature-nav-count">
              {noun} {position} of {siblings.length}
            </div>
            <div className="feature-nav-label">
              {isEvent ? feature.label : (
                <>
                  {showLabel ? `${feature.label} · ` : ""}
                  {formatRange(feature.start_year, feature.end_year)}
                </>
              )}
            </div>
          </div>
          <button
            className="feature-nav-btn"
            onClick={() => stepFeature(1)}
            aria-label={`Next ${noun.toLowerCase()}`}
            title={`Next ${noun.toLowerCase()} ( ] )`}
          >
            <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
              <path d="M4.5 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
      {isEvent && <EventImage event={entity} />}
      {isEvent && entity.image_credit && <div className="muted image-credit">{entity.image_credit}</div>}
      {picture && brokenImage !== picture.url && (
        <>
          <div className="info-media">
            <img
              src={picture.url}
              alt={picture.name}
              className="info-image"
              loading="lazy"
              onError={() => setBrokenImage(picture.url)} // a stand-in not added yet: show nothing
            />
          </div>
          {/* Credit below the frame (inside it, the cropped picture hid it). */}
          <div className="muted image-credit">{[picture.credit, picture.note].filter(Boolean).join(" · ")}</div>
        </>
      )}
      <p>{entity.description}</p>
      {related.length > 0 && (
        <div className="related">
          <div className="muted">Related:</div>
          <div className="also">
            {related.map((r) => (
              <button
                key={r.id}
                className="chip"
                onClick={() => (view === "timeline" ? openGroup(r.id) : focusEntity(r.id))}
                title={formatRange(r.start_year, r.end_year)}
              >
                <span className="related-dot" style={{ background: r.color ?? CATEGORY_STYLE[r.category].color }} />
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {approximate && (
        <div className="approx-note" role="note">
          <strong>Approximate, unverified.</strong> Location and dates were compiled from general knowledge and have not been checked against a primary source.
        </div>
      )}
      {feature && (showLabel || feature.date_text || feature.confidence) && (
        <div className="site-block">
          {showLabel && <strong>{feature.label}</strong>}
          {feature.date_text && !isEvent && <div>{feature.date_text}</div>}
          {feature.notes && <div className="muted">Location: {feature.notes}</div>}
          {feature.confidence && (
            <div className="muted">
              Confidence: <span className={`conf conf-${feature.confidence}`}>{feature.confidence}</span>
            </div>
          )}
          {(coordRef || dateRef) && (
            <div className="site-refs">
              {sameRef ? (
                <div>Location &amp; date: <Ref r={coordRef} /></div>
              ) : (
                <>
                  {coordRef && <div>Location: <Ref r={coordRef} /></div>}
                  {dateRef && <div>Date: <Ref r={dateRef} /></div>}
                </>
              )}
              {labs && <div className="muted">Lab nos. {labs}</div>}
              <RefList title="Published" items={asList(feature.refs)} />
              <RefList title="Compiled in" items={asList(feature.via)} />
            </div>
          )}
          {!coordRef && !dateRef && featureSource && featureSource.id !== "recall" && (
            <div className="site-refs">
              Source: <a href={featureSource.url} target="_blank" rel="noreferrer">{featureSource.name}</a>
            </div>
          )}
        </div>
      )}
      {kids.length > 0 && (
        <div>
          <div className="muted">Includes ({kids.length}), by date:</div>
          <ul className="children">
            {kids.map((k) => (
              <li key={k.id}>
                <button className="link" onClick={() => jumpTo(k.id)}>
                  <Swatch color={k.color} /> {k.name}
                </button>{" "}
                <span className="muted">{formatRange(k.start_year, k.end_year)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="muted refs">
        {feature ? `Sources for ${entity.name}: ` : "Sources: "}
        {sourceIds.map((id, i) => {
          const s = data.sourceById.get(id);
          return s ? (
            <span key={id}>
              {i > 0 && ", "}
              <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> ({s.licence})
            </span>
          ) : null;
        })}
        {wikiUrl && (
          <>
            {" "}· <a href={wikiUrl} target="_blank" rel="noreferrer">Read more</a>
          </>
        )}
      </div>
      {others.length > 0 && (
        <div>
          <div className="muted">Also here:</div>
          <div className="also">
            {others.map((o) => (
              <button key={o.id} className="chip" onClick={() => select(o.id, hits)}>
                {data.entityById.get(o.entity_id)?.name ?? o.entity_id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
