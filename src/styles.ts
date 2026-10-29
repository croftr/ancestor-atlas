// Every stylesheet, in cascade order: later files win over earlier ones at equal specificity. Kept in one
// list rather than imported by each component because the pages load lazily (App.tsx) and the bundler
// would otherwise order the CSS by chunk, not by import. ui/stacked.css (the small-screen layout) must
// stay last. A new stylesheet goes here; styles.test.ts fails if a component imports one itself.
import "maplibre-gl/dist/maplibre-gl.css";
import "./index.css";
import "./dna/dna.css";
import "./ui/events.css";
import "./audio/listen.css";
import "./events/events-page.css";
import "./ui/card.css";
import "./ui/picture-viewer.css";
import "./ui/card-resizer.css";
import "./ui/sidenav.css";
import "./browse/browse.css";
import "./tours/tours-page.css";
import "./region/place.css";
import "./tours/tours.css";
import "./ui/page-tabs.css";
import "./ui/intro-modal.css";
import "./updates/updates.css";
import "./news/news.css";
import "./timeline/timeline.css";
import "./browse/family-tree.css";
import "./browse/species-compare.css";
import "./ui/stacked.css";
