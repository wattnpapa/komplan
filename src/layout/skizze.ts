/**
 * Kommunikationsskizze Fb Fü 77: Plan + Skizzen-Ansicht → Szene. Elemente
 * liegen frei auf dem Blatt (mm). Stellen-Kästen und Anschlüsse mit Bezug
 * lesen ihre Angaben aus dem Plan; die Skizze selbst speichert nur Lage.
 *
 * Detailstufe „taktisch" blendet Geräte, NSt-Tabellen, Draht-Anschlüsse und
 * als technisch markierte Elemente aus, dazu Telefon/Fax in den Kästen
 * (Fb Fü 76 „Allgemeines": taktische Skizze für Führungskräfte).
 */

import type { Funkangabe, Kontakt, Plan, Rahmen, SkAnschluss, SkizzenAnsicht, SkizzenElement, SkNstTabelle, SkStelle, Stelle } from "../modell/typen";
import type { Element, Herkunft, Szene } from "../szene/typen";
import { kopfleiste } from "../szene/kopfleiste";
import { textBreite, zeilenHoehe } from "../szene/text";
import { funkText } from "./kontaktblock";
import { verbinderWeg } from "./route";

export const PAPIER_MM: Record<"A4" | "A3", [number, number]> = { A4: [297, 210], A3: [420, 297] };
export const SKIZZE_RAND = 10;
const SCHWARZ = "#000000";
const LINIE = 0.3;

export function blattGroesse(ansicht: Pick<SkizzenAnsicht, "papier">): [number, number] {
  const [l, k] = PAPIER_MM[ansicht.papier.format];
  return ansicht.papier.ausrichtung === "quer" ? [l, k] : [k, l];
}

/** Ist das Element in der gewählten Detailstufe zu sehen? */
export function sichtbar(e: SkizzenElement, detail: SkizzenAnsicht["detail"], alle?: Record<string, SkizzenElement>): boolean {
  if (detail === "technisch") return true;
  if (e.technisch) return false;
  if (e.art === "geraet" || e.art === "nst-tabelle") return false;
  if (e.art === "anschluss" && !String(e.medium).startsWith("funk")) return false;
  if (e.art === "verbinder" && alle) {
    for (const p of [e.von, e.nach]) {
      if ("element" in p) {
        const z = alle[p.element];
        if (z && !sichtbar(z, detail)) return false;
      }
    }
  }
  return true;
}

export const MEDIUM_TEXT: Record<SkAnschluss["medium"], string> = {
  "funk-analog": "", "funk-digital": "", telefon: "Tel", fax: "Fax", mobil: "Mobilfunk", email: "E-Mail", daten: "Daten", draht: "Draht", melder: "Melder", sonstig: "", pc: "PC", mobilfunkadapter: "Mobilfunkadapter",
};

/** Fahne (Fünf- bzw. Sechseck) eines Anschlusses. */
export function fahne(x: number, y: number, b: number, h: number, spitze: SkAnschluss["spitze"]): Array<[number, number]> {
  const t = Math.min(h * 0.75, 4);
  const l = spitze === "links" || spitze === "beide" ? t : 0;
  const r = spitze === "rechts" || spitze === "beide" ? t : 0;
  const m = y + h / 2;
  const p: Array<[number, number]> = [[x + l, y], [x + b - r, y]];
  if (r) p.push([x + b, m]);
  p.push([x + b - r, y + h], [x + l, y + h]);
  if (l) p.push([x, m]);
  return p;
}

/** Funkzeichen der Vordrucke: Überstrich und Zacken („VVV"). */
export function welle(x: number, y: number, b: number, h: number, herkunft?: Herkunft): Element[] {
  const zacken = 3;
  const schritt = b / (zacken * 2);
  const punkte: Array<[number, number]> = [[x, y + h * 0.3]];
  for (let i = 0; i < zacken; i++) {
    punkte.push([x + (2 * i + 1) * schritt, y + h], [x + (2 * i + 2) * schritt, y + h * 0.3]);
  }
  return [
    { art: "linie", punkte: [[x, y], [x + b, y]], strich: SCHWARZ, staerke: 0.3, linie: "durchgezogen", herkunft },
    { art: "linie", punkte, strich: SCHWARZ, staerke: 0.3, linie: "durchgezogen", herkunft },
  ];
}

