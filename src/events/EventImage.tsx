import type { Entity } from "../types";
import type { Picture } from "../tours/tourPicture";
import type { ReactNode } from "react";
import "./events-page.css";

/** The 500 px copy beside each title card in public/images/events/ (events.test.ts checks each has one). */
export const smallEventImage = (url: string) =>
  url.startsWith("/images/events/") && !url.includes("/extra/") ? url.replace(/\.webp$/, "-500.webp") : null;

/**
 * An event's picture, always shown whole as a square (the artwork carries the event's title, so
 * it must never be cropped). Until a picture exists, a placeholder in the same spirit: a dusk sky
 * over a horizon, with the event's name and date. `picture`: one of its extra pictures to show in
 * place of the main one (a tour moving through them).
 */
export default function EventImage({
  event,
  picture,
  className = "",
  children,
  onClick,
  sizes,
}: {
  event: Entity;
  picture?: Picture;
  className?: string;
  children?: ReactNode;
  /** A tap on the picture (the info card opens the full-screen viewer). Not on the placeholder. */
  onClick?: () => void;
  /** How wide the picture is shown (`sizes`), so small tiles load the 500 px copy; default full width. */
  sizes?: string;
}) {
  if (picture)
    return (
      <div className={`ev-img ${className}`} onClick={onClick}>
        <img key={picture.url} className="picture-in" src={picture.url} alt={picture.caption ?? event.name} />
        {children}
      </div>
    );
  if (event.image_url)
    return (
      <div className={`ev-img ${className}`} onClick={onClick}>
        <img
          key={event.image_url}
          src={event.image_url}
          {...(sizes && smallEventImage(event.image_url) && { srcSet: `${smallEventImage(event.image_url)} 500w, ${event.image_url} 1000w`, sizes })}
          alt={event.name}
          loading="lazy"
        />
        {children}
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
      {children}
    </div>
  );
}
