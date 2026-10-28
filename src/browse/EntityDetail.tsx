import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE, mediaUrl } from "../config";
import { useData } from "../map/data";
import { navigate, type BrowseView } from "../route";
import { useStore } from "../store";
import { formatRange } from "../time/scale";
import { shortRange } from "../ui/InfoPanel";
import { formatDuration } from "../timeline/layout";
import type { Entity } from "../types";
import { youtubeId } from "../youtube";
import { eventsAbout, pictureOf, typing } from "./browse";
import { runsOn } from "./civLayout";
import "../events/events-page.css";
import { CategoryBadge } from "../ui/CategoryIcon";
import ListenButton from "../audio/ListenButton";
import { entityPictures, preloadPictures } from "../tours/tourPicture";
import { PictureNav, creditLine } from "../ui/PictureNav";
import PictureViewer from "../ui/PictureViewer";
import { contemporaries } from "../ui/contemporaries";
import DnaCultureLink from "../dna/DnaCultureLink";
import TourStopLinks from "../tours/TourStopLinks";
import TourVideo from "../ui/TourVideo";
import { CardHead, CardIcon, CardSection, ReadMore, SourcesDisclosure } from "../ui/CardParts";
import { SINGULAR } from "../ui/CategoryIcon";
import "./browse.css";

/**
 * One species, culture or civilization over its browse page: picture, text, what is on the map, related
 * events and sources, links out. ←/→ step through `order` (what the page is showing), Esc closes.
 */
