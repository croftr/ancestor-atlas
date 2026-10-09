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
