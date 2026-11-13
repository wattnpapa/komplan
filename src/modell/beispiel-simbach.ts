/**
 * Ausbildungsbeispiel „Einsatzübung Simbach" nach den Folien
 * „Betriebsunterlagen" der THW-Bereichsausbildung Sprechfunk-Führung:
 * EAL 3 THW unter der Einsatzleitung der Feuerwehr, drei UEAL, Zugtrupp mit
 * Einheiten. Ein Plan, drei Ansichten: Fb Fü 76, Skizze FGr FK, Skizze ZTr.
 * Telefonnummern und E-Mail-Adressen sind erfunden (0999 …, example.org).
 */

import { neueId } from "./id";
import { neueFuehrungsorgAnsicht, neueKomplanAnsicht, neuerPlan, neueStelle, stelleAnlegen } from "./plan";
import { elementAnlegen, FARBE_DRAHT, FARBE_FUNK, neueSkizzenAnsicht } from "./skizze";
import type { Funkangabe, Id, Kontakt, Plan, Port, SkizzenAnsicht, ZeichenRef } from "./typen";

const kat = (s: string): ZeichenRef => ({ quelle: "katalog", schluessel: s });
const k = (art: Kontakt["art"], wert: string): Kontakt => ({ id: neueId(), art, wert });
const kanal = (band: "4m" | "2m", nr: string, ba: string, richtung: Funkangabe["richtung"]): Funkangabe => ({ id: neueId(), art: "analog", band, kanal: nr, betriebsart: ba, richtung });
const port = (element: Id, seite: "l" | "r" | "o" | "u", versatz = 0.5): Port => ({ element, seite, versatz });

export interface SimbachIds {
  el: Id;
  eal: Id;
  ueal: Id[];
  einheiten: Id[];
}

export function simbachPlan(zeit?: string): { plan: Plan; ids: SimbachIds } {
  const plan = neuerPlan({ name: "Einsatzübung Simbach (Ausbildungsbeispiel)", zeit, organisation: "thw" });
  plan.kopf = { fuehrungsstelle: "EAL 3 THW", fuer: "Flut Simbach", fdr: "M. Mustermann", einstufung: "VS – Nur für den Dienstgebrauch" };
  const el = stelleAnlegen(plan, neueStelle({
    zeichen: kat("Führungsstellen/EL"), beschriftung: "FW", bezeichnung: "Einsatzleitung Feuerwehr", funkrufname: "Florian Simbach 10",
    kontakte: [k("telefon", "0999 63877"), k("fax", "0999 37758")],
    funk: [kanal("4m", "501", "G/U", "unten")],
  }));
  const eal = stelleAnlegen(plan, neueStelle({
    zeichen: { quelle: "eigen", vorlage: "eal-thw" }, nummer: "3", beschriftung: "THW", bezeichnung: "EAL 3 THW", funkrufname: "Heros Simbach 10",
    kontakte: [k("telefon", "0999 184080"), k("fax", "0999 932904"), k("mobil", "0999 1719759351")],
    funk: [kanal("4m", "501", "G/U", "oben"), kanal("4m", "485", "W/U", "unten"), kanal("2m", "39", "W/U", "unten")],
    nebenstellen: [
      ["11", "FmZt / Abfrage"], ["12", "S 2"], ["13", "S 3"], ["14", "S 4"], ["15", "FaBe"], ["16", "S 6"], ["17", "Ltr. Stab"],
    ].map(([nummer, teilnehmer], i) => ({ id: neueId(), anschlussart: i < 4 ? "CAWITEL" : "AWINAP", nummer: nummer!, teilnehmer: teilnehmer! })),
  }), { unter: el });
  const ueal = (["Heros Simbach 21/10", "Heros Straubing 16/11", "Heros Karlsruhe 21/10"] as const).map((rn, i) =>
    stelleAnlegen(plan, neueStelle({
      zeichen: kat("Führungsstellen/UEAL"), nummer: String(i + 1), beschriftung: "", bezeichnung: `UEAL ${i + 1}`, funkrufname: rn,
      kontakte: [k("telefon", `0999 657438${i}2`), k("fax", `0999 132986${i}4`)],
      funk: [kanal("4m", "485", "W/U", "oben"), kanal("2m", "39", "W/U", "unten")],
    }), { unter: eal }),
  );
  const ztr = stelleAnlegen(plan, neueStelle({ zeichen: kat("THW_Einheiten/Zugtrupp"), beschriftung: "ZTr TZ", funkrufname: "Heros Simbach 20", funk: [kanal("2m", "39", "W/U", "unten")] }), { unter: ueal[0]! });
  const einheiten = [
    ["THW_Einheiten/Technischer_Zug", "TZ", "Heros Straubing 21/00"],
    ["THW_Einheiten/Bergungsgruppe", "B 1", "Heros Mühlacker 31/00"],
    ["THW_Fahrzeuge/Kipper", "Kipper", "Heros Karlsruhe 41/62"],
  ].map(([z, b, rn]) => stelleAnlegen(plan, neueStelle({ zeichen: kat(z!), beschriftung: b!, funkrufname: rn }), { unter: ztr }));

  // Ansichten: Führungsorganisation ist schon da; Fb Fü 76 mit EAL 3 als eigener Stelle
  const fo = Object.values(plan.ansichten)[0]!;
  fo.name = "Führungsorganisation";
  const fb76 = neueKomplanAnsicht({ name: "Fb Fü 76 EAL 3", variante: "fb-fue-76", fokus: eal, papier: { format: "A4", ausrichtung: "quer", grosseFlaeche: "einpassen" } });
  plan.ansichten[fb76.id] = fb76;
  plan.ansichtReihenfolge.push(fb76.id);
  void neueFuehrungsorgAnsicht;
  return { plan, ids: { el, eal, ueal, einheiten: [ztr, ...einheiten] } };
}