function anschlussText(e: SkAnschluss, plan: Plan): { label: string; wert: string; funk: boolean } {
  const funk = String(e.medium).startsWith("funk");
  if (e.bezug) {
    const s = plan.stellen[e.bezug.stelle];
    const k = s?.kontakte.find((x) => x.id === e.bezug!.eintrag);
    const f = s?.funk.find((x) => x.id === e.bezug!.eintrag);
    if (k) return { label: MEDIUM_TEXT[e.medium], wert: k.wert, funk };
    if (f) return { label: "", wert: funkText(f).wert, funk: true };
  }
  return { label: e.medium === "sonstig" ? "" : MEDIUM_TEXT[e.medium], wert: e.text ?? "", funk };
}

function anschlussZeichnen(e: SkAnschluss, plan: Plan, h: Herkunft): Element[] {
  const aus: Element[] = [];
  const { label, wert, funk } = anschlussText(e, plan);
  if (e.form === "kasten") {
    aus.push({ art: "rechteck", x: e.x, y: e.y, b: e.b, h: e.h, fuellung: "#ffffff", strich: SCHWARZ, staerke: LINIE, herkunft: h });
    aus.push({ art: "text", x: e.x + 2, y: e.y + e.h * 0.68, text: [label, wert].filter(Boolean).join(" "), groesse: 7.5, fett: true, anker: "start", herkunft: h });
    return aus;
  }
  aus.push({ art: "vieleck", punkte: fahne(e.x, e.y, e.b, e.h, e.spitze), fuellung: "#ffffff", strich: SCHWARZ, staerke: LINIE, herkunft: h });
  let x = e.x + (e.spitze === "links" || e.spitze === "beide" ? Math.min(e.h * 0.75, 4) : 1) + 1;
  const grund = e.y + e.h * 0.68;
  if (funk) {
    aus.push(...welle(x, e.y + e.h * 0.25, 6, e.h * 0.45, h));
    x += 8;
  }
  if (label) {
    aus.push({ art: "text", x, y: grund, text: label, groesse: 7, fett: true, anker: "start", herkunft: h });
    x += textBreite(label, 7, true) + 2;
  }
  if (wert) aus.push({ art: "text", x, y: grund, text: wert, groesse: 8, anker: "start", herkunft: h });
  return aus;
}

const KONTAKT_LABEL: Record<Kontakt["art"], string> = { telefon: "Tel.", fax: "Fax.", mobil: "Mobilfunk.", email: "Mail", sat: "Sat.", messenger: "Messenger", sonstig: "" };

/**
 * Inhalt eines Stellen-Kastens: Kontaktzeilen [Bezeichnung, Wert] und
 * Funk-Fahnen. Tel. und Fax stehen nur da, wenn die Stelle sie hat; leere
 * Zeilen zum Ausfüllen nur mit `leereTelFax` (Vorlagen). Ein Kontakt ohne
 * Nummer wird zur Linie zum Ausfüllen.
 */
export function stelleInhalt(e: SkStelle, s: Stelle | undefined, detail: SkizzenAnsicht["detail"]): { zeilen: Array<[string, string]>; funk: Array<Funkangabe | undefined> } {
  if (e.inhalt === "rahmen") return { zeilen: [], funk: [] };
  const zeige = e.zeige && e.zeige.length ? new Set(e.zeige) : undefined;
  const kontakte = detail === "technisch" ? (s?.kontakte ?? []).filter((k) => (!zeige || zeige.has(k.id)) && k.art !== "email") : [];
  const zeilen: Array<[string, string]> = kontakte.map((k) => [`${k.bezeichnung || KONTAKT_LABEL[k.art]}:`, k.wert]);
  if (detail === "technisch" && e.leereTelFax) {
    if (!kontakte.some((k) => k.art === "telefon")) zeilen.unshift(["Tel.:", ""]);
    if (!kontakte.some((k) => k.art === "fax")) zeilen.splice(1, 0, ["Fax.:", ""]);
  }
  const funk: Array<Funkangabe | undefined> = (s?.funk ?? []).filter((f) => !zeige || zeige.has(f.id));
  while (funk.length < (e.leereFunk ?? 0)) funk.push(undefined);
  return { zeilen, funk };
}

