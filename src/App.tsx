import MapView from "./map/MapView";
import Legend from "./ui/Legend";
import InfoPanel from "./ui/InfoPanel";
import TimeSlider from "./ui/TimeSlider";
import SearchBox from "./ui/SearchBox";
import SideNav from "./ui/SideNav";
import TimelinePage from "./timeline/TimelinePage";
import EventsPage from "./events/EventsPage";
import { useView } from "./route";

export default function App() {
  const view = useView();
  return (
    <div className="app" style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* The globe stays mounted under the timeline so its camera and state survive the switch. */}
      <MapView />
      {view === "globe" ? (
        <>
          <Legend />
          <InfoPanel />
          <TimeSlider />
          <SearchBox />
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
