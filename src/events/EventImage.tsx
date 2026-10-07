import type { Entity } from "../types";
import "./events-page.css";

/**
 * An event's picture, always shown whole as a square (the artwork carries the event's title, so
 * it must never be cropped). Until a picture exists, a placeholder in the same spirit: a dusk sky
 * over a horizon, with the event's name and date.
 */
export default function EventImage({ event, className = "" }: { event: Entity; className?: string }) {
  if (event.image_url)
    return (
      <div className={`ev-img ${className}`}>
        <img src={event.image_url} alt={event.name} loading="lazy" />
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
