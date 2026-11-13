import { describe, expect, it } from "vitest";
import { neuerPlan, neueStelle, stelleAnlegen } from "../modell/plan";
import type { Plan } from "../modell/typen";
import { PlanStore } from "./plan-store";

describe("PlanStore", () => {
  it("macht Änderungen rückgängig und wiederholt sie", () => {
    let t = 0;
    const store = new PlanStore(neuerPlan(), () => t);
    store.aendern((p) => void stelleAnlegen(p as Plan, neueStelle({ beschriftung: "A" })));
    t += 5000;
    store.aendern((p) => void stelleAnlegen(p as Plan, neueStelle({ beschriftung: "B" })));
    expect(store.zustand.wurzeln).toHaveLength(2);
    store.rueckgaengig();
    expect(store.zustand.wurzeln).toHaveLength(1);
    store.rueckgaengig();
    expect(store.zustand.wurzeln).toHaveLength(0);
    expect(store.kannRueckgaengig()).toBe(false);
    store.wiederholen();
    store.wiederholen();
    expect(store.zustand.wurzeln).toHaveLength(2);
  });

  it("bündelt Tippen ins selbe Feld", () => {
    let t = 0;
    const plan = neuerPlan();
    const store = new PlanStore(plan, () => t);
    for (const name of ["E", "EA", "EAL"]) {
      t += 300;
      store.aendern((p) => void (p.name = name), "name");
    }
    expect(store.zustand.name).toBe("EAL");
    store.rueckgaengig();
    expect(store.zustand.name).toBe(plan.name);
  });

  it("meldet Änderungen an Abonnenten", () => {
    const store = new PlanStore(neuerPlan());
    let n = 0;
    const ab = store.abonnieren(() => n++);
    store.aendern((p) => void (p.name = "X"));
    ab();
    store.aendern((p) => void (p.name = "Y"));
    expect(n).toBe(1);
  });
});
