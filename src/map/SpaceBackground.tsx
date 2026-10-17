import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { climateAt, useClimate } from "../time/climate";

/**
 * The star canvases reach this far past each edge, so they can drift with the globe's turning
 * (`--sky-x` / `--sky-y`, set by map/MapView.tsx) without showing an edge.
 */
export const SKY_MARGIN = 40;

export interface Star {
  u: number;
  v: number;
  radius: number;
  alpha: number;
  color: string;
  hasSpike?: boolean;
  layer: 0 | 1 | 2;
}

// Deterministic PRNG so star positions are steady and identical across renders.
function createPrng(seed = 1337) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Realistic astronomical star colors (stellar spectral classes O, B, A, F, G, K, M).
export const STAR_COLORS = [
  "#ffffff", // pure white
  "#f0f5ff", // blue-white
  "#d6e8ff", // icy blue (Class B)
  "#b5d8ff", // deep blue (Class O)
  "#fff8eb", // warm white (Class F)
  "#ffe8c2", // golden yellow (Class G, Sun-like)
  "#ffd199", // amber orange (Class K)
  "#ffbaa3", // soft coral (Class M)
];

export function generateStars(totalCount = 750): Star[] {
  const rand = createPrng(42069);
  const stars: Star[] = [];

  for (let i = 0; i < totalCount; i++) {
    let u: number;
    let v: number;

    // ~35% of stars cluster gently along a diagonal celestial/galactic band
    if (rand() < 0.35) {
      const t = rand();
      const lineU = 0.05 + t * 0.9;
      const lineV = 0.9 - t * 0.8;
      const offset = (rand() + rand() + rand() - 1.5) * 0.22;
      u = Math.max(0, Math.min(1, lineU + offset * 0.7));
      v = Math.max(0, Math.min(1, lineV + offset * 0.7));
    } else {
      u = rand();
      v = rand();
    }

    const typeRoll = rand();
    let radius: number;
    let alpha: number;
    let color: string;
    let hasSpike = false;
    let layer: 0 | 1 | 2 = 0;

    if (typeRoll < 0.68) {
      // Faint background star
      radius = 0.45 + rand() * 0.55;
      alpha = 0.2 + rand() * 0.45;
      const colorRoll = rand();
      color = colorRoll < 0.6 ? STAR_COLORS[0] : colorRoll < 0.85 ? STAR_COLORS[1] : STAR_COLORS[4];
      layer = rand() < 0.82 ? 0 : rand() < 0.5 ? 1 : 2;
    } else if (typeRoll < 0.92) {
      // Medium star
      radius = 1.0 + rand() * 0.65;
      alpha = 0.55 + rand() * 0.35;
      const colorRoll = rand();
      color =
        colorRoll < 0.45
          ? STAR_COLORS[0]
          : colorRoll < 0.7
          ? STAR_COLORS[1]
          : colorRoll < 0.85
          ? STAR_COLORS[2]
          : colorRoll < 0.95
          ? STAR_COLORS[5]
          : STAR_COLORS[6];
      layer = rand() < 0.7 ? 0 : rand() < 0.5 ? 1 : 2;
    } else if (typeRoll < 0.985) {
      // Bright star
      radius = 1.65 + rand() * 0.65;
      alpha = 0.85 + rand() * 0.15;
      const cIdx = Math.floor(rand() * STAR_COLORS.length);
      color = STAR_COLORS[cIdx];
      layer = rand() < 0.65 ? 0 : rand() < 0.5 ? 1 : 2;
    } else {
      // Hero prominent star with optical diffraction spikes
      radius = 2.2 + rand() * 0.7;
      alpha = 0.95 + rand() * 0.05;
      hasSpike = true;
      const cIdx = Math.floor(rand() * 6);
      color = STAR_COLORS[cIdx];
      layer = 0; // Hero stars stay steady
    }

    stars.push({ u, v, radius, alpha, color, hasSpike, layer });
  }

  return stars;
}

