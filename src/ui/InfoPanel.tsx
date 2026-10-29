import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { useStore } from "../store";
import { CATEGORY_STYLE } from "../config";
import { formatRange, formatYear } from "../time/scale";
import { useData } from "../map/data";
import { wikipediaUrl, type Entity } from "../types";
import { asList, labNumbers, refLink, type RefLink } from "./refs";
import { navOrder } from "../search/search";
import { clearShrunkCard, navigate, peekShrunkCard, type BrowseView, type View } from "../route";
import { formatDuration } from "../timeline/layout";
import "./events.css";
import ListenButton from "../audio/ListenButton";
import EventImage from "../events/EventImage";
import { STACKED_QUERY } from "../config";
import { useMediaQuery } from "./useMediaQuery";
import { videoCount } from "../youtube";
import { globeShareUrl, shareLink } from "../share";
import { CategoryBadge, SINGULAR } from "./CategoryIcon";
import { CardAction, CardHead, CardIcon, CardSection, ReadMore, SourcesDisclosure } from "./CardParts";
import { entityPictures, preloadPictures, standInNote, tourPictureFor } from "../tours/tourPicture";
import { PictureNav, creditLine } from "./PictureNav";
import PictureViewer from "./PictureViewer";
import CardResizer from "./CardResizer";
import TourVideo from "./TourVideo";
import { contemporaries } from "./contemporaries";
import DnaCultureLink from "../dna/DnaCultureLink";
import TourStopLinks from "../tours/TourStopLinks";

const hasCompanion600 = (url?: string): url is string =>
  !!url && (url.startsWith("/images/cultures/") || url.startsWith("/images/civilisations/")) && !url.includes("-600.webp");

const cultureSrcSet = (url?: string) => {
  if (hasCompanion600(url)) {
    return {
      srcSet: `${url.replace(/\.webp$/, "-600.webp")} 600w, ${url} 1200w`,
      sizes: "(max-width: 640px) 100vw, 450px",
    };
  }
  return {};
};

const cultureThumbSrc = (url?: string) => {
  if (hasCompanion600(url)) {
    return url.replace(/\.webp$/, "-600.webp");
  }
  return url;
};

const Ref = ({ r }: { r: RefLink }) =>
  r.href ? <a href={r.href} target="_blank" rel="noreferrer">{r.label}</a> : <>{r.label}</>;

/** A list of references: the first few inline, the rest behind a "more" toggle. */
const RefList = ({ title, items }: { title: string; items: string[] }) =>
  items.length === 0 ? null : (
    <div className="card-ref-list-more">
      {title}: {items.slice(0, 3).join("; ")}
      {items.length > 3 && (
        <details>
          <summary>{items.length - 3} more</summary>
          {items.slice(3).join("; ")}
        </details>
      )}
    </div>
  );

/** The browse page an entity opens on ("Species page"). */
const PAGE_OF: Record<Entity["category"], BrowseView> = {
  species: "species",
  culture: "cultures",
  civilization: "civilizations",
  event: "events",
};

/**
 * A date range in fewer words, for the compact card: the shared unit said once
 * ("c. 2.3–1.4 million years ago", "3,100 – 2,686 BCE").
 */
export function shortRange(start: number, end: number): string {
  const a = formatYear(start);
  const b = formatYear(end);
  const million = /^(?:c\. )?([\d.]+) million years ago$/;
  const ma = a.match(million);
  const mb = b.match(million);
  if (ma && mb) return `c. ${ma[1]}–${mb[1]} million years ago`;
  if (a.endsWith(" BCE") && b.endsWith(" BCE")) return `${a.slice(0, -4)} – ${b}`;
  if (/\d CE$/.test(a) && /\d CE$/.test(b)) return `${a.slice(0, -3)} – ${b}`;
  return `${a} – ${b}`;
}

