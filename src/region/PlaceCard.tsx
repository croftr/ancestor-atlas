import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { useDna } from "../dna/data";
import { DnaIcon } from "../dna/DnaIcon";
import { CATEGORY_STYLE, STACKED_QUERY } from "../config";
import { CATEGORIES, type Category } from "../types";
import { formatRange, snapYear, yearToPos } from "../time/scale";
import { sliderYearFor } from "../search/search";
import { CategoryBadge } from "../ui/CategoryIcon";
import { shortRange } from "../ui/InfoPanel";
import CardResizer from "../ui/CardResizer";
import { useMediaQuery } from "../ui/useMediaQuery";
import {
  formatCoords,
  queryRegion,
  RADIUS_OPTIONS_KM,
  type RegionDnaSite,
  type RegionEntry,
} from "./region";
import { areaAt, useAreasReady, type AreaLevel } from "./area";
import "./place.css";

export function PlacePinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.5 1.8" />
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
    </svg>
  );
}

type FilterMode = "all" | Category | "dna";

/** A continent can hold thousands of DNA sites: list this many, then a button for the rest. */
const DNA_LIST_STEP = 150;

export default function PlaceCard() {
  const place = useStore((s) => s.place);
  const year = useStore((s) => s.year);
  const select = useStore((s) => s.select);
  const openDnaSite = useStore((s) => s.openDnaSite);
  const closePlace = useStore((s) => s.closePlace);
  const setPlaceRadius = useStore((s) => s.setPlaceRadius);
  const setPlaceArea = useStore((s) => s.setPlaceArea);

  const data = useData();
  const dna = useDna(place !== null);
  const stacked = useMediaQuery(STACKED_QUERY);
  const areasReady = useAreasReady(place !== null);

  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const panelRef = useCallback((el: HTMLDivElement | null) => setPanelEl(el), []);
  const [minimised, setMinimised] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [newestFirst, setNewestFirst] = useState(false);
  const [dnaShown, setDnaShown] = useState(DNA_LIST_STEP);

  const areas = useMemo(
    () =>
      areasReady && place
        ? (["country", "continent"] as AreaLevel[]).flatMap((level) => {
            const area = areaAt(place.lon, place.lat, level);
            return area ? [area] : [];
          })
        : [],
    [areasReady, place],
  );
  const area = (place?.area && areas.find((a) => a.level === place.area)) || null;

  const result = useMemo(
    () => (data && place ? queryRegion(data, dna, place.lon, place.lat, place.radiusKm, area) : null),
    [data, dna, place, area],
  );

  useEffect(() => setDnaShown(DNA_LIST_STEP), [result]);

  // Reset filter if the active category has 0 items after a radius or location change.
  useEffect(() => {
    if (!result) return;
    if (filter === "dna" && result.dnaSites.length === 0) setFilter("all");
    else if (filter !== "all" && filter !== "dna" && result.counts[filter] === 0) setFilter("all");
  }, [result, filter]);

  useEffect(() => {
    if (!place) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useStore.getState().closePlace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [place]);

  if (!place || !result) return null;

  const nowPos = yearToPos(year) * 100;

  const visibleEntries = result.entries.filter((e) =>
    filter === "all" ? true : filter === "dna" ? false : e.entity.category === filter,
  );
  const sortedEntries = newestFirst
    ? [...visibleEntries].sort((a, b) => b.localEnd - a.localEnd || b.localStart - a.localStart)
    : visibleEntries;

  const showDna = (filter === "all" || filter === "dna") && result.dnaSites.length > 0;
  const sortedDna = newestFirst
    ? [...result.dnaSites].sort((a, b) => b.site.end - a.site.end || b.site.start - a.site.start)
    : result.dnaSites;

  const previewEntry = (entry: RegionEntry) => {
    const f = entry.closestFeature;
    const targetYear = entry.localStart <= year && year <= entry.localEnd ? year : sliderYearFor(f);
    useStore.setState((s) => ({
      playing: false,
      year: targetYear,
      enabled: { ...s.enabled, [entry.entity.category]: true },
    }));
  };

  const openEntry = (entry: RegionEntry) => {
    const f = entry.closestFeature;
    const bbox = data?.bboxOf.get(f.id);
    const targetYear = f.start_year <= year && year <= f.end_year ? year : sliderYearFor(f);
    useStore.setState((s) => ({
      playing: false,
      year: targetYear,
      enabled: { ...s.enabled, [entry.entity.category]: true },
      ...(bbox && { flyTo: { bbox, gentle: true } }),
    }));
    select(f.id, entry.localFeatures);
  };

  const previewDnaSite = (item: RegionDnaSite) => {
    const s = item.site;
    const targetYear = s.start <= year && year <= s.end ? year : snapYear(Math.round((s.start + s.end) / 2));
    useStore.setState({ playing: false, dna: true, year: targetYear });
  };

  const openDna = (item: RegionDnaSite) => {
    const s = item.site;
    const targetYear = s.start <= year && year <= s.end ? year : snapYear(Math.round((s.start + s.end) / 2));
    useStore.setState({
      playing: false,
      dna: true,
      year: targetYear,
      flyTo: { bbox: [s.lon, s.lat, s.lon, s.lat], gentle: true },
    });
    openDnaSite(s.id);
  };

  const totalCount = result.entries.length + result.dnaSites.length;

  return (
    <>
      {!stacked && <CardResizer panel={panelEl} />}
      <div
        ref={panelRef}
        className={`panel info-panel place-panel${minimised ? " minimised" : ""}`}
        role="dialog"
        aria-label={`Regional history: ${result.title}`}
      >
        <button
          className="info-min"
          onClick={() => setMinimised((m) => !m)}
          aria-expanded={!minimised}
          aria-label={minimised ? "Show full card" : "Minimise card"}
          title={minimised ? "Show full card" : "Minimise card"}
        >
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path
              d={minimised ? "M2.5 4.5 6 8l3.5-3.5" : "M2.5 7.5 6 4l3.5 3.5"}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="close" onClick={closePlace} aria-label="Close">
          ✕
        </button>
        <div
          className="info-head"
          onClick={
            minimised
              ? (e) => {
                  if (!(e.target as HTMLElement).closest("a, button")) setMinimised(false);
                }
              : undefined
          }
        >
          <div className="place-kicker">
            <PlacePinIcon size={14} />
            What Was Here?
          </div>
          <h2>{result.title}</h2>
          <div className="place-coords">
            {formatCoords(place.lon, place.lat)} ·{" "}
            {area ? `the whole ${area.level === "country" ? "country" : "continent"}` : `within ${place.radiusKm} km`}
          </div>
        </div>

        <div className="place-controls">
          <div className="place-radii" role="group" aria-label="Search radius">
            {RADIUS_OPTIONS_KM.map((r) => (
              <button
                key={r}
                type="button"
                className={`place-radius-btn${!area && place.radiusKm === r ? " active" : ""}`}
                onClick={() => setPlaceRadius(r)}
                aria-pressed={!area && place.radiusKm === r}
              >
                {r} km
              </button>
            ))}
            {areas.map((a) => (
              <button
                key={a.level}
                type="button"
                className={`place-radius-btn${area === a ? " active" : ""}`}
                onClick={() => setPlaceArea(a.level)}
                aria-pressed={area === a}
                title={`Everything in ${a.name}`}
              >
                {a.name}
              </button>
            ))}
          </div>
          {totalCount > 1 && (
            <button
              type="button"
              className="place-sort-btn"
              onClick={() => setNewestFirst((n) => !n)}
              title="Toggle chronological order"
            >
              {newestFirst ? "Newest first ↓" : "Oldest first ↑"}
            </button>
          )}
        </div>

        {result.earliestYear !== null && result.latestYear !== null ? (
          <div className="place-span-summary">
            <strong>{result.entries.length}</strong>{" "}
            {result.entries.length === 1 ? "mapped horizon" : "mapped horizons"}
            {result.dnaSites.length > 0 && (
              <>
                {" · "}
                <strong>{result.dnaPeopleCount}</strong> ancient{" "}
                {result.dnaPeopleCount === 1 ? "genome" : "genomes"} ({result.dnaSites.length}{" "}
                {result.dnaSites.length === 1 ? "site" : "sites"})
              </>
            )}
            <div className="muted">{formatRange(result.earliestYear, result.latestYear)}</div>
          </div>
        ) : (
          <div className="place-empty">
            No mapped species, cultures, civilizations, events, or ancient DNA sites{" "}
            {area ? `in ${area.name}` : `within ${place.radiusKm} km of this point`}. Try a wider search or another
            region on the globe.
          </div>
        )}

        {totalCount > 0 && (
          <>
            <div className="place-filters" role="group" aria-label="Filter by category">
              <button
                type="button"
                className={`place-filter-chip${filter === "all" ? " active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({totalCount})
              </button>
              {CATEGORIES.map((cat) =>
                result.counts[cat] > 0 ? (
                  <button
                    key={cat}
                    type="button"
                    className={`place-filter-chip${filter === cat ? " active" : ""}`}
                    onClick={() => setFilter(filter === cat ? "all" : cat)}
                  >
                    <CategoryBadge category={cat} size={15} decorative />
                    {CATEGORY_STYLE[cat].label} ({result.counts[cat]})
                  </button>
                ) : null,
              )}
              {result.dnaSites.length > 0 && (
                <button
                  type="button"
                  className={`place-filter-chip${filter === "dna" ? " active" : ""}`}
                  onClick={() => setFilter(filter === "dna" ? "all" : "dna")}
                >
                  <DnaIcon size={14} />
                  DNA ({result.dnaSites.length})
                </button>
              )}
            </div>

            <div className="place-axis" aria-hidden="true">
              <span>10M BCE</span>
              <span>100k BCE</span>
              <span>10k BCE</span>
              <span>1 CE</span>
            </div>

            {sortedEntries.length > 0 && (
              <ul className="place-list">
                {sortedEntries.map((entry) => {
                  const isActiveNow = entry.localStart <= year && year <= entry.localEnd;
                  const leftPct = yearToPos(entry.localStart) * 100;
                  const rightPct = yearToPos(entry.localEnd) * 100;
                  const widthPct = Math.max(1.2, rightPct - leftPct);
                  const color = entry.entity.color ?? CATEGORY_STYLE[entry.entity.category].color;
                  const siteLabel =
                    entry.closestFeature.label && entry.closestFeature.label !== entry.entity.name
                      ? entry.closestFeature.label
                      : "";
                  const noun = entry.entity.category === "civilization" ? "period" : "site";

                  return (
                    <li
                      key={entry.entity.id}
                      className={`place-item${isActiveNow ? " active-now" : ""}`}
                    >
                      <div className="place-item-top">
                        <button
                          type="button"
                          className="place-item-main"
                          onClick={() => previewEntry(entry)}
                          title="Jump the time slider to this occupation on the globe"
                        >
                          <CategoryBadge category={entry.entity.category} size={20} decorative />
                          <span className="place-item-text">
                            <span className="place-item-name">{entry.entity.name}</span>
                            <span className="place-item-sub">
                              {siteLabel ? `${siteLabel} · ` : ""}
                              {entry.siteCount > 1 ? `${entry.siteCount} ${noun}s · ` : ""}
                              {entry.distanceKm === 0 ? "Covers here" : `${entry.distanceKm} km`}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="place-item-open"
                          onClick={() => openEntry(entry)}
                          aria-label={`Open card for ${entry.entity.name}`}
                          title="Open details card"
                        >
                          Card →
                        </button>
                      </div>
                      <div className="place-item-meta">
                        <span>
                          {entry.entity.category === "event" && entry.entity.date_text
                            ? entry.entity.date_text
                            : shortRange(entry.localStart, entry.localEnd)}
                        </span>
                        {isActiveNow && <span style={{ color: "#f0bd78" }}>Active at slider year</span>}
                      </div>
                      <div
                        className="place-bar-track"
                        onClick={() => previewEntry(entry)}
                        title={`Click to view at ${shortRange(entry.localStart, entry.localEnd)}`}
                      >
                        <div
                          className="place-bar-fill"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            background: color,
                          }}
                        />
                        <div className="place-bar-now" style={{ left: `${nowPos}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {showDna && (
              <>
                <h3 className="place-section-title">
                  <DnaIcon size={14} />
                  Ancient DNA sites ({result.dnaSites.length} · {result.dnaPeopleCount} sampled)
                </h3>
                <ul className="place-list">
                  {sortedDna.slice(0, dnaShown).map((item) => {
                    const s = item.site;
                    const isActiveNow = s.start <= year && year <= s.end;
                    const leftPct = yearToPos(s.start) * 100;
                    const rightPct = yearToPos(s.end) * 100;
                    const widthPct = Math.max(1.2, rightPct - leftPct);
                    return (
                      <li key={s.id} className={`place-item${isActiveNow ? " active-now" : ""}`}>
                        <div className="place-item-top">
                          <button
                            type="button"
                            className="place-item-main"
                            onClick={() => previewDnaSite(item)}
                            title="Jump the time slider to this DNA site's date on the globe"
                          >
                            <DnaIcon size={18} />
                            <span className="place-item-text">
                              <span className="place-item-name">{s.name}</span>
                              <span className="place-item-sub">
                                {s.country ? `${s.country} · ` : ""}
                                {s.people.length} {s.people.length === 1 ? "person" : "people"} ·{" "}
                                {item.distanceKm === 0 ? "Here" : `${item.distanceKm} km`}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="place-item-open"
                            onClick={() => openDna(item)}
                            aria-label={`Open ancient DNA card for ${s.name}`}
                            title="Open ancient DNA samples"
                          >
                            Samples →
                          </button>
                        </div>
                        <div className="place-item-meta">
                          <span>{shortRange(s.start, s.end)}</span>
                          {isActiveNow && <span style={{ color: "#f0bd78" }}>Active at slider year</span>}
                        </div>
                        <div
                          className="place-bar-track"
                          onClick={() => previewDnaSite(item)}
                          title={`Click to view at ${shortRange(s.start, s.end)}`}
                        >
                          <div
                            className="place-bar-fill"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              background: "#f2a65a",
                            }}
                          />
                          <div className="place-bar-now" style={{ left: `${nowPos}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {sortedDna.length > dnaShown && (
                  <button type="button" className="place-sort-btn place-more-btn" onClick={() => setDnaShown((n) => n + DNA_LIST_STEP)}>
                    Show {Math.min(DNA_LIST_STEP, sortedDna.length - dnaShown)} more of {sortedDna.length - dnaShown}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