/** Skizze FGr FK (Technisch-/Taktische Kommunikationsskizze EAL 3). */
export function skizzeFgrFk(plan: Plan, ids: SimbachIds): SkizzenAnsicht {
  const a = neueSkizzenAnsicht({ name: "Skizze FGr FK", titel: "Technisch-/Taktische Kommunikationsskizze", fokus: ids.eal });
  const eal = plan.stellen[ids.eal]!;
  const el = plan.stellen[ids.el]!;
  const elKasten = elementAnlegen(a, { art: "stelle", stelle: ids.el, x: 12, y: 33, b: 62, h: 24 });
  const eigen = elementAnlegen(a, { art: "stelle", stelle: ids.eal, x: 100, y: 70, b: 110, h: 52, inhalt: "rahmen" });
  const g4a = elementAnlegen(a, { art: "geraet", geraet: "4m", x: 102.5, y: 86, b: 8, h: 7.5, technisch: true });
  const g4b = elementAnlegen(a, { art: "geraet", geraet: "4m", x: 102.5, y: 95, b: 8, h: 7.5, technisch: true });
  const mob = elementAnlegen(a, { art: "geraet", geraet: "mobfu", x: 102.5, y: 104, b: 8, h: 7.5, technisch: true });
  const fax = elementAnlegen(a, { art: "geraet", geraet: "fax", x: 116, y: 110, b: 8, h: 7.5, technisch: true });
  elementAnlegen(a, { art: "geraet", geraet: "pc", x: 132, y: 110, b: 8, h: 7.5, technisch: true });
  const g2 = elementAnlegen(a, { art: "geraet", geraet: "2m", x: 141, y: 84, b: 8, h: 7.5, technisch: true });
  const g4c = elementAnlegen(a, { art: "geraet", geraet: "4m", x: 141, y: 94, b: 8, h: 7.5, technisch: true });
  const f2 = elementAnlegen(a, { art: "anschluss", medium: "funk-analog", spitze: "rechts", x: 152, y: 85, b: 54, h: 5.2, bezug: { stelle: ids.eal, eintrag: eal.funk[2]!.id } });
  const f4 = elementAnlegen(a, { art: "anschluss", medium: "funk-analog", spitze: "rechts", x: 152, y: 95, b: 54, h: 5.2, bezug: { stelle: ids.eal, eintrag: eal.funk[1]!.id } });
  elementAnlegen(a, { art: "nst-tabelle", stelle: ids.eal, x: 100, y: 124, b: 70, h: 38, spalten: ["anschlussart", "nummer", "teilnehmer"], leerzeilen: 2, gruppen: [{ anschlussart: "CAWITEL", zeilen: 4 }, { anschlussart: "AWINAP", zeilen: 3 }], technisch: true });
  elementAnlegen(a, { art: "text", text: "S 6   16/98", groesse: 9, farbe: FARBE_FUNK, x: 150, y: 33, b: 25, h: 5 });

  // Anschlüsse links, verknüpft mit den Kontakten der EAL
  const mobil = eal.kontakte.find((x) => x.art === "mobil")!;
  const tel = eal.kontakte.find((x) => x.art === "telefon")!;
  const faxK = eal.kontakte.find((x) => x.art === "fax")!;
  const aMob = elementAnlegen(a, { art: "anschluss", medium: "mobil", spitze: "links", x: 12, y: 98, b: 70, h: 5.2, bezug: { stelle: ids.eal, eintrag: mobil.id }, technisch: true });
  const aFax = elementAnlegen(a, { art: "anschluss", medium: "fax", spitze: "links", x: 12, y: 107, b: 70, h: 5.2, bezug: { stelle: ids.eal, eintrag: faxK.id }, technisch: true });
  elementAnlegen(a, { art: "anschluss", medium: "pc", spitze: "links", x: 12, y: 116, b: 70, h: 5.2, technisch: true });
  elementAnlegen(a, { art: "anschluss", medium: "mobilfunkadapter", spitze: "beide", form: "kasten", x: 14, y: 125, b: 30, h: 7, technisch: true });
  const aTel = elementAnlegen(a, { art: "anschluss", medium: "telefon", spitze: "links", x: 12, y: 136, b: 70, h: 5.2, bezug: { stelle: ids.eal, eintrag: tel.id }, technisch: true });
  const v = (von: Port, nach: Port, farbe: string) => elementAnlegen(a, { art: "verbinder", x: 0, y: 0, b: 0, h: 0, von, nach, wegpunkte: [], farbe, linie: "durchgezogen", medium: farbe === FARBE_FUNK ? "funk-analog" : "draht" });
  v(port(aMob, "r"), port(mob, "l"), FARBE_DRAHT);
  v(port(aFax, "r"), port(fax, "l"), FARBE_DRAHT);
  v(port(aTel, "r"), port(eigen, "l", 0.95), FARBE_DRAHT);
  v(port(elKasten, "r", 0.75), port(g4a, "l"), FARBE_FUNK);
  void el;
  v(port(g4b, "r"), port(g4c, "l"), FARBE_FUNK);
  v(port(g2, "r"), port(f2, "l"), FARBE_FUNK);
  v(port(g4c, "r"), port(f4, "l"), FARBE_FUNK);
  // UEAL rechts
  ids.ueal.forEach((u, i) => {
    const box = elementAnlegen(a, { art: "stelle", stelle: u, x: 222, y: 33 + i * 44, b: 64, h: 36 });
    v(port(f4, "r"), port(box, "l", 0.78), FARBE_FUNK);
    v(port(f2, "r"), port(box, "l", 0.9), FARBE_FUNK);
  });
  return a;
}

