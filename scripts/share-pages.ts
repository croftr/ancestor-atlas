/**
 * Share pages: a small static page per entity (/s/<id>) and per tour (/s/tour/<id>), written into dist/
 * after `vite build`. The app lives behind the URL hash, which link previews and search engines never
 * see, so a shared card would otherwise preview as the home page. Each page carries its own title,
 * description and picture (Open Graph / Twitter tags) and a readable summary, then sends a visitor on
 * to the app: to the hash the link carries ("/s/neanderthal#/?year=…&site=…", from the card's Share
 * button), else to the entity on the globe or the tour. Also writes sitemap.xml and robots.txt.
 *
 * Run by `npm run build`; `SITE_URL` overrides the site's address (absolute URLs for the tags).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Entity } from "../src/types";
import { TOURS } from "../src/tours/tours";
import { formatRange } from "../src/time/scale";

const SITE = (process.env.SITE_URL ?? "https://ancestor-atlas-lilac.vercel.app").replace(/\/+$/, "");
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
  event: "Event",
};

interface Page {
  path: string; // "/s/neanderthal"
  title: string;
  kicker: string;
  date: string;
  description: string;
  image: string;
  /** Where the app opens when the link carries no hash of its own. */
  target: string;
}

function html(p: Page): string {
  const title = `${p.title} · Ancestor Atlas`;
  const desc = summary(p.description) || "Explore 7 million years of the human story on an interactive 3D globe.";
  const image = abs(p.image);
  const url = SITE + p.path;
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
<script>location.replace("/" + (location.hash.length > 2 ? location.hash : ${JSON.stringify(p.target)}));</script>
<style>
body{margin:0;background:#0b1020;color:#e8ecf4;font:16px/1.55 system-ui,sans-serif}
main{max-width:640px;margin:0 auto;padding:32px 16px}
img{width:100%;height:auto;border-radius:10px;display:block}
.k{color:#8b95ab;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;margin:20px 0 4px}
h1{font-family:Georgia,serif;font-weight:600;margin:0 0 4px}
.d{color:#cbd3e6;margin:0 0 16px}
a.go{display:inline-block;margin-top:12px;padding:10px 18px;border-radius:8px;background:#3d7bff;color:#fff;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<main>
${p.image !== DEFAULT_IMAGE ? `<img src="${esc(p.image)}" alt="">` : ""}
<p class="k">${esc(p.kicker)}</p>
<h1>${esc(p.title)}</h1>
<p class="d">${esc(p.date)}</p>
<p>${esc(p.description)}</p>
<a class="go" href="/${esc(p.target)}">Open in Ancestor Atlas</a>
</main>
</body>
</html>
`;
}

const pages: Page[] = [
  ...entities.map(
    (e): Page => ({
      path: `/s/${encodeURIComponent(e.id)}`,
      title: e.name,
      kicker: e.group ? `${KIND[e.category]} group` : KIND[e.category],
      date: e.date_text ?? formatRange(e.start_year, e.end_year),
      description: e.description ?? "",
      image: pictureOf(e) ?? DEFAULT_IMAGE,
      target: `#/?group=${encodeURIComponent(e.id)}`,
    }),
  ),
  ...TOURS.map((t): Page => {
    const first = t.stops.map((s) => byId.get(s.entity)).find((e) => e && pictureOf(e));
    return {
      path: `/s/tour/${encodeURIComponent(t.id)}`,
      title: t.title,
      kicker: `Guided tour · ${t.stops.length} stops`,
      date: "",
      description: t.blurb,
      image: (first && pictureOf(first)) ?? DEFAULT_IMAGE,
      target: `#/tour/${encodeURIComponent(t.id)}`,
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
