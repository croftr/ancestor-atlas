import { useEffect } from "react";
import { useStore } from "../store";
import { CATEGORY_STYLE } from "../config";
import { formatRange } from "../time/scale";
import { useData } from "../map/data";
import { wikipediaUrl, type Entity } from "../types";
import { asList, labNumbers, refLink, type RefLink } from "./refs";
import { navOrder } from "../search/search";
import { navigate, type View } from "../route";
import "./events.css";
import EventImage from "../events/EventImage";

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
  // Recalled (not source-backed) data must never look like sourced data.
  const approximate = feature ? feature.source_id === "recall" : entity.source_ids.includes("recall");

  return (
    <div className="panel info-panel">
      <button className="close" onClick={() => select(null)} aria-label="Close">✕</button>
      <span className="badge" style={{ background: style.color }}>{style.label}</span>
      {parent && (
        <div className="breadcrumb">
          <button className="link" onClick={() => openGroup(parent.id)}>{parent.name}</button> › {entity.name}
        </div>
      )}
      <h2>{entity.name}</h2>
      <div className="muted">{isEvent && entity.date_text ? entity.date_text : formatRange(entity.start_year, entity.end_year)}</div>
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
              Event page →
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
            ‹
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
            ›
          </button>
        </div>
      )}
      {isEvent && <EventImage event={entity} />}
      {isEvent && entity.image_credit && <div className="muted image-credit">{entity.image_credit}</div>}
      {!isEvent && entity.image_url && (
        <div className="info-media">
          <img src={entity.image_url} alt={entity.name} className="info-image" loading="lazy" />
          {entity.image_credit && <div className="muted image-credit">{entity.image_credit}</div>}
        </div>
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
