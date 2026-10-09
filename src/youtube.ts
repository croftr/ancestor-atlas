// No imports: also used by scripts/validate-data.ts under Node.
/** The video id of a YouTube link (watch, youtu.be, embed or shorts), or null for any other src. */
export const youtubeId = (src: string): string | null => {
  const m = src.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};


/** A media count for lists and links, e.g. "▶ 2 videos". */
// U+FE0E keeps ▶ as a text glyph (Android draws it as an emoji otherwise).
export const videoCount = (n: number): string => `▶\uFE0E ${n} video${n === 1 ? "" : "s"}`;
