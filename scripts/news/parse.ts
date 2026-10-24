// Reading RSS 2.0 and Atom feeds into plain items, and the small text helpers the news update shares.
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";

export interface FeedItem {
  title: string;
  url: string;
  source: string;
  /** ISO date-time. */
  published: string;
  /** The feed's teaser, as plain text (often empty: Nature's feeds give only titles). */
  text: string;
  doi?: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text", processEntities: true, htmlEntities: true });

const list = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
/** An element's text, whether the parser gave a string, a number or an object with attributes. */
const text = (x: unknown): string => {
  if (x == null) return "";
  if (typeof x === "string" || typeof x === "number") return String(x);
  if (typeof x === "object" && "#text" in x) return String((x as { "#text": unknown })["#text"]);
  return "";
};

/** HTML to plain text: tags dropped, entities and whitespace tidied. */
export function plain(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

const DOI = /\b(10\.\d{4,9}\/[^\s"<>]+[^\s"<>.,;)\]])/;
/** A DOI named in the text, or one a Nature article URL implies (nature.com/articles/<id> is 10.1038/<id>). */
export function findDoi(url: string, ...texts: string[]): string | undefined {
  for (const t of texts) {
    const m = t.match(DOI);
    if (m) return m[1].toLowerCase();
  }
  const nature = url.match(/^https:\/\/www\.nature\.com\/articles\/(s\d[\w.-]+)$/);
  return nature ? `10.1038/${nature[1]}` : undefined;
}

const iso = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

/** The URL without tracking parameters or a fragment, so one article read twice is seen as one. */
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_)/i.test(k)) u.searchParams.delete(k);
    u.hash = "";
    return u.toString();
  } catch {
    return url.trim();
  }
}

/** Short stable id for a URL. */
export const idOf = (url: string) => createHash("sha256").update(canonicalUrl(url)).digest("hex").slice(0, 12);

/** Items of an RSS 2.0 (or RSS 1.0/RDF) or Atom document; items without a title, link or date are skipped. */
export function parseFeed(xml: string, source: string): FeedItem[] {
  const doc = parser.parse(xml);
  const out: FeedItem[] = [];
  const add = (title: string, url: string, date: string, body: string, extra: string[] = []) => {
    const published = iso(date);
    title = plain(title);
    if (!title || !url || !published) return;
    const t = plain(body).slice(0, 1200);
    out.push({ title, url: canonicalUrl(url), source, published, text: t, doi: findDoi(url, ...extra, t) });
  };

  const rssItems = [...list(doc.rss?.channel?.item), ...list(doc["rdf:RDF"]?.item)];
  for (const it of rssItems) {
    add(
      text(it.title),
      text(it.link) || (String(text(it.guid)).startsWith("http") ? text(it.guid) : ""),
      text(it.pubDate) || text(it["dc:date"]),
      text(it["content:encoded"]) || text(it.description),
      [text(it["prism:doi"]), text(it["dc:identifier"])],
    );
  }
  for (const e of list(doc.feed?.entry)) {
    const links = list(e.link as { "@href"?: string; "@rel"?: string } | undefined);
    const link = links.find((l) => !l["@rel"] || l["@rel"] === "alternate")?.["@href"] ?? links[0]?.["@href"] ?? "";
    add(text(e.title), link, text(e.published) || text(e.updated), text(e.summary) || text(e.content));
  }
  return out;
}
