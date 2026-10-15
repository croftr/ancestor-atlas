import { BASEMAP_THEMES } from "../config";
import { useStore } from "../store";

/** The keyboard shortcuts the app already listens for (TimeSlider, InfoPanel, SearchBox). */
const SHORTCUTS: [keys: string[], what: string][] = [
  [["←", "→"], "Step back / forward in time"],
  [["Space"], "Play / pause"],
  [["[", "]"], "Previous / next site of the open card"],
  [["/"], "Search"],
  [["Esc"], "Close the card"],
];

/** Settings shown in the side navigation's Settings flyout. */
export default function SettingsContent() {
  // Keyboard shortcuts are left out on touch-only devices (phones, tablets without a mouse).
  const touchOnly = !!window.matchMedia?.("(pointer: coarse)").matches && !window.matchMedia?.("(any-pointer: fine)").matches;
  const hasKeyboard = !touchOnly;

  const basemap = useStore((s) => s.basemap);
  const setBasemap = useStore((s) => s.setBasemap);
  const paleo = useStore((s) => s.paleo);
  const setPaleo = useStore((s) => s.setPaleo);
  const routes = useStore((s) => s.routes);
  const setRoutes = useStore((s) => s.setRoutes);

  return (
    <div className="settings-group">
      <div className="settings-label">Globe theme</div>
      <div className="theme-options">
        {Object.entries(BASEMAP_THEMES).map(([key, t]) => (
          <button
            key={key}
            className={`theme-option${key === basemap ? " active" : ""}`}
            onClick={() => setBasemap(key)}
            aria-pressed={key === basemap}
          >
            <span className="swatch" style={{ background: t.bg }}>
              <span style={{ background: t.fill, borderColor: t.line }} />
            </span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="settings-label">On the globe</div>
      <label className="settings-check">
        <input type="checkbox" checked={paleo} onChange={(e) => setPaleo(e.target.checked)} />
        <span>
          Coastlines and ice sheets of the time
          <span className="muted">Sea level for the last 800,000 years; ice sheets for the last 80,000.</span>
        </span>
      </label>
      <label className="settings-check">
        <input type="checkbox" checked={routes} onChange={(e) => setRoutes(e.target.checked)} />
        <span>
          Migration routes
          <span className="muted">How modern humans spread out of Africa, drawn as the time slider passes each site.</span>
        </span>
      </label>
      {hasKeyboard && (
        <>
          <div className="settings-label">Keyboard shortcuts</div>
          <dl className="shortcuts">
            {SHORTCUTS.map(([keys, what]) => (
              <div key={what}>
                <dt>
                  {keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}
