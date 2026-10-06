import { useState } from "react";
import { BASEMAP_THEMES } from "../config";
import { useStore } from "../store";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const basemap = useStore((s) => s.basemap);
  const setBasemap = useStore((s) => s.setBasemap);

  return (
    <div className="settings">
      <button
        className="settings-toggle panel"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
      >
        ⚙
      </button>
      {open && (
        <div className="settings-panel panel" role="dialog" aria-label="Settings">
          <h2>Settings</h2>
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
        </div>
      )}
    </div>
  );
}
