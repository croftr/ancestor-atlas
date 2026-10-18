// The promo's sound: narration lines, the music edit, and a mix of the two.
//   npx tsx scripts/promo/audio.ts            make what's missing and write the rough-cut mix
//   npx tsx scripts/promo/audio.ts --redo <shot>…   record those lines again (a new take)
//   npx tsx scripts/promo/audio.ts --opening <name> read the cold open another way (OPENINGS in timeline.ts)
// Narration: the app's narrator (ELEVENLABS_VOICE_ID and model, no voice settings, as narrate.ts), one clip per line with the
// lines either side passed as context so the takes join up; cached in data/build/promo/vo by text, so only new or
// changed lines cost anything. Silence is trimmed so a line starts speaking at its `at`, and the takes are sped up
// to TEMPO afterwards (pitch kept; the API key may not read the voice's settings to set a speed).
// Writes data/build/promo/music.wav (the edit) and data/build/promo/roughcut.mp3 (music dipped under the voice,
// -16 LUFS), and prints each line's length against the time before the next one.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { encode } from "../audio/encode.ts";
import { FADE_S, LENGTH_S, LINES, MUSIC, OPENINGS, TEMPO, type Delivery, type Line } from "./timeline.ts";

const OUT = "data/build/promo";
const API = "https://api.elevenlabs.io/v1";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const fail = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};
const key = process.env.ELEVENLABS_API_KEY || fail("set ELEVENLABS_API_KEY in .env.local");
const voice = process.env.ELEVENLABS_VOICE_ID || fail("set ELEVENLABS_VOICE_ID in .env.local");
const args = process.argv.slice(2);
const redo = args.includes("--redo") ? args.filter((a) => /^\d+$/.test(a)).map(Number) : [];
const openingName = args[args.indexOf("--opening") + 1];
const opening: Delivery | undefined = args.includes("--opening") ? (OPENINGS[openingName] ?? fail(`no opening "${openingName}"`)) : undefined;

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { "xi-api-key": key, ...init.headers } });
  if (!res.ok) throw new Error(`ElevenLabs ${path.split("?")[0]}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res;
}
const ff = (a: string[]) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a], { stdio: "inherit" });
const duration = (f: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));
const spoken = (l: Line) => l.spoken ?? l.text;

mkdirSync(`${OUT}/vo`, { recursive: true });

let saved: object | undefined;
/** The voice's saved settings with a line's own speed and style over them (read once, only when needed). */
async function settings(d: Delivery): Promise<object | undefined> {
  if (d.speed === undefined && d.style === undefined) return undefined;
  saved ??= (await (await api(`/voices/${voice}/settings`)).json()) as object;
  return { ...saved, ...(d.speed !== undefined && { speed: d.speed }), ...(d.style !== undefined && { style: d.style }) };
}

async function line(l: Line, i: number): Promise<string> {
  const d = (l.delivery && opening) ?? l.delivery ?? {};
  const model = d.model ?? MODEL;
  // eleven_v3 takes direction tags but no neighbouring text.
  const v3 = model === "eleven_v3";
  const previous_text = v3 ? undefined : LINES.slice(Math.max(0, i - 2), i).map(spoken).join(" ") || undefined;
  const next_text = v3 || !LINES[i + 1] ? undefined : spoken(LINES[i + 1]);
  const text = d.tag ? `${d.tag} ${spoken(l)}` : spoken(l);
  const body = { text, model_id: model, voice_settings: v3 ? undefined : await settings(d), previous_text, next_text };
  const take = redo.includes(l.shot) ? `-${Date.now()}` : "";
  const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 10);
  const raw = `${OUT}/vo/${l.shot}-${hash}.mp3`;
  if (!existsSync(raw) || take) {
    console.log(`  recording ${l.shot}: ${l.text}`);
    const res = await api(`/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify(body),
    });
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  }
  const trimmed = `${OUT}/vo/${l.shot}.wav`;
  ff(["-i", raw, "-af", `silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,atempo=${TEMPO}`, "-ar", "44100", "-ac", "1", trimmed]);
  return trimmed;
}

console.log("Narration");
const clips: string[] = [];
for (const [i, l] of LINES.entries()) clips.push(await line(l, i));
for (const [i, l] of LINES.entries()) {
  const len = duration(clips[i]);
  const room = (LINES[i + 1]?.at ?? LENGTH_S) - l.at;
  const flag = len > room - 0.25 ? "  ✗ runs into the next line" : "";
  console.log(`  ${String(l.shot).padStart(2)}  ${l.at.toFixed(2)} s  ${len.toFixed(2)} s of ${room.toFixed(2)}${flag}  ${l.text}`);
}

console.log("Music");
if (!existsSync(MUSIC.file)) fail(`download the track to ${MUSIC.file} (${MUSIC.url})`);
const music = `${OUT}/music.wav`;
const after = LENGTH_S - MUSIC.cutFrom;
ff([
  "-i", MUSIC.file,
  "-filter_complex",
  `[0]atrim=0:${MUSIC.cutFrom},asetpts=N/SR/TB,afade=t=out:st=${MUSIC.cutFrom - 0.03}:d=0.03[a];` +
    `[0]atrim=${MUSIC.cutTo - 0.005}:${MUSIC.cutTo + after},asetpts=N/SR/TB,afade=t=in:d=0.005,` +
    `afade=t=out:st=${after - FADE_S}:d=${FADE_S}[b];[a][b]concat=n=2:v=0:a=1`,
  "-ar", "44100", "-ac", "2", music,
]);

console.log("Mix");
const inputs = clips.flatMap((c) => ["-i", c]);
const delays = LINES.map((l, i) => `[${i + 1}]adelay=${Math.round(l.at * 1000)}:all=1[v${i}]`).join(";");
const voices = LINES.map((_, i) => `[v${i}]`).join("");
const wav = `${OUT}/roughcut.wav`;
ff([
  "-i", music, ...inputs,
  "-filter_complex",
  `${delays};${voices}amix=inputs=${LINES.length}:normalize=0,apad=whole_dur=${LENGTH_S},asplit=2[vo][key];` +
    // Music dips under the voice (sidechain), voice sits on top.
    `[0]volume=0.55[m];[m][key]sidechaincompress=threshold=0.02:ratio=5:attack=60:release=700[duck];` +
    `[duck][vo]amix=inputs=2:normalize=0,atrim=0:${LENGTH_S}`,
  "-ac", "2", wav,
]);
const len = encode(wav, `${OUT}/roughcut.mp3`, { channels: 2, kbps: 192 });
console.log(`✓ ${OUT}/roughcut.mp3 (${len.toFixed(1)} s)`);
