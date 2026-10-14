import type { Entity } from "../types";
import type { Picture } from "../tours/tourPicture";
import "./events-page.css";

/**
 * An event's picture, always shown whole as a square (the artwork carries the event's title, so
 * it must never be cropped). Until a picture exists, a placeholder in the same spirit: a dusk sky
 * over a horizon, with the event's name and date. `picture`: one of its extra pictures to show in
 * place of the main one (a tour moving through them).
 */
export default function EventImage({ event, picture, className = "" }: { event: Entity; picture?: Picture; className?: string }) {
  if (picture)
    return (
      <div className={`ev-img ${className}`}>
        <img key={picture.url} className="picture-in" src={picture.url} alt={picture.caption ?? event.name} />
      </div>
    );
  if (event.image_url)
    return (
      <div className={`ev-img ${className}`}>
        <img key={event.image_url} src={event.image_url} alt={event.name} loading="lazy" />
      </div>
    );
  return (
    <div className={`ev-img ev-placeholder ${className}`} role="img" aria-label={`${event.name} (picture to come)`}>
      <div className="ev-ph-sun" aria-hidden />
      <div className="ev-ph-land" aria-hidden />
      <div className="ev-ph-text">
        <span className="ev-ph-name">{event.name}</span>
        {event.date_text && <span className="ev-ph-date">{event.date_text.replace(/\s*\(.*\)$/, "")}</span>}
      </div>
    </div>
  );
}
