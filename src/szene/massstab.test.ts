import { describe, expect, it } from "vitest";
import { neuerPlan, neueStelle, stelleAnlegen } from "../modell/plan";
import type { FuehrungsorgAnsicht } from "../modell/typen";
import { fuehrungsorgSzene, ZEICHEN_MM } from "../layout/fuehrungsorg";
import type { Szene } from "./typen";
import { ZEICHEN_BREITE_STANDARD, zeichenBreiteBegrenzen, zeichenBreiteInSzene, zeichenMassstab } from "./massstab";

const zeichen = (groesse: number) => ({ art: "zeichen" as const, x: 0, y: 0, groesse, ref: { quelle: "katalog" as const, schluessel: "Führungsstellen/TEL" } });

describe("Zeichenmaßstab fürs PDF", () => {
  it("misst die Grundform des größten Zeichens", () => {
    const s: Pick<Szene, "elemente"> = { elemente: [zeichen(10), zeichen(25.6), { art: "kreis", x: 0, y: 0, r: 100 }] };
    expect(zeichenBreiteInSzene(s)).toBeCloseTo(23.6);
  });

  it("bringt die Zeichen auf die gewünschte Breite", () => {
    const s = { elemente: [zeichen(25.6)] };
    expect(zeichenMassstab(s, 47.2)).toBeCloseTo(2);
    expect(zeichenMassstab(s, undefined) * 23.6).toBeCloseTo(ZEICHEN_BREITE_STANDARD);
  });

  it("lässt Szenen ohne Zeichen unverändert", () => {
    expect(zeichenMassstab({ elemente: [] }, 50)).toBe(1);
  });

  it("begrenzt unsinnige Eingaben", () => {
    expect(zeichenBreiteBegrenzen(Number.NaN)).toBe(ZEICHEN_BREITE_STANDARD);
    expect(zeichenBreiteBegrenzen(0)).toBe(ZEICHEN_BREITE_STANDARD);
    expect(zeichenBreiteBegrenzen(1)).toBe(5);
    expect(zeichenBreiteBegrenzen(5000)).toBe(300);
  });

  it("passt zur Führungsorganisation", () => {
    const plan = neuerPlan({ name: "Musterstadt", zeit: "2026-11-19T10:00" });
    stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "katalog", schluessel: "Führungsstellen/TEL" } }));
    const szene = fuehrungsorgSzene(plan, Object.values(plan.ansichten)[0] as FuehrungsorgAnsicht);
    expect(zeichenBreiteInSzene(szene)).toBeCloseTo(ZEICHEN_MM * 236 / 256);
  });
});
