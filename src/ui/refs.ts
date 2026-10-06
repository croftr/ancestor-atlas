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
    case "xronos": {
      // xronos:c14/<record id> (location) or xronos:IntCal20:c14/<record id> (dates); links to that XRONOS record
      const rec = value.match(/c14\/(\d+)/)?.[1];
      const href = rec ? `https://xronos.ch/c14s/${rec}` : "https://xronos.ch/";
      return value.startsWith("IntCal20")
        ? { label: "XRONOS radiocarbon dates, calibrated with IntCal20", href }
        : { label: rec ? `XRONOS record ${rec}` : "XRONOS", href };
    }
    case "url":
      return { label: value.replace(/^https?:\/\//, ""), href: value };
    default:
      return { label: ref };
  }
}

/** Lab numbers from a XRONOS source_ref ("xronos:OxA-1,KN-2,…"). */
export const labNumbers = (sourceRef: string | undefined) =>
  sourceRef?.startsWith("xronos:") ? sourceRef.slice(7).split(",").join(", ") : undefined;

/** A list-valued feature property. MapLibre hands nested arrays back from rendered features as JSON strings. */
export function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== "string" || !v) return [];
  if (v.startsWith("[")) {
    try { const a = JSON.parse(v); if (Array.isArray(a)) return a.map(String); } catch { /* plain string */ }
  }
  return v.split(/;\s*/).filter(Boolean);
}
