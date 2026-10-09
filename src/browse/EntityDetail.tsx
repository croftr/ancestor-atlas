import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE, mediaUrl } from "../config";
import { useData } from "../map/data";
import { navigate, type BrowseView } from "../route";
import { useStore } from "../store";
import { formatRange } from "../time/scale";
import { formatDuration } from "../timeline/layout";
import type { Entity } from "../types";
import { youtubeId } from "../youtube";
import { eventsAbout, pictureOf, typing } from "./browse";
import "../events/events-page.css";
import { CategoryBadge } from "../ui/CategoryIcon";
import "./browse.css";

/**
 * One culture or civilization over its browse page: picture, text, what is on the map, related
 * events and sources, links out. ←/→ step through `order` (what the page is showing), Esc closes.
 */
export default function EntityDetail({ entity, order, page, kicker }: { entity: Entity; order: Entity[]; page: BrowseView; kicker?: string }) {
  const data = useData()!;
  const focusEntity = useStore((s) => s.focusEntity);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const media = entity.media ?? [];
  const clip = current === null ? undefined : media[current];
  const ytId = clip?.kind === "video" ? youtubeId(clip.src) : null;

  const i = order.findIndex((e) => e.id === entity.id);
  const prev = i > 0 ? order[i - 1] : undefined;
  const next = i >= 0 && i < order.length - 1 ? order[i + 1] : undefined;
  const parent = entity.parent_id ? data.entityById.get(entity.parent_id) : undefined;
  const members = entity.group ? (data.childrenOf.get(entity.id) ?? []) : [];
  const features = entity.group ? members.flatMap((m) => data.featuresOf.get(m.id) ?? []) : (data.featuresOf.get(entity.id) ?? []);
  const xronos = features.filter((f) => f.source_id === "xronos").length;
  const events = eventsAbout(entity, data);
  const sources = entity.source_ids.flatMap((id) => data.sourceById.get(id) ?? []);
  const picture = pictureOf(entity, data);
  const credit = clip ? clip.credit : (picture?.note ? `${picture.note}. ${picture.credit}` : picture?.credit);
  const style = CATEGORY_STYLE[entity.category];
  const color = entity.color ?? style.color;
  const approximate = entity.source_ids.includes("recall");

  const choose = (idx: number) => {
    setFailed(null);
    setCurrent(current === idx ? null : idx);
  };

  useEffect(() => {
    setCurrent(null);
    setFailed(null);
    closeRef.current?.focus({ preventScroll: true });
  }, [entity.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.key === "Escape") navigate(page);
      else if (e.key === "ArrowLeft" && prev) navigate(page, prev.id);
      else if (e.key === "ArrowRight" && next) navigate(page, next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, page]);

  const showOnGlobe = (id: string) => {
    focusEntity(id);
    navigate("globe");
  };

  let mapLine: string | null = null;
  if (entity.category === "culture" && features.length)
    mapLine = `${features.length.toLocaleString("en-US")} site${features.length === 1 ? "" : "s"} on the globe` +
      (xronos ? `, ${xronos.toLocaleString("en-US")} of them radiocarbon-dated (XRONOS)` : "");
  else if (entity.category === "civilization" && features.length)
    mapLine = `${features.length} territory map${features.length === 1 ? "" : "s"} on the globe` + (entity.group ? ` across ${members.length} periods` : "");

  return (
    <div className="ev-overlay" onClick={(e) => e.target === e.currentTarget && navigate(page)}>
      <article className="ev-detail br-detail panel" role="dialog" aria-modal="true" aria-labelledby="br-detail-name">
        <button ref={closeRef} className="ev-close" onClick={() => navigate(page)} aria-label="Close">
          ✕
        </button>
        <div className="ev-detail-media">
          {clip?.kind === "video" ? (
            <div className="ev-player">
              {ytId ? (
                // youtube-nocookie: no YouTube cookies until the viewer plays; nothing loads before the click.
                <iframe
                  key={ytId}
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&playsinline=1`}
                  title={clip.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <video
                  key={clip.src}
                  src={mediaUrl(clip.src)}
                  poster={picture?.url}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  aria-label={clip.title}
                  onError={() => setFailed(clip.title)}
                />
              )}
              {!ytId && (
                <button className="ev-player-close" onClick={() => setCurrent(null)} aria-label="Close video">
                  ✕ Close
                </button>
              )}
            </div>
          ) : picture && broken !== picture.url ? (
            <div className="br-img large">
              <img src={picture.url} alt={entity.name} onError={() => setBroken(picture.url)} />
            </div>
          ) : (
            <div className="br-img large br-ph" style={{ "--swatch": color } as CSSProperties} role="img" aria-label={`${entity.name} (no picture yet)`}>
              <span>{entity.name}</span>
            </div>
          )}
          {clip?.kind === "audio" && (
            <audio key={clip.src} className="ev-audio" src={mediaUrl(clip.src)} controls autoPlay preload="none" onError={() => setFailed(clip.title)} />
          )}
          {credit && <div className="muted image-credit">{credit}</div>}
          {failed && <div className="ev-media-error">Couldn't load “{failed}”.</div>}
          {media.length > 0 && (
            <div className="ev-media-list">
              {media.map((m, idx) => (
                <button key={m.src} className="ev-media-btn" aria-pressed={current === idx} onClick={() => choose(idx)}>
                  <span aria-hidden>{m.kind === "video" ? "▶\uFE0E" : "♪"}</span>
                  {m.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ev-detail-body">
          <div className="ev-detail-era br-kicker">
            <span className="related-dot" style={{ background: color }} />
            {kicker ?? style.label}
          </div>
          {parent && (
            <div className="breadcrumb">
              <button className="link" onClick={() => navigate(page, parent.id)}>{parent.name}</button> › {entity.name}
            </div>
          )}
          <h2 id="br-detail-name" className="cat-title">
            <CategoryBadge category={entity.category} />
            <span>{entity.name}</span>
          </h2>
          <div className="ev-detail-date">
            {formatRange(entity.start_year, entity.end_year)}
            <span className="muted"> · {formatDuration(entity.end_year - entity.start_year)}</span>
          </div>
          {approximate && <div className="br-recall">Dates and places recalled, not yet checked against a source.</div>}
          <p>{entity.description}</p>

          {mapLine && <div className="muted br-mapline">{mapLine}</div>}

          {members.length > 0 && (
            <div className="related">
              <div className="muted">Periods:</div>
              <ol className="br-members">
                {members.map((m) => (
                  <li key={m.id}>
                    <span className="br-member">
                      <button className="link" onClick={() => navigate(page, m.id)}>{m.name}</button>
                      <span className="muted">{formatRange(m.start_year, m.end_year)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {events.length > 0 && (
            <div className="related">
              <div className="muted">Events:</div>
              <div className="also">
                {events.map((ev) => (
                  <button key={ev.id} className="chip" onClick={() => navigate("events", ev.id)} title={ev.date_text}>
                    <span className="related-dot" style={{ background: CATEGORY_STYLE.event.color }} />
                    {ev.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="muted ev-sources">
            {sources.length > 0 && (
              <>
                From{" "}
                {sources.map((s, k) => (
                  <span key={s.id}>
                    {k > 0 && ", "}
                    {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : s.name}
                  </span>
                ))}
              </>
            )}
            {entity.wikipedia_url && (
              <>
                {sources.length ? " · " : ""}
                <a href={entity.wikipedia_url} target="_blank" rel="noreferrer">Read more</a>
              </>
            )}
          </div>

          <div className="ev-actions">
            <button className="tl-btn" onClick={() => showOnGlobe(entity.id)}>Show on globe</button>
            <button className="tl-btn" onClick={() => navigate("timeline", entity.id)}>See on timeline</button>
          </div>

          {i >= 0 && order.length > 1 && (
            <nav className="ev-stepper" aria-label="Others">
              <button className="tl-btn" disabled={!prev} onClick={() => prev && navigate(page, prev.id)} title={prev?.name}>
                ‹ <span className="ev-step-name">{prev?.name ?? "Earlier"}</span>
              </button>
              <span className="muted">{i + 1} of {order.length}</span>
              <button className="tl-btn" disabled={!next} onClick={() => next && navigate(page, next.id)} title={next?.name}>
                <span className="ev-step-name">{next?.name ?? "Later"}</span> ›
              </button>
            </nav>
          )}
        </div>
      </article>
    </div>
  );
}