function parseHex(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbaStr(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, alpha))})`;
}

function drawStar(ctx: CanvasRenderingContext2D, s: Star, x: number, y: number) {
  const rgb = parseHex(s.color);

  // Soft halo for brighter stars
  if (s.radius > 1.4) {
    const haloRadius = s.hasSpike ? s.radius * 3.8 : s.radius * 2.4;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
    grad.addColorStop(0, rgbaStr(rgb, s.alpha * 0.45));
    grad.addColorStop(0.5, rgbaStr(rgb, s.alpha * 0.12));
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Star core
  ctx.fillStyle = rgbaStr(rgb, s.alpha);
  ctx.beginPath();
  ctx.arc(x, y, s.radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle 4-point cross diffraction spikes for hero stars
  if (s.hasSpike) {
    const spikeLen = s.radius * 4.2;
    ctx.strokeStyle = rgbaStr(rgb, s.alpha * 0.35);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - spikeLen, y);
    ctx.lineTo(x + spikeLen, y);
    ctx.moveTo(x, y - spikeLen);
    ctx.lineTo(x, y + spikeLen);
    ctx.stroke();
  }
}

export default function SpaceBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasStaticRef = useRef<HTMLCanvasElement>(null);
  const canvasTwinkleARef = useRef<HTMLCanvasElement>(null);
  const canvasTwinkleBRef = useRef<HTMLCanvasElement>(null);
  const canvasMeteorRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>(generateStars(750));
  const tint = useSkyTint();

  // The odd shooting star.
  useEffect(() => {
    const canvas = canvasMeteorRef.current;
    if (!canvas || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    return meteors(canvas);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const render = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width) + 2 * SKY_MARGIN;
      const h = Math.round(rect.height) + 2 * SKY_MARGIN;
      if (w <= 0 || h <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const canvases = [
        canvasStaticRef.current,
        canvasTwinkleARef.current,
        canvasTwinkleBRef.current,
        canvasMeteorRef.current,
      ];

      for (const canvas of canvases) {
        if (!canvas) continue;
        const targetW = Math.round(w * dpr);
        const targetH = Math.round(h * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
      }

      const ctxStatic = canvasStaticRef.current?.getContext("2d");
      const ctxTwinkleA = canvasTwinkleARef.current?.getContext("2d");
      const ctxTwinkleB = canvasTwinkleBRef.current?.getContext("2d");

      if (!ctxStatic || !ctxTwinkleA || !ctxTwinkleB) return;

      ctxStatic.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxTwinkleA.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxTwinkleB.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctxStatic.clearRect(0, 0, w, h);
      ctxTwinkleA.clearRect(0, 0, w, h);
      ctxTwinkleB.clearRect(0, 0, w, h);

      // Faint cosmic stardust lane along the galactic band
      const dustGrad = ctxStatic.createLinearGradient(w * 0.1, h * 0.9, w * 0.9, h * 0.1);
      dustGrad.addColorStop(0, "transparent");
      dustGrad.addColorStop(0.35, "rgba(45, 25, 75, 0.08)");
      dustGrad.addColorStop(0.5, "rgba(55, 38, 90, 0.12)");
      dustGrad.addColorStop(0.65, "rgba(35, 48, 95, 0.08)");
      dustGrad.addColorStop(1, "transparent");
      ctxStatic.fillStyle = dustGrad;
      ctxStatic.fillRect(0, 0, w, h);

      const count = Math.min(starsRef.current.length, Math.max(140, Math.round((w * h) / 3200)));
      const activeStars = starsRef.current.slice(0, count);

      for (const s of activeStars) {
        const x = s.u * w;
        const y = s.v * h;
        if (s.layer === 1) {
          drawStar(ctxTwinkleA, s, x, y);
        } else if (s.layer === 2) {
          drawStar(ctxTwinkleB, s, x, y);
        } else {
          drawStar(ctxStatic, s, x, y);
        }
      }
    };

    render();

    let resizeTimer = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(render);
    };

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(onResize);
      observer.observe(container);
      return () => {
        cancelAnimationFrame(resizeTimer);
        observer.disconnect();
      };
    } else {
      window.addEventListener("resize", onResize);
      return () => {
        cancelAnimationFrame(resizeTimer);
        window.removeEventListener("resize", onResize);
      };
    }
  }, []);

  return (
    <div ref={containerRef} className="space-background" aria-hidden="true">
      {/* The sky's glow follows the climate of the slider's moment: icier in glacial times, warmer in warm ones. */}
      <div className="space-tint cold" style={{ opacity: tint.cold }} />
      <div className="space-tint warm" style={{ opacity: tint.warm }} />
      <canvas ref={canvasStaticRef} className="space-canvas space-canvas-static" />
      <canvas ref={canvasTwinkleARef} className="space-canvas space-canvas-twinkle-a" />
      <canvas ref={canvasTwinkleBRef} className="space-canvas space-canvas-twinkle-b" />
      <canvas ref={canvasMeteorRef} className="space-canvas space-canvas-meteor" />
    </div>
  );
}

/**
 * How icy or warm the sky looks (0..1 each), from the LR04 δ18O of the slider's year: about 3.2‰ is
 * today; the deepest glacials reach about 5‰, the warm Pliocene about 2.7‰. Neutral before the record.
 */
function useSkyTint(): { cold: number; warm: number } {
  const climate = useClimate();
  const d = useStore((s) => {
    const v = climate ? climateAt(climate, s.year).d18o : undefined;
    return v === undefined ? undefined : Math.round(v * 50) / 50; // in steps, so it re-renders only on a change
  });
  if (d === undefined) return { cold: 0, warm: 0 };
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return { cold: clamp((d - 3.4) / 1.4), warm: clamp((3.25 - d) / 0.4) };
}

/** Seconds between shooting stars: rarer during a tour, so one doesn't pull the eye from the narration. */
const METEOR_GAP: [number, number] = [25, 60];
const METEOR_GAP_TOUR: [number, number] = [50, 100];

/**
 * Draws a shooting star now and then on its own canvas (sized with the others): a thin streak of under a
 * second across an upper corner, heading away from the globe; about one in five is brighter and leaves
 * a glow that fades. Nothing runs between them. Returns the cleanup.
 */
function meteors(canvas: HTMLCanvasElement): () => void {
  let timer = 0;
  let raf = 0;
  const schedule = () => {
    const [a, b] = useStore.getState().tour ? METEOR_GAP_TOUR : METEOR_GAP;
    timer = window.setTimeout(launch, (a + Math.random() * (b - a)) * 1000);
  };
  const launch = () => {
    const ctx = canvas.getContext("2d");
    // Not while the page is hidden or the globe isn't showing.
    if (!ctx || document.hidden || !canvas.offsetParent) return schedule();
    const dpr = canvas.width / Math.max(1, canvas.clientWidth);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const left = Math.random() < 0.5;
    const bright = Math.random() < 0.2;
    const x0 = w * (left ? 0.06 + Math.random() * 0.24 : 0.7 + Math.random() * 0.24);
    const y0 = h * (0.04 + Math.random() * 0.3);
    const angle = ((18 + Math.random() * 22) * Math.PI) / 180;
    const dx = Math.cos(angle) * (left ? -1 : 1);
    const dy = Math.sin(angle);
    const travel = (bright ? 320 : 220) + Math.random() * 160;
    const tail = (bright ? 150 : 90) + Math.random() * 70;
    const flight = (bright ? 900 : 650) + Math.random() * 250;
    const linger = bright ? 900 : 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const p = Math.min(1, t / flight);
      const eased = 1 - (1 - p) ** 2;
      const hx = x0 + dx * travel * eased;
      const hy = y0 + dy * travel * eased;
      if (p < 1) {
        // The streak grows, then shortens as it burns out.
        const len = tail * Math.sin(Math.PI * Math.min(1, p * 1.15));
        const alpha = Math.sin(Math.PI * p) * (bright ? 1 : 0.75);
        const tx = hx - dx * len;
        const ty = hy - dy * len;
        const g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0, "rgba(180, 210, 255, 0)");
        g.addColorStop(1, `rgba(235, 244, 255, ${alpha})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = bright ? 1.8 : 1.1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        const r = bright ? 7 : 4;
        const head = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
        head.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        head.addColorStop(1, "rgba(200, 225, 255, 0)");
        ctx.fillStyle = head;
        ctx.beginPath();
        ctx.arc(hx, hy, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (t < flight + linger) {
        // A bright one's glowing trail, fading where it burned.
        const k = 1 - (t - flight) / linger;
        const ex = x0 + dx * travel;
        const ey = y0 + dy * travel;
        const sx = x0 + dx * travel * 0.35;
        const sy = y0 + dy * travel * 0.35;
        const g = ctx.createLinearGradient(sx, sy, ex, ey);
        g.addColorStop(0, "rgba(160, 200, 255, 0)");
        g.addColorStop(0.7, `rgba(190, 215, 255, ${0.28 * k})`);
        g.addColorStop(1, "rgba(190, 215, 255, 0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      } else {
        ctx.clearRect(0, 0, w, h);
        raf = 0;
        return schedule();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };
  schedule();
  return () => {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
  };
}
