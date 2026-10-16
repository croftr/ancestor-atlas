import { useStore } from "../store";
import { navigate, useView } from "../route";
import { useDnaCultureCount } from "./data";
import "./dna.css";

/**
 * On a culture's card and page: how many ancient genomes link to it, and a button that turns the ancient DNA layer
 * on (from a page, it also goes to the globe at the culture's best moment). While the layer is on, the open culture
 * card's genome sites are ringed on the globe (MapView).
 */
export default function DnaCultureLink({ cultureId }: { cultureId: string }) {
  const count = useDnaCultureCount(cultureId);
  const on = useStore((s) => s.dna);
  const view = useView();
  if (!count) return null;
  const [people, sites] = count;
  const onGlobe = view === "globe";
  const show = () => {
    useStore.getState().setDna(true);
    if (!onGlobe) {
      useStore.getState().focusEntity(cultureId);
      navigate("globe");
    }
  };
  return (
    <div className="muted dna-culture-link">
      {people.toLocaleString("en-US")} ancient genome{people === 1 ? "" : "s"} from {sites} site{sites === 1 ? "" : "s"}
      {onGlobe && on ? (
        " (ringed on the globe when dated to this time)"
      ) : (
        <>
          {" · "}
          <button className="link" onClick={show}>
            Show on the globe
          </button>
        </>
      )}
    </div>
  );
}