/** shortRange, with a "c." said once for the whole span ("c. 438,000 – 418,000 BCE"). */
const siteRange = (start: number, end: number) => shortRange(start, end).replace(/^(c\. .*– )c\. /, "$1");

export default function InfoPanel({ view = "globe" }: { view?: View }) {
  const data = useData();
  const focusEntity = useStore((s) => s.focusEntity);
  const selectedId = useStore((s) => s.selectedId);
  const groupId = useStore((s) => s.groupId);
  const hits = useStore((s) => s.hits);
  const select = useStore((s) => s.select);
  const openGroup = useStore((s) => s.openGroup);
  const jumpTo = useStore((s) => s.jumpTo);
  const stepFeature = useStore((s) => s.stepFeature);
  const tourPicture = useStore((s) => s.tour?.picture);
  const viewerOpen = useStore((s) => s.pictureViewer);
  const setViewerOpen = useStore((s) => s.setPictureViewer);
  const lastPlace = useStore((s) => s.lastPlace);
  const reopenPlace = useStore((s) => s.reopenPlace);
  const openPlace = useStore((s) => s.openPlace);

  // A picture that failed to load (a stand-in not added yet) is left out.
  const [brokenImage, setBrokenImage] = useState<string | null>(null);
  // Share: the phone's share sheet where there is one, else copy the link ("Link copied").
  const [copied, setCopied] = useState(false);
  const share = async (title: string) => {
    if (await shareLink(title, globeShareUrl())) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };
  // Small screens: the card can shrink to give the page room: on the globe to its title (and
  // site stepper), on the timeline (where the expanded card fills the screen) to a thumbnail.
  // Arriving on the timeline via "See on timeline" starts shrunk.
  const [minimised, setMinimised] = useState(() => view === "timeline" && peekShrunkCard());
  useEffect(() => {
    if (view === "timeline") clearShrunkCard();
  }, [view]);
  // Globe on a small screen: a newly picked entity opens its card minimised, so the globe's
  // flight to it stays in view; expand it from there. Stepping through its sites keeps the state.
  const entityKey = groupId ?? hits.find((h) => h.id === selectedId)?.entity_id ?? null;
  useLayoutEffect(() => {
    if (entityKey && view === "globe" && window.matchMedia?.(STACKED_QUERY).matches) setMinimised(true);
  }, [entityKey, view]);
  const stacked = useMediaQuery(STACKED_QUERY);
  // Small screens: the card sits above the globe in a scrolling column. When the selection
  // changes while the card is scrolled out of view (say, after tapping the globe below it),
  // bring the card's top back into view.
  const cardRef = useRef<HTMLDivElement>(null);
  // The full card's element, for its resize handle (desktop), which follows its height.
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const panelRef = useCallback((el: HTMLDivElement | null) => {
    cardRef.current = el;
    setPanelEl(el);
  }, []);
  // Small screens: a quick sideways swipe on the card steps through the sites; a swipe down on
  // its title minimises it (globe). Slow drags and mostly-vertical moves are left to scrolling.
  const swipe = useRef<{ x: number; y: number; t: number; onHead: boolean } | null>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || view !== "globe" || !window.matchMedia?.(STACKED_QUERY).matches) return;
    const top = el.getBoundingClientRect().top;
    if (top < 56 || top > window.innerHeight * 0.6) {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [selectedId, groupId, view]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useStore.getState().select(null);
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "[") useStore.getState().stepFeature(-1);
      if (e.key === "]") useStore.getState().stepFeature(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isTouring = useStore((s) => s.tour !== null);
  const [manualIndex, setManualIndex] = useState(0);

  const feature = selectedId ? hits.find((h) => h.id === selectedId) : undefined;
  const entity: Entity | undefined = data
    ? groupId
      ? data.entityById.get(groupId)
      : feature
        ? data.entityById.get(feature.entity_id)
        : undefined
    : undefined;

  useEffect(() => {
    setManualIndex(0);
    if (entity) preloadPictures(entity);
  }, [entity?.id]);

  if (!data || !entity) return null;

  const style = CATEGORY_STYLE[entity.category];
  const parent = entity.parent_id ? data.entityById.get(entity.parent_id) : undefined;
  const kids = entity.group ? (data.childrenOf.get(entity.id) ?? []) : [];
  const others = feature
    ? hits.filter((h) => h.entity_id !== feature.entity_id && h.id !== feature.id)
        .filter((h, i, a) => a.findIndex((x) => x.entity_id === h.entity_id) === i)
    : [];
  const wikiUrl = feature?.wikipedia_phrase ? wikipediaUrl(feature.wikipedia_phrase) : entity.wikipedia_url;
  const sourceIds = [...new Set([...(feature ? [feature.source_id] : []), ...entity.source_ids])];
  // Evidence for the clicked point itself (curated and bulk sites carry per-row references).
  const coordRef = refLink(feature?.coord_source);
  const dateRef = refLink(feature?.date_source);
  const sameRef = coordRef && dateRef && coordRef.href === dateRef.href && coordRef.label === dateRef.label;
  const labs = labNumbers(feature?.source_ref);
  const featureSource = feature ? data.sourceById.get(feature.source_id) : undefined;
  const showLabel = feature?.label && feature.label !== entity.name;
  // Prev/next through every feature of this entity (sites, or territory periods for civilizations).
  const siblings = feature ? navOrder(data.featuresOf.get(feature.entity_id) ?? [], data.bboxOf) : [];
  const position = feature ? siblings.findIndex((f) => f.id === feature.id) + 1 : 0;
  const isEvent = entity.category === "event";
  const noun = entity.category === "civilization" ? "Period" : isEvent ? "Place" : "Site";
  const related = (entity.related_ids ?? []).flatMap((r) => data.entityById.get(r) ?? []);
  const sameTime = contemporaries(entity, data.entities);
  const siteCultures = asList(feature?.culture_ids).flatMap((id) => data.entityById.get(id) ?? []);
  // Own picture; else the group's (e.g. Ancient Egypt); else a shared stand-in (picture-groups.yaml).
  // The last two say what they show.
  const picture: { url: string; name: string; credit?: string; note?: string } | undefined = isEvent
    ? undefined
    : entity.image_url
      ? { url: entity.image_url, name: entity.name, credit: entity.image_credit, note: entity.image_caption }
      : parent?.image_url
        ? { url: parent.image_url, name: parent.name, credit: parent.image_credit, note: standInNote(`${parent.name} as a whole`, parent.image_caption) }
        : entity.fallback_image
          ? { url: entity.fallback_image.url, name: entity.name, credit: entity.fallback_image.credit, note: standInNote(entity.fallback_image.label, entity.fallback_image.caption) }
          : undefined;

  const pictures = entityPictures(entity, parent);
  const hasMultiplePictures = !isTouring && pictures.length > 1;
  const curIndex = hasMultiplePictures ? manualIndex % pictures.length : 0;
  const manualPic = hasMultiplePictures ? pictures[curIndex] : undefined;
  const tourExtra = tourPictureFor(entity, tourPicture);

  // In tour mode: pictures rotate automatically via tour.picture.
  // In non-tour mode: user can manually rotate through pictures if >1 available.
  const extra = isTouring ? tourExtra : curIndex > 0 ? manualPic : undefined;
  const eventPicture = isEvent
    ? isTouring
      ? tourExtra ?? (entity.image_url ? { url: entity.image_url, credit: entity.image_credit } : undefined)
      : manualPic ?? (entity.image_url ? { url: entity.image_url, credit: entity.image_credit } : undefined)
    : undefined;

  const shown = isEvent
    ? undefined
    : isTouring
      ? tourExtra
        ? { url: tourExtra.url, name: tourExtra.caption ?? entity.name, credit: tourExtra.credit, note: tourExtra.caption }
        : picture
      : manualPic
        ? {
            url: manualPic.url,
            name: manualPic.caption ?? entity.name,
            credit: manualPic.credit,
            note: manualPic.caption ?? (curIndex === 0 ? picture?.note : undefined),
          }
        : picture;
  // The full-screen viewer (PictureViewer.tsx) shows the same pictures as the card, on the same
  // one: the tour's (index 0 is the main picture, then the extras) or the one stepped to by hand.
  const viewerPictures = pictures.filter((p) => p.url !== brokenImage);
  const hasMain = viewerPictures.length > (entity.extra_images?.length ?? 0);
  const viewerIndex = isTouring
    ? Math.max(0, (tourPicture?.entity === entity.id ? tourPicture.index : 0) - (hasMain ? 0 : 1))
    : viewerPictures.length
      ? manualIndex % viewerPictures.length
      : 0;
  const canView = viewerPictures.length > 0;
  const viewer = viewerOpen && canView && (
    <PictureViewer
      entity={entity}
      date={isEvent && entity.date_text ? entity.date_text : formatRange(entity.start_year, entity.end_year)}
      pictures={viewerPictures}
      index={viewerIndex}
      onIndex={setManualIndex}
      miniGlobe={view === "globe" && !stacked}
    />
  );
  const openViewer = () => setViewerOpen(true);
  // On the card's picture: a tap anywhere on it, or this button (keyboard), opens the viewer.
  const viewerHint = canView && (
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
  );

  // Recalled (not source-backed) data must never look like sourced data.
  const approximate = feature ? feature.source_id === "recall" : entity.source_ids.includes("recall");

  // Timeline on a small screen, shrunk: a thumbnail of the picture over the chart; tap to expand.
  if (view === "timeline" && stacked && minimised) {
    const thumb = isEvent ? eventPicture?.url : shown?.url;
    const showThumb = thumb && brokenImage !== thumb;
    return (
      <div className={`panel info-thumb${isEvent ? " square" : ""}`}>
        <button className="info-thumb-open" onClick={() => setMinimised(false)} aria-label={`Open card: ${entity.name}`} title="Open card">
          <span className="info-thumb-media" style={showThumb ? undefined : { background: entity.color ?? style.color }}>
            {showThumb && <img src={cultureThumbSrc(thumb)} alt="" onError={() => setBrokenImage(thumb)} />}
            <svg className="info-thumb-expand" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5 7 5M1.5 10.5 5 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="info-thumb-name">{entity.name}</span>
        </button>
        <button className="info-thumb-close" onClick={() => select(null)} aria-label="Close card">✕</button>
      </div>
    );
  }
  // Small screens track a quick sideways swipe (steps through the sites) and a swipe down on the
  // full card's title (shrinks it). Slow drags and mostly-vertical moves are left to scrolling.
  const onTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!stacked || e.touches.length !== 1 || target.closest("iframe, video, audio, input")) return;
    const t = e.touches[0];
    swipe.current = { x: t.clientX, y: t.clientY, t: Date.now(), onHead: !!target.closest(".info-head") };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || Date.now() - start.t > 600) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) {
      if (feature && siblings.length > 1) stepFeature(dx < 0 ? 1 : -1);
    } else if (start.onHead && view === "globe" && !minimised && dy > 50 && dy > 2 * Math.abs(dx)) {
      setMinimised(true);
    }
  };

  // Globe on a small screen, shrunk (the default for a new pick, and for every tour stop): a compact
  // card, the name and dates beside the picture, with the site stepper along the bottom. A tap opens
  // the full card. During a tour it floats over the top of the globe; otherwise it sits above it.
  if (view === "globe" && stacked && minimised) {
    const thumb = isEvent ? eventPicture?.url : shown?.url;
    const showThumb = !!thumb && brokenImage !== thumb;
    const open = () => setMinimised(false);
    return (
      <>
      {viewer}
      <div
        ref={cardRef}
        key={entity.id}
        className={`info-compact${isEvent ? " square" : ""}${feature && siblings.length > 1 ? " has-nav" : ""}`}
        style={{ "--cat": entity.color ?? style.color } as CSSProperties}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button className="ic-open" onClick={open} aria-label={`Open card: ${entity.name}`} title="Open card">
          <span className="ic-name">
            <CategoryBadge category={entity.category} size={22} decorative />
            <span>{entity.name}</span>
          </span>
          <span className="ic-date">{isEvent && entity.date_text ? entity.date_text : shortRange(entity.start_year, entity.end_year)}</span>
        </button>
        {/* The picture opens the full-screen viewer; the name beside it opens the card. */}
        <button
          className="ic-media"
          onClick={showThumb && canView ? openViewer : open}
          aria-label={showThumb && canView ? "View pictures full screen" : undefined}
          tabIndex={showThumb && canView ? 0 : -1}
          aria-hidden={showThumb && canView ? undefined : true}
        >
          {showThumb ? (
            <>
              <img key={thumb} className={extra ? "ic-extra picture-in" : undefined} src={cultureThumbSrc(thumb)} alt="" onError={() => setBrokenImage(thumb)} />
              {!extra && entity.video && <TourVideo key={entity.video.src} src={entity.video.src} />}
            </>
          ) : (
            <span className="ic-media-blank">
              <CategoryBadge category={entity.category} size={40} decorative />
            </span>
          )}
          <svg className="ic-expand" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path d="M7 1.5h3.5V5M5 10.5H1.5V7M10.5 1.5 7 5M1.5 10.5 5 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="ic-close" onClick={() => select(null)} aria-label="Close card">
          <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        {feature && siblings.length > 1 && (
          <div className="ic-nav" role="group" aria-label={`${noun}s of ${entity.name}`}>
            <button onClick={() => stepFeature(-1)} aria-label={`Previous ${noun.toLowerCase()}`}>
              <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
                <path d="M7.5 2 3.5 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="ic-nav-mid" aria-live="polite">
              <span className="ic-nav-count">
                {noun} {position} of {siblings.length}
              </span>
              <span className="ic-nav-label">
                {isEvent ? feature.label : showLabel ? feature.label : shortRange(feature.start_year, feature.end_year)}
              </span>
            </span>
            <button onClick={() => stepFeature(1)} aria-label={`Next ${noun.toLowerCase()}`}>
              <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
                <path d="M4.5 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
      </>
    );
  }
  const shrinkToThumb = view === "timeline";
  const minLabel = shrinkToThumb ? "Shrink card" : minimised ? "Show full card" : "Minimise card";
  const videos = entity.media?.length ?? 0;
  // Evidence for the clicked point (folded into Sources), and what else is known about it (shown).
  const siteRefs = !!feature && !!(coordRef || dateRef || labs || feature.refs || feature.via || (featureSource && featureSource.id !== "recall"));
  // A period's own dates are already in the stepper above; a site's dating ("c. 5.46 ka cal BP") adds to it.
  const siteDate =
    feature?.date_text && !isEvent && (showLabel || feature.date_text !== formatRange(feature.start_year, feature.end_year)) ? feature.date_text : undefined;
  const siteBlock =
    !!feature && !!(showLabel || siteDate || feature.confidence || feature.notes || siteCultures.length || feature.cultures || feature.also_recorded);
  // Chips for other entities: on the timeline they open there, on the globe they fly to it.
  const chip = (r: Entity, title: string) => (
    <button key={r.id} className="chip" onClick={() => (view === "timeline" ? openGroup(r.id) : focusEntity(r.id))} title={title}>
      <CategoryBadge category={r.category} size={18} />
      {r.name}
    </button>
  );

  return (
    <>
    {viewer}
    {!stacked && <CardResizer panel={panelEl} />}
    <div
      ref={panelRef}
      className={`panel info-panel${minimised ? " minimised" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="info-head"
        // Minimised, a tap on the title opens the card (links inside keep their own action).
        onClick={
          minimised
            ? (e) => {
                if (!(e.target as HTMLElement).closest("a, button")) setMinimised(false);
              }
            : undefined
        }
      >
        {view === "globe" && lastPlace && !isTouring && (
          <div className="place-back-bar">
            <button type="button" className="place-back-btn" onClick={reopenPlace}>
              ← Back to regional history
            </button>
          </div>
        )}
        <CardHead
          category={entity.category}
          decorative
          eyebrow={
            <>
              <span>{SINGULAR[entity.category]}</span>
              {parent && (
                <>
                  <span className="card-eyebrow-sep" aria-hidden="true">·</span>
                  <button className="card-eyebrow-link" onClick={() => openGroup(parent.id)} title={`Open ${parent.name}`}>
                    {parent.name}
                  </button>
                </>
              )}
            </>
          }
          tools={
            <>
              <button className="card-tool info-min" onClick={() => setMinimised((m) => !m)} aria-expanded={!minimised} aria-label={minLabel} title={minLabel}>
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                  <path
                    d={
                      shrinkToThumb
                        ? "M10.5 1.5 7 5M7 1.5V5h3.5M1.5 10.5 5 7M5 10.5V7H1.5" // arrows pointing inward
                        : minimised
                          ? "M2.5 4.5 6 8l3.5-3.5"
                          : "M2.5 7.5 6 4l3.5 3.5"
                    }
                    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button className="card-tool close" onClick={() => select(null)} aria-label="Close card" title="Close (Esc)">
                <CardIcon name="close" size={16} />
              </button>
            </>
          }
          title={entity.name}
          sub={
            isEvent && entity.date_text ? (
              entity.date_text
            ) : (
              <>
                <span>{formatRange(entity.start_year, entity.end_year)}</span>
                <span className="card-sub-pill">{formatDuration(entity.end_year - entity.start_year)}</span>
              </>
            )
          }
        />
      </div>
      <div className="card-actions">
        {view === "timeline" ? (
          <CardAction
            icon="globe"
            label="Globe"
            title="Show on the globe"
            onClick={() => {
              focusEntity(entity.id);
              navigate("globe");
            }}
          />
        ) : (
          <CardAction icon="timeline" label="Timeline" title="See on the timeline" onClick={() => navigate("timeline", entity.id)} />
        )}
        <CardAction
          icon="page"
          label={`${SINGULAR[entity.category]} page`}
          title={`${SINGULAR[entity.category]} page${videos ? ` (${videoCount(videos)})` : ""}`}
          badge={
            videos > 0 && (
              <>
                <svg viewBox="0 0 8 8" width="6" height="6" aria-hidden="true">
                  <path d="M1.5 1v6L7 4z" fill="currentColor" />
                </svg>
                {videos}
              </>
            )
          }
          onClick={() => navigate(PAGE_OF[entity.category], entity.id)}
        />
        {view === "globe" && !isTouring && feature && data.bboxOf.get(feature.id) && (
          <CardAction
            icon="here"
            label="History here"
            title="See all species, cultures, ancient DNA, and civilizations within 300 km across all 7 million years"
            onClick={() => {
              const b = data.bboxOf.get(feature.id)!;
              openPlace((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
            }}
          />
        )}
        <CardAction
          icon={copied ? "copied" : "share"}
          label={copied ? "Link copied" : "Share"}
          title="Share a link to this card"
          live
          onClick={() => share(entity.name)}
        />
      </div>
      {feature && siblings.length > 1 && (
        <div className="feature-nav" role="group" aria-label={`${noun}s of ${entity.name}`}>
          <button
            className="feature-nav-btn"
            onClick={() => stepFeature(-1)}
            aria-label={`Previous ${noun.toLowerCase()}`}
            title={`Previous ${noun.toLowerCase()} ( [ )`}
          >
            <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
              <path d="M7.5 2 3.5 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="feature-nav-mid" aria-live="polite">
            <div className="feature-nav-label">
              {isEvent || showLabel ? feature.label : formatRange(feature.start_year, feature.end_year)}
            </div>
            {/* Two parts set apart by a gap, not a dot, so a narrow card wraps them cleanly onto two lines. */}
            <div className="feature-nav-count">
              <span>
                {noun} {position} of {siblings.length}
              </span>
              {!isEvent && showLabel && <span className="feature-nav-dates">{siteRange(feature.start_year, feature.end_year)}</span>}
            </div>
          </div>
          <button
            className="feature-nav-btn"
            onClick={() => stepFeature(1)}
            aria-label={`Next ${noun.toLowerCase()}`}
            title={`Next ${noun.toLowerCase()} ( ] )`}
          >
            <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
              <path d="M4.5 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
      {isEvent && (
        <EventImage
          event={entity}
          picture={extra}
          className={canView ? "pv-open" : ""}
          onClick={canView ? openViewer : undefined}
        >
          {!extra && entity.video && <TourVideo key={entity.video.src} src={entity.video.src} />}
          {viewerHint}
          {hasMultiplePictures && (
            <PictureNav
              count={pictures.length}
              current={curIndex}
              onPrev={() => setManualIndex((i) => (i - 1 + pictures.length) % pictures.length)}
              onNext={() => setManualIndex((i) => (i + 1) % pictures.length)}
              onSelect={(idx) => setManualIndex(idx)}
            />
          )}
        </EventImage>
      )}
      {isEvent && eventPicture?.credit && (
        <div className="muted image-credit">{creditLine(eventPicture.credit, extra ? extra.caption : entity.image_caption, extra?.source)}</div>
      )}
      {shown && brokenImage !== shown.url && (
        <>
          <div className="info-media pv-open" onClick={canView ? openViewer : undefined}>
            {viewerHint}
            <img
              key={shown.url}
              src={shown.url}
              {...cultureSrcSet(shown.url)}
              alt={shown.name}
              className={`info-image${extra ? " info-image-extra picture-in" : ""}`}
              loading="lazy"
              onError={() => setBrokenImage(shown.url)} // a stand-in not added yet: show nothing
            />
            {!extra && entity.video && <TourVideo key={entity.video.src} src={entity.video.src} />}
            {hasMultiplePictures && (
              <PictureNav
                count={pictures.length}
                current={curIndex}
                onPrev={() => setManualIndex((i) => (i - 1 + pictures.length) % pictures.length)}
                onNext={() => setManualIndex((i) => (i + 1) % pictures.length)}
                onSelect={(idx) => setManualIndex(idx)}
              />
            )}
          </div>
          {/* Credit below the frame (inside it, the cropped picture hid it). */}
          <div className="muted image-credit">{creditLine(shown.credit, shown.note, extra?.source)}</div>
        </>
      )}
      <ListenButton entity={entity} />
      <p className="card-desc">{entity.description}</p>
      {wikiUrl && <ReadMore href={wikiUrl} />}
      {entity.category === "culture" && <DnaCultureLink cultureId={entity.id} />}
      {approximate && (
        <div className="approx-note" role="note">
          <strong>Approximate, unverified.</strong> Location and dates were compiled from general knowledge and have not been checked against a primary source.
        </div>
      )}
      {siteBlock && feature && (
        <section className="card-site" aria-label={`This ${noun.toLowerCase()}`}>
          <h3 className="card-section-title">This {noun.toLowerCase()}</h3>
          {showLabel && <div className="card-site-name">{feature.label}</div>}
          {(siteDate || feature.confidence) && (
            <div className="card-site-meta">
              {siteDate && <span>{siteDate}</span>}
              {feature.confidence && (
                <span className={`card-conf conf-${feature.confidence}`} title="How sure the sources are of this place and date">
                  {feature.confidence[0].toUpperCase() + feature.confidence.slice(1)} confidence
                </span>
              )}
            </div>
          )}
          {feature.notes && <div className="card-site-note">Location: {feature.notes}</div>}
          {(siteCultures.length > 0 || feature.cultures) && (
            <CardSection title="Culture in the same layer">
              <div className="also">
                {siteCultures.map((c) => chip(c, formatRange(c.start_year, c.end_year)))}
                {asList(feature.cultures).map((n) => <span key={n} className="chip chip-plain">{n}</span>)}
              </div>
            </CardSection>
          )}
          {feature.also_recorded && (
            <CardSection title="Also recorded here in ROAD">
              <ul className="card-site-list">
                {feature.also_recorded.split(" | ").map((r) => <li key={r}>{r}</li>)}
              </ul>
            </CardSection>
          )}
        </section>
      )}
      {others.length > 0 && (
        <CardSection title="Also here">
          <div className="also">
            {others.map((o) => (
              <button key={o.id} className="chip" onClick={() => select(o.id, hits)}>
                <CategoryBadge category={o.category} size={18} />
                {data.entityById.get(o.entity_id)?.name ?? o.entity_id}
              </button>
            ))}
          </div>
        </CardSection>
      )}
      {kids.length > 0 && (
        <CardSection title="Includes, by date" count={kids.length}>
          <ul className="card-members">
            {kids.map((k) => (
              <li key={k.id}>
                <button className="card-member" onClick={() => jumpTo(k.id)} title={formatRange(k.start_year, k.end_year)}>
                  <span className="card-member-dot" style={{ background: k.color ?? style.color }} />
                  <span className="card-member-name">{k.name}</span>
                  <span className="card-member-date">{shortRange(k.start_year, k.end_year)}</span>
                </button>
              </li>
            ))}
          </ul>
        </CardSection>
      )}
      {related.length > 0 && (
        <CardSection title="Related">
          <div className="also">{related.map((r) => chip(r, formatRange(r.start_year, r.end_year)))}</div>
        </CardSection>
      )}
      {sameTime.length > 0 && (
        <CardSection title="Alive at the same time">
          <div className="also">{sameTime.map(({ entity: r, from, to }) => chip(r, `Both alive ${formatRange(from, to)}`))}</div>
        </CardSection>
      )}
      {!isTouring && <TourStopLinks entityId={entity.id} />}
      <SourcesDisclosure>
        {siteRefs && feature && (
          <div className="card-ref-group">
            <div className="card-ref-title">This {noun.toLowerCase()}{showLabel ? `: ${feature.label}` : ""}</div>
            {sameRef ? (
              <div>Location and date: <Ref r={coordRef} /></div>
            ) : (
              <>
                {coordRef && <div>Location: <Ref r={coordRef} /></div>}
                {dateRef && <div>Date: <Ref r={dateRef} /></div>}
              </>
            )}
            {labs && <div>Lab nos. {labs}</div>}
            <RefList title="Published" items={asList(feature.refs)} />
            <RefList title="Compiled in" items={asList(feature.via)} />
            {!coordRef && !dateRef && featureSource && featureSource.id !== "recall" && (
              <div>Source: <a href={featureSource.url} target="_blank" rel="noreferrer">{featureSource.name}</a></div>
            )}
          </div>
        )}
        <div className="card-ref-group">
          {siteRefs && <div className="card-ref-title">{entity.name}</div>}
          <ul className="card-ref-list">
            {sourceIds.map((id) => {
              const s = data.sourceById.get(id);
              return s ? (
                <li key={id}>
                  <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> <span className="card-ref-licence">{s.licence}</span>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      </SourcesDisclosure>
    </div>
    </>
  );
}
