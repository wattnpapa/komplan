import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { neuerPlan } from "../modell/plan";
import { papierkorbAufraeumen, planEndgueltigLoeschen, planLaden, planListe, planSpeichern, standSpeichern, staendeVon, wertLesen, wertSchreiben } from "./db";

describe("IndexedDB-Ablage", () => {
  it("speichert, listet und löscht Pläne samt Ständen", async () => {
    const a = neuerPlan({ name: "A", zeit: "2026-11-13T10:00" });
    const b = neuerPlan({ name: "B", zeit: "2026-11-13T11:00" });
    await planSpeichern(a);
    await planSpeichern(b);
    expect((await planListe()).map((p) => p.name)).toEqual(["B", "A"]);
    expect(await planLaden(a.id)).toEqual(a);
    await standSpeichern({ id: "s1", planId: a.id, stand: a.stand, angelegt: "2026-11-13T10:05", plan: a });
    expect(await staendeVon(a.id)).toHaveLength(1);
    await planEndgueltigLoeschen(a.id);
    expect(await planLaden(a.id)).toBeUndefined();
    expect(await staendeVon(a.id)).toHaveLength(0);
  });

  it("räumt den Papierkorb nach 30 Tagen", async () => {
    const alt = { ...neuerPlan({ name: "alt" }), geloeschtAm: "2026-09-01T10:00" };
    const neu = { ...neuerPlan({ name: "neu" }), geloeschtAm: "2026-11-10T10:00" };
    await planSpeichern(alt);
    await planSpeichern(neu);
    expect(await papierkorbAufraeumen(new Date("2026-11-13T12:00:00"))).toBe(1);
    expect(await planLaden(alt.id)).toBeUndefined();
    expect(await planLaden(neu.id)).toBeDefined();
  });

  it("merkt sich Werte", async () => {
    expect(await wertLesen("x", 5)).toBe(5);
    await wertSchreiben("x", [1, 2]);
    expect(await wertLesen("x", [])).toEqual([1, 2]);
  });
});
