import { BASEMAP_THEMES } from "../config";
import { useStore } from "../store";

/** Settings shown in the side navigation's Settings flyout. */
export default function SettingsContent() {
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
    </div>
  );
}
