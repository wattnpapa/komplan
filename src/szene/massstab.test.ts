import { describe, expect, it } from "vitest";
import { neuerPlan, neueStelle, stelleAnlegen } from "../modell/plan";
import type { FuehrungsorgAnsicht } from "../modell/typen";
import { fuehrungsorgSzene, ZEICHEN_MM } from "../layout/fuehrungsorg";
import type { Szene } from "./typen";
import { einpassMassstab, pdfNutzflaeche, ZEICHEN_BREITE_STANDARD, zeichenBreiteBegrenzen, zeichenBreiteInSzene, zeichenMassstab } from "./massstab";

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

  it("hält beim Einpassen die Zeichenbreite als Obergrenze", () => {
    // Zeichen 23,6 mm breit: 50 mm entspricht Faktor 50/23,6 ≈ 2,12
    const klein = { breite: 40, hoehe: 30, elemente: [zeichen(25.6)] };
    expect(einpassMassstab(klein, 277, 183, 50) * 23.6).toBeCloseTo(50);
    expect(einpassMassstab(klein, 277, 183, 20) * 23.6).toBeCloseTo(20);
    // Großer Plan: die Seite begrenzt
    const gross = { breite: 600, hoehe: 200, elemente: [zeichen(25.6)] };
    expect(einpassMassstab(gross, 277, 183, 50)).toBeCloseTo(277 / 600);
    // Ohne Zeichenbreite wie bisher höchstens Faktor 2
    expect(einpassMassstab(klein, 277, 183)).toBe(2);
  });

  it("rechnet die Nutzfläche wie das PDF", () => {
    expect(pdfNutzflaeche("A4", "quer", false)).toEqual({ seiteB: 297, seiteH: 210, nutzB: 277, nutzH: 183 });
    expect(pdfNutzflaeche("A3", "hoch", true).nutzH).toBe(420 - 20 - 7 - 5);
  });
});