/** Skizze Zugtrupp: Einheiten unten an der Sammelschiene. */
export function skizzeZtr(plan: Plan, ids: SimbachIds): SkizzenAnsicht {
  const a = neueSkizzenAnsicht({ name: "Skizze ZTr", titel: "Technisch-/Taktische Kommunikationsskizze", fokus: ids.eal });
  const elKasten = elementAnlegen(a, { art: "stelle", stelle: ids.el, x: 12, y: 33, b: 62, h: 24 });
  const eigen = elementAnlegen(a, { art: "stelle", stelle: ids.eal, x: 100, y: 38, b: 70, h: 30 });
  elementAnlegen(a, { art: "verbinder", x: 0, y: 0, b: 0, h: 0, von: port(elKasten, "r", 0.8), nach: port(eigen, "l", 0.75), wegpunkte: [], farbe: FARBE_FUNK, linie: "durchgezogen", medium: "funk-analog" });
  const schiene = 132;
  // Einheiten links an der roten Schiene, freie Plätze rechts an einem gestrichelten Abzweig
  ids.einheiten.slice(1).forEach((e, i) => {
    const z = elementAnlegen(a, { art: "zeichen", stelle: e, x: 14 + i * 38, y: 145, b: 26, h: 26 });
    elementAnlegen(a, { art: "verbinder", x: 0, y: 0, b: 0, h: 0, von: port(eigen, "u", 0.5), nach: port(z, "o"), wegpunkte: [{ x: 135, y: schiene }], farbe: FARBE_FUNK, linie: "durchgezogen", medium: "funk-analog" });
  });
  const abzweig = elementAnlegen(a, { art: "knotenpunkt", x: 134.2, y: schiene - 0.8, b: 1.6, h: 1.6 });
  for (let i = 0; i < 6; i++) {
    const p = elementAnlegen(a, { art: "platzhalter", x: 150 + i * 22, y: 149, b: 16, h: 16 });
    elementAnlegen(a, { art: "verbinder", x: 0, y: 0, b: 0, h: 0, von: port(abzweig, "r"), nach: port(p, "o"), wegpunkte: [], farbe: "#000000", linie: "gestrichelt" });
  }
  return a;
}

