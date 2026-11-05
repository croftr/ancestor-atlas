import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../map/data";
import { navigate } from "../route";
import { useStore } from "../store";
import { formatRange, yearToPos } from "../time/scale";
import { formatDuration, shortDuration } from "../timeline/layout";
import type { Entity } from "../types";
import { CategoryBadge } from "../ui/CategoryIcon";
import { eventsAbout, pictureOf, scaleLabel, scaleTicks } from "./browse";
import { REFS, type Support } from "./phylogeny";
import {
  compareSpecies,
  FAMOUS_SPECIES_PAIRS,
  type SitePoint,
  type SpeciesComparison,
} from "./compare";

const COLOR_A = "#f6b95b";
const COLOR_B = "#5bc8f6";

const SUPPORT_LABEL: Record<Support, string> = {
  supported: "Well supported",
  debated: "Debated",
  unresolved: "Unresolved",
};

interface LandCollection {
  features: {
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
  }[];
}

let landCache: LandCollection | null = null;
let landPromise: Promise<LandCollection | null> | null = null;

function loadLand(): Promise<LandCollection | null> {
  if (landCache) return Promise.resolve(landCache);
  if (!landPromise) {
    landPromise = fetch("/data/basemap/land.geojson")
      .then((r) => (r.ok ? (r.json() as Promise<LandCollection>) : null))
      .then((d) => {
        landCache = d;
        return d;
      })
      .catch(() => null);
  }
  return landPromise;
}

const DEG = Math.PI / 180;

/** Orthographic projection of (lon, lat) onto a sphere of radius `R` centred at (lon0, lat0). */
function projectOrtho(
  lon: number,
  lat: number,
  lon0: number,
  lat0: number,
  R: number,
  cx: number,
  cy: number,
): { x: number; y: number; visible: boolean } {
  const lam = lon * DEG;
  const phi = lat * DEG;
  const lam0 = lon0 * DEG;
  const phi0 = lat0 * DEG;
  const dLam = lam - lam0;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);

  const cosC = sinPhi0 * sinPhi + cosPhi0 * cosPhi * Math.cos(dLam);
  const x = cx + R * cosPhi * Math.sin(dLam);
  const y = cy - R * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * Math.cos(dLam));
  return { x, y, visible: cosC >= 0 };
}

