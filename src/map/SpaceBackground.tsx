import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { climateAt, useClimate } from "../time/climate";
import SkyObjects from "../sky/SkyObjects";

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

// Nearly white, with only a slight cool or warm cast: a quiet backdrop, not a feature.
export const STAR_COLORS = ["#ffffff", "#eef1f5", "#f5f1ea"];

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
    let layer: 0 | 1 | 2 = 0;

    if (typeRoll < 0.8) {
      // Faint background star
      radius = 0.4 + rand() * 0.4;
      alpha = 0.12 + rand() * 0.28;
      layer = rand() < 0.82 ? 0 : rand() < 0.5 ? 1 : 2;
    } else {
      // Slightly brighter star
      radius = 0.7 + rand() * 0.45;
      alpha = 0.35 + rand() * 0.3;
      layer = rand() < 0.7 ? 0 : rand() < 0.5 ? 1 : 2;
    }
    const color = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];

    stars.push({ u, v, radius, alpha, color, layer });
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

  // No halo or spikes: plain points.
  ctx.fillStyle = rgbaStr(rgb, s.alpha);
  ctx.beginPath();
  ctx.arc(x, y, s.radius, 0, Math.PI * 2);
  ctx.fill();

}

export default function SpaceBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasStaticRef = useRef<HTMLCanvasElement>(null);
  const canvasTwinkleARef = useRef<HTMLCanvasElement>(null);
  const canvasTwinkleBRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>(generateStars(750));
  const tint = useSkyTint();

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

      const count = Math.min(starsRef.current.length, Math.max(140, Math.round((w * h) / 7000)));
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
      <SkyObjects />
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

