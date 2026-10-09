import { useMemo, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE } from "../config";
import { useData } from "../map/data";
import { navigate, useOpenItem } from "../route";
import { formatRange } from "../time/scale";
import { firstSentence, shortDuration } from "../timeline/layout";
import type { Entity } from "../types";
import { barStyle, stageTitle, summaryOf } from "./browse";
import EntityDetail from "./EntityDetail";
import { videoCount } from "../youtube";
import "../events/events-page.css";
import { CategoryBadge } from "../ui/CategoryIcon";
import "./browse.css";

interface Stage {
  key: string;
  title: string;
  picture?: { url: string; credit?: string };
  cultures: Entity[];
  axis: [number, number];
}

/**
 * Cultures page (#/cultures): cultures grouped by the stage their shared picture stands for
 * (early toolmakers, Ice Age hunters, early farmers...). The picture is shown once per stage, not
 * on every card; each card has a bar showing when it ran within its stage.
 */
export default function CulturesPage() {
  const data = useData();
  const openId = useOpenItem();
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const stages = useMemo<Stage[]>(() => {
    if (!data) return [];
    const cultures = data.entities.filter((e) => e.category === "culture").sort((a, b) => a.start_year - b.start_year);
    const byKey = new Map<string, Stage>();
    for (const c of cultures) {
      const fb = c.image_url ? undefined : c.fallback_image;
      const key = fb?.url ?? "other";
      let s = byKey.get(key);
      if (!s) {
        s = {
          key,
          title: fb ? stageTitle(fb.label) : "Other cultures",
          picture: fb ? { url: fb.url, credit: fb.credit } : undefined,
          cultures: [],
          axis: [Infinity, -Infinity],
        };
        byKey.set(key, s);
      }
      s.cultures.push(c);
      s.axis = [Math.min(s.axis[0], c.start_year), Math.max(s.axis[1], c.end_year)];
    }
    return [...byKey.values()].sort((a, b) => a.axis[0] - b.axis[0]);
  }, [data]);

  if (!data) return <div className="events-page"><div className="ev-loading muted">Loading…</div></div>;

  const all = stages.flatMap((s) => s.cultures);
  const shown = stages.filter((s) => stageFilter === null || s.key === stageFilter);
  const visible = shown.flatMap((s) => s.cultures);
  const open = openId ? data.entityById.get(openId) : undefined;
  const openStage = open && stages.find((s) => s.cultures.includes(open));
  const accent = CATEGORY_STYLE.culture.color;

  return (
    <div className="events-page br-page" style={{ "--accent": accent } as CSSProperties}>
      <header className="ev-header">
        <div className="ev-title">
          <h1 className="cat-title">
            <CategoryBadge category="culture" decorative />
            Cultures
          </h1>
          <span className="muted ev-count">
            {all.length} cultures{all.length ? `, ${formatRange(Math.min(...all.map((c) => c.start_year)), Math.max(...all.map((c) => c.end_year)))}` : ""}
          </span>
        </div>
        <div className="ev-filters" role="group" aria-label="Filter by stage">
          <button className={`chip${stageFilter === null ? " active" : ""}`} aria-pressed={stageFilter === null} onClick={() => setStageFilter(null)}>
            All stages
          </button>
          {stages.map((s) => (
            <button
              key={s.key}
              className={`chip${stageFilter === s.key ? " active" : ""}`}
              aria-pressed={stageFilter === s.key}
              onClick={() => setStageFilter(stageFilter === s.key ? null : s.key)}
            >
              {s.title} <span className="ev-chip-count">{s.cultures.length}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="ev-main">
        {shown.map((s) => (
          <section key={s.key} className="cu-stage" aria-labelledby={`stage-${s.key}`}>
            <div className="cu-stage-head">
              {s.picture && (
                <figure className="cu-stage-fig">
                  <div className="br-img">
                    <img src={s.picture.url} alt="" loading="lazy" onError={(e) => ((e.currentTarget.parentElement!.style.display = "none"))} />
                  </div>
                  {s.picture.credit && <figcaption className="muted image-credit">{s.picture.credit}</figcaption>}
                </figure>
              )}
              <div>
                <h2 id={`stage-${s.key}`}>{s.title}</h2>
                <div className="muted">{formatRange(s.axis[0], s.axis[1])}</div>
              </div>
            </div>
            <ul className="cu-grid">
              {s.cultures.map((c) => {
                const n = data.featuresOf.get(c.id)?.length ?? 0;
                const summary = summaryOf(c, firstSentence);
                return (
                  <li key={c.id}>
                    <button className="cu-card" onClick={() => navigate("cultures", c.id)}>
                      <span className="cu-card-name">{c.name}</span>
                      <span className="cu-card-date">{formatRange(c.start_year, c.end_year)}</span>
                      <span className="br-bar" aria-hidden>
                        <span style={barStyle(c, s.axis)} />
                      </span>
                      <span className="cu-card-meta muted">
                        {shortDuration(c.end_year - c.start_year)}
                        {n > 0 && <> · {n.toLocaleString("en-US")} site{n === 1 ? "" : "s"}</>}
                        {c.media && c.media.length > 0 && <> · <span className="nowrap">{videoCount(c.media.length)}</span></>}
                      </span>
                      {summary && <span className="cu-card-summary">{summary}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>

      {open && open.category === "culture" && (
        <EntityDetail entity={open} order={visible.includes(open) ? visible : all} page="cultures" kicker={openStage?.title} />
      )}
    </div>
  );
}
