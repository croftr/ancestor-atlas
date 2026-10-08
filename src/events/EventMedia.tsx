import { useState } from "react";
import { mediaUrl } from "../config";
import { youtubeId } from "../youtube";
import type { Entity } from "../types";
import EventImage from "./EventImage";

/**
 * The detail view's media column: the event's picture, with a button per video or audio clip.
 * Nothing is fetched until a clip is chosen; a video then plays in place of the picture (which
 * stays as its poster), and audio plays in a bar below it.
 */
export default function EventMedia({ event }: { event: Entity }) {
  const media = event.media ?? [];
  const [current, setCurrent] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const clip = current === null ? undefined : media[current];
  const ytId = clip?.kind === "video" ? youtubeId(clip.src) : null;
  const credit = clip ? clip.credit : event.image_credit;
  const choose = (i: number) => {
    setFailed(null);
    setCurrent(current === i ? null : i);
  };

  return (
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
        <EventImage event={event} className="large" />
      )}
      {clip?.kind === "audio" && (
        <audio key={clip.src} className="ev-audio" src={mediaUrl(clip.src)} controls autoPlay preload="none" onError={() => setFailed(clip.title)} />
      )}
      {credit && <div className="muted image-credit">{credit}</div>}
      {failed && <div className="ev-media-error">Couldn't load “{failed}”.</div>}
      {media.length > 0 && (
        <div className="ev-media-list">
          {media.map((m, i) => (
            <button key={m.src} className="ev-media-btn" aria-pressed={current === i} onClick={() => choose(i)}>
              <span aria-hidden>{m.kind === "video" ? "▶" : "♪"}</span>
              {m.title}
            </button>
          ))}
          {clip?.kind === "video" && (
            <button className="ev-media-btn" onClick={() => setCurrent(null)}>
              ✕ Close video
            </button>
          )}
        </div>
      )}
    </div>
  );
}
