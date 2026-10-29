import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { formatRange } from "../time/scale";
import { buildIndex, buildPlaceIndex, normalize, searchEntities, searchPlaces, type Place } from "../search/search";
import { showSite } from "../globeLink";
import type { Entity } from "../types";
import { CategoryBadge, SINGULAR } from "./CategoryIcon";
import { useMediaQuery } from "./useMediaQuery";
import { PlacePinIcon } from "../region/PlaceCard";

/** Bold the first occurrence of the query in the name (accent-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query);
  // NFD-stripping can change lengths, so map positions through a per-character normalisation.
  const chars = [...text];
  const normChars = chars.map((c) => normalize(c) || c.toLowerCase());
  const joined = normChars.join("");
  const at = joined.indexOf(q);
  if (!q || at < 0) return <>{text}</>;
  let pos = 0, start = -1, end = chars.length;
  for (let i = 0; i < chars.length; i++) {
    if (pos === at) start = i;
    pos += normChars[i].length;
    if (start >= 0 && pos >= at + q.length) {
      end = i + 1;
      break;
    }
  }
  if (start < 0) return <>{text}</>;
  return (
    <>
      {chars.slice(0, start).join("")}
      <mark>{chars.slice(start, end).join("")}</mark>
      {chars.slice(end).join("")}
    </>
  );
}

/** A row in the results: an entity, or (on the globe) a named place. */
type Result = { kind: "entity"; id: string; entity: Entity } | { kind: "place"; id: string; place: Place };

const MAX_RESULTS = 8;
/** Rows kept for places when entities match too, so a site such as "Olduvai Gorge" is never crowded out. */
const MIN_PLACE_ROWS = 3;

/** "Denisovan, Neanderthal +2" */
const entityList = (names: string[]) => names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");

/**
 * `onChoose` replaces the default (show the entity on the globe), e.g. on the timeline page; places
 * (site names) are searched only on the globe.
 */
export default function SearchBox({ onChoose }: { onChoose?: (e: Entity) => void } = {}) {
  const data = useData();
  const focusEntity = useStore((s) => s.focusEntity);
  const placeMode = useStore((s) => s.placeMode);
  const setPlaceMode = useStore((s) => s.setPlaceMode);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => (data ? buildIndex(data.entities) : []), [data]);
  const places = useMemo(
    () => (data && !onChoose ? buildPlaceIndex(data.features, (id) => data.entityById.get(id)?.name, data.bboxOf) : []),
    [data, onChoose],
  );
  const results = useMemo((): Result[] => {
    const entities = searchEntities(index, query, MAX_RESULTS);
    const sites = searchPlaces(places, query, MAX_RESULTS);
    const placeRows = Math.min(sites.length, Math.max(MIN_PLACE_ROWS, MAX_RESULTS - entities.length));
    return [
      ...entities.slice(0, MAX_RESULTS - placeRows).map((e): Result => ({ kind: "entity", id: e.id, entity: e })),
      ...sites.slice(0, placeRows).map((p): Result => ({ kind: "place", id: `place-${p.features[0].id}`, place: p })),
    ];
  }, [index, places, query]);

  useEffect(() => setActive(0), [query]);

  // "/" or Ctrl/Cmd+K focuses the search from anywhere (not during a tour, which hides it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useStore.getState().tour) return;
      if (e.key === "Escape" && useStore.getState().placeMode) {
        useStore.getState().setPlaceMode(false);
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const choose = (r: Result) => {
    // A place opens its oldest site; the card's "Also here" lists the rest.
    if (r.kind === "place") showSite(r.place.features[0].id);
    else if (onChoose) onChoose(r.entity);
    else focusEntity(r.entity.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (results[active]) choose(results[active]);
    } else if (e.key === "Escape") {
      e.stopPropagation(); // don't also close the info card
      if (query) setQuery("");
      else inputRef.current?.blur();
    }
  };

  const showList = open && query.trim().length > 0;
  // Phones: the full placeholder doesn't fit beside the menu button.
  const narrow = useMediaQuery("(max-width: 480px)");

  return (
    <div className="search" role="search">
      <div className="search-field panel">
        <span className="search-icon" aria-hidden>⌕</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={narrow ? "Search the atlas…" : onChoose ? "Search species, cultures, civilizations…" : "Search species, cultures, places…"}
          aria-label={onChoose ? "Search by name" : "Search by name or place"}
          aria-expanded={showList}
          aria-controls="search-results"
          aria-activedescendant={showList && results[active] ? `search-opt-${results[active].id}` : undefined}
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          disabled={!data}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {!query && <kbd className="search-kbd">/</kbd>}
        {!onChoose && (
          <button
            type="button"
            className={`search-place-btn${placeMode ? " active" : ""}`}
            onClick={() => setPlaceMode(!placeMode)}
            aria-pressed={placeMode}
            aria-label="What was here? Click a point on the globe to explore its regional history"
            title="What was here? Click any point on the globe (or right-click) to see 7 million years of local history"
          >
            <PlacePinIcon size={16} />
          </button>
        )}
      </div>
      {!onChoose && placeMode && !showList && (
        <div className="panel place-mode-banner" role="status">
          <span>Click any point on the globe to see what lived there</span>
          <button type="button" className="place-mode-cancel" onClick={() => setPlaceMode(false)}>
            Cancel
          </button>
        </div>
      )}
      {showList && (
        <ul id="search-results" className="search-results panel" role="listbox">
          {results.length === 0 && <li className="search-empty muted">{onChoose ? "No matching names" : "No matching names or places"}</li>}
          {results.map((r, i) => {
            const first = r.kind === "place" ? r.place.features[0] : null;
            return (
              <li
                key={r.id}
                id={`search-opt-${r.id}`}
                role="option"
                aria-selected={i === active}
                className={`search-result${i === active ? " active" : ""}`}
                onMouseDown={(ev) => ev.preventDefault() /* keep focus so blur doesn't close first */}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r)}
              >
                <span className="search-badge">
                  <CategoryBadge category={r.kind === "entity" ? r.entity.category : first!.category} size={24} decorative />
                </span>
                <span className="search-name">
                  <Highlight text={r.kind === "entity" ? r.entity.name : r.place.label} query={query} />
                </span>
                <span className="search-meta muted">
                  {r.kind === "entity"
                    ? `${r.entity.group ? "Group" : SINGULAR[r.entity.category]} · ${formatRange(r.entity.start_year, r.entity.end_year)}`
                    : `Site · ${entityList(r.place.entities)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
