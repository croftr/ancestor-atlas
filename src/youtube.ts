// No imports: also used by scripts/validate-data.ts under Node.
/** The video id of a YouTube link (watch, youtu.be, embed or shorts), or null for any other src. */
export const youtubeId = (src: string): string | null => {
  const m = src.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