const ZEICHEN_KASTEN = 13;

/** Mindesthöhe des Kastens unter dem Zeichen für seinen Inhalt. */
function inhaltHoehe(e: SkStelle, zeilen: number, funk: number): number {
  if (e.inhalt === "rahmen") return 0;
  return zeilen * ZEILE + funk * (FAHNE_H + 1.2) + 2.5;
}
const ZEILE = 4.6;
const FAHNE_H = 4.6;

function stelleZeichnen(e: SkStelle, plan: Plan, detail: SkizzenAnsicht["detail"], h: Herkunft): Element[] {
  const s = plan.stellen[e.stelle];
  const aus: Element[] = [];
  const zs = ZEICHEN_KASTEN;
  // Zeichen so setzen, dass sein Kasten (viewBox 10..246 × 64..192) bei e.x/e.y liegt
  const zx = e.x - (zs * 10) / 256, zy = e.y - (zs * 64) / 256;
  const kastenH = (zs * 128) / 256;
  if (s?.zeichen) aus.push({ art: "zeichen", x: zx, y: zy, groesse: zs, ref: s.zeichen, herkunft: h });
  else aus.push({ art: "rechteck", x: e.x, y: e.y, b: (zs * 236) / 256, h: kastenH, fuellung: "#ffffff", strich: SCHWARZ, staerke: 0.6, herkunft: h });
  const lx = e.x + (zs * 236) / 256 + 1.2;
  aus.push({ art: "text", x: lx, y: e.y + kastenH - 0.6, text: "Funkrufname:", groesse: 7, fett: true, anker: "start", herkunft: h });
  if (s?.funkrufname) aus.push({ art: "text", x: lx + textBreite("Funkrufname:", 7, true) + 1.2, y: e.y + kastenH - 0.6, text: s.funkrufname, groesse: 8, anker: "start", herkunft: h });
  const beschriftung = s ? [s.nummer, s.beschriftung].filter(Boolean).join(" ") : "";
  if (beschriftung) aus.push({ art: "text", x: lx, y: e.y + 3, text: beschriftung, groesse: 7.5, anker: "start", herkunft: h });

  const { zeilen, funk } = stelleInhalt(e, s, detail);
  const oben = e.y + kastenH + 2.5;
  const inhaltH = inhaltHoehe(e, zeilen.length, funk.length);
  const hoehe = Math.max(e.y + e.h - oben, inhaltH);
  aus.push({ art: "rechteck", x: e.x, y: oben, b: e.b, h: hoehe, fuellung: "#ffffff", strich: SCHWARZ, staerke: LINIE, herkunft: h });
  let y = oben + 1;
  for (const [label, wert] of zeilen) {
    y += ZEILE;
    const gx = e.x + 2;
    aus.push({ art: "text", x: gx, y: y - 1, text: label, groesse: 7, fett: true, anker: "start", herkunft: h });
    const wx = gx + Math.max(10, textBreite(label, 7, true) + 1.2);
    if (wert) aus.push({ art: "text", x: wx, y: y - 1, text: wert, groesse: 8, anker: "start", herkunft: h });
    else aus.push({ art: "linie", punkte: [[wx, y - 0.8], [e.x + e.b - 3, y - 0.8]], strich: SCHWARZ, staerke: 0.2, linie: "gepunktet", herkunft: h });
  }
  for (const f of funk) {
    y += 1.2;
    const fb = e.b - 6;
    aus.push({ art: "vieleck", punkte: fahne(e.x + 1.5, y, fb, FAHNE_H, "beide"), fuellung: "#ffffff", strich: SCHWARZ, staerke: LINIE, herkunft: h });
    aus.push(...welle(e.x + 6, y + FAHNE_H * 0.25, 6, FAHNE_H * 0.45, h));
    if (f) {
      const t = funkText(f);
      aus.push({ art: "text", x: e.x + 14, y: y + FAHNE_H * 0.7, text: t.wert, groesse: 8, anker: "start", herkunft: h });
    }
    y += FAHNE_H;
  }
  return aus;
}

