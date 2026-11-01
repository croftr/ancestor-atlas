import DataLoading from "../ui/DataLoading";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE } from "../config";
import { useData, type Data } from "../map/data";
import { navigate, useOpenItem } from "../route";
import { formatRange } from "../time/scale";
import { firstSentence } from "../timeline/layout";
import type { Entity } from "../types";
import { barStyle, summaryOf } from "./browse";
import { rangeText, runsOn } from "./civLayout";
import EntityDetail from "./EntityDetail";
import { useSectionNav } from "./useSectionNav";
import Totals from "./Totals";
import { videoCount } from "../youtube";
import { CategoryBadge } from "../ui/CategoryIcon";

interface Region {
  id: string;
  title: string;
  cities: Entity[];
  axis: [number, number];
}

const OTHER = "Other places";
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Pictures in public/images/cities/ (and the culture and civilization folders) have a 600 px companion. */
const hasSmall = (url: string) => /^\/images\/(cities|cultures|civilisations)\//.test(url) && !url.endsWith("-600.webp");

/**
 * Where a city lay, by the region of the civilization it belonged to (`part_of`), else of the first civilization it
 * was ruled by; a city of a culture alone (before any state) falls under "Other places".
 */
function regionOf(city: Entity, data: Data): string {
  for (const id of city.related_ids ?? []) {
    const e = data.entityById.get(id);
    const region = e?.region ?? (e?.parent_id ? data.entityById.get(e.parent_id)?.region : undefined);
    if (region) return region;
  }
  return OTHER;
}

/** The city's own picture, else its first extra photo. */
const pictureOf = (c: Entity) =>
  c.image_url
    ? { url: c.image_url, alt: c.image_caption ?? c.name }
    : c.extra_images?.[0]
      ? { url: c.extra_images[0].url, alt: c.extra_images[0].caption ?? c.name }
      : undefined;

