// Turn evidence references from the data (coord_source, date_source, source_ref) into readable links.
export interface RefLink { label: string; href?: string }

export function refLink(ref: string | undefined): RefLink | undefined {
  if (!ref) return undefined;
  const [scheme, ...rest] = ref.split(":");
  const value = rest.join(":");
  switch (scheme) {
    case "wikidata": {
      const qid = value.split("#")[0];
      return { label: `Wikidata ${qid}`, href: `https://www.wikidata.org/wiki/${qid}` };
    }
    case "wikipedia": {
      // wikipedia:Title@rev (English) or wikipedia:de:Title@rev
      const m = value.match(/^(?:([a-z]{2,3}):)?(.+?)(?:@(\d+))?$/);
      if (!m) return { label: ref };
      const [, lang = "en", title, rev] = m;
      const name = title.replace(/_/g, " ");
      return {
        label: `Wikipedia${lang === "en" ? "" : ` (${lang})`}: ${name}`,
        href: rev
          ? `https://${lang}.wikipedia.org/w/index.php?oldid=${rev}`
          : `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      };
    }
    case "doi":
      return { label: `doi:${value}`, href: `https://doi.org/${value}` };
    case "xronos":
      return value === "IntCal20"
        ? { label: "XRONOS radiocarbon dates, calibrated with IntCal20", href: "https://xronos.ch/" }
        : { label: "XRONOS", href: "https://xronos.ch/" };
    case "url":
      return { label: value.replace(/^https?:\/\//, ""), href: value };
    default:
      return { label: ref };
  }
}

/** Lab numbers from a XRONOS source_ref ("xronos:OxA-1,KN-2,…"). */
export const labNumbers = (sourceRef: string | undefined) =>
  sourceRef?.startsWith("xronos:") ? sourceRef.slice(7).split(",").join(", ") : undefined;
