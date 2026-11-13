/**
 * Kommunikationsplan als Formular THW Fb Fü 76 (A4 quer), aus demselben
 * Datenmodell: übergeordnete und benachbarte Stellen → obere Reihe,
 * eigene Führungsstelle (Fokus) → Mitte mit vier Kanalfeldern,
 * Unterstellte → Raster (4 Kästen), weitere → Reihe „Takt. Einheit"
 * (5 Kästen), danach Folgeseiten. Maße am Formular abgenommen.
 */

import { elternVon } from "../modell/baum";
import type { Funkangabe, Id, KomplanAnsicht, Kontakt, Plan, Stelle } from "../modell/typen";
import { kopfleiste, einpassen } from "../szene/kopfleiste";
import type { Element, Herkunft, Szene } from "../szene/typen";
import { textBreite } from "../szene/text";
import { funkText } from "./kontaktblock";

const B = 297, H = 210, R = 10;
const NUTZ = B - 2 * R;
const L = 0.35;
const DICK = 0.7;
const S_LABEL = 7;
const S_WERT = 8;

export function stelleKurz(s: Stelle | undefined): string {
  if (!s) return "";
  const z = s.zeichen?.quelle === "katalog" ? s.zeichen.schluessel.split("/").pop()!.replaceAll("_", " ") : s.zeichen?.quelle === "eigen" ? s.zeichen.text ?? "" : s.zeichen?.text ?? "";
  const kurz = [z.length <= 10 ? z : "", s.nummer, s.beschriftung].filter(Boolean).join(" ");
  return kurz || s.bezeichnung;
}

export const wert = (s: Stelle | undefined, art: Kontakt["art"]) => s?.kontakte.find((k) => k.art === art && k.wert)?.wert ?? "";
export const funkWert = (f: Funkangabe | undefined) => (f ? funkText(f).wert : "");

/** Fokus der Formularansicht: gewählte Stelle oder erste Wurzel. */
export function formularFokus(plan: Plan, ansicht: Pick<KomplanAnsicht, "fokus">): Id | undefined {
  if (ansicht.fokus && plan.stellen[ansicht.fokus]) return ansicht.fokus;
  return plan.wurzeln.find((w) => plan.stellen[w]);
}

/** Senkrechter Kanalpfeil der Vordrucke: Strich mit Spitze und Punkt am anderen Ende. */
export function kanalPfeil(x: number, y: number, h: number, richtung: Funkangabe["richtung"] | "gestrichelt", herkunft?: Herkunft): Element[] {
  const aus: Element[] = [];
  if (richtung === "gestrichelt") {
    aus.push({ art: "linie", punkte: [[x, y], [x, y + h]], strich: "#000", staerke: 0.4, linie: "gestrichelt", herkunft });
    return aus;
  }
  const kopf = Math.min(2.2, h * 0.3);
  const hoch = richtung === "oben";
  const spitzeY = hoch ? y : y + h;
  const punktY = hoch ? y + h - 0.9 : y + 0.9;
  aus.push({ art: "linie", punkte: [[x, hoch ? y + kopf : y + 0.9], [x, hoch ? y + h - 0.9 : y + h - kopf]], strich: "#000", staerke: 0.45, linie: "durchgezogen", herkunft });
  if (richtung !== "keine") {
    aus.push({ art: "vieleck", punkte: hoch ? [[x, spitzeY], [x + 1, y + kopf], [x - 1, y + kopf]] : [[x, spitzeY], [x + 1, y + h - kopf], [x - 1, y + h - kopf]], fuellung: "#000", herkunft });
    aus.push({ art: "kreis", x, y: punktY, r: 0.9, fuellung: "#000", herkunft });
  }
  return aus;
}

/** Bezeichnung + Wert mit gepunkteter Linie, wenn leer. */
export function feld(x: number, y: number, breite: number, label: string, w: string, herkunft?: Herkunft, labelGroesse = S_LABEL): Element[] {
  const aus: Element[] = [{ art: "text", x, y, text: label, groesse: labelGroesse, fett: true, anker: "start", herkunft }];
  const lx = x + textBreite(label, labelGroesse, true) + 1.2;
  if (w) aus.push({ art: "text", x: lx, y, text: einpassen(w, S_WERT, x + breite - lx), groesse: S_WERT, anker: "start", herkunft });
  else aus.push({ art: "linie", punkte: [[lx, y + 0.4], [x + breite, y + 0.4]], strich: "#000", staerke: 0.2, linie: "gepunktet", herkunft });
  return aus;
}