function nstZeichnen(e: SkNstTabelle, plan: Plan, h: Herkunft): Element[] {
  const aus: Element[] = [];
  const s = plan.stellen[e.stelle];
  const daten = s?.nebenstellen ?? [];
  const gruppenNamen: string[] = [...(e.gruppen ?? []).map((g) => g.anschlussart)];
  for (const n of daten) if (!gruppenNamen.includes(n.anschlussart)) gruppenNamen.push(n.anschlussart);
  const gruppen = gruppenNamen.map((name) => {
    const eintraege = daten.filter((n) => n.anschlussart === name);
    const mindest = e.gruppen?.find((g) => g.anschlussart === name)?.zeilen ?? 1;
    return { name, eintraege, zeilen: Math.max(mindest, eintraege.length) };
  });
  const zeilen = gruppen.reduce((n, g) => n + g.zeilen, 0) + e.leerzeilen;
  const kopfH = 4.5;
  const zh = Math.max(3.8, (e.h - kopfH) / Math.max(1, zeilen));
  const anteil: Record<SkNstTabelle["spalten"][number], number> = { anschlussart: 0.2, technik: 0.14, nummer: 0.14, teilnehmer: 0.52 };
  const summe = e.spalten.reduce((n, sp) => n + anteil[sp], 0);
  const breiten = e.spalten.map((sp) => (anteil[sp] / summe) * e.b);
  const xs = breiten.reduce<number[]>((a, b, i) => [...a, a[i]! + b], [e.x]);
  const hoehe = kopfH + zeilen * zh;
  aus.push({ art: "rechteck", x: e.x, y: e.y, b: e.b, h: hoehe, fuellung: "#ffffff", strich: SCHWARZ, staerke: 0.4, herkunft: h });
  const titel: Record<string, string> = { anschlussart: "", technik: "Technik", nummer: "NSt-Nr.", teilnehmer: "Teilnehmer" };
  e.spalten.forEach((sp, i) => {
    if (titel[sp]) aus.push({ art: "text", x: xs[i]! + 1, y: e.y + kopfH - 1.2, text: titel[sp]!, groesse: 7, fett: true, anker: "start", herkunft: h });
    if (i > 0) aus.push({ art: "linie", punkte: [[xs[i]!, e.y], [xs[i]!, e.y + hoehe]], strich: SCHWARZ, staerke: LINIE, linie: "durchgezogen", herkunft: h });
  });
  aus.push({ art: "linie", punkte: [[e.x, e.y + kopfH], [e.x + e.b, e.y + kopfH]], strich: SCHWARZ, staerke: LINIE, linie: "durchgezogen", herkunft: h });
  const artSpalte = e.spalten.indexOf("anschlussart");
  let y = e.y + kopfH;
  const zeile = (werte: Partial<Record<SkNstTabelle["spalten"][number], string>>, erste: boolean, gruppenStart: boolean) => {
    e.spalten.forEach((sp, i) => {
      const w = werte[sp];
      if (w && !(sp === "anschlussart" && !erste)) aus.push({ art: "text", x: xs[i]! + 1, y: y + zh * 0.72, text: w, groesse: sp === "anschlussart" ? 7 : 8, fett: sp === "anschlussart", anker: "start", herkunft: h });
    });
    // Zeilenlinie: in der Anschlussart-Spalte nur am Gruppenanfang
    const x0 = artSpalte >= 0 && !gruppenStart ? xs[artSpalte + 1]! : e.x;
    if (y > e.y + kopfH) aus.push({ art: "linie", punkte: [[x0, y], [e.x + e.b, y]], strich: SCHWARZ, staerke: 0.2, linie: "durchgezogen", herkunft: h });
    y += zh;
  };
  for (const g of gruppen) {
    for (let i = 0; i < g.zeilen; i++) {
      const n = g.eintraege[i];
      zeile({ anschlussart: g.name, technik: n?.technik, nummer: n?.nummer, teilnehmer: n?.teilnehmer }, i === 0, i === 0);
    }
  }
  for (let i = 0; i < e.leerzeilen; i++) zeile({}, true, true);
  return aus;
}

