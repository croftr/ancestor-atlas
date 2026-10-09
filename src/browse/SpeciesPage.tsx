import { useMemo, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE, TIMELINE_ERAS } from "../config";
import { useData } from "../map/data";
import { navigate, useOpenItem } from "../route";
import { formatRange, yearToPos } from "../time/scale";
import { erasFor, firstSentence, shortDuration } from "../timeline/layout";
import type { Entity } from "../types";
import { summaryOf } from "./browse";
import EntityDetail from "./EntityDetail";
import { videoCount } from "../youtube";
import "../events/events-page.css";
import { CategoryBadge } from "../ui/CategoryIcon";
import "./browse.css";

/** Years marked on the shared time scale above the list (those inside the species' span). */
const SCALE_YEARS = [-7_000_000, -5_000_000, -3_000_000, -2_000_000, -1_000_000, -500_000, -200_000, -100_000, -50_000];
/** "7M", "500k" (the scale's caption says "years ago"). */
const scaleLabel = (year: number) => (-year >= 1_000_000 ? `${-year / 1_000_000}M` : `${-year / 1000}k`);

/**
 * Species page (#/species): every species in the order it appeared, numbered, grouped by era
 * (as on the Events page). Each row's bar sits on one time scale shared by the whole page (the
 * time slider's compressed scale, so the recent species aren't slivers), which shows at a glance
 * who came when and who lived alongside whom.
 */
export default function SpeciesPage() {
  const data = useData();
  const openId = useOpenItem();
  const [eraFilter, setEraFilter] = useState<string | null>(null);

  const { species, eras, axis } = useMemo(() => {
    if (!data) return { species: [] as Entity[], eras: [], axis: [0, 1] as [number, number] };
    const species = data.entities.filter((e) => e.category === "species").sort((a, b) => a.start_year - b.start_year || a.end_year - b.end_year);
    const eras = erasFor(data.entities, TIMELINE_ERAS)
      .map((era) => ({ ...era, species: species.filter((s) => s.start_year >= era.start && s.start_year < era.end) }))
      .filter((era) => era.species.length > 0);
    const axis: [number, number] = species.length
      ? [yearToPos(Math.min(...species.map((s) => s.start_year))), yearToPos(Math.max(...species.map((s) => s.end_year)))]
      : [0, 1];
    return { species, eras, axis };
  }, [data]);

  if (!data) return <div className="events-page"><div className="ev-loading muted">Loading…</div></div>;

  // Where a year sits on the page's shared scale, in %.
  const at = (year: number) => ((yearToPos(year) - axis[0]) / Math.max(1e-9, axis[1] - axis[0])) * 100;
  const bar = (s: Entity) => {
    const left = Math.max(0, at(s.start_year));
    return { left: `${left}%`, width: `${Math.max(1, Math.min(100 - left, at(s.end_year) - left))}%` };
  };
  // Scale marks, oldest first, skipping any that would crowd the one before (the compressed
  // scale bunches the millions together).
  const ticks: { y: number; x: number }[] = [];
  for (const y of SCALE_YEARS) {
    const x = at(y);
    if (x >= 2 && x <= 96 && (ticks.length === 0 || x - ticks[ticks.length - 1].x >= 12)) ticks.push({ y, x });
  }

  const shown = eras.filter((e) => eraFilter === null || e.label === eraFilter);
  const visible = shown.flatMap((e) => e.species);
  const open = openId ? data.entityById.get(openId) : undefined;
  const openEra = open && eras.find((e) => e.species.includes(open));
  const accent = CATEGORY_STYLE.species.color;
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
            {species.length} species, in the order they appeared
            {first && last ? `: ${formatRange(first.start_year, Math.max(...species.map((s) => s.end_year)))}` : ""}
          </span>
        </div>
        <div className="ev-filters" role="group" aria-label="Filter by era">
          <button className={`chip${eraFilter === null ? " active" : ""}`} aria-pressed={eraFilter === null} onClick={() => setEraFilter(null)}>
            All eras
          </button>
          {eras.map((e) => (
            <button
              key={e.label}
              className={`chip${eraFilter === e.label ? " active" : ""}`}
              aria-pressed={eraFilter === e.label}
              onClick={() => setEraFilter(eraFilter === e.label ? null : e.label)}
            >
              {e.label} <span className="ev-chip-count">{e.species.length}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="ev-main sp-main">
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

        {shown.map((era) => (
          <section key={era.label} className="sp-era" aria-labelledby={`sp-era-${era.label}`}>
            <h2 id={`sp-era-${era.label}`}>
              {era.label} <span className="muted">{era.species.length} species</span>
            </h2>
            <ol className="sp-list">
              {era.species.map((s) => {
                const n = data.featuresOf.get(s.id)?.length ?? 0;
                const order = species.indexOf(s) + 1;
                const summary = summaryOf(s, firstSentence);
                return (
                  <li key={s.id}>
                    <button className="sp-row" onClick={() => navigate("species", s.id)}>
                      <span className="sp-order" aria-label={`Number ${order} to appear`}>{order}</span>
                      <span className="br-img sp-img">
                        {s.image_url && <img src={s.image_url} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />}
                      </span>
                      <span className="sp-text">
                        <span className="sp-name">{s.name}</span>
                        <span className="sp-date">{formatRange(s.start_year, s.end_year)}</span>
                        <span className="br-bar sp-bar" aria-hidden>
                          <span style={bar(s)} />
                        </span>
                        <span className="sp-meta muted">
                          Lived {shortDuration(s.end_year - s.start_year)}
                          {n > 0 && <> · {n.toLocaleString("en-US")} fossil site{n === 1 ? "" : "s"}</>}
                          {s.media && s.media.length > 0 && <> · <span className="nowrap">{videoCount(s.media.length)}</span></>}
                        </span>
                        {summary && <span className="sp-summary">{summary}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </main>

      {open && open.category === "species" && (
        <EntityDetail
          entity={open}
          order={visible.includes(open) ? visible : species}
          page="species"
          kicker={openEra ? `${openEra.label} · number ${species.indexOf(open) + 1} of ${species.length} to appear` : undefined}
        />
      )}
    </div>
  );
}