/** Interactive dual-colour orthographic mini-globe showing both species' fossil ranges. */
function CompareGlobe({ cmp }: { cmp: SpeciesComparison }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [land, setLand] = useState<LandCollection | null>(() => landCache);
  const [center, setCenter] = useState<[number, number]>(cmp.globeCenter);
  const [hovered, setHovered] = useState<{ site: SitePoint; speciesName: string; color: string } | null>(null);
  const dragRef = useRef<{ x: number; y: number; lon0: number; lat0: number } | null>(null);
  const screenPointsRef = useRef<{ x: number; y: number; r: number; site: SitePoint; speciesName: string; color: string }[]>([]);

  useEffect(() => {
    if (!land) loadLand().then((d) => d && setLand(d));
  }, [land]);

  useEffect(() => {
    setCenter(cmp.globeCenter);
    setHovered(null);
  }, [cmp.a.id, cmp.b.id, cmp.globeCenter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 256;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 8;
    const [lon0, lat0] = center;

    // 1. Ocean sphere
    const grad = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.28, R * 0.1, cx, cy, R);
    grad.addColorStop(0, "#162444");
    grad.addColorStop(0.75, "#0b1328");
    grad.addColorStop(1, "#060a16");
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Clip to sphere
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // 2. Graticule lines every 30 deg
    ctx.strokeStyle = "rgba(150, 175, 220, 0.09)";
    ctx.lineWidth = 0.8;
    for (let lon = -150; lon <= 180; lon += 30) {
      ctx.beginPath();
      let pen = false;
      for (let lat = -80; lat <= 80; lat += 5) {
        const p = projectOrtho(lon, lat, lon0, lat0, R, cx, cy);
        if (p.visible) {
          if (!pen) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let pen = false;
      for (let lon = -180; lon <= 180; lon += 5) {
        const p = projectOrtho(lon, lat, lon0, lat0, R, cx, cy);
        if (p.visible) {
          if (!pen) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();
    }

    // 3. Land polygons
    if (land) {
      ctx.fillStyle = "#1d2a48";
      ctx.strokeStyle = "rgba(160, 185, 230, 0.22)";
      ctx.lineWidth = 0.7;
      for (const feat of land.features) {
        const g = feat.geometry;
        const polys: number[][][][] =
          g.type === "Polygon" ? [g.coordinates as number[][][]] : (g.coordinates as number[][][][]);
        for (const rings of polys) {
          const ring = rings[0];
          if (!ring || ring.length < 3) continue;
          ctx.beginPath();
          let anyVisible = false;
          let started = false;
          for (let i = 0; i < ring.length; i += 2) {
            const pt = ring[i];
            const p = projectOrtho(pt[0], pt[1], lon0, lat0, R, cx, cy);
            if (p.visible) {
              anyVisible = true;
              if (!started) {
                ctx.moveTo(p.x, p.y);
                started = true;
              } else {
                ctx.lineTo(p.x, p.y);
              }
            } else {
              started = false;
            }
          }
          if (anyVisible) {
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      }
    }

    // 4. Dashed connector between closest sites if both are visible
    if (cmp.closestSites && cmp.closestSites.distanceKm > 0) {
      const pa = projectOrtho(cmp.closestSites.siteA.lon, cmp.closestSites.siteA.lat, lon0, lat0, R, cx, cy);
      const pb = projectOrtho(cmp.closestSites.siteB.lon, cmp.closestSites.siteB.lat, lon0, lat0, R, cx, cy);
      if (pa.visible && pb.visible) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 5. Fossil site markers for Species A and Species B
    const drawn: { x: number; y: number; r: number; site: SitePoint; speciesName: string; color: string }[] = [];
    const drawSites = (sites: SitePoint[], color: string, speciesName: string) => {
      for (const s of sites) {
        const p = projectOrtho(s.lon, s.lat, lon0, lat0, R, cx, cy);
        if (!p.visible) continue;
        const r = Math.min(8, 3.8 + Math.log2(s.finds + 1) * 0.85);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.88;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "#080d1a";
        ctx.stroke();
        drawn.push({ x: p.x, y: p.y, r, site: s, speciesName, color });
      }
    };

    drawSites(cmp.sitesA, COLOR_A, cmp.a.name);
    drawSites(cmp.sitesB, COLOR_B, cmp.b.name);
    screenPointsRef.current = drawn;

    ctx.restore(); // unclip

    // 6. Atmosphere rim
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(142, 197, 255, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }, [land, center, cmp]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, lon0: center[0], lat0: center[1] };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      const nextLon = ((((dragRef.current.lon0 - dx * 0.45) + 180) % 360) + 360) % 360 - 180;
      const nextLat = Math.max(-75, Math.min(75, dragRef.current.lat0 + dy * 0.45));
      setCenter([nextLon, nextLat]);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best: (typeof screenPointsRef.current)[number] | null = null;
    let bestDist = 14;
    for (const pt of screenPointsRef.current) {
      const d = Math.hypot(pt.x - x, pt.y - y);
      if (d <= bestDist) {
        bestDist = d;
        best = pt;
      }
    }
    setHovered(best ? { site: best.site, speciesName: best.speciesName, color: best.color } : null);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="sc-globe-card">
      <div className="sc-section-head">
        <h2>Geographic ranges</h2>
        <span className="muted" style={{ fontSize: "0.76rem" }}>Drag globe to rotate</span>
      </div>
      <div className="sc-globe-stage">
        <canvas
          ref={canvasRef}
          className="sc-globe-canvas"
          style={{ width: 256, height: 256 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHovered(null)}
          aria-label={`Mini-globe showing fossil sites of ${cmp.a.name} and ${cmp.b.name}`}
        />
        {hovered && (
          <div className="sc-globe-tooltip">
            <span style={{ color: hovered.color, fontWeight: 700 }}>●</span>{" "}
            <strong>{hovered.site.feature.label || hovered.speciesName}</strong> · {hovered.speciesName} (
            {hovered.site.finds} {hovered.site.finds === 1 ? "find" : "finds"})
          </div>
        )}
      </div>
      <div className="sc-globe-legend">
        <span className="sc-globe-legend-item">
          <span className="sc-dot a" />
          <span>
            {cmp.a.name} ({cmp.sitesA.length} {cmp.sitesA.length === 1 ? "site" : "sites"})
          </span>
        </span>
        <span className="sc-globe-legend-item">
          <span className="sc-dot b" />
          <span>
            {cmp.b.name} ({cmp.sitesB.length} {cmp.sitesB.length === 1 ? "site" : "sites"})
          </span>
        </span>
      </div>
      {cmp.closestSites && (
        <div className="sc-closest-note">
          {cmp.closestSites.distanceKm === 0 ? (
            <>
              <strong>Found at the same site:</strong>{" "}
              {cmp.closestSites.siteA.feature.label || "Shared locality"}
            </>
          ) : (
            <>
              <strong>Closest fossil sites:</strong>{" "}
              {cmp.closestSites.siteA.feature.label || cmp.a.name} &amp;{" "}
              {cmp.closestSites.siteB.feature.label || cmp.b.name} (
              {cmp.closestSites.distanceKm.toLocaleString("en-US")} km apart)
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SpeciesCompare({
  species,
  initialA,
  initialB,
  onSelectPair,
}: {
  species: Entity[];
  initialA?: string;
  initialB?: string;
  onSelectPair?: (a: string, b: string) => void;
}) {
  const data = useData()!;
  const focusEntity = useStore((s) => s.focusEntity);

  const defaultA = initialA && species.some((s) => s.id === initialA) ? initialA : "neanderthal";
  const defaultB =
    initialB && species.some((s) => s.id === initialB) && initialB !== defaultA
      ? initialB
      : defaultA === "homo-sapiens"
        ? "neanderthal"
        : "homo-sapiens";

  const [idA, setIdA] = useState(defaultA);
  const [idB, setIdB] = useState(defaultB);

  useEffect(() => {
    if (initialA && species.some((s) => s.id === initialA) && initialA !== idA) {
      if (initialA === idB) setIdB(idA);
      setIdA(initialA);
    }
  }, [initialA, species]);

  const choosePair = (nextA: string, nextB: string) => {
    setIdA(nextA);
    setIdB(nextB);
    onSelectPair?.(nextA, nextB);
  };

  const spA = data.entityById.get(idA) ?? species[0];
  const spB = data.entityById.get(idB) ?? species[Math.min(1, species.length - 1)];

  const cmp = useMemo(() => compareSpecies(data, spA, spB), [data, spA, spB]);

  const axis: [number, number] = useMemo(() => {
    if (!species.length) return [0, 1];
    return [
      yearToPos(Math.min(...species.map((s) => s.start_year))),
      yearToPos(Math.max(...species.map((s) => s.end_year))),
    ];
  }, [species]);

  const at = (year: number) => ((yearToPos(year) - axis[0]) / Math.max(1e-9, axis[1] - axis[0])) * 100;
  const barStyle = (start: number, end: number) => {
    const left = Math.max(0, at(start));
    const width = Math.max(1, Math.min(100 - left, at(end) - left));
    return { left: `${left}%`, width: `${width}%` };
  };
  const ticks = scaleTicks(at);

  const showOnGlobe = (id: string) => {
    focusEntity(id);
    navigate("globe");
  };

  const renderColumn = (
    s: Entity,
    side: "a" | "b",
    sites: SitePoint[],
    finds: number,
  ) => {
    const pic = pictureOf(s, data);
    const sortedByAge = [...sites].sort((x, y) => x.feature.start_year - y.feature.start_year);
    const earliestSite = sortedByAge[0];
    const latestSite = [...sites].sort((x, y) => y.feature.end_year - x.feature.end_year)[0];
    const relatedCultures = (s.related_ids ?? [])
      .map((id) => data.entityById.get(id))
      .filter((e): e is Entity => !!e && e.category === "culture");
    const relatedEvents = eventsAbout(s, data);

    return (
      <div className={`sc-col ${side}`}>
        <div className="sc-col-head">
          <div className="sc-col-img">
            {pic ? (
              <img src={pic.url} alt={s.name} loading="lazy" />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                <CategoryBadge category="species" size={36} decorative />
              </div>
            )}
          </div>
          <div className="sc-col-title">
            <h3>
              <span className={`sc-dot ${side}`} style={{ display: "inline-block", marginRight: 8 }} />
              {s.name}
            </h3>
            <div className="sc-col-date">{formatRange(s.start_year, s.end_year)}</div>
          </div>
        </div>

        <dl className="sc-stats-grid">
          <div>
            <dt>Known span</dt>
            <dd style={{ color: side === "a" ? COLOR_A : COLOR_B }}>
              {shortDuration(s.end_year - s.start_year)}
            </dd>
          </div>
          <div>
            <dt>Fossil sites</dt>
            <dd>{sites.length.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Fossil finds</dt>
            <dd>{finds.toLocaleString("en-US")}</dd>
          </div>
        </dl>

        <p className="sc-desc">{s.description}</p>

        {earliestSite && (
          <div className="sc-sites-summary">
            <div>
              <strong>Earliest site:</strong> {earliestSite.feature.label || s.name} (
              {formatRange(earliestSite.feature.start_year, earliestSite.feature.end_year)})
            </div>
            {latestSite && latestSite.feature.id !== earliestSite.feature.id && (
              <div>
                <strong>Latest site:</strong> {latestSite.feature.label || s.name} (
                {formatRange(latestSite.feature.start_year, latestSite.feature.end_year)})
              </div>
            )}
          </div>
        )}

        {(relatedCultures.length > 0 || relatedEvents.length > 0) && (
          <div>
            <div className="muted" style={{ fontSize: "0.78rem", marginBottom: 4 }}>
              Associated cultures &amp; milestones:
            </div>
            <div className="also">
              {relatedCultures.map((c) => (
                <button key={c.id} className="chip" onClick={() => navigate("cultures", c.id)}>
                  <CategoryBadge category="culture" size={15} decorative />
                  {c.name}
                </button>
              ))}
              {relatedEvents.map((ev) => (
                <button key={ev.id} className="chip" onClick={() => navigate("events", ev.id)}>
                  <CategoryBadge category="event" size={15} decorative />
                  {ev.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sc-col-actions">
          <button type="button" className="chip" onClick={() => navigate("species", s.id)}>
            Species details &amp; media →
          </button>
          <button type="button" className="chip" onClick={() => showOnGlobe(s.id)}>
            Show on 3D globe →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="sc-wrap">
      <div className="sc-picker-bar">
        <div className="sc-pickers">
          <label className="sc-picker">
            <span className="sc-dot a" aria-hidden="true" />
            <select
              className="sc-select a"
              value={spA.id}
              aria-label="First species to compare"
              onChange={(e) => {
                const next = e.target.value;
                if (next === spB.id) choosePair(spB.id, spA.id);
                else choosePair(next, spB.id);
              }}
            >
              {species.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  {idx + 1}. {s.name} ({formatRange(s.start_year, s.end_year)})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="sc-swap-btn"
            onClick={() => choosePair(spB.id, spA.id)}
            title="Swap species"
            aria-label="Swap the two species"
          >
            ⇄ Swap
          </button>

          <label className="sc-picker">
            <span className="sc-dot b" aria-hidden="true" />
            <select
              className="sc-select b"
              value={spB.id}
              aria-label="Second species to compare"
              onChange={(e) => {
                const next = e.target.value;
                if (next === spA.id) choosePair(spB.id, spA.id);
                else choosePair(spA.id, next);
              }}
            >
              {species.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  {idx + 1}. {s.name} ({formatRange(s.start_year, s.end_year)})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="sc-presets" role="group" aria-label="Suggested species pairs">
          <span className="sc-presets-label">Compare:</span>
          {FAMOUS_SPECIES_PAIRS.map((pair) => {
            const active =
              (spA.id === pair.a && spB.id === pair.b) || (spA.id === pair.b && spB.id === pair.a);
            return (
              <button
                key={`${pair.a}-${pair.b}`}
                type="button"
                className={`chip${active ? " active" : ""}`}
                onClick={() => choosePair(pair.a, pair.b)}
              >
                {pair.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Spans & Overlap */}
      <section className="sc-timeline-card" aria-label="Time span comparison">
        <div className="sc-section-head">
          <h2>Time spans &amp; overlap</h2>
          {cmp.overlap ? (
            <span className="sc-overlap-badge overlapped">
              Overlapped { cmp.overlapYears > 0 ? `for ${formatDuration(cmp.overlapYears)}` : "in time" } (
              {formatRange(cmp.overlap[0], cmp.overlap[1])})
            </span>
          ) : (
            <span className="sc-overlap-badge separated">
              Separated by {formatDuration(cmp.gapYears)}
            </span>
          )}
        </div>

        <div className="sc-bars">
          <div className="sc-bar-row">
            <span className="sc-bar-label">
              <span className="sc-dot a" />
              <span>{spA.name}</span>
            </span>
            <div className="sc-bar-track">
              <div className="sc-bar-fill a" style={barStyle(spA.start_year, spA.end_year)} />
              {cmp.overlap && (
                <div className="sc-bar-overlap" style={barStyle(cmp.overlap[0], cmp.overlap[1])} />
              )}
            </div>
          </div>
          <div className="sc-bar-row">
            <span className="sc-bar-label">
              <span className="sc-dot b" />
              <span>{spB.name}</span>
            </span>
            <div className="sc-bar-track">
              <div className="sc-bar-fill b" style={barStyle(spB.start_year, spB.end_year)} />
              {cmp.overlap && (
                <div className="sc-bar-overlap" style={barStyle(cmp.overlap[0], cmp.overlap[1])} />
              )}
            </div>
          </div>
        </div>

        <div className="sc-scale" aria-hidden="true">
          <div className="sc-scale-track">
            {ticks.map((t) => (
              <span key={t.y} className="sp-tick" style={{ left: `${t.x}%` }}>
                {scaleLabel(t.y)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Dual-Colour Mini-Globe & Evolutionary Relationship */}
      <div className="sc-middle-grid">
        <CompareGlobe cmp={cmp} />

        <div className="sc-lineage-card">
          <div className="sc-section-head">
            <h2>Evolutionary relationship</h2>
          </div>
          {cmp.commonClade && (
            <div className="sc-clade-box">
              <div className="sc-clade-head">
                <span className={`ft-support ${cmp.commonClade.support}`}>
                  {SUPPORT_LABEL[cmp.commonClade.support]}
                </span>
                <h3>Shared clade: {cmp.commonClade.label}</h3>
              </div>
              <p style={{ margin: "6px 0 8px", fontSize: "0.88rem", lineHeight: 1.5 }}>
                {cmp.commonClade.note}
              </p>
              {cmp.commonClade.refs.length > 0 && (
                <ul className="ft-refs">
                  {cmp.commonClade.refs.map((r) => (
                    <li key={r}>{REFS[r]}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {cmp.geneFlows.length > 0 && (
            <>
              <div className="sc-section-head" style={{ marginTop: 4 }}>
                <h2>Documented interbreeding ({cmp.geneFlows.length})</h2>
              </div>
              <ul className="sc-geneflow-list">
                {cmp.geneFlows.map((gf) => (
                  <li key={gf.id} className="sc-geneflow-item">
                    <div>
                      <strong>{gf.name}</strong> · <span className="muted">{gf.date_text}</span>
                    </div>
                    <div style={{ marginTop: 4 }}>{gf.description}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Side-by-Side Anatomy, Fossils & Cultures */}
      <div className="sc-columns">
        {renderColumn(spA, "a", cmp.sitesA, cmp.findsA)}
        {renderColumn(spB, "b", cmp.sitesB, cmp.findsB)}
      </div>
    </div>
  );
}
