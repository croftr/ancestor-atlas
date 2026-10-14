import type { Entity, ExtraImage } from "../types";

/** One picture an entity can show: the main one (index 0) or one of its `extra_images`. */
export interface Picture {
  url: string;
  credit?: string;
  caption?: string;
  source?: string;
}

/**
 * The main picture then the extras, in order. The main picture is the entity's own, else its shared
 * stand-in; a civilization shown with its group's picture has none here (the card finds the group's),
 * so the list then starts with the extras.
 */
export function entityPictures(entity: Entity): Picture[] {
  const main = entity.image_url
    ? { url: entity.image_url, credit: entity.image_credit }
    : entity.fallback_image
      ? { url: entity.fallback_image.url, credit: entity.fallback_image.credit }
      : undefined;
  return [...(main ? [main] : []), ...(entity.extra_images ?? [])];
}

/**
 * When each picture starts, in ms after the card opens: the main one at 0, an extra at its `at`;
 * extras without an `at` are spread evenly between the timed pictures around them (or the end of
 * the hold). With no `at` anywhere, the main picture and the extras share the hold evenly.
 */
export function pictureTimes(extras: ExtraImage[], holdMs: number): number[] {
  const times: (number | undefined)[] = [0, ...extras.map((x) => (x.at === undefined ? undefined : x.at * 1000))];
  let prev = 0;
  for (let i = 1; i < times.length; i++) {
    if (times[i] !== undefined) {
      prev = i;
      continue;
    }
    let next = i;
    while (next < times.length && times[next] === undefined) next++;
    const from = times[prev]!;
    const to = next < times.length ? times[next]! : Math.max(from, holdMs);
    const step = (to - from) / (next - prev);
    for (let j = i; j < next; j++) times[j] = from + step * (j - prev);
    prev = next;
    i = next;
  }
  return times as number[];
}

/** Which picture (0 = main) shows `elapsedMs` into a hold of `holdMs`. */
export function pictureIndexAt(extras: ExtraImage[] | undefined, elapsedMs: number, holdMs: number): number {
  if (!extras?.length) return 0;
  const times = pictureTimes(extras, holdMs);
  let index = 0;
  for (let i = 1; i < times.length; i++) if (elapsedMs >= times[i]) index = i;
  return index;
}

/** Fetches the extras ahead of time, so a switch mid-narration shows at once. */
export function preloadPictures(entity: Entity | undefined) {
  for (const x of entity?.extra_images ?? []) {
    const img = new Image();
    img.src = x.url;
  }
}

/**
 * The picture a card should show for `entity`, given the store's `tour.picture`: one of its extras
 * while a tour holds on it and has moved past the main picture, else undefined (show the main picture
 * as usual). For now extras show only in tours; a picture stepper on the card could use
 * `entityPictures` too.
 */
export function tourPictureFor(entity: Entity, current: { entity: string; index: number } | undefined): Picture | undefined {
  if (!current || current.entity !== entity.id || current.index === 0) return undefined;
  // Index 0 is whatever main picture the card shows (own, group's or stand-in); then the extras.
  return entity.extra_images?.[current.index - 1];
}
