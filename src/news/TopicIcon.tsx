import { CATEGORY_PATH } from "../ui/CategoryIcon";
import { DnaIcon } from "../dna/DnaIcon";
import type { NewsTopic } from "./types";

/** An hourglass with sand run into the lower bulb: dating and methods. Line drawing on a 24×24 grid. */
const Hourglass = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path strokeWidth={2.2} d="M5.5 2.5h13M5.5 21.5h13" />
    <path strokeWidth={1.9} d="M7.5 2.5c0 5.5 4.5 6 4.5 9.5s-4.5 4-4.5 9.5M16.5 2.5c0 5.5-4.5 6-4.5 9.5s4.5 4 4.5 9.5" />
    <path fill="currentColor" stroke="none" d="M8.6 20.6c.4-2.3 2-3.4 3.4-3.9 1.4.5 3 1.6 3.4 3.9z" />
    <path fill="currentColor" stroke="none" opacity={0.7} d="M10 7.2h4c-.6.9-1.3 1.5-2 2-.7-.5-1.4-1.1-2-2z" />
  </svg>
);

const Solid = ({ d, size }: { d: string; size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
    <path fillRule="evenodd" d={d} />
  </svg>
);

/**
 * One icon per news topic. Three reuse the category silhouettes (an early human's head, a Neolithic pot, a temple
 * front) so a topic reads like the atlas pages it belongs with; ancient DNA uses the DNA layer's helix.
 */
export function TopicIcon({ topic, size = 20 }: { topic: NewsTopic; size?: number }) {
  switch (topic) {
    case "hominins":
      return <Solid d={CATEGORY_PATH.species} size={size} />;
    case "dna":
      return <DnaIcon size={size} />;
    case "cultures":
      return <Solid d={CATEGORY_PATH.culture} size={size} />;
    case "civilizations":
      return <Solid d={CATEGORY_PATH.civilization} size={size} />;
    case "methods":
      return <Hourglass size={size} />;
  }
}

/** The topic as a rounded tile in its colour (set by the `topic-*` class's `--t`). */
export const TopicTile = ({ topic, size = 40 }: { topic: NewsTopic; size?: number }) => (
  <span className={`nw-tile topic-${topic}`} style={{ width: size, height: size }} aria-hidden>
    <TopicIcon topic={topic} size={Math.round(size * 0.56)} />
  </span>
);
