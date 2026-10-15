import { describe, expect, it } from "vitest";
import { entityPictures, pictureIndexAt, pictureTimes, tourPictureFor } from "./tourPicture";
import type { Entity } from "../types";

const x = (at?: number) => ({ url: "/images/x.webp", credit: "c", at });

describe("pictureTimes", () => {
  it("shares the hold evenly when nothing is timed", () => {
    expect(pictureTimes([x()], 20_000)).toEqual([0, 10_000]);
    expect(pictureTimes([x(), x()], 30_000)).toEqual([0, 10_000, 20_000]);
  });
  it("uses `at` (seconds) and spreads untimed pictures around it", () => {
    expect(pictureTimes([x(4), x(12)], 30_000)).toEqual([0, 4_000, 12_000]);
    expect(pictureTimes([x(), x(10)], 30_000)).toEqual([0, 5_000, 10_000]);
    expect(pictureTimes([x(10), x()], 30_000)).toEqual([0, 10_000, 20_000]);
  });
});

describe("pictureIndexAt", () => {
  it("is the main picture without extras", () => expect(pictureIndexAt(undefined, 50_000, 20_000)).toBe(0));
  it("moves on at each start time", () => {
    const extras = [x(), x(8)];
    expect(pictureIndexAt(extras, 0, 20_000)).toBe(0);
    expect(pictureIndexAt(extras, 3_999, 20_000)).toBe(0);
    expect(pictureIndexAt(extras, 4_000, 20_000)).toBe(1);
    expect(pictureIndexAt(extras, 9_000, 20_000)).toBe(2);
  });
});

describe("tourPictureFor", () => {
  const extras = [{ url: "/a.webp", credit: "a" }, { url: "/b.webp", credit: "b" }];
  const civ = { id: "c", extra_images: extras } as unknown as Entity; // no picture of its own (shows its group's)
  it("shows the main picture at index 0", () => expect(tourPictureFor(civ, { entity: "c", index: 0 })).toBeUndefined());
  it("finds extras even without an own picture", () => {
    expect(tourPictureFor(civ, { entity: "c", index: 1 })?.url).toBe("/a.webp");
    expect(tourPictureFor(civ, { entity: "c", index: 2 })?.url).toBe("/b.webp");
  });
  it("ignores another entity's stop", () => expect(tourPictureFor(civ, { entity: "x", index: 1 })).toBeUndefined());
});

describe("entityPictures", () => {
  const extras = [{ url: "/extra1.webp", credit: "e1" }, { url: "/extra2.webp", credit: "e2" }];

  it("includes own image and extras", () => {
    const e = { id: "e", image_url: "/main.webp", image_credit: "mc", extra_images: extras } as unknown as Entity;
    const pics = entityPictures(e);
    expect(pics).toHaveLength(3);
    expect(pics[0]).toEqual({ url: "/main.webp", credit: "mc" });
    expect(pics[1]).toEqual(extras[0]);
    expect(pics[2]).toEqual(extras[1]);
  });

  it("inherits parent image for civilization without own image", () => {
    const parent = { id: "p", name: "Parent", image_url: "/p.webp", image_credit: "pc" } as unknown as Entity;
    const civ = { id: "c", extra_images: extras } as unknown as Entity;
    const pics = entityPictures(civ, parent);
    expect(pics).toHaveLength(3);
    expect(pics[0]).toEqual({ url: "/p.webp", credit: "pc", caption: "Shows Parent as a whole" });
    expect(pics[1]).toEqual(extras[0]);
    expect(pics[2]).toEqual(extras[1]);
  });

  it("uses fallback_image when no own or parent image", () => {
    const cult = { id: "cu", fallback_image: { url: "/f.webp", credit: "fc", label: "Early" }, extra_images: extras } as unknown as Entity;
    const pics = entityPictures(cult);
    expect(pics).toHaveLength(3);
    expect(pics[0]).toEqual({ url: "/f.webp", credit: "fc", caption: "Shows Early" });
    expect(pics[1]).toEqual(extras[0]);
  });

  it("returns single picture when no extras", () => {
    const e = { id: "e", image_url: "/main.webp", image_credit: "mc" } as unknown as Entity;
    expect(entityPictures(e)).toEqual([{ url: "/main.webp", credit: "mc" }]);
  });

  it("returns empty when no image and no extras", () => {
    const e = { id: "e" } as unknown as Entity;
    expect(entityPictures(e)).toEqual([]);
  });
});
