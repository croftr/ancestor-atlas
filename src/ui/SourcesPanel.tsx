import { useData } from "../map/data";

/**
 * Data sources and credits, shown from the side menu (it replaces the legend's "Data sources"
 * list and the map's attribution box). The licences ask for attribution, so it must stay reachable.
 */
export default function SourcesContent() {
  const data = useData();
  return (
    <div className="sources-panel">
      <p className="muted sources-intro">
        Each site, date and event links its own evidence in its info card. The datasets behind them:
      </p>
      <ul className="sources-list">
        {(data?.sources ?? []).map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> <span className="muted">· {s.licence}</span>
            <div className="muted">{s.citation}</div>
          </li>
        ))}
      </ul>
      <div className="settings-label sources-map-label">Map</div>
      <ul className="sources-list">
        <li>
          Land outlines: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>{" "}
          <span className="muted">· public domain</span>
        </li>
        <li>
          Globe rendering: <a href="https://maplibre.org/" target="_blank" rel="noreferrer">MapLibre GL JS</a>{" "}
          <span className="muted">· BSD 3-Clause</span>
        </li>
      </ul>
    </div>
  );
}
