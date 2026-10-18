import { useMemo, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE, TIMELINE_ERAS } from "../config";
import { useData } from "../map/data";
import { navigate, useOpenItem } from "../route";
import { formatRange, yearToPos } from "../time/scale";
import { erasFor, firstSentence, shortDuration } from "../timeline/layout";
import type { Entity, FeatureProps } from "../types";
import { scaleLabel, scaleTicks, summaryOf } from "./browse";
import FamilyTree from "./FamilyTree";
import SpeciesCompare from "./SpeciesCompare";
import EntityDetail from "./EntityDetail";
import Totals from "./Totals";
import { videoCount } from "../youtube";
import "../events/events-page.css";
import { CategoryBadge } from "../ui/CategoryIcon";
import "./browse.css";

/**
 * Fossil finds at a site: the specimens ROAD catalogues there (FeatureProps.finds); a site without a ROAD record
 * stands for at least one fossil and counts as one.
 */
const findsAt = (f: FeatureProps) => f.finds ?? 1;
const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

const FINDS_NOTE =
  "Fossil finds are individual specimens (a skull, a jaw, a tooth) as catalogued in ROAD; a site with no ROAD record counts as one find.";

/** List, family tree, or side-by-side comparison, remembered (the list when storage is unavailable). */
type Layout = "list" | "tree" | "compare";
const LAYOUT_KEY = "species-layout";
const readLayout = (): Layout => {
  try {
    const v = localStorage.getItem(LAYOUT_KEY);
    return v === "tree" || v === "compare" ? v : "list";
  } catch {
    return "list";
  }
};

/**
 * Species page (#/species): every species in the order it appeared, numbered, grouped by era
 * (as on the Events page). Each row's bar sits on one time scale shared by the whole page (the
 * time slider's compressed scale, so the recent species aren't slivers), which shows at a glance
 * who came when and who lived alongside whom. The Family tree switch draws the same bars joined
 * into a tree (FamilyTree.tsx), and Compare compares any two species side by side (SpeciesCompare.tsx).
 */
