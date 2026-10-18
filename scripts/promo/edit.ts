// Cut the promo: the clips of timeline.ts in order (generated clips scaled up to 1080p), the on-screen text faded
// over them, and the sound from audio.ts, into data/build/promo/promo.mp4 (H.264 + AAC, faststart).
//   npx tsx scripts/promo/edit.ts            (after audio.ts, film.ts and titles.ts)
//   npx tsx scripts/promo/edit.ts --draft    quicker, lower quality, for checking the cut
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { CLIPS, LENGTH_S, SHOTS, TEXTS } from "./timeline.ts";

const OUT = "data/build/promo";
const FPS = 30;
const draft = process.argv.includes("--draft");
const TEXT_IN = 0.5;
const TEXT_OUT = 0.4;
/** Fade up from black at the start, and down to black at the end. */
const OPEN_S = 0.6;
const CLOSE_S = 1.5;

const fail = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

// Each clip's length: its shot's time, shared evenly between the parts of a shot.
const shotLength = (n: number) => {
  const i = SHOTS.findIndex((s) => s.n === n);
  return (SHOTS[i + 1]?.at ?? LENGTH_S) - SHOTS[i].at;
};
const parts = (n: number) => CLIPS.filter((c) => c.shot === n).length;
const clips = CLIPS.map((c) => ({ ...c, length: shotLength(c.shot) / parts(c.shot) }));

const sources = [...new Set(clips.map((c) => c.src))];
for (const s of sources) if (!existsSync(s)) fail(`missing ${s}`);
const audio = `${OUT}/roughcut.mp3`;
if (!existsSync(audio)) fail(`missing ${audio} (npx tsx scripts/promo/audio.ts)`);
for (const t of TEXTS) if (!existsSync(`${OUT}/titles/${t.id}.png`)) fail(`missing title ${t.id} (npx tsx scripts/promo/titles.ts)`);

const inputs: string[] = [];
for (const s of sources) inputs.push("-i", s);
const textBase = sources.length;
for (const t of TEXTS) inputs.push("-loop", "1", "-framerate", String(FPS), "-t", String(LENGTH_S), "-i", `${OUT}/titles/${t.id}.png`);
const audioIndex = textBase + TEXTS.length;
inputs.push("-i", audio);

const f: string[] = [];
// Each clip trimmed, at its speed, 1920×1080 at FPS; a clip that dissolves into the next runs on for the dissolve.
clips.forEach((c, i) => {
  const speed = c.speed ?? 1;
  const length = c.length + (c.dissolve ?? 0);
  f.push(
    `[${sources.indexOf(c.src)}:v]trim=start=${c.in ?? 0}:duration=${(length * speed).toFixed(4)},setpts=(PTS-STARTPTS)/${speed},` +
      `fps=${FPS},scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p,trim=duration=${length.toFixed(4)},setpts=PTS-STARTPTS[c${i}]`,
  );
});
// Join them in order: a dissolve where the clip before asks for one, a cut otherwise.
let joined = "c0";
let total = clips[0].length + (clips[0].dissolve ?? 0);
for (let i = 1; i < clips.length; i++) {
  const d = clips[i - 1].dissolve;
  const out = `j${i}`;
  if (d) f.push(`[${joined}][c${i}]xfade=transition=fade:duration=${d}:offset=${(total - d).toFixed(4)}[${out}]`);
  else f.push(`[${joined}][c${i}]concat=n=2:v=1:a=0[${out}]`);
  total += clips[i].length + (clips[i].dissolve ?? 0) - (d ?? 0);
  joined = out;
}
// The text, each faded in and out over its time.
let v = joined;
TEXTS.forEach((t, k) => {
  const end = Math.min(t.to, LENGTH_S);
  f.push(
    `[${textBase + k}:v]format=rgba,fade=t=in:st=${t.from}:d=${TEXT_IN}:alpha=1,fade=t=out:st=${(end - TEXT_OUT).toFixed(3)}:d=${TEXT_OUT}:alpha=1[t${k}]`,
    `[${v}][t${k}]overlay=0:0:enable='between(t,${t.from},${end})'[o${k}]`,
  );
  v = `o${k}`;
});
f.push(`[${v}]fade=t=in:st=0:d=${OPEN_S},fade=t=out:st=${LENGTH_S - CLOSE_S}:d=${CLOSE_S},trim=duration=${LENGTH_S}[v]`);

const out = `${OUT}/${draft ? "promo-draft" : "promo"}.mp4`;
console.log(`Cutting ${clips.length} clips (${total.toFixed(2)} s of picture for ${LENGTH_S} s) and ${TEXTS.length} titles`);
execFileSync(
  "ffmpeg",
  [
    "-hide_banner", "-loglevel", "error", "-stats", "-y", ...inputs,
    "-filter_complex", f.join(";"),
    "-map", "[v]", "-map", `${audioIndex}:a`,
    "-c:v", "libx264", "-preset", draft ? "veryfast" : "slow", "-crf", draft ? "26" : "17", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-t", String(LENGTH_S), "-movflags", "+faststart", out,
  ],
  { stdio: "inherit" },
);
console.log(`✓ ${out}`);
