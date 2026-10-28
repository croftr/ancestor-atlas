import type { ReactNode } from "react";

/** An AI-generated picture's credit is not shown (Rob's call, 28 Oct 2026): its caption says what it shows instead. */
export const isAiCredit = (credit: string | undefined) => !!credit && /^AI-generated/i.test(credit);

/** A picture's credit (linked to where it came from, if known), then what it shows. */
export function creditLine(credit: string | undefined, note: string | undefined, source: string | undefined): ReactNode {
  if (isAiCredit(credit)) credit = undefined;
  return (
    <>
      {source && credit ? (
        <a href={source} target="_blank" rel="noopener noreferrer">
          {credit}
        </a>
      ) : (
        credit
      )}
      {credit && note ? " · " : ""}
      {note}
    </>
  );
}

/**
 * Small arrows and dots overlaying an entity or event picture that has multiple images available.
 * Lets the user manually rotate / step through them in non-tour mode.
 */
export function PictureNav({
  count,
  current,
  onPrev,
  onNext,
  onSelect,
}: {
  count: number;
  current: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect?: (index: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <div className="pic-nav" role="group" aria-label="Pictures">
      <button
        type="button"
        className="pic-nav-btn pic-nav-prev"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Previous picture"
        title="Previous picture"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M7.5 2 3.5 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        className="pic-nav-btn pic-nav-next"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Next picture"
        title="Next picture"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M4.5 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="pic-dots" role="tablist" aria-label="Picture indicators">
        {Array.from({ length: count }, (_, idx) => (
          <button
            key={idx}
            type="button"
            className={`pic-dot${idx === current ? " active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(idx);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Picture ${idx + 1} of ${count}`}
            aria-selected={idx === current}
          />
        ))}
      </div>
    </div>
  );
}
