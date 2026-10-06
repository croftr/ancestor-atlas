import { useEffect } from "react";
import { useStore } from "../store";
import { CATEGORY_STYLE } from "../config";
import { formatRange } from "../time/scale";
import { useData } from "../map/data";
import { wikipediaUrl, type Entity } from "../types";

const Swatch = ({ color }: { color?: string }) =>
  color ? <span className="swatch" style={{ background: color, borderRadius: 2 }} /> : null;

export default function InfoPanel() {
  const data = useData();
  const selectedId = useStore((s) => s.selectedId);
  const groupId = useStore((s) => s.groupId);
  const hits = useStore((s) => s.hits);
  const select = useStore((s) => s.select);
  const openGroup = useStore((s) => s.openGroup);
  const jumpTo = useStore((s) => s.jumpTo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useStore.getState().select(null);
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
  const showLabel = feature?.label && feature.label !== entity.name;
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
      <div className="muted">{formatRange(entity.start_year, entity.end_year)}</div>
      <p>{entity.description}</p>
      {approximate && (
        <div className="approx-note" role="note">
          <strong>Approximate, unverified.</strong> Location and dates were compiled from general knowledge and have not been checked against a primary source.
        </div>
      )}
      {feature && (showLabel || feature.date_text || feature.confidence) && (
        <div className="site-block">
          {showLabel && <strong>{feature.label}</strong>}
          {feature.date_text && <div>{feature.date_text}</div>}
          {feature.confidence && (
            <div className="muted">
              Confidence: <span className={`conf conf-${feature.confidence}`}>{feature.confidence}</span>
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
        Source:{" "}
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