/** A picture that fades in once loaded (or at once if it already was), and steps aside if it fails. */
function Picture({ url, alt, sizes }: { url: string; alt: string; sizes: string }) {
  return (
    <img
      src={url}
      {...(hasSmall(url) && { srcSet: `${url.replace(/\.webp$/, "-600.webp")} 600w, ${url} 1200w`, sizes })}
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
 * Cities page (#/cities): the towns and cities (cities.yaml), by region, oldest first. Each region opens with a strip
 * of its cities' pictures and a small chart of when they lived, then a card per city. The chips jump to a region and
 * follow the scroll; the search filters by name, civilization and description.
 */
export default function CitiesPage() {
  const data = useData();
  const openId = useOpenItem();
  const [query, setQuery] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

  const regions = useMemo<Region[]>(() => {
    if (!data) return [];
    const by = new Map<string, Entity[]>();
    for (const c of data.entities.filter((e) => e.category === "city")) {
      const r = regionOf(c, data);
      (by.get(r) ?? by.set(r, []).get(r)!).push(c);
    }
    return [...by.entries()]
      .map(([title, cities]) => {
        cities.sort((a, b) => a.start_year - b.start_year || a.name.localeCompare(b.name));
        const axis: [number, number] = [Math.min(...cities.map((c) => c.start_year)), Math.max(...cities.map((c) => c.end_year))];
        return { id: slug(title), title, cities, axis };
      })
      .sort((a, b) => (a.title === OTHER ? 1 : b.title === OTHER ? -1 : a.axis[0] - b.axis[0]));
  }, [data]);

  const partOfName = (c: Entity) => (c.part_of ? data?.entityById.get(c.part_of)?.name ?? "" : "");
  const q = fold(query.trim());
  const shown = useMemo(
    () =>
      regions
        .map((r) => ({ ...r, cities: q ? r.cities.filter((c) => fold(`${c.name} ${partOfName(c)} ${r.title} ${c.description ?? ""}`).includes(q)) : r.cities }))
        .filter((r) => r.cities.length > 0),
    [regions, q, data],
  );

  const { barRef, chipsRef, active, jump } = useSectionNav(pageRef, [shown]);

  if (!data) return <div className="events-page"><div className="ev-loading muted"><DataLoading /></div></div>;

  const all = regions.flatMap((r) => r.cities);
  const visible = shown.flatMap((r) => r.cities);
  const civilizations = new Set(all.map((c) => c.part_of).filter(Boolean));
  const pictures = all.reduce((n, c) => n + (c.image_url ? 1 : 0) + (c.extra_images?.length ?? 0), 0);
  const open = openId ? data.entityById.get(openId) : undefined;

  return (
    <div ref={pageRef} className="events-page br-page cu-page ci-page" style={{ "--accent": CATEGORY_STYLE.city.color } as CSSProperties}>
      <header className="ev-header br-intro">
        <div className="ev-title">
          <h1 className="cat-title">
            <CategoryBadge category="city" decorative />
            Cities
          </h1>
          <span className="muted ev-count">
            {q
              ? `Showing ${visible.length} of ${all.length}`
              : all.length ? rangeText({ start_year: Math.min(...all.map((c) => c.start_year)), end_year: Math.max(...all.map((c) => c.end_year)) }) : ""}
          </span>
        </div>
        <Totals
          items={[
            { label: all.length === 1 ? "City" : "Cities", value: all.length },
            { label: "Civilizations", value: civilizations.size, title: "Civilizations and cultures the cities belonged to" },
            { label: "Pictures", value: pictures },
            { label: "Regions", value: regions.length },
          ]}
        />
      </header>
      {/* Only the search and the region chips stay at the top; the title and counts scroll away. */}
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
            placeholder="Search cities"
            aria-label="Search cities by name, civilization or description"
          />
        </div>
        <nav ref={chipsRef} className="ev-filters cu-chips" aria-label="Jump to a region">
          {shown.map((r) => (
            <button
              key={r.id}
              data-chip={r.id}
              className={`chip${active === r.id ? " active" : ""}`}
              aria-current={active === r.id ? "true" : undefined}
              onClick={() => jump(r.id)}
            >
              {r.title} <span className="ev-chip-count">{r.cities.length}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="ev-main cu-main">
        {shown.length === 0 && (
          <div className="cu-empty">
            <p>{all.length ? `No city matches “${query.trim()}”.` : "No cities yet."}</p>
            {all.length > 0 && <button className="chip" onClick={() => setQuery("")}>Clear search</button>}
          </div>
        )}
        {shown.map((r) => (
          <section key={r.id} data-section={r.id} className="cu-stage" aria-labelledby={`region-${r.id}`}>
            <header className="cu-hero">
              <div className="cu-hero-art strip" aria-hidden>
                {r.cities.slice(0, 4).map((c) => {
                  const p = pictureOf(c);
                  return p && <Picture key={c.id} url={p.url} alt="" sizes="(max-width: 760px) 50vw, 25vw" />;
                })}
              </div>
              <div className="cu-hero-text">
                <p className="cu-hero-kicker">
                  <span className="cu-hero-span">{rangeText({ start_year: r.axis[0], end_year: r.axis[1] })}</span>
                </p>
                <h2 id={`region-${r.id}`}>{r.title}</h2>
                <p className="cu-hero-meta">
                  {r.cities.length} {r.cities.length === 1 ? "city" : "cities"}
                </p>
                {/* When each city lived within the region's span, oldest at the top. */}
                <ul className="cu-gantt" aria-hidden>
                  {r.cities.map((c) => (
                    <li key={c.id} title={`${c.name}: ${c.date_text ?? formatRange(c.start_year, c.end_year)}`}>
                      <span style={barStyle(c, r.axis)} />
                    </li>
                  ))}
                </ul>
              </div>
            </header>
            <ul className="cu-grid">
              {r.cities.map((c) => {
                const p = pictureOf(c);
                const pics = (c.image_url ? 1 : 0) + (c.extra_images?.length ?? 0);
                const civ = partOfName(c);
                const summary = summaryOf(c, firstSentence);
                return (
                  <li key={c.id}>
                    <button className="cu-card" onClick={() => navigate("cities", c.id)}>
                      <span className="cu-card-img">
                        {p ? <Picture url={p.url} alt={p.alt} sizes="(max-width: 600px) 40vw, 340px" /> : <span className="cu-card-ph" aria-hidden>{c.name}</span>}
                        {c.media && c.media.length > 0 && (
                          <span className="cu-card-flag" title={videoCount(c.media.length)}>
                            {videoCount(c.media.length)}
                          </span>
                        )}
                      </span>
                      <span className="cu-card-body">
                        <span className="cu-card-name">{c.name}</span>
                        <span className="cu-card-date" title={formatRange(c.start_year, c.end_year)}>{c.date_text ?? formatRange(c.start_year, c.end_year)}</span>
                        <span className="br-bar" title={`When it lived within ${formatRange(r.axis[0], r.axis[1])}`}>
                          <span className={runsOn(c) ? "runs-on" : undefined} style={barStyle(c, r.axis)} />
                        </span>
                        <span className="cu-card-meta muted">
                          {civ}
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
      </main>

      {open && open.category === "city" && <EntityDetail entity={open} order={visible.includes(open) ? visible : all} page="cities" />}
    </div>
  );
}
