import { useMemo, useState } from "react";
import { useStore } from "../store";
import { CATEGORIES } from "../types";
import { CATEGORY_STYLE } from "../config";
import { isActive, useData } from "../map/data";

const swatchStyle = (c: (typeof CATEGORIES)[number]): React.CSSProperties => {
  const color = CATEGORY_STYLE[c].color;
  if (c === "species") return { background: color, borderRadius: "50%" };
  if (c === "culture") return { background: color, borderRadius: "50%", filter: "blur(2px)" };
  return { background: color, borderRadius: 2 };
};

export default function Legend() {
  const year = useStore((s) => s.year);
  const enabled = useStore((s) => s.enabled);
  const toggle = useStore((s) => s.toggleCategory);
  const data = useData();
  const features = data?.features;
  const [showSources, setShowSources] = useState(false);

  const counts = useMemo(() => {
    const sets: Record<string, Set<string>> = { species: new Set(), culture: new Set(), civilization: new Set() };
    for (const f of features ?? []) if (isActive(f, year)) sets[f.category].add(f.entity_id);
    return sets;
  }, [features, year]);

  return (
    <div className="panel legend">
      <h1>History Globe</h1>
      {CATEGORIES.map((c) => (
        <label key={c} className="legend-row">
          <input type="checkbox" checked={enabled[c]} onChange={() => toggle(c)} />
          <span className="swatch" style={swatchStyle(c)} />
          <span>
            {CATEGORY_STYLE[c].label} <span className="muted">{CATEGORY_STYLE[c].shape}</span>
          </span>
          <span className="count">{counts[c].size} active</span>
        </label>
      ))}
      <button className="sources-toggle" onClick={() => setShowSources((v) => !v)} aria-expanded={showSources}>
        ⓘ Data sources
      </button>
      {showSources && (
        <ul className="sources-list">
          {(data?.sources ?? []).map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> <span className="muted">· {s.licence}</span>
              <div className="muted">{s.citation}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
