import DataLoading from "../ui/DataLoading";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE } from "../config";
import { useData } from "../map/data";
import { navigate, useOpenItem } from "../route";
import { shortRange } from "../ui/InfoPanel";
import { formatRange } from "../time/scale";
import { firstSentence, shortDuration } from "../timeline/layout";
import type { Entity } from "../types";
import { barStyle, summaryOf } from "./browse";
import { CULTURE_STAGES, type CultureStage } from "./cultureStages";
import EntityDetail from "./EntityDetail";
import { useSectionNav } from "./useSectionNav";
import Totals from "./Totals";
import { videoCount } from "../youtube";
import "../events/events-page.css";
import { CategoryBadge } from "../ui/CategoryIcon";
import { isAiCredit } from "../ui/PictureNav";
import "./browse.css";

interface Stage extends CultureStage {
  cultures: Entity[];
  axis: [number, number];
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const small = (url: string) => url.replace(/\.webp$/, "-600.webp");

/** A picture that fades in once loaded (or at once if it already was), and steps aside if it fails. */
function Picture({ url, alt, sizes, className }: { url: string; alt: string; sizes: string; className?: string }) {
  return (
    <img
      className={className}
      src={url}
      srcSet={`${small(url)} 600w, ${url} 1200w`}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      decoding="async"
      ref={(el) => {
        if (el?.complete && el.naturalWidth) el.classList.add("loaded");
      }}
      onLoad={(e) => e.currentTarget.classList.add("loaded")}
      onError={(e) => e.currentTarget.classList.add("failed")}
    />
  );
}

/**
 * Cultures page (#/cultures): the cultures by stage (first toolmakers, Ice Age hunters, early farmers...; the stages
 * are in cultureStages.ts). Each stage opens with a banner (its painting, or a strip of its cultures' pictures) and
 * a small chart of when its cultures ran, then a card per culture with its own picture. The chips jump to a stage
 * and follow the scroll; the search filters by name and description.
 */
export default function CulturesPage() {
  const data = useData();
  const openId = useOpenItem();
  const [query, setQuery] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

  const stages = useMemo<Stage[]>(() => {
    if (!data) return [];
    return CULTURE_STAGES.map((s) => {
      const cultures = s.members
        .map((id) => data.entityById.get(id))
        .filter((e): e is Entity => !!e)
        .sort((a, b) => a.start_year - b.start_year || a.end_year - b.end_year);
      const axis: [number, number] = [Math.min(...cultures.map((c) => c.start_year)), Math.max(...cultures.map((c) => c.end_year))];
      return { ...s, cultures, axis };
    })
      .filter((s) => s.cultures.length > 0)
      .sort((a, b) => a.axis[0] - b.axis[0]);
  }, [data]);

  const q = fold(query.trim());
  const shown = useMemo(
    () =>
      stages
        .map((s) => ({ ...s, cultures: q ? s.cultures.filter((c) => fold(`${c.name} ${c.description ?? ""}`).includes(q)) : s.cultures }))
        .filter((s) => s.cultures.length > 0),
    [stages, q],
  );

  const { barRef, chipsRef, active, jump } = useSectionNav(pageRef, [shown]);

  if (!data) return <div className="events-page"><div className="ev-loading muted"><DataLoading /></div></div>;


  const all = stages.flatMap((s) => s.cultures);
  const visible = shown.flatMap((s) => s.cultures);
  const sitesOf = (list: Entity[]) => list.reduce((n, c) => n + (data.featuresOf.get(c.id)?.length ?? 0), 0);
  // Radiocarbon dates behind the XRONOS points; their date text gives the count: "... (12 dates)", "(1 date, ...)".
  const radiocarbon = all.reduce((n, c) => n + (data.featuresOf.get(c.id) ?? [])
    .filter((f) => f.source_id === "xronos")
    .reduce((k, f) => k + Number(f.date_text?.match(/\((\d+) dates?\b/)?.[1] ?? 0), 0), 0);
  const open = openId ? data.entityById.get(openId) : undefined;
  const openStage = open && stages.find((s) => s.cultures.includes(open));
  // One credit line for the page when every picture on it shares one.
  const credits = new Set([...all.map((c) => c.image_credit), ...stages.map((s) => s.picture?.credit)].filter(Boolean));
  const sharedCredit = credits.size === 1 ? [...credits][0] : undefined;

  return (
    <div ref={pageRef} className="events-page br-page cu-page" style={{ "--accent": CATEGORY_STYLE.culture.color } as CSSProperties}>
      <header className="ev-header br-intro">
        <div className="ev-title">
          <h1 className="cat-title">
            <CategoryBadge category="culture" decorative />
            Cultures
          </h1>
          <span className="muted ev-count">
            {q
              ? `Showing ${visible.length} of ${all.length}`
              : all.length ? formatRange(Math.min(...all.map((c) => c.start_year)), Math.max(...all.map((c) => c.end_year))) : ""}
          </span>
        </div>
        <Totals
          items={[
            { label: "Cultures", value: all.length },
            { label: "Sites", value: sitesOf(all) },
            { label: "Radiocarbon dates", value: radiocarbon, title: "Calibrated radiocarbon dates from XRONOS behind the culture sites" },
            { label: "Stages", value: stages.length },
          ]}
        />
      </header>
      {/* Only the search and the stage chips stay at the top; the title and counts scroll away. */}
      <div ref={barRef} className="br-sticky">
        <div className="br-search">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Search cultures"
            aria-label="Search cultures by name or description"
          />
        </div>
        <nav ref={chipsRef} className="ev-filters cu-chips" aria-label="Jump to a stage">
          {shown.map((s) => (
            <button
              key={s.id}
              data-chip={s.id}
              className={`chip${active === s.id ? " active" : ""}`}
              aria-current={active === s.id ? "true" : undefined}
              onClick={() => jump(s.id)}
            >
              {s.title} <span className="ev-chip-count">{s.cultures.length}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="ev-main cu-main">
        {shown.length === 0 && (
          <div className="cu-empty">
            <p>No culture matches “{query.trim()}”.</p>
            <button className="chip" onClick={() => setQuery("")}>Clear search</button>
          </div>
        )}
        {shown.map((s) => (
          <section key={s.id} data-section={s.id} className="cu-stage" aria-labelledby={`stage-${s.id}`}>
            <header className="cu-hero">
              <div className={`cu-hero-art${s.picture ? "" : " strip"}`} aria-hidden>
                {s.picture ? (
                  <Picture url={s.picture.url} alt="" sizes="(max-width: 760px) 100vw, 80vw" />
                ) : (
                  s.cultures.slice(0, 4).map((c) => c.image_url && <Picture key={c.id} url={c.image_url} alt="" sizes="(max-width: 760px) 50vw, 25vw" />)
                )}
              </div>
              <div className="cu-hero-text">
                <p className="cu-hero-kicker">
                  <span>Stage {stages.findIndex((t) => t.id === s.id) + 1}</span>
                  <span aria-hidden>·</span>
                  <span className="cu-hero-span" title={formatRange(s.axis[0], s.axis[1])}>{shortRange(s.axis[0], s.axis[1])}</span>
                </p>
                <h2 id={`stage-${s.id}`}>{s.title}</h2>
                <p className="cu-hero-blurb">{s.blurb}</p>
                <p className="cu-hero-meta">
                  {s.cultures.length} culture{s.cultures.length === 1 ? "" : "s"} · {sitesOf(s.cultures).toLocaleString("en-US")} sites
                </p>
                {/* When each culture ran within the stage, oldest at the top. */}
                <ul className="cu-gantt" aria-hidden>
                  {s.cultures.map((c) => (
                    <li key={c.id} title={`${c.name}: ${formatRange(c.start_year, c.end_year)}`}>
                      <span style={barStyle(c, s.axis)} />
                    </li>
                  ))}
                </ul>
              </div>
            </header>
            <ul className="cu-grid">
              {s.cultures.map((c) => {
                const n = data.featuresOf.get(c.id)?.length ?? 0;
                const pics = (c.image_url ? 1 : 0) + (c.extra_images?.length ?? 0);
                const summary = summaryOf(c, firstSentence);
                return (
                  <li key={c.id}>
                    <button className="cu-card" onClick={() => navigate("cultures", c.id)}>
                      <span className="cu-card-img">
                        {c.image_url ? (
                          <Picture url={c.image_url} alt={c.image_caption ?? ""} sizes="(max-width: 600px) 40vw, 340px" />
                        ) : (
                          <span className="cu-card-ph" aria-hidden>{c.name}</span>
                        )}
                        {c.media && c.media.length > 0 && (
                          <span className="cu-card-flag" title={videoCount(c.media.length)}>
                            {videoCount(c.media.length)}
                          </span>
                        )}
                      </span>
                      <span className="cu-card-body">
                        <span className="cu-card-name">{c.name}</span>
                        <span className="cu-card-date" title={formatRange(c.start_year, c.end_year)}>{shortRange(c.start_year, c.end_year)}</span>
                        <span className="br-bar" title={`When it ran within ${formatRange(s.axis[0], s.axis[1])}`}>
                          <span style={barStyle(c, s.axis)} />
                        </span>
                        <span className="cu-card-meta muted">
                          {shortDuration(c.end_year - c.start_year)}
                          {n > 0 && <> · <span className="nowrap">{n.toLocaleString("en-US")} site{n === 1 ? "" : "s"}</span></>}
                          {pics > 1 && <> · <span className="nowrap">{pics} pictures</span></>}
                        </span>
                        {summary && <span className="cu-card-summary">{summary}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {shown.length > 0 && sharedCredit && (
          <p className="cu-credit muted">
            {isAiCredit(sharedCredit) ? "The paintings are" : <>Pictures: {sharedCredit};</>} reconstructions, not
            records. Many culture pages also show photographs of real finds.
          </p>
        )}
      </main>

      {open && open.category === "culture" && (
        <EntityDetail entity={open} order={visible.includes(open) ? visible : all} page="cultures" kicker={openStage?.title} />
      )}
    </div>
  );
}