export function simbachMitSkizzen(zeit: string | undefined, erste: "fb76" | "fgrfk" | "ztr"): Plan {
  const { plan, ids } = simbachPlan(zeit);
  const fgr = skizzeFgrFk(plan, ids);
  const ztr = skizzeZtr(plan, ids);
  plan.ansichten[fgr.id] = fgr;
  plan.ansichten[ztr.id] = ztr;
  plan.ansichtReihenfolge.push(fgr.id, ztr.id);
  const vorn = erste === "fgrfk" ? fgr.id : erste === "ztr" ? ztr.id : plan.ansichtReihenfolge.find((id) => plan.ansichten[id]!.typ === "kommunikationsplan")!;
  plan.ansichtReihenfolge = [vorn, ...plan.ansichtReihenfolge.filter((id) => id !== vorn)];
  return plan;
}

/** FwDV 800: Führungsgruppe mit drei Einsatzabschnitten (Feuerwehr), erfundene Daten. */
export function fwdv800Plan(zeit?: string): Plan {
  const plan = neuerPlan({ name: "Kommunikationsplan nach FwDV 800", zeit, organisation: "feuerwehr" });
  plan.kopf = { fuehrungsstelle: "Feuerwehr Musterstadt", fuer: "Brand Lagerhalle Musterstraße", fdr: "", sachbearbeiter: "S 6, Brandoberinspektor Beispiel", kennwort: "Musterhalle" };
  const tmo = (rg: string, richtung: Funkangabe["richtung"] = "unten"): Funkangabe => ({ id: neueId(), art: "digital", betrieb: "TMO", rufgruppe: rg, richtung });
  const fg = stelleAnlegen(plan, neueStelle({
    zeichen: kat("Einheiten/Führungsgruppe"), bezeichnung: "Führungsgruppe ELW 2 Musterstadt", funkrufname: "Florian Musterstadt 11/12",
    leiter: { name: "Erika Beispiel", funkrufname: "Florian Musterstadt 1/1", kontakte: [] },
    kontakte: [k("telefon", "0999 112-200"), k("fax", "0999 112-299"), k("mobil", "0999 5550100"), k("email", "elw2@feuerwehr.example.org")],
    funk: [tmo("FW_MS_1")],
  }));
  ["Nord", "Süd", "Wasserversorgung"].forEach((ea, i) =>
    stelleAnlegen(plan, neueStelle({
      zeichen: { quelle: "eigen", vorlage: "eal-fw" }, nummer: String(i + 1), beschriftung: ea, bezeichnung: `ELW 1 EA ${ea}`, funkrufname: `Florian Musterstadt ${i + 2}/11`,
      leiter: { name: ["Max Muster", "Lena Probe", "Tom Test"][i]!, funkrufname: `Florian Musterstadt ${i + 2}/1`, kontakte: [k("mobil", `0999 55501${i}1`)] },
      kontakte: [k("telefon", `0999 112-3${i}0`), k("mobil", `0999 55502${i}0`)],
      funk: [tmo(`FW_MS_EA${i + 1}`), { id: neueId(), art: "digital", betrieb: "DMO", rufgruppe: `DMO 3${i}1`, richtung: "unten" }],
    }), { unter: fg }),
  );
  const a = neueKomplanAnsicht({ name: "FwDV 800 Anlage 1", variante: "fwdv-800", fokus: fg });
  plan.ansichten[a.id] = a;
  plan.ansichtReihenfolge.unshift(a.id);
  return plan;
}
