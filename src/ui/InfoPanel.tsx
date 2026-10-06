import { useEffect } from "react";
import { useStore } from "../store";
import { CATEGORY_STYLE } from "../config";
import { formatRange } from "../time/scale";

export default function InfoPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const hits = useStore((s) => s.hits);
  const select = useStore((s) => s.select);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useStore.getState().select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const entity = selectedId ? hits.find((h) => h.id === selectedId) : undefined;
  if (!selectedId || !entity) return null;
  const style = CATEGORY_STYLE[entity.category];
  const others = hits.filter((h) => h.id !== selectedId);

  return (
    <div className="panel info-panel">
      <button className="close" onClick={() => select(null)} aria-label="Close">✕</button>
      <span className="badge" style={{ background: style.color }}>{style.label}</span>
      <h2>{entity.name}</h2>
      <div className="muted">{formatRange(entity.start_year, entity.end_year)}</div>
      <p>{entity.description}</p>
      {others.length > 0 && (
        <div>
          <div className="muted">Also here:</div>
          <div className="also">
            {others.map((o) => (
              <button key={o.id} className="chip" onClick={() => select(o.id, hits)}>
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