export default function EntityDetail({
  entity,
  order,
  page,
  kicker,
  onCompare,
}: {
  entity: Entity;
  order: Entity[];
  page: BrowseView;
  kicker?: string;
  onCompare?: (id: string) => void;
}) {
  const data = useData()!;
  const focusEntity = useStore((s) => s.focusEntity);
  const viewerOpen = useStore((s) => s.pictureViewer);
  const setViewerOpen = useStore((s) => s.setPictureViewer);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [picIndex, setPicIndex] = useState(0);

  const media = entity.media ?? [];
  const clip = current === null ? undefined : media[current];
  const ytId = clip?.kind === "video" ? youtubeId(clip.src) : null;

  const i = order.findIndex((e) => e.id === entity.id);
  const prev = i > 0 ? order[i - 1] : undefined;
  const next = i >= 0 && i < order.length - 1 ? order[i + 1] : undefined;
  const parent = entity.parent_id ? data.entityById.get(entity.parent_id) : undefined;
  // A civilization the atlas cuts off at its end (1 CE) carried on after it.
  const cutOff = entity.category === "civilization" && runsOn(entity);
  const members = entity.group ? (data.childrenOf.get(entity.id) ?? []) : [];
  const features = entity.group ? members.flatMap((m) => data.featuresOf.get(m.id) ?? []) : (data.featuresOf.get(entity.id) ?? []);
  const xronos = features.filter((f) => f.source_id === "xronos").length;
  const events = eventsAbout(entity, data);
  const sameTime = contemporaries(entity, data.entities);
  const sources = entity.source_ids.flatMap((id) => data.sourceById.get(id) ?? []);
  const picture = pictureOf(entity, data);
  const pictures = entityPictures(entity, parent);
  const hasMultiplePictures = pictures.length > 1;
  const curPicIndex = hasMultiplePictures ? picIndex % pictures.length : 0;
  const currentPic = hasMultiplePictures ? pictures[curPicIndex] : undefined;
  const isExtra = curPicIndex > 0;
  const shown = currentPic
    ? {
        url: currentPic.url,
        name: currentPic.caption ?? entity.name,
        credit: currentPic.credit,
        note: currentPic.caption ?? (curPicIndex === 0 ? picture?.note : undefined),
      }
    : picture;
  const viewerPictures = pictures.filter((p) => p.url !== broken);
  const viewerIndex = viewerPictures.length ? picIndex % viewerPictures.length : 0;
  const canView = viewerPictures.length > 0;
  const openViewer = () => setViewerOpen(true);
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
    setPicIndex(0);
    setViewerOpen(false);
    preloadPictures(entity);
    closeRef.current?.focus({ preventScroll: true });
    return () => setViewerOpen(false);
  }, [entity.id, setViewerOpen]);
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
  if (entity.category === "species" && features.length)
    mapLine = `${features.length} fossil site${features.length === 1 ? "" : "s"} on the globe`;
  else if (entity.category === "culture" && features.length)
    mapLine = `${features.length.toLocaleString("en-US")} site${features.length === 1 ? "" : "s"} on the globe` +
      (xronos ? `, ${xronos.toLocaleString("en-US")} of them radiocarbon-dated (XRONOS)` : "");
  else if (entity.category === "civilization" && features.length)
    mapLine = `${features.length} territory map${features.length === 1 ? "" : "s"} on the globe` + (entity.group ? ` across ${members.length} periods` : "");

  return (
    <>
    {viewerOpen && canView && (
      <PictureViewer
        entity={entity}
        date={formatRange(entity.start_year, entity.end_year)}
        pictures={viewerPictures}
        index={viewerIndex}
        onIndex={setPicIndex}
      />
    )}
    <div className="ev-overlay" onClick={(e) => e.target === e.currentTarget && navigate(page)}>
      <article className="ev-detail br-detail panel" role="dialog" aria-modal="true" aria-labelledby="br-detail-name">
        <button ref={closeRef} className="ev-close" onClick={() => navigate(page)} aria-label="Close" title="Close (Esc)">
          <CardIcon name="close" size={16} />
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
          ) : shown && broken !== shown.url ? (
            <div className={`br-img large${canView ? " pv-open" : ""}`} onClick={canView ? openViewer : undefined}>
              {canView && (
                <button
                  className="pv-open-hint"
                  onClick={(e) => {
                    e.stopPropagation();
                    openViewer();
                  }}
                  aria-label="View pictures full screen"
                  title="View full screen"
                >
                  <svg viewBox="0 0 12 12" width="13" height="13" aria-hidden="true">
                    <path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5 7 5M1.5 10.5 5 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              <img
                key={shown.url}
                src={shown.url}
                {...((shown.url.startsWith("/images/cultures/") || shown.url.startsWith("/images/civilisations/")) && !shown.url.includes("-600.webp")
                  ? {
                      srcSet: `${shown.url.replace(/\.webp$/, "-600.webp")} 600w, ${shown.url} 1200w`,
                      sizes: "(max-width: 640px) 100vw, 600px",
                    }
                  : {})}
                alt={entity.name}
                className={isExtra ? "info-image-extra picture-in" : undefined}
                onError={() => setBroken(shown.url)}
              />
              {!isExtra && entity.video && <TourVideo key={entity.video.src} src={entity.video.src} />}
              {hasMultiplePictures && (
                <PictureNav
                  count={pictures.length}
                  current={curPicIndex}
                  onPrev={() => setPicIndex((idx) => (idx - 1 + pictures.length) % pictures.length)}
                  onNext={() => setPicIndex((idx) => (idx + 1) % pictures.length)}
                  onSelect={(idx) => setPicIndex(idx)}
                />
              )}
            </div>
          ) : (
            <div className="br-img large br-ph" style={{ "--swatch": color } as CSSProperties} role="img" aria-label={`${entity.name} (no picture yet)`}>
              <span>{entity.name}</span>
            </div>
          )}
          {clip?.kind === "audio" && (
            <audio key={clip.src} className="ev-audio" src={mediaUrl(clip.src)} controls autoPlay preload="none" onError={() => setFailed(clip.title)} />
          )}
          {clip ? (
            <div className="muted image-credit">{clip.credit}</div>
          ) : shown?.credit ? (
            <div className="muted image-credit">{creditLine(shown.credit, shown.note, isExtra ? currentPic?.source : undefined)}</div>
          ) : null}
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
          <CardHead
            category={entity.category}
            titleId="br-detail-name"
            eyebrow={
              <>
                <span>{kicker ?? SINGULAR[entity.category]}</span>
                {parent && (
                  <>
                    <span className="card-eyebrow-sep" aria-hidden="true">·</span>
                    <button className="card-eyebrow-link" onClick={() => navigate(page, parent.id)} title={`Open ${parent.name}`}>
                      {parent.name}
                    </button>
                  </>
                )}
              </>
            }
            title={entity.name}
            sub={
              <>
                <span>
                  {formatRange(entity.start_year, entity.end_year)}
                  {cutOff ? " and later" : ""}
                </span>
                <span className="card-sub-pill">{cutOff ? "at least " : ""}{formatDuration(entity.end_year - entity.start_year)}</span>
              </>
            }
          />
          {cutOff && <div className="muted br-cutoff">It carried on after 1 CE, where the atlas ends.</div>}
          {approximate && <div className="br-recall">Dates and places recalled, not yet checked against a source.</div>}
          <div className="ev-actions">
            <button className="tl-btn primary" onClick={() => showOnGlobe(entity.id)}>
              <CardIcon name="globe" size={16} />
              Show on globe
            </button>
            <button className="tl-btn" onClick={() => navigate("timeline", entity.id)}>
              <CardIcon name="timeline" size={16} />
              See on timeline
            </button>
            {onCompare && (
              <button className="tl-btn" onClick={() => onCompare(entity.id)}>
                <CardIcon name="compare" size={16} />
                Compare species
              </button>
            )}
          </div>
          <ListenButton entity={entity} />
          <p className="card-desc">{entity.description}</p>
          {entity.wikipedia_url && <ReadMore href={entity.wikipedia_url} />}

          {mapLine && <div className="br-mapline">{mapLine}</div>}
          {entity.category === "culture" && <DnaCultureLink cultureId={entity.id} />}

          {members.length > 0 && (
            <CardSection title="Periods, by date" count={members.length}>
              <ol className="card-members">
                {members.map((m) => (
                  <li key={m.id}>
                    <button className="card-member" onClick={() => navigate(page, m.id)} title={formatRange(m.start_year, m.end_year)}>
                      <span className="card-member-dot" style={{ background: m.color ?? color }} />
                      <span className="card-member-name">{m.name}</span>
                      <span className="card-member-date">{shortRange(m.start_year, m.end_year)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </CardSection>
          )}

          {events.length > 0 && (
            <CardSection title="Events">
              <div className="also">
                {events.map((ev) => (
                  <button key={ev.id} className="chip" onClick={() => navigate("events", ev.id)} title={ev.date_text}>
                    <CategoryBadge category="event" size={18} decorative />
                    {ev.name}
                  </button>
                ))}
              </div>
            </CardSection>
          )}

          {sameTime.length > 0 && (
            <CardSection title="Alive at the same time">
              <div className="also">
                {sameTime.map(({ entity: r, from, to }) => (
                  <button key={r.id} className="chip" onClick={() => navigate(page, r.id)} title={`Both alive ${formatRange(from, to)}`}>
                    <CategoryBadge category="species" size={18} decorative />
                    {r.name}
                  </button>
                ))}
              </div>
            </CardSection>
          )}

          <TourStopLinks entityId={entity.id} />

          {sources.length > 0 && (
            <SourcesDisclosure>
              <ul className="card-ref-list">
                {sources.map((s) => (
                  <li key={s.id}>
                    {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : s.name}{" "}
                    <span className="card-ref-licence">{s.licence}</span>
                  </li>
                ))}
              </ul>
            </SourcesDisclosure>
          )}

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
    </>
  );
}
