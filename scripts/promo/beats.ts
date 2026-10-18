// Find the music's tempo and beats, to put the promo's music edits on a beat:
//   npx tsx scripts/promo/beats.ts [<audio file>] [<from s> <to s> …]
// Prints the tempo, the beat grid's phase, and the beats (with their onset strength) inside each range given.
// Onset envelope = positive change in band energy per 23 ms frame; tempo from its autocorrelation (60–180 BPM);
// phase = the offset whose beats carry the most onset energy over the whole track.
import { execFileSync } from "node:child_process";
import { MUSIC } from "./timeline.ts";

const args = process.argv.slice(2);
const file = args[0] && !/^[\d.]+$/.test(args[0]) ? args.shift()! : MUSIC.file;
const ranges: [number, number][] = [];
for (let i = 0; i + 1 < args.length; i += 2) ranges.push([Number(args[i]), Number(args[i + 1])]);

const RATE = 11025;
const HOP = 256; // ~23 ms
const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"], {
  maxBuffer: 1 << 30,
});
const pcm = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const frames = Math.floor(pcm.length / HOP);
const fps = RATE / HOP;

// Energy per frame in a crude low and high band (one-pole split), log-compressed; onset = summed positive change.
const low = new Float64Array(frames);
const high = new Float64Array(frames);
let lp = 0;
for (let f = 0; f < frames; f++) {
  let el = 0;
  let eh = 0;
  for (let i = f * HOP; i < (f + 1) * HOP; i++) {
    lp += 0.08 * (pcm[i] - lp);
    el += lp * lp;
    eh += (pcm[i] - lp) ** 2;
  }
  low[f] = Math.log1p(1000 * el);
  high[f] = Math.log1p(1000 * eh);
}
const onset = new Float64Array(frames);
for (let f = 1; f < frames; f++) onset[f] = Math.max(0, low[f] - low[f - 1]) + Math.max(0, high[f] - high[f - 1]);
// Remove the slow trend so loud sections don't dominate.
const W = Math.round(fps);
const flat = new Float64Array(frames);
for (let f = 0; f < frames; f++) {
  let s = 0;
  let n = 0;
  for (let g = Math.max(0, f - W); g < Math.min(frames, f + W); g++, n++) s += onset[g];
  flat[f] = Math.max(0, onset[f] - s / n);
}

// Tempo: autocorrelation peak between 60 and 180 BPM, weighted gently towards 120.
let best = { bpm: 0, score: -Infinity, lag: 0 };
for (let lag = Math.round((fps * 60) / 180); lag <= Math.round((fps * 60) / 60); lag++) {
  let s = 0;
  for (let f = lag; f < frames; f++) s += flat[f] * flat[f - lag];
  const bpm = (fps * 60) / lag;
  const score = s * Math.exp(-0.5 * Math.log2(bpm / 120) ** 2);
  if (score > best.score) best = { bpm, score, lag };
}
// Refine to a fractional period by scanning around the integer lag.
const scoreAt = (period: number, phase: number) => {
  let s = 0;
  for (let t = phase; t < frames; t += period) s += flat[Math.round(t)] ?? 0;
  return s;
};
let period = best.lag;
let phase = 0;
let top = -Infinity;
for (let p = best.lag - 1; p <= best.lag + 1; p += 0.01) {
  for (let ph = 0; ph < p; ph += 0.5) {
    const s = scoreAt(p, ph);
    if (s > top) [top, period, phase] = [s, p, ph];
  }
}
const beatS = period / fps;
console.log(`${file}\ntempo ${(60 / beatS).toFixed(2)} BPM (beat ${beatS.toFixed(4)} s), first beat at ${(phase / fps).toFixed(3)} s`);

const strength = (t: number) => {
  const f = Math.round(t * fps);
  let m = 0;
  for (let g = f - 2; g <= f + 2; g++) m = Math.max(m, flat[g] ?? 0);
  return m;
};
for (const [from, to] of ranges) {
  console.log(`\nbeats ${from}–${to} s (index, time, onset strength):`);
  for (let k = Math.ceil((from * fps - phase) / period); ; k++) {
    const t = (phase + k * period) / fps;
    if (t > to) break;
    console.log(`  #${k}  ${t.toFixed(3)} s  ${"█".repeat(Math.round(strength(t) * 8))}`);
  }
}
