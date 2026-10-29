import { useEffect, useState } from "react";
import { loadData } from "../map/data";

/** "Loading…" while the atlas data is on its way; says so if it failed, instead of loading forever. */
export default function DataLoading() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadData().then((d) => alive && !d && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  return <>{failed ? "The atlas couldn't load. Check your connection and refresh the page." : "Loading…"}</>;
}
