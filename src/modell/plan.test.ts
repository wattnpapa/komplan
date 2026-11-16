import { produce } from "immer";
import { describe, expect, it } from "vitest";
import { elternVon, loseStellenIds, nachfahren } from "./baum";
import { dateienLesen, dateiLesen, dateiSchreiben, DateiFehler, sammlungSchreiben, zumEinlesen } from "./migration";
import { standEinfrieren } from "./stand";
import { neuerPlan, neueStelle, planDuplizieren, stelleAnlegen, stelleDuplizieren, stelleLoeschen, umhaengen, verschieben, zielEineEbeneHoeher } from "./plan";
import { planPruefen } from "./validierung";

function beispiel() {
  const plan = neuerPlan({ name: "Test", zeit: "2026-11-13T10:00" });
  const tel = stelleAnlegen(plan, neueStelle({ beschriftung: "TEL" }));
  const ea1 = stelleAnlegen(plan, neueStelle({ beschriftung: "EAL 1" }), { unter: tel });
  const ea2 = stelleAnlegen(plan, neueStelle({ beschriftung: "EAL 2" }), { unter: tel });
  const uea = stelleAnlegen(plan, neueStelle({ beschriftung: "UEAL 1.1" }), { unter: ea1 });
  return { plan, tel, ea1, ea2, uea };
}

describe("Plan-Befehle", () => {
  it("legt einen Baum an", () => {
    const { plan, tel, ea1, ea2, uea } = beispiel();
    expect(plan.wurzeln).toEqual([tel]);
    expect(plan.stellen[tel]!.kinder).toEqual([ea1, ea2]);
    expect(elternVon(plan, uea)).toBe(ea1);
    expect(nachfahren(plan, tel)).toEqual([ea1, uea, ea2]);
    expect(planPruefen(plan).filter((h) => h.stufe === "fehler")).toEqual([]);
  });

  it("hängt um, aber nie unter sich selbst", () => {
    const { plan, tel, ea1, ea2, uea } = beispiel();
    expect(umhaengen(plan, ea1, { unter: uea })).toBe(false);
    expect(umhaengen(plan, ea1, { unter: ea1 })).toBe(false);
    expect(umhaengen(plan, uea, { unter: ea2 })).toBe(true);
    expect(plan.stellen[ea2]!.kinder).toEqual([uea]);
    expect(plan.stellen[ea1]!.kinder).toEqual([]);
    expect(umhaengen(plan, ea2, { unter: tel, index: 0 })).toBe(true);
    expect(plan.stellen[tel]!.kinder).toEqual([ea2, ea1]);
    expect(umhaengen(plan, ea2, { unter: tel, index: 2 })).toBe(true);
    expect(plan.stellen[tel]!.kinder).toEqual([ea1, ea2]);
    expect(umhaengen(plan, ea2, { lose: true })).toBe(true);
    expect(loseStellenIds(plan)).toEqual([ea2]);
    expect(plan.loseStellen).toEqual([ea2]);
  });

  it("hängt eine Ebene höher, hinter die bisherige übergeordnete Stelle", () => {
    const p = neuerPlan();
    const tel = stelleAnlegen(p, neueStelle({ beschriftung: "TEL" }));
    const ea1 = stelleAnlegen(p, neueStelle({ beschriftung: "EA 1" }), { unter: tel });
    const ea2 = stelleAnlegen(p, neueStelle({ beschriftung: "EA 2" }), { unter: tel });
    const ua = stelleAnlegen(p, neueStelle({ beschriftung: "UA" }), { unter: ea1 });
    expect(zielEineEbeneHoeher(p, ua)).toEqual({ unter: tel, index: 1 });
    umhaengen(p, ua, zielEineEbeneHoeher(p, ua)!);
    expect(p.stellen[tel]!.kinder).toEqual([ea1, ua, ea2]);
    expect(zielEineEbeneHoeher(p, ea1)).toEqual({ wurzel: true, index: 1 });
    expect(zielEineEbeneHoeher(p, tel)).toBeUndefined();
  });

  it("verschiebt innerhalb der Geschwister", () => {
    const { plan, tel, ea1, ea2 } = beispiel();
    verschieben(plan, ea1, 1);
    expect(plan.stellen[tel]!.kinder).toEqual([ea2, ea1]);
    verschieben(plan, ea1, 5);
    expect(plan.stellen[tel]!.kinder).toEqual([ea2, ea1]);
  });

  it("löscht mit und ohne Teilbaum und räumt Ansichten auf", () => {
    const { plan, tel, ea1, ea2, uea } = beispiel();
    const ansicht = Object.values(plan.ansichten)[0]!;
    if (ansicht.typ !== "skizze") ansicht.knoten[ea1] = { eingeklappt: true };
    stelleLoeschen(plan, ea1);
    expect(plan.stellen[tel]!.kinder).toEqual([uea, ea2]);
    if (ansicht.typ !== "skizze") expect(ansicht.knoten[ea1]).toBeUndefined();
    stelleLoeschen(plan, tel, true);
    expect(Object.keys(plan.stellen)).toEqual([]);
    expect(plan.wurzeln).toEqual([]);
  });

  it("dupliziert auch in einem Immer-Entwurf (so ruft der Editor auf)", () => {
    const p = neuerPlan();
    const tel = stelleAnlegen(p, neueStelle({ beschriftung: "TEL", kontakte: [{ id: "k1", art: "telefon", wert: "0999 1" }] }));
    let neu: string | undefined;
    const q = produce(p, (e) => void (neu = stelleDuplizieren(e as typeof p, tel)));
    expect(neu).toBeDefined();
    expect(q.wurzeln).toEqual([tel, neu]);
    expect(q.stellen[neu!]!.kontakte[0]!.wert).toBe("0999 1");
  });

  it("dupliziert Teilbäume mit neuen IDs", () => {
    const { plan, tel, ea1 } = beispiel();
    const kopie = stelleDuplizieren(plan, ea1)!;
    expect(plan.stellen[tel]!.kinder[1]).toBe(kopie);
    expect(plan.stellen[kopie]!.kinder).toHaveLength(1);
    expect(plan.stellen[kopie]!.kinder[0]).not.toBe(plan.stellen[ea1]!.kinder[0]);
    const p2 = planDuplizieren(plan, "Kopie", "2026-11-14T00:00");
    expect(p2.id).not.toBe(plan.id);
    expect(p2.stellen).toEqual(plan.stellen);
  });
});

