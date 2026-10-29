import { navigate } from "../route";
import { useStore } from "../store";
import { beginTour } from "./TourPlayer";

/** From a tap: start the tour (at stop `index`) and go to the globe to watch it. */
export function watchTour(id: string, index = 0) {
  beginTour(() => useStore.getState().startTour(id, { index }));
  navigate("globe");
}
