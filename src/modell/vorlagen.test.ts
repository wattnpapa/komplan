import { describe, expect, it } from "vitest";
import { KATALOG } from "../zeichen/katalog";
import { eigeneVorlage } from "../zeichen/eigen/vorlagen";
import { fuehrungsorgSzene } from "../layout/fuehrungsorg";
import { planPruefen } from "./validierung";
import { VORLAGEN } from "./vorlagen";

const schluessel = new Set(KATALOG.map((k) => k.schluessel));

describe("Vorlagen", () => {
  for (const v of VORLAGEN) {
    it(`${v.id} ist gültig und zeichenbar`, () => {
      const plan = v.erzeugen("2026-11-13T10:00");
      expect(planPruefen(plan).filter((h) => h.stufe === "fehler")).toEqual([]);
      for (const s of Object.values(plan.stellen)) {
        if (s.zeichen?.quelle === "katalog") expect(schluessel.has(s.zeichen.schluessel), s.zeichen.schluessel).toBe(true);
        if (s.zeichen?.quelle === "eigen") expect(eigeneVorlage(s.zeichen.vorlage), s.zeichen.vorlage).toBeDefined();
      }
      const a = plan.ansichten[plan.ansichtReihenfolge[0]!]!;
      if (a.typ !== "skizze" && plan.wurzeln.length) expect(fuehrungsorgSzene(plan, a).elemente.length).toBeGreaterThan(0);
      // Keine echten Kontaktdaten in Beispielen
      const json = JSON.stringify(plan);
      expect(json).not.toMatch(/@(?!example\.org)[a-z0-9-]+\.[a-z]{2,}/i);
    });
  }
});