const GERAET_TEXT: Record<string, string> = { "4m": "4 m", "2m": "2 m", mobfu: "Mob Fu", handy: "Handy", fax: "Fax", pc: "PC", tel: "Tel", sonstig: "" };

function elementZeichnen(e: SkizzenElement, plan: Plan, ansicht: SkizzenAnsicht, rahmen: (id: string) => Rahmen | undefined): Element[] {
  const h: Herkunft = { element: e.id, rolle: "skizze", ...("stelle" in e && e.stelle ? { stelle: e.stelle } : {}) };
  switch (e.art) {
    case "stelle":
      return stelleZeichnen(e, plan, ansicht.detail, h);
    case "anschluss":
      return anschlussZeichnen(e, plan, h);
    case "geraet": {
      const t = e.text ?? GERAET_TEXT[e.geraet] ?? "";
      // Zu breit für den Kasten: an Leerzeichen umbrechen („Mob Fu")
      const zeilen = textBreite(t, 7, true) > e.b - 1.5 && t.includes(" ") ? t.split(" ") : [t];
      return [
        { art: "rechteck", x: e.x, y: e.y, b: e.b, h: e.h, fuellung: "#ffffff", strich: SCHWARZ, staerke: 0.55, herkunft: h },
        ...zeilen.map((z, i) => ({ art: "text" as const, x: e.x + 1, y: e.y + (zeilen.length === 1 ? e.h * 0.62 : 3 + i * 2.8), text: z, groesse: 7, fett: true, anker: "start" as const, herkunft: h })),
      ];
    }
    case "nst-tabelle":
      return nstZeichnen(e, plan, h);
    case "platzhalter":
      return [
        { art: "rechteck", x: e.x, y: e.y, b: e.b, h: e.h, fuellung: "#ffffff", strich: SCHWARZ, staerke: 0.3, linie: "gepunktet", herkunft: h },
        ...(e.text ? [{ art: "text" as const, x: e.x + e.b / 2, y: e.y + e.h / 2 + 1, text: e.text, groesse: 7, anker: "middle" as const, herkunft: h }] : []),
      ];
    case "zeichen": {
      const s = e.stelle ? plan.stellen[e.stelle] : undefined;
      const ref = s?.zeichen ?? e.zeichen;
      const text = e.text ?? (s ? s.funkrufname || [s.nummer, s.beschriftung].filter(Boolean).join(" ") : "");
      const g = Math.min(e.b, e.h);
      const aus: Element[] = [{ art: "zeichen", x: e.x + (e.b - g) / 2, y: e.y, groesse: g, ref, herkunft: h }];
      text.split("\n").forEach((z, i) => aus.push({ art: "text", x: e.x + e.b / 2, y: e.y + g * 0.94 + (i + 1) * zeilenHoehe(7.5) * 0.9, text: z, groesse: 7.5, anker: "middle", herkunft: h }));
      return aus;
    }
    case "text":
      return e.text.split("\n").map((z, i) => ({ art: "text" as const, x: e.x, y: e.y + (i + 0.8) * zeilenHoehe(e.groesse), text: z, groesse: e.groesse, fett: e.fett, farbe: e.farbe, anker: "start" as const, herkunft: h }));
    case "rahmen":
      return [
        { art: "rechteck", x: e.x, y: e.y, b: e.b, h: e.h, strich: SCHWARZ, staerke: 0.35, linie: e.linie, herkunft: h },
        ...(e.text ? [{ art: "text" as const, x: e.x + 1.5, y: e.y + 4, text: e.text, groesse: 8, fett: true, anker: "start" as const, herkunft: h }] : []),
      ];
    case "knotenpunkt":
      return e.b < 2 && e.h < 2
        ? [{ art: "kreis", x: e.x + e.b / 2, y: e.y + e.h / 2, r: 0.8, fuellung: SCHWARZ, herkunft: h }]
        : [{ art: "rechteck", x: e.x, y: e.y, b: Math.max(e.b, 0.4), h: Math.max(e.h, 0.4), fuellung: SCHWARZ, herkunft: h }];
    case "verbinder": {
      const weg = verbinderWeg(e, rahmen);
      if (!weg) return [];
      return [{ art: "linie", punkte: weg, strich: e.farbe, staerke: 0.45, linie: e.linie, herkunft: h }];
    }
  }
}

