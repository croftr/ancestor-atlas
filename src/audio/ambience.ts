import { mediaUrl } from "../config";
import { audioContext, musicMuted, subscribeMusicMuted } from "./music";
import { narrationState, subscribeNarration } from "./narration";

/**
 * A tour stop's ambient sound (tours/ambience.ts): a short burst under the narration, not a bed under
 * all of it. It comes in DELAY seconds after the card opens (the narration starts with the card), swells
 * for about HOLD seconds and fades away. The clock stops while the tour or the Listen button is paused,
 * so the burst keeps its place in the narration. Decoded into a buffer and played by Web Audio, on the
 * music's audio context, so it needs the same tap to start. In a tour the music button mutes it too;
 * under a Listen button (no music button there) it always plays. Without Web Audio it stays silent.
 */
const LEVEL = 0.5; // without narration, relative to full volume (mastered to -16 LUFS like the voice)
const DUCKED = 0.24; // while narration plays: about 12 dB under the voice
const DELAY = 2; // seconds after the card opens
const FADE_IN = 0.8;
const HOLD = 4.2; // at full level, between the fades
const FADE_OUT = 1.5;
const DUCK = 0.6;
const TICK_MS = 100;

const buffers = new Map<string, Promise<AudioBuffer | null>>();
function load(key: string): Promise<AudioBuffer | null> {
  const ctx = audioContext();
  if (!ctx) return Promise.resolve(null);
  let p = buffers.get(key);
  if (!p) {
    p = fetch(mediaUrl(key))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => {
        buffers.delete(key); // try again next time
        return null;
      });
    buffers.set(key, p);
  }
  return p;
}

let current: {
  key: string;
  gain: GainNode;
  source?: AudioBufferSourceNode;
  muteable: boolean;
  timer: number;
} | null = null;
let paused = false;

const target = () => ((current?.muteable && musicMuted()) || paused ? 0 : narrationState().playing ? DUCKED : LEVEL);

function ramp(gain: GainNode, to: number, seconds: number) {
  const ctx = audioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(to, now + seconds);
}

/** Fetch and decode a sound ahead of its stop. */
export function preloadAmbience(key: string) {
  load(key);
}

/**
 * Start a stop's sound burst (fading out any other); the same one again carries on. `muteable`: the
 * tour's music button mutes it (in a tour; not under a Listen button, which has no such button).
 */
export function startAmbience(key: string, { muteable = true } = {}) {
  const ctx = audioContext();
  if (!ctx || current?.key === key) return;
  stopAmbience();
  ctx.resume().catch(() => {});
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  let buffer: AudioBuffer | null = null;
  load(key).then((b) => (buffer = b));
  // Seconds since the card opened, not counting pauses.
  let elapsed = 0;
  const playing: NonNullable<typeof current> = {
    key,
    gain,
    muteable,
    timer: window.setInterval(() => {
      if (current !== playing) return window.clearInterval(playing.timer);
      if (!paused) elapsed += TICK_MS / 1000;
      if (elapsed >= DELAY + FADE_IN + HOLD) return stopAmbience(FADE_OUT);
      if (playing.source || !buffer || elapsed < DELAY) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      // Start somewhere along the loop, so a sound heard twice in a tour doesn't open the same way.
      source.start(0, Math.random() * buffer.duration);
      playing.source = source;
      ramp(gain, target(), FADE_IN);
    }, TICK_MS),
  };
  current = playing;
}

/** Fade the sound out and let it go. */
export function stopAmbience(seconds = FADE_OUT) {
  const c = current;
  current = null;
  if (!c) return;
  window.clearInterval(c.timer);
  ramp(c.gain, 0, seconds);
  window.setTimeout(() => {
    c.source?.stop();
    c.gain.disconnect();
  }, seconds * 1000 + 100);
}

/** The tour paused or resumed: the sound fades down or back (it keeps its place). */
export function pauseAmbience(p: boolean) {
  paused = p;
  if (current?.source) ramp(current.gain, target(), DUCK);
}

// Dip under narration, and follow the music button.
const follow = () => current?.source && ramp(current.gain, target(), DUCK);
let speaking = false;
subscribeNarration(() => {
  if (narrationState().playing === speaking) return;
  speaking = narrationState().playing;
  follow();
});
subscribeMusicMuted(follow);
