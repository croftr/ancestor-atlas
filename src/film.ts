import { useStore } from "./store";

/**
 * Filming the promo video: scripts/promo/film.ts opens the app with "?film" and drives it from shot scripts,
 * which reach the store and the map through window (the map is added by MapView). Nothing else changes.
 */
export const FILM = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("film");

if (FILM) Object.assign(window, { __atlas: useStore });
