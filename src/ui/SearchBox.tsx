import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { formatRange } from "../time/scale";
import { buildIndex, normalize, searchEntities } from "../search/search";
import type { Entity } from "../types";
import { CategoryBadge, SINGULAR } from "./CategoryIcon";
import { useMediaQuery } from "./useMediaQuery";

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

/** `onChoose` replaces the default (show the entity on the globe), e.g. on the timeline page. */
export default function SearchBox({ onChoose }: { onChoose?: (e: Entity) => void } = {}) {
  const data = useData();
  const focusEntity = useStore((s) => s.focusEntity);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => (data ? buildIndex(data.entities) : []), [data]);
  const results = useMemo(() => searchEntities(index, query, 8), [index, query]);

  useEffect(() => setActive(0), [query]);

  // "/" or Ctrl/Cmd+K focuses the search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

  const choose = (e: Entity) => {
    if (onChoose) onChoose(e);
    else focusEntity(e.id);
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
          placeholder={narrow ? "Search the atlas…" : "Search species, cultures, civilizations…"}
          aria-label="Search by name"
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
      </div>
      {showList && (
        <ul id="search-results" className="search-results panel" role="listbox">
          {results.length === 0 && <li className="search-empty muted">No matching names</li>}
          {results.map((e, i) => {
            return (
              <li
                key={e.id}
                id={`search-opt-${e.id}`}
                role="option"
                aria-selected={i === active}
                className={`search-result${i === active ? " active" : ""}`}
                onMouseDown={(ev) => ev.preventDefault() /* keep focus so blur doesn't close first */}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(e)}
              >
                <span className="search-badge">
                  <CategoryBadge category={e.category} size={24} decorative />
                </span>
                <span className="search-name">
                  <Highlight text={e.name} query={query} />
                </span>
                <span className="search-meta muted">
                  {e.group ? "Group" : SINGULAR[e.category]} · {formatRange(e.start_year, e.end_year)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