/** Rahmen eines Elements zum Andocken; Stellen-Kästen wachsen mit ihrem Inhalt. */
export function elementRahmen(e: SkizzenElement, plan: Plan, detail: SkizzenAnsicht["detail"]): Rahmen {
  if (e.art === "stelle") {
    const { zeilen, funk } = stelleInhalt(e, plan.stellen[e.stelle], detail);
    const kastenH = (ZEICHEN_KASTEN * 128) / 256;
    return { x: e.x, y: e.y, b: e.b, h: Math.max(e.h, kastenH + 2.5 + inhaltHoehe(e, zeilen.length, funk.length)) };
  }
  return { x: e.x, y: e.y, b: e.b, h: e.h };
}

export function skizzeSzene(plan: Plan, ansicht: SkizzenAnsicht): Szene {
  const [blattB, blattH] = blattGroesse(ansicht);
  const elemente: Element[] = [];
  const bild = plan.kopf.logo ? plan.bilder[plan.kopf.logo] : undefined;
  const kopf = kopfleiste({
    breite: blattB - 2 * SKIZZE_RAND,
    formular: "Fb Fü 77",
    titel: ansicht.titel,
    kopf: plan.kopf,
    dtg: plan.stand.dtg,
    logo: bild ? { daten: bild.daten, breite: bild.breite, hoehe: bild.hoehe } : undefined,
    organisationText: plan.organisation === "thw" ? "Technisches\nHilfswerk" : undefined,
  });
  elemente.push(...kopf.elemente.map((e) => verschieben(e, SKIZZE_RAND, SKIZZE_RAND)));

  const rahmenCache = new Map<string, Rahmen>();
  const rahmen = (id: string) => {
    let r = rahmenCache.get(id);
    if (!r) {
      const e = ansicht.elemente[id];
      if (!e || !sichtbar(e, ansicht.detail)) return undefined;
      r = elementRahmen(e, plan, ansicht.detail);
      rahmenCache.set(id, r);
    }
    return r;
  };
  let maxX = blattB, maxY = blattH;
  // Verbinder zuerst (hinter den Elementen), dann die übrigen in Ebenenreihenfolge
  const reihenfolge = ansicht.reihenfolge.filter((id) => ansicht.elemente[id]);
  const verbinder = reihenfolge.filter((id) => ansicht.elemente[id]!.art === "verbinder");
  const rest = reihenfolge.filter((id) => ansicht.elemente[id]!.art !== "verbinder");
  for (const id of [...verbinder, ...rest]) {
    const e = ansicht.elemente[id]!;
    if (!sichtbar(e, ansicht.detail, ansicht.elemente)) continue;
    const teile = elementZeichnen(e, plan, ansicht, rahmen);
    elemente.push(...teile);
    if (e.art !== "verbinder") {
      const r = elementRahmen(e, plan, ansicht.detail);
      maxX = Math.max(maxX, r.x + r.b + SKIZZE_RAND);
      maxY = Math.max(maxY, r.y + r.h + SKIZZE_RAND);
    }
  }
  return { breite: maxX, hoehe: maxY, elemente };
}

function verschieben(e: Element, dx: number, dy: number): Element {
  if (e.art === "linie" || e.art === "vieleck") return { ...e, punkte: e.punkte.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
  return { ...e, x: e.x + dx, y: e.y + dy };
}

