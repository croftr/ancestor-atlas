/** Deterministic 32-bit FNV-1a string hash. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${x(f(0))}${x(f(8))}${x(f(4))}`;
}

export interface CivColors {
  color: string;
  line_color: string;
}

/**
 * Colour family from the root group (or the entity itself if ungrouped);
 * lightness varies per entity so a group's children read as one family.
 */
export function civColors(rootId: string, entityId: string): CivColors {
  const hue = hash(rootId) % 360;
  const l = 42 + (hash(entityId) % 25); // 42..66
  return { color: hslToHex(hue, 60, l), line_color: hslToHex(hue, 65, Math.max(18, l - 24)) };
}
