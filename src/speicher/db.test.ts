import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { neuerPlan } from "../modell/plan";
import { papierkorbAufraeumen, planEndgueltigLoeschen, planLaden, planLadenMitRev, planListe, planSpeichern, planSpeichernWenn, standSpeichern, staendeVon, wertLesen, wertSchreiben } from "./db";

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

  it("überschreibt keine Fassung, die ein anderer Tab inzwischen gespeichert hat", async () => {
    const p = neuerPlan({ name: "Tab", zeit: "2026-11-13T10:00" });
    const start = await planSpeichern(p);
    // Tab A und Tab B gehen beide von `start` aus
    const a = await planSpeichernWenn({ ...p, name: "Tab A" }, start);
    expect(a.ok).toBe(true);
    const b = await planSpeichernWenn({ ...p, name: "Tab B" }, start);
    expect(b.ok).toBe(false);
    expect((await planLaden(p.id))?.name).toBe("Tab A");
    // Tab B lädt neu und speichert von der aktuellen Revision aus
    const neu = await planLadenMitRev(p.id);
    expect(neu?.rev).toBe(a.ok ? a.rev : "");
    expect((await planSpeichernWenn({ ...p, name: "Tab B" }, neu?.rev)).ok).toBe(true);
    expect((await planLaden(p.id))?.name).toBe("Tab B");
  });

  it("merkt sich Werte", async () => {
    expect(await wertLesen("x", 5)).toBe(5);
    await wertSchreiben("x", [1, 2]);
    expect(await wertLesen("x", [])).toEqual([1, 2]);
  });
});
