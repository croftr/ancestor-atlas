// The promo's on-screen text, drawn by Chrome as transparent 1920×1080 PNGs (data/build/promo/titles/<id>.png),
// for edit.ts to fade over the picture. Georgia, as the app's own titles (picture viewer, compact card).
//   npx tsx scripts/promo/titles.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { launch } from "./cdp.ts";
import { TEXTS } from "./timeline.ts";

const OUT = "data/build/promo/titles";
const CREAM = "#f4ead2";
const GOLD = "#d9b26a";

const STYLES: Record<string, string> = {
  // The name, large and spaced, under the globe (raised in its shot to make room).
  title: `font-size: 112px; letter-spacing: 0.16em; text-transform: uppercase; text-indent: 0.16em;`,
  // A feature's caption, top centre (where the search bar is, hidden in those shots), on a dark backing so it
  // reads over the globe too.
  caption: `position: absolute; top: 52px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 56px;
    letter-spacing: 0.04em; padding: 10px 40px 14px; border-radius: 14px; background: rgba(8, 12, 26, 0.72);
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.45);`,
  // The end card: the address under the globe, with the credits small underneath.
  end: `font-size: 88px; letter-spacing: 0.03em;`,
};

function html(kind: string, text: string, sub?: string) {
  const centred = kind !== "caption";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: 1920px; height: 1080px; background: transparent; }
    body { position: relative; font-family: Georgia, "Times New Roman", serif; color: ${CREAM};
      ${centred ? "display: flex; flex-direction: column; align-items: center; justify-content: flex-end; box-sizing: border-box; padding-bottom: 96px;" : ""} }
    .t { ${STYLES[kind]} text-align: center; text-shadow: 0 2px 6px rgba(0,0,0,.75), 0 0 32px rgba(0,0,0,.6); }
    .rule { width: 120px; height: 2px; background: ${GOLD}; margin: 22px auto 0; box-shadow: 0 0 8px rgba(0,0,0,.6); }
    .sub { margin-top: 26px; font-size: 26px; letter-spacing: 0.02em; color: ${CREAM}; opacity: .85; text-align: center;
      text-shadow: 0 1px 4px rgba(0,0,0,.8); line-height: 1.5; }
  </style></head><body><div class="t">${text}${kind === "caption" ? "" : `<div class="rule"></div>`}</div>${sub ? `<div class="sub">${sub}</div>` : ""}</body></html>`;
}

mkdirSync(OUT, { recursive: true });
const page = await launch({ width: 1920, height: 1080, profile: "data/build/promo/chrome" });
await page.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const t of TEXTS) {
  await page.send("Page.navigate", { url: `data:text/html;base64,${Buffer.from(html(t.kind, t.text, t.sub)).toString("base64")}` });
  await new Promise((r) => setTimeout(r, 400));
  const { data } = await page.send<{ data: string }>("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/${t.id}.png`, Buffer.from(data, "base64"));
  console.log(`  ✓ ${t.id}: ${t.text}`);
}
await page.close();
process.exit(0);
