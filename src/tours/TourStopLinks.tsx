import { toursOfEntity } from "./tours";
import { watchTour } from "./ToursPage";

const FilmChipIcon = (
  <svg className="tour-chip-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path
      d="M2 3h12v10H2zM3.3 4.2v1.3h1.3V4.2zm0 3.1v1.4h1.3V7.3zm0 3.2v1.3h1.3v-1.3zm8.1-6.3v1.3h1.3V4.2zm0 3.1v1.4h1.3V7.3zm0 3.2v1.3h1.3v-1.3zM5.8 4.2v7.6h4.4V4.2z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

/**
 * Chips on an entity's card or detail page for each guided tour that stops at it.
 * Clicking one launches the tour on the globe starting at that stop.
 */
export default function TourStopLinks({ entityId }: { entityId: string }) {
  const refs = toursOfEntity(entityId);
  if (refs.length === 0) return null;
  return (
    <div className="related tour-stop-links">
      <div className="muted">{refs.length === 1 ? "Guided tour:" : "Guided tours:"}</div>
      <div className="also">
        {refs.map(({ tour, index }) => (
          <button
            key={tour.id}
            className="chip tour-chip"
            onClick={() => watchTour(tour.id, index)}
            title={`Watch "${tour.title}" from stop ${index + 1} of ${tour.stops.length}`}
          >
            {FilmChipIcon}
            <span>{tour.title}</span>
            <span className="tour-chip-stop">
              {index + 1}/{tour.stops.length}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
