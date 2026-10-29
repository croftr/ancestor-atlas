import { useStore } from "./store";
import { getData } from "./map/data";
import { globeHash, globeUrl } from "./globeLink";

/**
 * Share links go through the entity's or tour's share page (/s/<id>, written by scripts/share-pages.ts
 * at build time), so link previews show that entity's own title, text and picture; the page then opens
 * the hash the link carries. The dev server has no share pages, so there the plain app link is used.
 */
const sharePage = (path: string, hash: string) =>
  import.meta.env.PROD ? `${window.location.origin}/s/${path}${hash}` : `${window.location.origin}/${hash}`;

/** The globe as it is now (year and open card), through the open entity's share page. */
export function globeShareUrl(): string {
  const s = useStore.getState();
  const entity = s.selectedId ? getData()?.featureById.get(s.selectedId)?.entity_id : s.groupId;
  return entity ? sharePage(encodeURIComponent(entity), globeHash(s)) : globeUrl();
}

export const tourShareUrl = (id: string) => sharePage(`tour/${encodeURIComponent(id)}`, "");

/** The phone's share sheet where there is one, else copy the link. True when the link was copied. */
export async function shareLink(title: string, url: string): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({ title: `${title} · Ancestor Atlas`, url });
      return false;
    }
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false; // share sheet dismissed, or clipboard unavailable
  }
}
