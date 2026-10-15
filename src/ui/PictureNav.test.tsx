import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PictureNav, creditLine } from "./PictureNav";

describe("PictureNav", () => {
  it("renders nothing when count is 0 or 1", () => {
    expect(renderToStaticMarkup(<PictureNav count={0} current={0} onPrev={() => {}} onNext={() => {}} />)).toBe("");
    expect(renderToStaticMarkup(<PictureNav count={1} current={0} onPrev={() => {}} onNext={() => {}} />)).toBe("");
  });

  it("renders prev and next arrow buttons and dots when count > 1", () => {
    const html = renderToStaticMarkup(<PictureNav count={3} current={1} onPrev={() => {}} onNext={() => {}} />);
    expect(html).toContain("pic-nav-prev");
    expect(html).toContain("pic-nav-next");
    expect(html).toContain("aria-label=\"Previous picture\"");
    expect(html).toContain("aria-label=\"Next picture\"");
    expect(html).toContain("pic-dots");
    // Should have 3 dots
    const dots = html.match(/\bpic-dot\b/g);
    expect(dots).toHaveLength(3);
    // Dot at current index 1 should be active
    expect(html).toContain("pic-dot active");
    expect(html).toContain("aria-label=\"Picture 2 of 3\"");
  });
});

describe("creditLine", () => {
  it("renders credit alone when no note or source", () => {
    expect(renderToStaticMarkup(<>{creditLine("Photo by Alice", undefined, undefined)}</>)).toBe("Photo by Alice");
  });

  it("links credit when source is provided", () => {
    const html = renderToStaticMarkup(<>{creditLine("Photo by Alice", undefined, "https://example.com")}</>);
    expect(html).toContain("<a href=\"https://example.com\" target=\"_blank\" rel=\"noopener noreferrer\">Photo by Alice</a>");
  });

  it("appends note with separator", () => {
    const html = renderToStaticMarkup(<>{creditLine("Photo by Alice", "Front view", undefined)}</>);
    expect(html).toBe("Photo by Alice · Front view");
  });
});
