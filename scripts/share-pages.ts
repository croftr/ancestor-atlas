/**
 * Share & SEO pages: a static HTML page per entity (/s/<id>) and per tour (/s/tour/<id>), written into dist/
 * after `vite build`.
 *
 * - Link previews (Open Graph / Twitter) get the entity's or tour's own title, description, and picture.
 * - Shared links from the app carry a URL hash ("/s/neanderthal#/?year=…&site=…" or "/s/tour/…#/tour/…")
 *   and immediately redirect the visitor to that exact state on the globe.
 * - Search engine crawlers and direct organic visitors (no hash) stay on the static page, which provides
 *   structured data (JSON-LD), full descriptions, internal links to related entities/tours, and buttons
 *   to launch the 3D globe or category detail page.
 * - Also writes sitemap.xml and robots.txt.
 *
 * Run by `npm run build`; `SITE_URL` overrides the site's address (absolute URLs for the tags).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Entity } from "../src/types";
import { PAGE_OF } from "../src/route";
import { TOURS, type Tour } from "../src/tours/tours";
import { formatRange } from "../src/time/scale";

const SITE = (process.env.SITE_URL ?? "https://ancestoratlas.org").replace(/\/+$/, "");
const OUT = "dist";
const DEFAULT_IMAGE = "/og-preview.jpg";

const entities: Entity[] = JSON.parse(readFileSync("public/data/entities.json", "utf8"));
const byId = new Map(entities.map((e) => [e.id, e]));

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (url: string) => (/^https?:\/\//.test(url) ? url : SITE + (url.startsWith("/") ? url : `/${url}`));

/** About `max` characters, cut at a sentence end if one is near, else at a word. */
function summary(text: string, max = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = cut.lastIndexOf(". ");
  if (stop > max * 0.5) return cut.slice(0, stop + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}

/** The entity's picture, else its group's, else its stage picture (as browse/browse.ts pictureOf). */
function pictureOf(e: Entity): string | undefined {
  if (e.image_url) return e.image_url;
  const parent = e.parent_id ? byId.get(e.parent_id) : undefined;
  return parent?.image_url ?? e.fallback_image?.url;
}

const KIND: Record<Entity["category"], string> = {
  species: "Species",
  culture: "Culture",
  civilization: "Civilization",
  city: "City",
  event: "Event",
};

interface LinkItem {
  href: string;
  label: string;
  meta?: string;
}

interface LinkSection {
  heading: string;
  items: LinkItem[];
}

interface Page {
  path: string; // "/s/neanderthal"
  title: string;
  kicker: string;
  date: string;
  description: string;
  extraText?: string;
  image: string;
  /** Where the primary CTA button opens in the app. */
  target: string;
  primaryLabel: string;
  secondaryTarget?: string;
  secondaryLabel?: string;
  externalUrl?: string;
  externalLabel?: string;
  sameAs?: string[];
  sections: LinkSection[];
}

const entityLink = (e: Entity): LinkItem => ({
  href: `/s/${encodeURIComponent(e.id)}`,
  label: e.name,
  meta: e.date_text ?? formatRange(e.start_year, e.end_year),
});

const tourLink = (t: Tour): LinkItem => ({
  href: `/s/tour/${encodeURIComponent(t.id)}`,
  label: t.title,
  meta: `${t.stops.length} stops`,
});

function html(p: Page): string {
  const title = `${p.title} · Ancestor Atlas`;
  const desc = summary(p.description) || "Explore 7 million years of the human story on an interactive 3D globe.";
  const image = abs(p.image);
  const url = SITE + p.path;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: desc,
    image,
    url,
    mainEntityOfPage: url,
    isAccessibleForFree: true,
    isPartOf: {
      "@type": "WebSite",
      name: "Ancestor Atlas",
      url: `${SITE}/`,
    },
    publisher: {
      "@type": "Organization",
      name: "Ancestor Atlas",
      url: `${SITE}/`,
    },
  };
  if (p.sameAs && p.sameAs.length > 0) {
    jsonLd.sameAs = p.sameAs;
  }

  const sectionsHtml = p.sections
    .filter((s) => s.items.length > 0)
    .map(
      (s) => `<section class="rel">
<h2>${esc(s.heading)}</h2>
<ul>
${s.items
  .map(
    (item) =>
      `<li><a href="${esc(item.href)}">${esc(item.label)}</a>${item.meta ? ` <span class="m">${esc(item.meta)}</span>` : ""}</li>`,
  )
  .join("\n")}
</ul>
</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#0b1020">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Ancestor Atlas">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" type="image/webp" href="/favicon.webp">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
<script>if (location.hash.length > 2) location.replace("/" + location.hash);</script>
<style>
body{margin:0;background:#0b1020;color:#e8ecf4;font:16px/1.6 system-ui,sans-serif}
main{max-width:680px;margin:0 auto;padding:28px 16px 56px}
nav.top{margin-bottom:20px;font-size:.9rem}
nav.top a{color:#8b95ab;text-decoration:none}
nav.top a:hover{color:#e8ecf4}
img{width:100%;height:auto;border-radius:10px;display:block;margin-bottom:16px}
.k{color:#8b95ab;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;margin:16px 0 4px}
h1{font-family:Georgia,serif;font-weight:600;margin:0 0 4px;font-size:1.85rem;line-height:1.25}
.d{color:#cbd3e6;margin:0 0 16px;font-size:.95rem}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0 28px}
a.go{display:inline-block;padding:10px 18px;border-radius:8px;background:#3d7bff;color:#fff;text-decoration:none;font-weight:600;font-size:.95rem}
a.go.sec{background:#1a233a;color:#dbe4f8;border:1px solid #2b3858}
section.rel{margin-top:28px;padding-top:20px;border-top:1px solid #1c253b}
section.rel h2{font-size:.9rem;text-transform:uppercase;letter-spacing:.06em;color:#8b95ab;margin:0 0 10px}
section.rel ul{list-style:none;padding:0;margin:0;display:grid;gap:6px}
section.rel a{color:#7daaff;text-decoration:none}
section.rel a:hover{text-decoration:underline}
section.rel .m{color:#8b95ab;font-size:.85rem;margin-left:6px}
</style>
</head>
<body>
<main>
<nav class="top"><a href="/">← Ancestor Atlas · Interactive 3D Globe</a></nav>
${p.image !== DEFAULT_IMAGE ? `<img src="${esc(p.image)}" alt="${esc(p.title)}">` : ""}
<p class="k">${esc(p.kicker)}</p>
<h1>${esc(p.title)}</h1>
${p.date ? `<p class="d">${esc(p.date)}</p>` : ""}
<p>${esc(p.description)}</p>
${p.extraText ? `<p>${esc(p.extraText)}</p>` : ""}
<div class="actions">
<a class="go" href="/${esc(p.target)}">${esc(p.primaryLabel)}</a>
${p.secondaryTarget && p.secondaryLabel ? `<a class="go sec" href="/${esc(p.secondaryTarget)}">${esc(p.secondaryLabel)}</a>` : ""}
${p.externalUrl && p.externalLabel ? `<a class="go sec" href="${esc(p.externalUrl)}" rel="noopener noreferrer">${esc(p.externalLabel)}</a>` : ""}
</div>
${sectionsHtml}
</main>
</body>
</html>
`;
}

// Precompute entity relationships for internal SEO linking.
const childrenOf = new Map<string, Entity[]>();
const citiesOfEntity = new Map<string, Entity[]>();
const reverseRelated = new Map<string, Entity[]>();
const toursByEntity = new Map<string, Tour[]>();
const byCategory = new Map<Entity["category"], Entity[]>();

for (const e of entities) {
  if (e.parent_id) {
    const list = childrenOf.get(e.parent_id) ?? [];
    list.push(e);
    childrenOf.set(e.parent_id, list);
  }
  if (e.category === "city" && e.part_of) {
    const list = citiesOfEntity.get(e.part_of) ?? [];
    list.push(e);
    citiesOfEntity.set(e.part_of, list);
  }
  for (const rId of e.related_ids ?? []) {
    const list = reverseRelated.get(rId) ?? [];
    list.push(e);
    reverseRelated.set(rId, list);
  }
  const catList = byCategory.get(e.category) ?? [];
  catList.push(e);
  byCategory.set(e.category, catList);
}

for (const list of byCategory.values()) {
  list.sort((a, b) => a.start_year - b.start_year);
}

for (const t of TOURS) {
  const seen = new Set<string>();
  for (const s of t.stops) {
    if (seen.has(s.entity)) continue;
    seen.add(s.entity);
    const list = toursByEntity.get(s.entity) ?? [];
    list.push(t);
    toursByEntity.set(s.entity, list);
  }
}

const pages: Page[] = [
  ...entities.map((e): Page => {
    const parent = e.parent_id ? byId.get(e.parent_id) : undefined;
    const partOf = e.part_of ? byId.get(e.part_of) : undefined;
    const kids = childrenOf.get(e.id) ?? [];
    const cities = citiesOfEntity.get(e.id) ?? [];
    const relatedSet = new Map<string, Entity>();
    for (const id of e.related_ids ?? []) {
      const r = byId.get(id);
      if (r && r.id !== e.id) relatedSet.set(r.id, r);
    }
    for (const r of reverseRelated.get(e.id) ?? []) {
      if (r.id !== e.id) relatedSet.set(r.id, r);
    }
    const tours = toursByEntity.get(e.id) ?? [];

    // Chronological neighbours in the same category so every entity page has crawlable internal links.
    const catPeers = byCategory.get(e.category) ?? [];
    const idx = catPeers.findIndex((x) => x.id === e.id);
    const neighbours: Entity[] = [];
    for (let offset = -2; offset <= 2; offset++) {
      if (offset === 0) continue;
      const peer = catPeers[idx + offset];
      if (peer && !relatedSet.has(peer.id) && peer.id !== parent?.id && peer.id !== partOf?.id) {
        neighbours.push(peer);
      }
    }

    const sections: LinkSection[] = [];
    const lineage: Entity[] = [...(parent ? [parent] : []), ...(partOf && partOf.id !== parent?.id ? [partOf] : [])];
    if (lineage.length > 0) {
      sections.push({ heading: "Part of", items: lineage.map(entityLink) });
    }
    if (kids.length > 0) {
      sections.push({ heading: "Includes", items: kids.map(entityLink) });
    }
    if (cities.length > 0) {
      sections.push({ heading: "Cities", items: cities.map(entityLink) });
    }
    if (relatedSet.size > 0) {
      sections.push({ heading: "Related", items: [...relatedSet.values()].slice(0, 12).map(entityLink) });
    }
    if (tours.length > 0) {
      sections.push({ heading: "Featured in guided tours", items: tours.map(tourLink) });
    }
    if (neighbours.length > 0) {
      sections.push({ heading: `More ${KIND[e.category].toLowerCase()} entries`, items: neighbours.map(entityLink) });
    }

    const sameAs: string[] = [];
    if (e.wikipedia_url) sameAs.push(e.wikipedia_url);
    if (e.wikidata) sameAs.push(`https://www.wikidata.org/wiki/${e.wikidata}`);

    const baseKicker = e.group ? `${KIND[e.category]} group` : KIND[e.category];
    const kicker = e.region ? `${baseKicker} · ${e.region}` : baseKicker;

    return {
      path: `/s/${encodeURIComponent(e.id)}`,
      title: e.name,
      kicker,
      date: e.date_text ?? formatRange(e.start_year, e.end_year),
      description: e.description ?? "",
      image: pictureOf(e) ?? DEFAULT_IMAGE,
      target: `#/?group=${encodeURIComponent(e.id)}`,
      primaryLabel: "Open on 3D Globe",
      secondaryTarget: `#/${PAGE_OF[e.category]}/${encodeURIComponent(e.id)}`,
      secondaryLabel: `${KIND[e.category]} page`,
      externalUrl: e.wikipedia_url,
      externalLabel: e.wikipedia_url ? "Wikipedia" : undefined,
      sameAs,
      sections,
    };
  }),
  ...TOURS.map((t): Page => {
    const first = t.stops.map((s) => byId.get(s.entity)).find((e) => e && pictureOf(e));
    const seen = new Set<string>();
    const stopEntities: Entity[] = [];
    for (const s of t.stops) {
      if (seen.has(s.entity)) continue;
      seen.add(s.entity);
      const ent = byId.get(s.entity);
      if (ent) stopEntities.push(ent);
    }
    const otherTours = TOURS.filter((o) => o.id !== t.id);

    return {
      path: `/s/tour/${encodeURIComponent(t.id)}`,
      title: t.title,
      kicker: `Guided tour · ${t.stops.length} stops`,
      date: t.book ? `${t.book.author} (${t.book.year})` : "",
      description: t.synopsis ?? t.blurb,
      extraText: t.closing,
      image: t.book?.cover?.url ?? (first && pictureOf(first)) ?? DEFAULT_IMAGE,
      target: `#/tour/${encodeURIComponent(t.id)}`,
      primaryLabel: "Start Guided Tour on 3D Globe",
      secondaryTarget: "#/tours",
      secondaryLabel: "All Guided Tours",
      externalUrl: t.book?.link,
      externalLabel: t.book ? "About the book" : undefined,
      sections: [
        { heading: "Stops on this tour", items: stopEntities.map(entityLink) },
        { heading: "More guided tours", items: otherTours.map(tourLink) },
      ],
    };
  }),
];

for (const p of pages) {
  // "/s/neanderthal" -> dist/s/neanderthal.html, served without the extension (cleanUrls in vercel.json).
  const file = join(OUT, `${decodeURIComponent(p.path)}.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html(p));
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[{ path: "/" }, ...pages].map((p) => `  <url><loc>${esc(SITE + p.path)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`,
);
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Share pages: ${pages.length} (${entities.length} entities, ${TOURS.length} tours), sitemap.xml, robots.txt`);
