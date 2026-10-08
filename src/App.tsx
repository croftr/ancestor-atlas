import MapView from "./map/MapView";
import Legend from "./ui/Legend";
import InfoPanel from "./ui/InfoPanel";
import TimeSlider from "./ui/TimeSlider";
import SearchBox from "./ui/SearchBox";
import SideNav from "./ui/SideNav";
import TimelinePage from "./timeline/TimelinePage";
import EventsPage from "./events/EventsPage";
import { useView } from "./route";
import { useStore } from "./store";
// Last, so the small-screen layout overrides the component styles above.
import "./ui/stacked.css";

export default function App() {
  const view = useView();
  // An open info card on the globe: the time slider narrows so the two never overlap.
  const hasCard = useStore((s) => s.selectedId !== null || s.groupId !== null);
  return (
    <div className={`app view-${view}${view === "globe" && hasCard ? " has-card" : ""}`}>
      {/* Small screens stack the globe page in a scrolling column (search, legend, card, globe,
          slider): see ui/stacked.css. Elsewhere the wrapper is display: contents. */}
      <div className="globe-page">
        {/* The globe stays mounted under the timeline so its camera and state survive the switch. */}
        <MapView />
        {view === "globe" && (
          <>
            <SearchBox />
            <Legend />
            <InfoPanel />
            <TimeSlider />
          </>
        )}
      </div>
      {view === "globe" ? null : view === "timeline" ? (
        <TimelinePage />
      ) : (
        <EventsPage />
      )}
      <SideNav />
    </div>
  );
}
