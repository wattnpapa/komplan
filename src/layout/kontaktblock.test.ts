import { describe, expect, it } from "vitest";
import { neueKomplanAnsicht, neuerPlan, neueStelle, stelleAnlegen } from "../modell/plan";
import type { Element } from "../szene/typen";
import { kopfleiste } from "../szene/kopfleiste";
import { fuehrungsorgSzene } from "./fuehrungsorg";
import { FARBE_GUELTIG, gueltigkeitText, kontaktblock } from "./kontaktblock";

const texte = (e: Element[]) => e.filter((x): x is Extract<Element, { art: "text" }> => x.art === "text").map((x) => x.text);

describe("Kontaktblock", () => {
  const stelle = neueStelle({
    bezeichnung: "Lenkungsgruppe",
    betriebDurch: "THW FK Musterstadt",
    kontakte: [
      { id: "1", art: "telefon", wert: "0999 200-40" },
      { id: "2", art: "email", wert: "a@example.org", gueltigAb: "2026-11-13T15:00" },
      { id: "3", art: "email", wert: "b@example.org", gueltigBis: "2026-11-13T15:00" },
    ],
    funk: [{ id: "f", art: "digital", betrieb: "TMO", rufgruppe: "TBZ_9901_UNI", richtung: "unten" }],
  });

  it("setzt Felder, nummeriert Mail-Adressen und färbt die Gültigkeit", () => {
    const b = kontaktblock(stelle, neueKomplanAnsicht(), "2026-11-13T10:00");
    const t = texte(b.elemente);
    expect(t).toContain("Lenkungsgruppe");
    expect(t).toContain("Betrieb: THW FK Musterstadt");
    expect(t).toContain("Mail 1: ");
    expect(t).toContain("Mail 2: ");
    expect(t).toContain(" ab 13.11. 15:00");
    const gueltig = b.elemente.find((e) => e.art === "text" && e.text === " bis 13.11. 15:00");
    expect(gueltig && gueltig.art === "text" && gueltig.farbe).toBe(FARBE_GUELTIG);
    expect(t).toContain("TBZ_9901_UNI");
    // Richtungspfeil als Fläche, nicht als Zeichen
    expect(b.elemente.some((e) => e.art === "vieleck")).toBe(true);
    expect(t.join("")).not.toContain("↓");
    expect(b.b).toBeGreaterThan(30);
  });

  it("zeichnet Platzhalterlinien nur auf Wunsch", () => {
    const leer = neueStelle();
    expect(kontaktblock(leer, { ...neueKomplanAnsicht(), platzhalter: false }).h).toBe(0);
    const mit = kontaktblock(leer, { ...neueKomplanAnsicht(), platzhalter: true });
    expect(mit.elemente.filter((e) => e.art === "linie" && e.linie === "gepunktet").length).toBeGreaterThanOrEqual(4);
  });

  it("nennt das Jahr nur, wenn es vom Stand abweicht", () => {
    expect(gueltigkeitText({ gueltigBis: "2027-01-02T08:00" }, 2026)).toBe("bis 02.01.2027 08:00");
    expect(gueltigkeitText({ gueltigAb: "2026-01-02T08:00" }, 2026)).toBe("ab 02.01. 08:00");
  });
});

describe("Kommunikationsplan-Ansicht", () => {
  it("hängt Blöcke an, blendet einzelne aus und setzt die Kopfleiste darüber", () => {
    const plan = neuerPlan({ zeit: "2026-11-13T10:00" });
    plan.kopf = { fuehrungsstelle: "TEL Musterstadt", fuer: "Übung", fdr: "M. Mustermann", einstufung: "VS – Nur für den Dienstgebrauch" };
    const tel = stelleAnlegen(plan, neueStelle({ bezeichnung: "TEL", kontakte: [{ id: "a", art: "telefon", wert: "0999 1" }] }));
    const ea = stelleAnlegen(plan, neueStelle({ bezeichnung: "EA Nord", kontakte: [{ id: "b", art: "telefon", wert: "0999 2" }] }), { unter: tel });
    const a = neueKomplanAnsicht({ knoten: { [ea]: { kontaktLage: "aus" } } });
    const t = texte(fuehrungsorgSzene(plan, a).elemente);
    expect(t).toContain("0999 1");
    expect(t).not.toContain("0999 2");
    expect(t).toContain("Kommunikationsplan");
    expect(t).toContain("VS-NfD");
    expect(t).toContain("131000NOV26");
  });

  it("Kopfleiste hat die Felder der THW-Vordrucke", () => {
    const k = kopfleiste({ breite: 277, formular: "Fb Fü 76", titel: "Kommunikationsplan", kopf: { fuehrungsstelle: "EAL 3", fuer: "Flut", fdr: "X" }, dtg: "010730JUN16" });
    const t = texte(k.elemente);
    for (const s of ["Fb Fü 76", "Kommunikationsplan", "Führungsstelle", "für", "Stand:", "F.d.R.:", "EAL 3", "Flut", "010730JUN16"]) expect(t).toContain(s);
  });
});
