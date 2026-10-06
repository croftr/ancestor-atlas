import MapView from "./map/MapView";
import Legend from "./ui/Legend";
import InfoPanel from "./ui/InfoPanel";
import TimeSlider from "./ui/TimeSlider";
import SettingsPanel from "./ui/SettingsPanel";

export default function App() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <MapView />
      <Legend />
      <InfoPanel />
      <TimeSlider />
      <SettingsPanel />
    </div>
  );
}