export default function SpeciesPage() {
  const data = useData();
  const openId = useOpenItem();
  const [layout, setLayoutState] = useState<Layout>(readLayout);
  const [comparePair, setComparePair] = useState<[string, string]>(["neanderthal", "homo-sapiens"]);
  const setLayout = (l: Layout) => {
    setLayoutState(l);
    try {
      localStorage.setItem(LAYOUT_KEY, l);
    } catch {
      // Not remembered; fine.
    }
  };
  const startCompareWith = (id: string) => {
    setComparePair(([a, b]) => {
      if (id === a) return [a, b];
      if (id === b) return [b, a];
      return [id, a];
    });
    setLayout("compare");
    if (openId) navigate("species");
  };

  const { species, eras, axis, tally } = useMemo(() => {
    const tally = new Map<string, { sites: number; finds: number }>();
    if (!data) return { species: [] as Entity[], eras: [], axis: [0, 1] as [number, number], tally };
    const species = data.entities.filter((e) => e.category === "species").sort((a, b) => a.start_year - b.start_year || a.end_year - b.end_year);
    for (const s of species) {
      const fs = data.featuresOf.get(s.id) ?? [];
      tally.set(s.id, { sites: fs.length, finds: fs.reduce((n, f) => n + findsAt(f), 0) });
    }
    const sum = (list: Entity[], k: "sites" | "finds") => list.reduce((n, s) => n + (tally.get(s.id)?.[k] ?? 0), 0);
    const eras = erasFor(data.entities, TIMELINE_ERAS)
      .map((era) => ({ ...era, species: species.filter((s) => s.start_year >= era.start && s.start_year < era.end) }))
      .map((era) => ({ ...era, sites: sum(era.species, "sites"), finds: sum(era.species, "finds") }))
      .filter((era) => era.species.length > 0);
    const axis: [number, number] = species.length
      ? [yearToPos(Math.min(...species.map((s) => s.start_year))), yearToPos(Math.max(...species.map((s) => s.end_year)))]
      : [0, 1];
    return { species, eras, axis, tally };
  }, [data]);

  if (!data) return <div className="events-page"><div className="ev-loading muted">Loading…</div></div>;

  // Where a year sits on the page's shared scale, in %.
  const at = (year: number) => ((yearToPos(year) - axis[0]) / Math.max(1e-9, axis[1] - axis[0])) * 100;
  const bar = (s: Entity) => {
    const left = Math.max(0, at(s.start_year));
    return { left: `${left}%`, width: `${Math.max(1, Math.min(100 - left, at(s.end_year) - left))}%` };
  };
  const ticks = scaleTicks(at);

  const open = openId ? data.entityById.get(openId) : undefined;
  const openEra = open && eras.find((e) => e.species.includes(open));
  const accent = CATEGORY_STYLE.species.color;
  const totalSites = eras.reduce((n, e) => n + e.sites, 0);
  const totalFinds = eras.reduce((n, e) => n + e.finds, 0);
  const first = species[0];
  const last = species.at(-1);

  return (
    <div className="events-page br-page sp-page" style={{ "--accent": accent } as CSSProperties}>
      <header className="ev-header">
        <div className="ev-title">
          <h1 className="cat-title">
            <CategoryBadge category="species" decorative />
            Species
          </h1>
          <span className="muted ev-count">
            in the order they appeared
            {first && last ? `: ${formatRange(first.start_year, Math.max(...species.map((s) => s.end_year)))}` : ""}
          </span>
        </div>
        <Totals
          items={[
            { label: "Species", value: species.length },
            { label: "Fossil sites", value: totalSites },
            { label: "Fossil finds", value: totalFinds, title: FINDS_NOTE },
          ]}
        />
        <div className="ev-filters">
          <span className="sp-layout" role="group" aria-label="Show as">
            {(["list", "tree", "compare"] as const).map((l) => (
              <button key={l} className={`chip${layout === l ? " active" : ""}`} aria-pressed={layout === l} onClick={() => setLayout(l)}>
                {l === "list" ? "List" : l === "tree" ? "Family tree" : "Compare"}
              </button>
            ))}
          </span>
        </div>
      </header>

      {layout === "tree" ? (
        <main className="ev-main ft-main">
          <FamilyTree species={species} />
        </main>
      ) : layout === "compare" ? (
        <main className="ev-main sp-main">
          <SpeciesCompare
            species={species}
            initialA={comparePair[0]}
            initialB={comparePair[1]}
            onSelectPair={(a, b) => setComparePair([a, b])}
          />
        </main>
      ) : (
        <main className="ev-main sp-main">
          <p className="muted sp-note">{FINDS_NOTE}</p>
          {/* The shared scale every row's bar is drawn on. */}
          <div className="sp-scale" aria-hidden="true">
            <span className="sp-scale-track">
              {ticks.map((t) => (
                <span key={t.y} className="sp-tick" style={{ left: `${t.x}%` }}>
                  {scaleLabel(t.y)}
                </span>
              ))}
            </span>
            <span className="sp-scale-caption">years ago</span>
          </div>
  
          {eras.map((era) => (
            <section key={era.label} className="sp-era" aria-labelledby={`sp-era-${era.label}`}>
              <h2 id={`sp-era-${era.label}`}>
                {era.label}{" "}
                <span className="muted">
                  {count(era.species.length, "species", "species")} · {count(era.sites, "fossil site")} · {count(era.finds, "fossil find")}
                </span>
              </h2>
              <ol className="sp-list">
                {era.species.map((s) => {
                  const { sites: n, finds } = tally.get(s.id) ?? { sites: 0, finds: 0 };
                  const order = species.indexOf(s) + 1;
                  const summary = summaryOf(s, firstSentence);
                  return (
                    <li key={s.id} className="sp-row-wrap">
                      <button className="sp-row" onClick={() => navigate("species", s.id)}>
                        <span className="sp-order" aria-label={`Number ${order} to appear`}>{order}</span>
                        <span className="br-img sp-img">
                          {s.image_url && <img src={s.image_url} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />}
                        </span>
                        <span className="sp-text">
                          <span className="sp-name">{s.name}</span>
                          <span className="sp-date">{formatRange(s.start_year, s.end_year)}</span>
                          <span className="br-bar sp-bar" aria-hidden>
                            {ticks.map((t) => <i key={t.y} className="sp-grid" style={{ left: `${t.x}%` }} />)}
                            <span style={bar(s)} />
                          </span>
                          <span className="sp-meta muted">
                            Lived {shortDuration(s.end_year - s.start_year)}
                            {n > 0 && <> · {count(n, "fossil site")} · <span title={FINDS_NOTE}>{count(finds, "fossil find")}</span></>}
                            {s.media && s.media.length > 0 && <> · <span className="nowrap">{videoCount(s.media.length)}</span></>}
                          </span>
                          {summary && <span className="sp-summary">{summary}</span>}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="sp-compare-quick"
                        onClick={() => startCompareWith(s.id)}
                        title={`Compare ${s.name} side by side with another species`}
                      >
                        Compare
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </main>
      )}

      {open && open.category === "species" && (
        <EntityDetail
          entity={open}
          order={species}
          page="species"
          kicker={openEra ? `${openEra.label} · number ${species.indexOf(open) + 1} of ${species.length} to appear` : undefined}
          onCompare={startCompareWith}
        />
      )}
    </div>
  );
}
