import { lazy, Suspense, useEffect, type CSSProperties } from "react";
import MapView from "./map/MapView";
import Legend from "./ui/Legend";
import InfoPanel from "./ui/InfoPanel";
import DnaCard from "./dna/DnaCard";
import PlaceCard from "./region/PlaceCard";
import TimeSlider from "./ui/TimeSlider";
import SearchBox from "./ui/SearchBox";
import SideNav from "./ui/SideNav";
import PageTabs from "./ui/PageTabs";
import WelcomeHint from "./ui/WelcomeHint";
import TourPlayer from "./tours/TourPlayer";
import ClimateHud from "./tours/ClimateHud";
import TourFinale from "./tours/TourFinale";
import ErrorBoundary from "./ui/ErrorBoundary";
import { useHash, useView } from "./route";
import { useStore } from "./store";
import { readTourHash, useGlobeLink } from "./globeLink";
import { usePageTitle } from "./pageTitle";

// The pages and the intro dialog load when first opened, so a visit to the globe downloads only the
// globe (their stylesheets are in styles.ts with the rest).
const ToursPage = lazy(() => import("./tours/ToursPage"));
const UpdatesPage = lazy(() => import("./updates/UpdatesPage"));
const NewsPage = lazy(() => import("./news/NewsPage"));
const TimelinePage = lazy(() => import("./timeline/TimelinePage"));
const EventsPage = lazy(() => import("./events/EventsPage"));
const CulturesPage = lazy(() => import("./browse/CulturesPage"));
const SpeciesPage = lazy(() => import("./browse/SpeciesPage"));
const CivilizationsPage = lazy(() => import("./browse/CivilizationsPage"));
const IntroModal = lazy(() => import("./ui/IntroModal"));

export default function App() {
  const view = useView();
  const hash = useHash();
  useGlobeLink(view);
  usePageTitle();
  const introOpen = useStore((s) => s.introOpen);
  const setIntroOpen = useStore((s) => s.setIntroOpen);

  useEffect(() => {
    const onHash = () => {
      if (/^#\/?(intro|about)$/i.test(window.location.hash)) {
        setIntroOpen(true);
      }
      const tour = readTourHash(window.location.hash);
      if (tour && useStore.getState().tour?.id !== tour) useStore.getState().startTour(tour, { gate: true });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [setIntroOpen]);

  // An open info card on the globe: the time slider narrows so the two never overlap.
  const hasCard = useStore((s) => s.selectedId !== null || s.groupId !== null || s.dnaSite !== null || s.place !== null || s.tour?.note === true);
  const touring = useStore((s) => s.tour !== null);
  // Another card (or none) clears a card that failed to render.
  const cardKey = useStore((s) => `${s.selectedId}|${s.groupId}|${s.dnaSite}|${s.place ? `${s.place.lon},${s.place.lat}` : ""}`);
  // The card's width as dragged (desktop); the CSS clamps it to the window (ui/sidenav.css).
  const cardWidth = useStore((s) => s.cardWidth);
  return (
    <div
      className={`app view-${view}${view === "globe" && hasCard ? " has-card" : ""}${touring ? " touring" : ""}`}
      style={cardWidth ? ({ "--card-user-w": `${cardWidth}px` } as CSSProperties) : undefined}
    >
      {/* Keyboard and screen-reader users can't reach the globe's markers: the first Tab stop offers
          the pages that list the same things (hidden until focused). */}
      <nav className="skip-links" aria-label="Skip to lists">
        <a href="#/species">Species list</a>
        <a href="#/cultures">Cultures list</a>
        <a href="#/civilizations">Civilizations list</a>
        <a href="#/events">Events list</a>
        <a href="#/tours">Guided tours</a>
      </nav>
      {/* Small screens stack the globe page in a scrolling column (search, legend, card, globe,
          slider): see ui/stacked.css. Elsewhere the wrapper is display: contents. */}
      <div className="globe-page">
        {/* The globe stays mounted under the timeline so its camera and state survive the switch. */}
        <MapView />
        {view === "globe" && (
          <>
            <SearchBox />
            <ClimateHud />
            <Legend />
            <ErrorBoundary what="This card" resetKey={cardKey} className="info-panel" onClose={() => useStore.getState().select(null)}>
              <InfoPanel />
              <DnaCard />
              <PlaceCard />
            </ErrorBoundary>
            <TimeSlider />
            <WelcomeHint />
            <TourPlayer />
            <TourFinale />
          </>
        )}
      </div>
      {view !== "globe" && (
        // Keyed on the address, so opening another page or entry tries again after a failure.
        <ErrorBoundary what="This page" resetKey={hash} className="page-error">
          <Suspense fallback={<div className="events-page"><div className="ev-loading muted">Loading…</div></div>}>
            {view === "timeline" && <TimelinePage />}
            {view === "events" && <EventsPage />}
            {view === "species" && <SpeciesPage />}
            {view === "cultures" && <CulturesPage />}
            {view === "civilizations" && <CivilizationsPage />}
            {view === "tours" && <ToursPage />}
            {view === "news" && <NewsPage />}
            {view === "updates" && <UpdatesPage />}
          </Suspense>
        </ErrorBoundary>
      )}
      <PageTabs />
      <SideNav />
      {introOpen && (
        <Suspense fallback={null}>
          <IntroModal />
        </Suspense>
      )}
    </div>
  );
}
