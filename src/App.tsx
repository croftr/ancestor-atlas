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
      {/* The globe stays mounted under the timeline so its camera and state survive the switch. */}
      <MapView />
      {view === "globe" ? (
        <>
          {/* Small screens stack these in a column (search, legend, card, globe, slider): see index.css. */}
          <SearchBox />
          <Legend />
          <InfoPanel />
          <TimeSlider />
        </>
      ) : view === "timeline" ? (
        <TimelinePage />
      ) : (
        <EventsPage />
      )}
      <SideNav />
    </div>
  );
}
