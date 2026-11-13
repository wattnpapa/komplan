import { describe, expect, it } from "vitest";
import { vorlage } from "../modell/vorlagen";
import { BESCHAEDIGT, datenAusFragment, linkMit, planDekodieren, planKodieren } from "./teillink";

describe("Teil-Link", () => {
  it("überträgt einen Plan verlustfrei und kurz", async () => {
    const plan = vorlage("schadstoffunfall")!.erzeugen("2026-11-13T10:00");
    const daten = await planKodieren(plan);
    expect(daten).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(daten.length).toBeLessThan(JSON.stringify(plan).length / 2);
    expect(await planDekodieren(daten)).toEqual(plan);
    const link = linkMit(daten, "https://komplan.app/#/plan/abc");
    expect(link.startsWith("https://komplan.app/#p=")).toBe(true);
    expect(datenAusFragment(new URL(link).hash)).toBe(daten);
  });

  it("lehnt kaputte Links ab", async () => {
    await expect(planDekodieren("abc$")).rejects.toThrow(BESCHAEDIGT);
    await expect(planDekodieren("AAAAAAAA")).rejects.toThrow(BESCHAEDIGT);
    const daten = await planKodieren(vorlage("leer")!.erzeugen());
    await expect(planDekodieren(daten.slice(0, -10))).rejects.toThrow();
  });

  it("lässt Bilder auf Wunsch weg", async () => {
    const plan = vorlage("leer")!.erzeugen();
    plan.bilder.x = { id: "x", mime: "image/png", daten: `data:image/png;base64,${"A".repeat(5000)}`, breite: 10, hoehe: 10 };
    plan.kopf.logo = "x";
    const mit = await planKodieren(plan);
    const ohne = await planKodieren(plan, true);
    expect(ohne.length).toBeLessThan(mit.length);
    expect((await planDekodieren(ohne)).bilder).toEqual({});
  });
});