function kasten(x: number, y: number, b: number, h: number, staerke = L, linie: "durchgezogen" | "gestrichelt" = "durchgezogen"): Element {
  return { art: "rechteck", x, y, b, h, fuellung: "#ffffff", strich: "#000", staerke, linie };
}

function obereStelle(s: Stelle | undefined, x: number, y: number, b: number, h: number, kanal: Funkangabe | undefined): Element[] {
  const hk: Herkunft | undefined = s ? { stelle: s.id, rolle: "kontakt" } : undefined;
  const aus: Element[] = [kasten(x, y, b, h, DICK)];
  const zeilen: Array<[string, string]> = [["FüSt:", stelleKurz(s)], ["FuRN:", s?.funkrufname ?? ""], ["Kanal:", funkWert(kanal)], ["Tel.:", wert(s, "telefon")], ["Fax:", wert(s, "fax")]];
  zeilen.forEach(([l, w], i) => aus.push(...feld(x + 1.5, y + 5 + i * 6, b - 3, l, w, hk, 8)));
  return aus;
}

function unterstellt(s: Stelle | undefined, x: number, y: number, b: number, h: number, oben: Funkangabe | undefined, unten: Funkangabe | undefined): Element[] {
  const hk: Herkunft | undefined = s ? { stelle: s.id, rolle: "kontakt" } : undefined;
  const aus: Element[] = [kasten(x, y, b, h)];
  aus.push(...kanalPfeil(x + 2.5, y + 1.5, 7, "oben", hk));
  aus.push(...feld(x + 5, y + 5.5, b - 7, "Kanal 2 / 4 m:", funkWert(oben), hk, 6));
  aus.push(...feld(x + 5, y + 18, b - 7, "FüSt:", stelleKurz(s), hk, 6));
  aus.push(...feld(x + 5, y + 30, b - 7, "FuRN:", s?.funkrufname ?? "", hk, 6));
  aus.push(...feld(x + 5, y + 36, b - 7, "Tel.:", wert(s, "telefon"), hk, 6));
  aus.push(...feld(x + 5, y + 41, b - 7, "Fax.:", wert(s, "fax"), hk, 6));
  aus.push(...kanalPfeil(x + 2.5, y + h - 8.5, 7, "unten", hk));
  aus.push(...feld(x + 5, y + h - 1.8, b - 7, "Kanal 2 / 4 m:", funkWert(unten), hk, 6));
  return aus;
}

function taktEinheit(s: Stelle | undefined, x: number, y: number, b: number, h: number, oben: Funkangabe | undefined): Element[] {
  const hk: Herkunft | undefined = s ? { stelle: s.id, rolle: "kontakt" } : undefined;
  const aus: Element[] = [kasten(x, y, b, h)];
  aus.push(...kanalPfeil(x + 2.5, y + 1.2, 6, "oben", hk));
  aus.push(...feld(x + 5, y + 5, b - 7, "Kanal 2 / 4 m:", funkWert(oben), hk, 6));
  aus.push(...feld(x + 5, y + 11.5, b - 7, "Takt. Einheit:", stelleKurz(s), hk, 6));
  aus.push(...kanalPfeil(x + 2.5, y + 12.5, 9.5, "unten", hk));
  const untenKanal = s?.funk.find((f) => f.richtung === "unten");
  aus.push(...feld(x + 5, y + 17.5, b - 7, "Kanal 2 / 4 m:", funkWert(untenKanal), hk, 6));
  aus.push(...feld(x + 5, y + 21.5, b - 7, "FuRN:", s?.funkrufname ?? "", hk, 6));
  const k2 = s?.funk.find((f) => f.art === "analog" && f.band === "2m");
  aus.push(...feld(x + 5, y + h + 5.5, b - 7, "Kanal 2 m:", funkWert(k2), hk, 6));
  return aus;
}

/** Kanal einer unterstellten Stelle nach oben: eigener „oben"-Kanal, sonst der Führungskanal der eigenen Stelle. */
function kanalNachOben(s: Stelle | undefined, fokus: Stelle): Funkangabe | undefined {
  if (!s) return undefined;
  return s.funk.find((f) => f.richtung === "oben" || f.richtung === "beide") ?? fokus.funk.find((f) => f.richtung === "unten" || f.richtung === "beide");
}

