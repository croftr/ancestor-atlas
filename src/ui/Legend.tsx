import { useMemo } from "react";
import { useStore } from "../store";
import { CATEGORIES } from "../types";
import { CATEGORY_STYLE } from "../config";
import { isActive, useEntities } from "../map/data";

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
  const entities = useEntities();

  const counts = useMemo(() => {
    const sets: Record<string, Set<string>> = { species: new Set(), culture: new Set(), civilization: new Set() };
    for (const e of entities) if (isActive(e, year)) sets[e.category].add(e.entity_id);
    return sets;
  }, [entities, year]);

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
    </div>
  );
}
