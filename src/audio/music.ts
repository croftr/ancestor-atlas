import { useSyncExternalStore } from "react";
import { mediaUrl } from "../config";
import { narrationState, subscribeNarration } from "./narration";

/**
 * A tour's background music: loops, fades in and out, and dips while narration speaks. Mixed through
 * Web Audio (a gain node), since iOS ignores an element's volume; the bucket allows cross-origin
 * reads, which that needs. Falls back to the element's volume where Web Audio is missing.
 */
const LEVEL = 0.35; // music under the tour, relative to narration (both mastered to -16 LUFS)
const DUCKED = 0.1; // while narration plays
const FADE_IN = 2.5;
const FADE_OUT = 1.5;
const DUCK = 0.6;

const MUTE_KEY = "history-globe.tour-music-muted";
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
})();
const muteListeners = new Set<() => void>();

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let audio: HTMLAudioElement | null = null;
let src: string | null = null;
let stopTimer = 0;

const target = () => (muted || !src ? 0 : narrationState().playing ? DUCKED : LEVEL);

function ramp(to: number, seconds: number) {
  if (gain && ctx) {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(to, now + seconds);
  } else if (audio) audio.volume = to; // no Web Audio: no fade
}

/** Call from a tap (starting a tour), so the music may start later without one. */
export function primeMusic() {
  if (ctx || typeof AudioContext === "undefined") return;
  ctx = new AudioContext();
  gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
}

export function startMusic(key: string) {
  window.clearTimeout(stopTimer);
  if (src === key && audio) return resumeMusic();
  stopNow();
  src = key;
  audio = new Audio();
  audio.crossOrigin = "anonymous"; // Web Audio needs a CORS-clean source, or it outputs silence
  audio.loop = true;
  audio.preload = "auto";
  audio.src = mediaUrl(key);
  if (ctx && gain) ctx.createMediaElementSource(audio).connect(gain);
  else audio.volume = 0;
  resumeMusic();
}

export function resumeMusic() {
  if (!audio) return;
  window.clearTimeout(stopTimer);
  ctx?.resume().catch(() => {});
  audio.play().catch(() => {}); // blocked without a tap: stays silent
  ramp(target(), FADE_IN);
}

export function pauseMusic() {
  if (!audio) return;
  ramp(0, DUCK);
  const a = audio;
  window.clearTimeout(stopTimer);
  stopTimer = window.setTimeout(() => a.pause(), DUCK * 1000);
}

/** Fade out and let go of the track. */
export function stopMusic() {
  if (!audio) return;
  ramp(0, FADE_OUT);
  window.clearTimeout(stopTimer);
  stopTimer = window.setTimeout(stopNow, FADE_OUT * 1000);
}

function stopNow() {
  audio?.pause();
  audio?.removeAttribute("src");
  audio = null;
  src = null;
}

export function setMusicMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
  ramp(target(), DUCK);
  muteListeners.forEach((l) => l());
}

export const useMusicMuted = () =>
  useSyncExternalStore(
    (l) => {
      muteListeners.add(l);
      return () => muteListeners.delete(l);
    },
    () => muted,
  );

// Dip under narration, and come back up when it stops.
let speaking = false;
subscribeNarration(() => {
  const now = narrationState().playing;
  if (now === speaking) return;
  speaking = now;
  if (audio && !audio.paused) ramp(target(), DUCK);
});
