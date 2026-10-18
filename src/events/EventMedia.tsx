import { useEffect, useState } from "react";
import { mediaUrl } from "../config";
import { useStore } from "../store";
import { formatRange } from "../time/scale";
import { youtubeId } from "../youtube";
import type { Entity } from "../types";
import EventImage from "./EventImage";
import { entityPictures, preloadPictures } from "../tours/tourPicture";
import { PictureNav, creditLine } from "../ui/PictureNav";
import PictureViewer from "../ui/PictureViewer";
import TourVideo from "../ui/TourVideo";

/**
 * The detail view's media column: the event's picture, with a button per video or audio clip.
 * Nothing is fetched until a clip is chosen; a video then plays in place of the picture (which
 * stays as its poster), and audio plays in a bar below it.
 */
export default function EventMedia({ event }: { event: Entity }) {
  const media = event.media ?? [];
  const viewerOpen = useStore((s) => s.pictureViewer);
  const setViewerOpen = useStore((s) => s.setPictureViewer);
  const [current, setCurrent] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [picIndex, setPicIndex] = useState(0);

  useEffect(() => {
    setPicIndex(0);
    setViewerOpen(false);
    preloadPictures(event);
    return () => setViewerOpen(false);
  }, [event.id, setViewerOpen]);

  const pictures = entityPictures(event);
  const hasMultiplePictures = pictures.length > 1;
  const curPicIndex = hasMultiplePictures ? picIndex % pictures.length : 0;
  const currentPic = hasMultiplePictures ? pictures[curPicIndex] : undefined;
  const isExtra = curPicIndex > 0;
  const canView = pictures.length > 0;
  const openViewer = () => setViewerOpen(true);

  const clip = current === null ? undefined : media[current];
  const ytId = clip?.kind === "video" ? youtubeId(clip.src) : null;
  const choose = (i: number) => {
    setFailed(null);
    setCurrent(current === i ? null : i);
  };

  return (
    <div className="ev-detail-media">
      {viewerOpen && canView && (
        <PictureViewer
          entity={event}
          date={event.date_text ?? formatRange(event.start_year, event.end_year)}
          pictures={pictures}
          index={curPicIndex}
          onIndex={setPicIndex}
        />
      )}
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
              poster={event.image_url}
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label={clip.title}
              onError={() => setFailed(clip.title)}
            />
          )}
          {!ytId && ( // YouTube's own buttons sit top-right; its clip is closed from the list below
            <button className="ev-player-close" onClick={() => setCurrent(null)} aria-label="Close video">
              ✕ Close
            </button>
          )}
        </div>
      ) : (
        <EventImage
          event={event}
          picture={isExtra ? currentPic : undefined}
          className={`large${canView ? " pv-open" : ""}`}
          onClick={canView ? openViewer : undefined}
        >
          {!isExtra && event.video && <TourVideo key={event.video.src} src={event.video.src} />}
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
          {hasMultiplePictures && (
            <PictureNav
              count={pictures.length}
              current={curPicIndex}
              onPrev={() => setPicIndex((i) => (i - 1 + pictures.length) % pictures.length)}
              onNext={() => setPicIndex((i) => (i + 1) % pictures.length)}
              onSelect={(idx) => setPicIndex(idx)}
            />
          )}
        </EventImage>
      )}
      {clip?.kind === "audio" && (
        <audio key={clip.src} className="ev-audio" src={mediaUrl(clip.src)} controls autoPlay preload="none" onError={() => setFailed(clip.title)} />
      )}
      {clip ? (
        <div className="muted image-credit">{clip.credit}</div>
      ) : currentPic ? (
        <div className="muted image-credit">{creditLine(currentPic.credit, isExtra ? currentPic.caption : undefined, isExtra ? currentPic.source : undefined)}</div>
      ) : event.image_credit ? (
        <div className="muted image-credit">{event.image_credit}</div>
      ) : null}
      {failed && <div className="ev-media-error">Couldn't load “{failed}”.</div>}
      {media.length > 0 && (
        <div className="ev-media-list">
          {media.map((m, i) => (
            <button key={m.src} className="ev-media-btn" aria-pressed={current === i} onClick={() => choose(i)}>
              <span aria-hidden>{m.kind === "video" ? "▶\uFE0E" : "♪"}</span>
              {m.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