describe("Datei", () => {
  it("schreibt und liest verlustfrei", () => {
    const { plan } = beispiel();
    const { plan: gelesen } = dateiLesen(dateiSchreiben(plan));
    expect(gelesen).toEqual(plan);
  });

  it("lehnt Fremdes und Neueres ab", () => {
    expect(() => dateiLesen("nix")).toThrow(DateiFehler);
    expect(() => dateiLesen('{"format":"anders"}')).toThrow(/keine komplan-Datei/);
    const { plan } = beispiel();
    const zukunft = JSON.parse(dateiSchreiben(plan));
    zukunft.plan.schemaVersion = 99;
    expect(() => dateiLesen(JSON.stringify(zukunft))).toThrow(/neueren Fassung/);
    const kaputt = JSON.parse(dateiSchreiben(plan));
    delete kaputt.plan.stellen;
    expect(() => dateiLesen(JSON.stringify(kaputt))).toThrow(/stellen/);
  });

  it("liest Einzeldatei und Sammelsicherung", () => {
    const { plan } = beispiel();
    const zweiter = neuerPlan({ name: "Zweiter" });
    const s = standEinfrieren(plan, "2026-11-13T12:00");
    expect(dateienLesen(dateiSchreiben(plan, [s]))).toEqual([{ plan, staende: [s] }]);
    const gelesen = dateienLesen(sammlungSchreiben([{ plan, staende: [s] }, { plan: zweiter }], "2026-11-16T09:00"));
    expect(gelesen.map((e) => e.plan.name)).toEqual([plan.name, "Zweiter"]);
    expect(gelesen[0]!.staende).toEqual([s]);
    expect(gelesen[1]!.staende).toEqual([]);
    expect(() => dateienLesen('{"format":"komplan-sammlung"}')).toThrow(/keine Pläne/);
  });

  it("gibt Ständen beim Einlesen neue IDs, damit sie keine vorhandenen überschreiben", () => {
    const { plan } = beispiel();
    const s = standEinfrieren(plan, "2026-11-13T12:00");
    const neu = zumEinlesen({ plan, staende: [s] }, false);
    expect(neu.plan.id).toBe(plan.id);
    expect(neu.staende[0]!.id).not.toBe(s.id);
    expect(neu.staende[0]!.planId).toBe(plan.id);
    const kopie = zumEinlesen({ plan, staende: [s] }, true);
    expect(kopie.plan.id).not.toBe(plan.id);
    expect(kopie.plan.name).toBe(`${plan.name} (eingelesen)`);
    expect(kopie.staende[0]!.planId).toBe(kopie.plan.id);
    expect(kopie.staende[0]!.id).not.toBe(s.id);
  });
});

describe("Hinweise", () => {
  it("findet abgelaufene Kontakte, doppelte Rufgruppen und Zyklen", () => {
    const { plan, tel, ea1, ea2 } = beispiel();
    plan.stellen[tel]!.kontakte.push({ id: "k1", art: "email", wert: "lage@example.org", gueltigBis: "2026-11-13T09:00" });
    plan.stellen[ea2]!.kontakte.push({ id: "k2", art: "email", wert: "ea2@example.org", gueltigAb: "2026-11-13T15:00" });
    for (const id of [ea1, ea2]) plan.stellen[id]!.funk.push({ id: `f${id}`, art: "digital", betrieb: "TMO", rufgruppe: "TBZ_9901_UNI", richtung: "unten" });
    const regeln = planPruefen(plan).map((h) => h.regel);
    expect(regeln).toContain("abgelaufen");
    expect(regeln).toContain("noch-nicht-gueltig");
    expect(regeln).toContain("rufgruppe-doppelt");
    plan.stellen[ea1]!.kinder.push(tel);
    expect(planPruefen(plan).map((h) => h.regel)).toContain("zyklus");
  });
});
