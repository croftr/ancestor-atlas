// Film the app's shots for the promo video, frame by frame on a virtual clock (clock.js), so they are smooth
// whatever the machine:
//   npx tsx scripts/promo/film.ts <shot>…        e.g. 4 5 15a (needs the dev server: npx vite --port 5179)
//   npx tsx scripts/promo/film.ts all
// Each shot (shots.ts) gets a fresh page at 1920×1080 with its stored settings and page, its setup, then FPS
// frames a second for its length (from the timeline, plus HANDLE_S for trimming in the edit, or its own
// `seconds`), running its cues as their moments pass and its `frame` function every frame. Frames are JPEG
// screenshots, encoded to data/build/promo/shots/<id>.mp4 (H.264, CRF 14).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { launch, type Page } from "./cdp.ts";
import { APP_SHOTS, type AppShot, type Ctx } from "./shots.ts";
import { LENGTH_S, SHOTS } from "./timeline.ts";

const BASE = process.env.PROMO_URL || "http://localhost:5179/?film";
const FPS = 30;
const HANDLE_S = 0.5;
const OUT = "data/build/promo/shots";
const W = 1920;
const H = 1080;

/** A shot's length in the timeline (shot ids like "15a" are parts of shot 15 and give their own length). */
function seconds(id: string, shot: AppShot): number {
  if (shot.seconds) return shot.seconds;
  const i = SHOTS.findIndex((s) => String(s.n) === id);
  if (i < 0) throw new Error(`shot ${id} needs its own seconds`);
  return (SHOTS[i + 1]?.at ?? LENGTH_S) - SHOTS[i].at + HANDLE_S;
}

/** Run a shot function (written as `(ctx, …) => …` in shots.ts) inside the page. */
const run = (page: Page, fn: (ctx: Ctx, ...a: any[]) => unknown, ...a: unknown[]) =>
  page.eval(
    `(async () => { const ctx = { store: window.__atlas, map: window.__map, film: window.__film, promo: window.__promo }; ` +
      `await (${fn.toString()})(ctx, ...${JSON.stringify(a)}); return null; })()`,
  );
const tick = (page: Page) => page.eval("window.__film.step(1000 / 30).then(() => window.__film.settle())");

async function film(id: string) {
  const shot = APP_SHOTS[id];
  if (!shot) throw new Error(`no app shot ${id} in shots.ts`);
  const length = seconds(id, shot);
  console.log(`Shot ${id}: ${length.toFixed(2)} s`);
  const page = await launch({ width: W, height: H, profile: "data/build/promo/chrome" });
  try {
    const storage = { "history-globe.welcome-seen": "1", ...shot.storage };
    await page.send("Page.addScriptToEvaluateOnNewDocument", {
      source: [
        `try { for (const [k, v] of Object.entries(${JSON.stringify(storage)})) localStorage.setItem(k, v); } catch {}`,
        readFileSync("scripts/promo/clock.js", "utf8"),
        readFileSync("scripts/promo/page.js", "utf8"),
      ].join("\n"),
    });
    await page.send("Page.navigate", { url: `${BASE}${shot.hash ?? "#/"}` });
    // Load: step time along until the app (and on the globe, the map) is in.
    const ready = shot.hash && !shot.hash.startsWith("#/?") && shot.hash !== "#/"
      ? "!!window.__atlas && document.readyState === 'complete'"
      : "!!(window.__map && window.__map.loaded() && window.__atlas)";
    for (let i = 0; i < 600; i++) {
      await new Promise((r) => setTimeout(r, 15));
      if (await page.eval<boolean>(`(async () => { if (!window.__film) return false; await window.__film.step(1000 / 30); await window.__film.settle(); return ${ready}; })()`)) break;
    }
    // The "nothing on the map" notice is never wanted on film.
    await page.eval(`window.__promo.hide(${JSON.stringify([".empty-state", ...(shot.hide ?? [])])})`);
    if (shot.setup) await run(page, shot.setup);
    if (shot.frame) await run(page, shot.frame, 0, 0);
    for (let i = 0; i < (shot.warmup ?? 2) * FPS; i++) await tick(page);

    const dir = `${OUT}/${id}`;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const cues = [...(shot.cues ?? [])].sort((a, b) => a.at - b.at);
    const frames = Math.round(length * FPS);
    for (let f = 0; f < frames; f++) {
      const t = f / FPS;
      while (cues.length && cues[0].at <= t) await run(page, cues.shift()!.run);
      if (shot.frame) await run(page, shot.frame, t, t / length);
      const t0 = Date.now();
      const settled = await tick(page);
      const t1 = Date.now();
      const { data } = await page.send<{ data: string }>("Page.captureScreenshot", { format: "jpeg", quality: 95 });
      if (process.env.PROMO_PROFILE) console.log(`  frame ${f}: tick ${t1 - t0} ms ${JSON.stringify(settled)}, shot ${Date.now() - t1} ms`);
      writeFileSync(`${dir}/${String(f).padStart(5, "0")}.jpg`, Buffer.from(data, "base64"));
      if (f % FPS === 0) process.stdout.write(`  ${t.toFixed(0)} s\r`);
    }
    execFileSync(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", "-framerate", String(FPS), "-i", `${dir}/%05d.jpg`,
        "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", `${OUT}/${id}.mp4`],
      { stdio: "inherit" },
    );
    console.log(`  ✓ ${OUT}/${id}.mp4 (${frames} frames)`);
  } finally {
    await page.close();
  }
}

const args = process.argv.slice(2);
const wanted = args.includes("all") ? Object.keys(APP_SHOTS) : args;
if (!wanted.length) {
  console.error("✗ which shots? (ids, or all)");
  process.exit(1);
}
for (const id of wanted) await film(id);
process.exit(0);