export function fbfue76Szene(plan: Plan, ansicht: KomplanAnsicht): Szene {
  const fokusId = formularFokus(plan, ansicht);
  const fokus = fokusId ? plan.stellen[fokusId] : undefined;
  const bild = plan.kopf.logo ? plan.bilder[plan.kopf.logo] : undefined;
  const leer: Stelle = { id: "", typ: "stelle", beschriftung: "", zusatzzeilen: [], bezeichnung: "", kontakte: [], funk: [], nebenstellen: [], kinder: [], anbindung: { lage: "unten", linie: "durchgezogen" } };
  const f = fokus ?? leer;

  // obere Reihe: übergeordnete, Nachbarn aus der Ansicht, dann Geschwister
  const eltern = fokusId ? elternVon(plan, fokusId) : null;
  const geschwister = eltern ? plan.stellen[eltern]!.kinder.filter((k) => k !== fokusId) : [];
  const obere = [...new Set([...(eltern ? [eltern] : []), ...(ansicht.nachbarn ?? []), ...geschwister])].filter((id) => plan.stellen[id]).slice(0, 4);

  const kinder = f.kinder.filter((k) => plan.stellen[k]);
  const proSeite = 9; // 4 im Raster, 5 in der Reihe „Takt. Einheit"
  const seitenZahl = Math.max(1, Math.ceil(kinder.length / proSeite));
  const elemente: Element[] = [];
  const seiten: Array<{ y: number; h: number }> = [];

  for (let seite = 0; seite < seitenZahl; seite++) {
    const oy = seite * (H + 10);
    seiten.push({ y: oy, h: H });
    const v = (e: Element): Element => verschieben(e, 0, oy);
    const kopf = kopfleiste({
      breite: NUTZ,
      formular: "Fb Fü 76",
      titel: seitenZahl > 1 ? `Kommunikationsplan (Blatt ${seite + 1} von ${seitenZahl})` : "Kommunikationsplan",
      kopf: plan.kopf,
      dtg: plan.stand.dtg,
      logo: bild ? { daten: bild.daten, breite: bild.breite, hoehe: bild.hoehe } : undefined,
      organisationText: plan.organisation === "thw" ? "Technisches\nHilfswerk" : undefined,
    });
    elemente.push(...kopf.elemente.map((e) => v(verschieben(e, R, R))));

    // Obere Reihe (4 Kästen)
    const ob = NUTZ / 4;
    for (let i = 0; i < 4; i++) {
      const s = obere[i] ? plan.stellen[obere[i]!] : undefined;
      const kanal = s?.funk.find((x) => x.richtung === "unten" || x.richtung === "beide") ?? s?.funk[0];
      elemente.push(...obereStelle(s, R + i * ob, 32.3, ob, 30.5, kanal).map(v));
    }

    // Eigene Führungsstelle
    const hf: Herkunft | undefined = fokus ? { stelle: fokus.id, rolle: "knoten" } : undefined;
    elemente.push(v({ ...kasten(R, 66.3, 22.8, 11.5, DICK), herkunft: hf }));
    elemente.push(v({ art: "linie", punkte: [[R, 77.8], [R, 81.8]], strich: "#000", staerke: DICK, linie: "durchgezogen" }));
    if (f.zeichen) elemente.push(v({ art: "zeichen", x: R + 1, y: 66.3 + 11.5 / 2 - 20.8 / 2, groesse: 20.8, ref: f.zeichen, herkunft: hf }));
    const beschr = [f.nummer, f.beschriftung].filter(Boolean).join(" ");
    if (beschr) elemente.push(v({ art: "text", x: R + 25, y: 74, text: beschr, groesse: 10, fett: true, anker: "start", herkunft: hf }));
    const bandY = 81.8, bandH = 24.4;
    elemente.push(v(kasten(R, bandY, NUTZ, bandH, DICK)));
    const xs = [R, R + 44.6, R + 89.2, R + 133.1, R + 176.5, R + 222.3, R + NUTZ];
    elemente.push(v({ art: "linie", punkte: [[R, bandY + 9.6], [xs[5]!, bandY + 9.6]], strich: "#000", staerke: L, linie: "durchgezogen" }));
    elemente.push(v({ art: "linie", punkte: [[R + 101, bandY], [R + 101, bandY + 9.6]], strich: "#000", staerke: L, linie: "durchgezogen" }));
    elemente.push(v({ art: "linie", punkte: [[xs[5]!, bandY], [xs[5]!, bandY + bandH]], strich: "#000", staerke: L, linie: "durchgezogen" }));
    for (let i = 1; i < 5; i++) elemente.push(v({ art: "linie", punkte: [[xs[i]!, bandY + 9.6], [xs[i]!, bandY + bandH]], strich: "#000", staerke: L, linie: "durchgezogen" }));
    elemente.push(v({ art: "text", x: R + 1.5, y: bandY + 3.5, text: "Bezeichnung der", groesse: 6.5, anker: "start" }));
    elemente.push(...feld(R + 1.5, bandY + 7.6, 97, "Führungsstelle:", f.bezeichnung, hf, 7).map(v));
    elemente.push(...feld(R + 103, bandY + 7.6, xs[5]! - R - 105, "Funkrufname:", f.funkrufname ?? "", hf, 7).map(v));
    elemente.push(...feld(xs[5]! + 1.5, bandY + 5, NUTZ - xs[5]! + R - 3, "MobilfunkNr:", wert(f, "mobil"), hf, 6).map(v));
    elemente.push(...feld(xs[5]! + 1.5, bandY + 14, NUTZ - xs[5]! + R - 3, "Telefax:", wert(f, "fax"), hf, 6).map(v));
    elemente.push(...feld(xs[5]! + 1.5, bandY + 22.5, NUTZ - xs[5]! + R - 3, "Telefon:", wert(f, "telefon"), hf, 6).map(v));
    // vier Kanalfelder + ein freies Feld
    for (let i = 0; i < 5; i++) {
      const k = f.funk[i];
      const x0 = xs[i]!, w = xs[i + 1]! - x0;
      if (i === 4) {
        elemente.push(...feld(x0 + 2, bandY + 15, w - 4, "", funkWert(k), hf, 6).map(v));
        continue;
      }
      const richtung = k ? (k.richtung === "keine" ? "gestrichelt" : k.richtung) : i === 2 ? "gestrichelt" : i === 1 ? "unten" : i === 3 ? "unten" : "oben";
      elemente.push(...kanalPfeil(x0 + 3, bandY + 11, 11.5, richtung === "beide" ? "unten" : richtung, hf).map(v));
      const label = k ? (k.art === "digital" ? `Rufgr. ${k.betrieb}:` : `Kanal ${k.band === "4m" ? "4" : "2"} m:`) : i === 2 ? "Kanal:" : i === 3 ? "Kanal 2 m:" : "Kanal 4 m:";
      elemente.push(...feld(x0 + 6, bandY + 15.5, w - 8, label, funkWert(k), hf, 6).map(v));
      elemente.push(...feld(x0 + 6, bandY + 22.6, w - 8, "Bedingung:", k?.bedingung ?? "", hf, 6).map(v));
    }

    // Raster der Unterstellten und Reihe „Takt. Einheit"
    const teil = kinder.slice(seite * proSeite, (seite + 1) * proSeite).map((k) => plan.stellen[k]!);
    const spalten = [R - 0.4, R + 56.6, R + 113.6, R + 170.9, R + 227.2];
    const sb = 49.7;
    for (let i = 0; i < 4; i++) {
      const s = teil[i];
      elemente.push(...unterstellt(s, spalten[i]!, 110.7, sb, 46.9, kanalNachOben(s, f), s?.funk.find((x) => x.richtung === "unten")).map(v));
    }
    // NSt-Feld
    elemente.push(v(kasten(spalten[4]!, 110.7, sb, 46.9)));
    elemente.push(v({ art: "text", x: spalten[4]! + 3, y: 115, text: "NSt:", groesse: 8, anker: "start" }));
    if (seite === 0) {
      f.nebenstellen.slice(0, 9).forEach((n, i) =>
        elemente.push(v({ art: "text", x: spalten[4]! + 3, y: 120 + i * 4, text: einpassen(`${n.nummer}  ${n.teilnehmer}`, 7.5, sb - 5), groesse: 7.5, anker: "start", herkunft: hf })),
      );
    }
    for (let i = 0; i < 5; i++) {
      const s = teil[4 + i];
      elemente.push(...taktEinheit(s, spalten[i]!, 159.3, sb, 23.2, kanalNachOben(s, f)).map(v));
    }
  }
  return { breite: B, hoehe: seitenZahl * (H + 10) - 10, elemente, seiten };
}

export function verschieben(e: Element, dx: number, dy: number): Element {
  if (e.art === "linie" || e.art === "vieleck") return { ...e, punkte: e.punkte.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
  return { ...e, x: e.x + dx, y: e.y + dy };
}

export const FORMULAR_SCHRIFT = { S_LABEL, S_WERT };
