import { useEffect } from "react";
import { useOpenItem, useView, type View } from "./route";
import { useStore } from "./store";
import { useData } from "./map/data";
import { tourById } from "./tours/tours";
import { dnaSiteById, useDna } from "./dna/data";
import { formatCoords } from "./region/region";

const SITE_NAME = "Ancestor Atlas";

const VIEW_LABELS: Record<Exclude<View, "globe">, string> = {
  timeline: "Timeline",
  tours: "Guided Tours",
  updates: "Data Updates",
  events: "Events",
  species: "Species",
  cultures: "Cultures",
  civilizations: "Civilizations",
};

/** Compute the page title for a given view and selection state. */
export function pageTitleFor(opts: {
  view: View;
  openItemName?: string;
  tourTitle?: string;
  selectedEntityName?: string;
  dnaSiteName?: string;
  placeLabel?: string;
}): string {
  const { view, openItemName, tourTitle, selectedEntityName, dnaSiteName, placeLabel } = opts;

  if (view === "globe") {
    if (tourTitle) return `${tourTitle} · ${SITE_NAME}`;
    if (selectedEntityName) return `${selectedEntityName} · ${SITE_NAME}`;
    if (dnaSiteName) return `${dnaSiteName} (Ancient DNA) · ${SITE_NAME}`;
    if (placeLabel) return `${placeLabel} (Regional History) · ${SITE_NAME}`;
    return SITE_NAME;
  }

  if (view === "timeline") {
    if (selectedEntityName) return `${selectedEntityName} · Timeline · ${SITE_NAME}`;
    return `Timeline · ${SITE_NAME}`;
  }

  const label = VIEW_LABELS[view];
  if (openItemName) return `${openItemName} · ${label} · ${SITE_NAME}`;
  return `${label} · ${SITE_NAME}`;
}

/** Keep `document.title` in sync with the active page, open entity, or guided tour. */
export function usePageTitle() {
  const view = useView();
  const openId = useOpenItem();
  const data = useData();
  const tourId = useStore((s) => s.tour?.id);
  const selectedId = useStore((s) => s.selectedId);
  const groupId = useStore((s) => s.groupId);
  const hits = useStore((s) => s.hits);
  const dnaSiteId = useStore((s) => s.dnaSite);
  const place = useStore((s) => s.place);
  const dna = useDna(!!dnaSiteId);

  const openItemName = openId ? data?.entityById.get(openId)?.name : undefined;
  const tourTitle = tourId ? tourById(tourId)?.title : undefined;
  const selectedEntityId = groupId ?? (selectedId ? hits.find((h) => h.id === selectedId)?.entity_id : undefined);
  const selectedEntityName = selectedEntityId ? data?.entityById.get(selectedEntityId)?.name : undefined;
  const dnaSiteName = dnaSiteById(dna, dnaSiteId)?.name;
  const placeLabel = place ? formatCoords(place.lon, place.lat) : undefined;

  const title = pageTitleFor({
    view,
    openItemName,
    tourTitle,
    selectedEntityName,
    dnaSiteName,
    placeLabel,
  });

  useEffect(() => {
    document.title = title;
  }, [title]);
}
