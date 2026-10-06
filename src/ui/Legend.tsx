import { useMemo, useState } from "react";
import { useStore } from "../store";
import { CATEGORIES, type Category } from "../types";
import { CATEGORY_STYLE } from "../config";
import { isActive, useData } from "../map/data";

interface ActiveEntityItem {
  id: string;
  name: string;
  color?: string;
  siteCount: number;
}

const swatchStyle = (c: Category, colorOverride?: string): React.CSSProperties => {
  const color = colorOverride ?? CATEGORY_STYLE[c].color;
  if (c === "species") return { background: color, borderRadius: "50%" };
  if (c === "culture") return { background: color, borderRadius: "50%", filter: "blur(2px)" };
  return { background: color, borderRadius: 2 };
};

export default function Legend() {
  const year = useStore((s) => s.year);
  const enabled = useStore((s) => s.enabled);
  const toggle = useStore((s) => s.toggleCategory);
  const selectedId = useStore((s) => s.selectedId);
  const groupId = useStore((s) => s.groupId);
  const hits = useStore((s) => s.hits);
  const select = useStore((s) => s.select);
  const openGroup = useStore((s) => s.openGroup);
  const jumpTo = useStore((s) => s.jumpTo);

  const data = useData();
  const features = data?.features;
  const [showSources, setShowSources] = useState(false);
  const [expanded, setExpanded] = useState<Record<Category, boolean>>({
    species: false,
    culture: false,
    civilization: false,
  });

  const toggleExpanded = (c: Category) => {
    setExpanded((prev) => ({ ...prev, [c]: !prev[c] }));
  };

  const selectedEntityId = useMemo(() => {
    if (groupId) return groupId;
    if (!selectedId) return null;
    const feat = hits.find((h) => h.id === selectedId) ?? features?.find((f) => f.id === selectedId);
    return feat?.entity_id ?? null;
  }, [groupId, selectedId, hits, features]);

  const breakdown = useMemo(() => {
    const map: Record<Category, Map<string, ActiveEntityItem>> = {
      species: new Map(),
      culture: new Map(),
      civilization: new Map(),
    };

    for (const f of features ?? []) {
      if (!isActive(f, year)) continue;
      const catMap = map[f.category];
      if (!catMap) continue;

      const existing = catMap.get(f.entity_id);
      if (existing) {
        existing.siteCount += 1;
      } else {
        const ent = data?.entityById.get(f.entity_id);
        catMap.set(f.entity_id, {
          id: f.entity_id,
          name: ent?.name ?? f.label ?? f.entity_id,
          color: ent?.color ?? f.color,
          siteCount: 1,
        });
      }
    }

    const result: Record<Category, ActiveEntityItem[]> = {
      species: [],
      culture: [],
      civilization: [],
    };

    for (const c of CATEGORIES) {
      const items = Array.from(map[c].values());
      items.sort((a, b) => {
        const entA = data?.entityById.get(a.id);
        const entB = data?.entityById.get(b.id);
        const startDiff = (entA?.start_year ?? 0) - (entB?.start_year ?? 0);
        if (startDiff !== 0) return startDiff;
        return a.name.localeCompare(b.name);
      });
      result[c] = items;
    }

    return result;
  }, [features, year, data]);

  const handleSelectEntity = (entityId: string, category: Category) => {
    if (selectedEntityId === entityId) {
      select(null);
      return;
    }

    if (!enabled[category]) {
      toggle(category);
    }

    const activeFeatures = (features ?? []).filter(
      (f) => f.entity_id === entityId && isActive(f, year)
    );

    if (activeFeatures.length > 0) {
      select(activeFeatures[0].id, activeFeatures);
    } else {
      const ent = data?.entityById.get(entityId);
      if (ent?.group) {
        openGroup(entityId);
      } else {
        jumpTo(entityId);
      }
    }
  };

  return (
    <div className="panel legend">
      <div className="legend-brand">
        <img src="/logo-128.webp" alt="Ancestor Atlas Logo" className="legend-brand-logo" />
        <h1>Ancestor Atlas</h1>
      </div>
      {CATEGORIES.map((c) => {
        const items = breakdown[c];
        const isExpanded = expanded[c];
        return (
          <div key={c} className="legend-category">
            <div className="legend-row">
              <input
                type="checkbox"
                className="legend-checkbox"
                checked={enabled[c]}
                onChange={() => toggle(c)}
                aria-label={`Toggle visibility of ${CATEGORY_STYLE[c].label}`}
                title={enabled[c] ? "Hide on map" : "Show on map"}
              />
              <button
                type="button"
                className={`legend-title-btn ${!enabled[c] ? "disabled" : ""}`}
                onClick={() => toggleExpanded(c)}
                aria-expanded={isExpanded}
                title={`Click to ${isExpanded ? "collapse" : "expand"} ${CATEGORY_STYLE[c].label} breakdown`}
              >
                <span className="swatch" style={swatchStyle(c)} />
                <span className="legend-title-text">
                  {CATEGORY_STYLE[c].label} <span className="muted">{CATEGORY_STYLE[c].shape}</span>
                </span>
                <span className="count">{items.length} active</span>
                <span className={`legend-caret ${isExpanded ? "open" : ""}`} aria-hidden="true">
                  ▸
                </span>
              </button>
            </div>
            {isExpanded && (
              <div className="legend-breakdown">
                {items.length === 0 ? (
                  <div className="legend-breakdown-empty muted">None active in this era</div>
                ) : (
                  <ul className="legend-breakdown-list">
                    {items.map((item) => {
                      const isSelected = selectedEntityId === item.id;
                      return (
                        <li key={item.id} className="legend-breakdown-item">
                          <button
                            type="button"
                            className={`legend-item-btn ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectEntity(item.id, c)}
                            title={`Select ${item.name}`}
                          >
                            <span className="swatch" style={swatchStyle(c, item.color)} />
                            <span className="item-name">{item.name}</span>
                            {item.siteCount > 1 && (
                              <span className="item-count muted">({item.siteCount})</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
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
