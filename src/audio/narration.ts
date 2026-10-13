import { useSyncExternalStore } from "react";
import { mediaUrl } from "../config";

/**
 * One shared player for narration, so only one voice plays at a time (a Listen button, or a tour).
 * A single element, reused for every clip: iOS only lets audio play from an element first played in a tap.
 */
export interface NarrationState {
  /** Bucket key of the clip loaded, if any. */
  src: string | null;
  playing: boolean;
  ended: boolean;
  failed: boolean;
  time: number;
  duration: number;
}

let state: NarrationState = { src: null, playing: false, ended: false, failed: false, time: 0, duration: 0 };
const listeners = new Set<() => void>();
const update = (p: Partial<NarrationState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};

let audio: HTMLAudioElement | null = null;
function el(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = "auto";
  audio.addEventListener("play", () => update({ playing: true, ended: false }));
  audio.addEventListener("pause", () => update({ playing: false }));
  audio.addEventListener("ended", () => update({ playing: false, ended: true }));
  audio.addEventListener("timeupdate", () => update({ time: audio!.currentTime }));
  audio.addEventListener("loadedmetadata", () => update({ duration: audio!.duration }));
  audio.addEventListener("error", () => update({ playing: false, failed: true }));
  return audio;
}

/** Play a clip from the start. Resolves with its length in seconds once it is playing. */
export function playNarration(src: string): Promise<number> {
  const a = el();
  const url = mediaUrl(src);
  if (state.src !== src) {
    a.src = url;
    update({ src, time: 0, duration: 0, failed: false, ended: false });
  } else {
    a.currentTime = 0;
    update({ failed: false, ended: false });
  }
  const meta =
    a.readyState >= 1
      ? Promise.resolve(a.duration)
      : new Promise<number>((resolve, reject) => {
          a.addEventListener("loadedmetadata", () => resolve(a.duration), { once: true });
          a.addEventListener("error", () => reject(a.error), { once: true });
        });
  return a.play().then(() => meta);
}

/** The player's state now (outside React). */
export const narrationState = () => state;

export const pauseNarration = () => audio?.pause();
export function resumeNarration() {
  if (audio && state.src && !state.ended && !state.failed) audio.play().catch(() => {});
}
export function stopNarration() {
  audio?.pause();
  if (state.src) update({ playing: false, time: 0, ended: true }); // not resumable
  if (audio) audio.currentTime = 0;
}

/** Warm the browser cache for a clip about to play (the next tour stop). */
export function preloadNarration(src: string) {
  const a = new Audio();
  a.preload = "auto";
  a.src = mediaUrl(src);
}

export function subscribeNarration(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const useNarration = () => useSyncExternalStore(subscribeNarration, () => state);

/**
 * Call from a tap (starting a tour): lets the shared element play later without one (iOS and others
 * only allow audio that was first started from a tap). Plays a moment of silence.
 */
export function primeNarration() {
  const a = el();
  if (state.src) return;
  a.src = silence();
  a.play().then(() => a.pause(), () => {});
}

/** 0.1 s of silent 8 kHz, 8-bit mono WAV (silence is the midpoint, 128). */
function silence(): string {
  const n = 800;
  const b = new Uint8Array(44 + n).fill(128, 44);
  const v = new DataView(b.buffer);
  const str = (o: number, t: string) => [...t].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, "data");
  v.setUint32(40, n, true);
  return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
}
