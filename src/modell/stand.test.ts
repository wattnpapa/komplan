import { describe, expect, it } from "vitest";
import { neuerPlan, neueStelle, stelleAnlegen, umhaengen } from "./plan";
import { inhaltsSchluessel, naechsterStand, planVergleichen, seitStandGeaendert, standEinfrieren, standInhaltFesthalten, standWeiterzaehlen } from "./stand";

describe("Stände", () => {
  it("friert ein und zählt weiter", () => {
    const p = neuerPlan({ zeit: "2026-11-13T10:00" });
    const s = standEinfrieren(p, "2026-11-13T12:00");
    standWeiterzaehlen(p, "2026-11-13T12:00", "Lagewechsel");
    expect(s.stand.version).toBe(1);
    expect(s.plan.stand.dtg).toBe("131000NOV26");
    expect(p.stand).toEqual({ dtg: "131200NOV26", zeitpunkt: "2026-11-13T12:00", version: 2, bemerkung: "Lagewechsel", inhalt: inhaltsSchluessel(p) });
  });

  it("erkennt Änderungen seit dem Stand, nicht aber Stand und Änderungszeit selbst", () => {
    const p = neuerPlan({ zeit: "2026-11-13T10:00" });
    expect(seitStandGeaendert(p)).toBe(false); // ohne Prüfwert: unbekannt, nicht geändert
    standInhaltFesthalten(p);
    expect(seitStandGeaendert(p)).toBe(false);
    p.geaendert = "2026-11-13T11:00";
    p.stand.dtg = "131100NOV26";
    p.name = "Umbenannt";
    expect(seitStandGeaendert(p)).toBe(false);
    stelleAnlegen(p, neueStelle({ beschriftung: "EA 1" }));
    expect(seitStandGeaendert(p)).toBe(true);
    standWeiterzaehlen(p, "2026-11-13T12:00");
    expect(seitStandGeaendert(p)).toBe(false);
  });

  it("vergibt beim Anlegen nie eine Version doppelt", () => {
    const p = neuerPlan({ zeit: "2026-11-13T10:00" });
    standInhaltFesthalten(p);
    // unverändert und noch nicht eingefroren: Version 1 selbst festhalten
    expect(naechsterStand(p, [])).toEqual({ weiterzaehlen: false });
    // schon eingefroren oder geändert: nächste freie Nummer
    expect(naechsterStand(p, [1])).toEqual({ weiterzaehlen: true, version: 2 });
    stelleAnlegen(p, neueStelle({ beschriftung: "EA 1" }));
    expect(naechsterStand(p, [])).toEqual({ weiterzaehlen: true, version: 2 });
    // nach Rückgängig steht der Plan wieder auf 1, eingefroren ist schon 2
    expect(naechsterStand(p, [1, 2])).toEqual({ weiterzaehlen: true, version: 3 });
  });

  it("vergleicht Stellen, Kontakte, Funk und Unterstellung", () => {
    const p = neuerPlan();
    const tel = stelleAnlegen(p, neueStelle({ beschriftung: "TEL" }));
    const ea = stelleAnlegen(p, neueStelle({ beschriftung: "EA 1", kontakte: [{ id: "k1", art: "telefon", wert: "0999 1" }] }), { unter: tel });
    const weg = stelleAnlegen(p, neueStelle({ beschriftung: "EA 2" }), { unter: tel });
    const alt = structuredClone(p);
    p.stellen[ea]!.kontakte[0]!.wert = "0999 2";
    p.stellen[ea]!.funk.push({ id: "f1", art: "digital", betrieb: "TMO", rufgruppe: "TBZ_9901_UNI", richtung: "unten" });
    p.stellen[ea]!.funkrufname = "Heros Muster 10";
    const neu = stelleAnlegen(p, neueStelle({ beschriftung: "EA 3" }), { unter: tel });
    umhaengen(p, neu, { unter: ea });
    delete p.stellen[weg];
    p.stellen[tel]!.kinder = p.stellen[tel]!.kinder.filter((k) => k !== weg);
    const texte = planVergleichen(alt, p).map((a) => `${a.art}: ${a.text}`);
    expect(texte).toContain("geaendert: EA 1: Kontakt telefon 0999 1 → telefon 0999 2");
    expect(texte).toContain("neu: EA 1: Funk TMO TBZ_9901_UNI (unten) hinzugefügt");
    expect(texte).toContain('geaendert: EA 1: Funkrufname „" → „Heros Muster 10"');
    expect(texte).toContain("neu: EA 3 hinzugefügt");
    expect(texte).toContain("entfernt: EA 2 entfernt");
    expect(planVergleichen(p, p)).toEqual([]);
  });
});
