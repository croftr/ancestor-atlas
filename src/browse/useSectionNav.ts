import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Chips that jump to a page's sections (`data-section` on each) and follow the scroll: the chip of the section at the
 * top of the page, under the pinned bar, is the active one, kept in view in its sideways-scrolling row (`data-chip`).
 * Used by the Cultures (stages) and Species (eras) pages; `deps` are what changes which sections are on the page.
 */
export function useSectionNav(pageRef: RefObject<HTMLElement | null>, deps: unknown[]) {
  const barRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 48;
      const sections = page.querySelectorAll<HTMLElement>("[data-section]");
      let current: string | null = null;
      for (const sec of sections) if (sec.getBoundingClientRect().top <= line) current = sec.dataset.section!;
      // At the very bottom the last section may never reach the line: light it anyway.
      if (page.scrollTop + page.clientHeight >= page.scrollHeight - 4) current = sections[sections.length - 1]?.dataset.section ?? current;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    page.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      page.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, deps);

  // Keep the lit chip in view in its row (without moving the page).
  useEffect(() => {
    const row = chipsRef.current;
    const chip = active ? row?.querySelector<HTMLElement>(`[data-chip="${CSS.escape(active)}"]`) : null;
    if (!row || !chip) return;
    const left = chip.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth - 28) {
      row.scrollTo({ left: Math.max(0, left - 24), behavior: "smooth" });
    }
  }, [active]);

  /** Scroll the page so a section starts just under the pinned bar. */
  const jump = (id: string) => {
    const page = pageRef.current;
    const sec = page?.querySelector<HTMLElement>(`[data-section="${CSS.escape(id)}"]`);
    if (!page || !sec) return;
    const top = page.scrollTop + sec.getBoundingClientRect().top - page.getBoundingClientRect().top - (barRef.current?.offsetHeight ?? 0) - 12;
    page.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return { barRef, chipsRef, active, jump };
}
