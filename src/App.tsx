import MapView from "./map/MapView";
import Legend from "./ui/Legend";
import InfoPanel from "./ui/InfoPanel";
import TimeSlider from "./ui/TimeSlider";
import SettingsPanel from "./ui/SettingsPanel";
import SearchBox from "./ui/SearchBox";
import TimelinePage from "./timeline/TimelinePage";
import { navigate, useView } from "./route";

export default function App() {
  const view = useView();
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* The globe stays mounted under the timeline so its camera and state survive the switch. */}
      <MapView />
      {view === "globe" ? (
        <>
          <Legend />
          <InfoPanel />
          <TimeSlider />
          <SettingsPanel />
          <SearchBox />
          <button
            className="view-switch panel"
            onClick={() => navigate("timeline")}
            title="Timeline of all species, cultures and civilizations"
            aria-label="Open timeline"
          >
            ☰
          </button>
        </>
      ) : (
        <TimelinePage />
      )}
    </div>
  );
}
