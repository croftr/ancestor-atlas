import { describe, expect, it } from "vitest";
import { compareCoords, groupPins, isGenericPeriod, isPeriodGroup, isUncertainTaxon, markNew, type CheckResult } from "./check.ts";

describe("update check", () => {
  it("tells period names from cultures", () => {
    for (const p of ["LN", "UBA", "UN", "PN", "Middle Neolithic", "MiddleNeolithic", "Néolithique ancien", "Epipaléolithique", "Nordisches Spätneolithikum",
      "Late Neolithic/Early Bronze Age", "Meso/Neo", "Middle/Upper Paleolithic", "Early", "unspec.", "British EN", "SN II", "Upper Paleolithic (Eurasia)",
      "Middle Stone Age/Later Stone Age", "Late Pleistocene (E Asia)", "Bronze Age II", "Transition", "ELSA"])
      expect(isGenericPeriod(p), p).toBe(true);
    for (const c of ["Mousterian", "Swifterbant", "Horgen", "Cortaillod", "Grübchenkeramik", "Proto-Aurignacian", "Robberg", "Epicardial", "Sauveterrien", "LBK", "Dynastic", "Uluzzian"])
      expect(isGenericPeriod(c), c).toBe(false);
  });
  it("leaves out uncertain taxa and place-and-period AADR groups", () => {
    expect(["Homo sp.", "Hominidae indet.", "Homo n.c.", "Homo cf. erectus", "Homo neanderthalensis or sapiens", "(blank)", "Homo"].every(isUncertainTaxon)).toBe(true);
    expect(isUncertainTaxon("Homo luzonensis")).toBe(false);
    expect(["Spain_C", "England_LIA_MIA", "Pakistan_IA", "Israel_MLBA", "Sweden_N"].every(isPeriodGroup)).toBe(true);
    expect(["Romania_C_Bodrogkeresztur", "Czechia_IA_LaTene", "Turkey_Catalhoyuk_MN"].some(isPeriodGroup)).toBe(false);
  });
  it("groups pins by page", () => {
    const g = groupPins([
      { lang: "en", title: "Lapita_culture", rev: 20, file: "a" },
      { lang: "en", title: "Lapita_culture", rev: 10, file: "b" },
      { lang: "en", title: "Lapita_culture", rev: 20, file: "a" },
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].pins).toEqual([{ rev: 10, uses: 1 }, { rev: 20, uses: 2 }]);
    expect(g[0].files).toEqual(["a", "b"]);
  });
  it("reports coordinates that vanished, lost their item or moved (in that order)", () => {
    const rows = [
      { qid: "Q1", label: "same", where: "x", lat: 10, lon: 10 },
      { qid: "Q2", label: "moved", where: "x", lat: 10, lon: 10 },
      { qid: "Q3", label: "none", where: "x", lat: 10, lon: 10 },
      { qid: "Q4", label: "gone", where: "x", lat: 10, lon: 10 },
    ];
    const items = new Map([["Q1", { coord: { lat: 10.001, lon: 10 } }], ["Q2", { coord: { lat: 10.1, lon: 10 } }], ["Q3", {}]]);
    expect(compareCoords(rows, items).map((c) => [c.label, c.state])).toEqual([["none", "no-coords"], ["gone", "gone"], ["moved", "moved"]]);
  });
  it("marks gaps that the previous check did not list", () => {
    const gaps = (labels: string[]) => ({ xronos: labels.map((label) => ({ label, count: 1 })), xronosGeneric: 0, roadTaxa: [], roadCultures: [], aadr: [] });
    const now = { gaps: gaps(["Horgen", "Pfyn"]) } as unknown as CheckResult;
    markNew(now, { gaps: gaps(["Horgen"]) } as unknown as CheckResult);
    expect(now.gaps.xronos.map((g) => g.isNew)).toEqual([undefined, true]);
  });
});

describe("existing cultures", () => {
  it("spots a culture the atlas already has inside a label", async () => {
    const { matchCulture } = await import("./check.ts");
    const known = new Map([["lengyel", "Lengyel culture"], ["mousterian", "Levallois / Mousterian"]]);
    expect(matchCulture("Hungary_LN_Lengyel", known)).toBe("Lengyel culture");
    expect(matchCulture("Late Levalloiso-Mousterian (Levant)", known)).toBe("Levallois / Mousterian");
    expect(matchCulture("Swifterbant", known)).toBeUndefined();
  });
});
