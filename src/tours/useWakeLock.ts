import { useEffect } from "react";

/**
 * Keeps the screen on while `on` (as a video player does): a tour plays itself, so nothing touches
 * the phone and it would otherwise go to sleep mid-tour. Uses the Screen Wake Lock API (Chrome,
 * Edge, Safari 16.4+; needs https or localhost). The browser drops the lock whenever the page is
 * hidden, so it is taken again when the page comes back. Without the API it does nothing.
 */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const take = async () => {
      if (done || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        const l = await navigator.wakeLock.request("screen");
        if (done) l.release().catch(() => {});
        else lock = l;
      } catch {
        /* refused (battery saver, permissions policy): the screen may sleep as usual */
      }
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", take);
      lock?.release().catch(() => {});
    };
  }, [on]);
}
