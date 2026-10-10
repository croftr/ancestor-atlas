import { useEffect, useRef } from "react";

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
  const starsRef = useRef<Star[]>(generateStars(750));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const render = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
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
      <canvas ref={canvasStaticRef} className="space-canvas space-canvas-static" />
      <canvas ref={canvasTwinkleARef} className="space-canvas space-canvas-twinkle-a" />
      <canvas ref={canvasTwinkleBRef} className="space-canvas space-canvas-twinkle-b" />
    </div>
  );
}
