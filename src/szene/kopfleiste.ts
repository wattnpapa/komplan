/**
 * Kopfleiste nach den THW-Vordrucken Fb Fü 76/77 („Allgemeines"):
 * oben ein blauer Balken mit Formularnummer links, Titel mittig, Logo rechts;
 * darunter links die herausgebende Führungsstelle (ggf. Funktion des
 * Verfassers), mittig „für …", rechts Stand, F.d.R. und Einstufung.
 * Proportionen am Formular Fb Fü 76 (A4 quer) abgenommen.
 */

import type { Formularkopf } from "../modell/typen";
import type { Element } from "./typen";
import { textBreite } from "./text";

export const THW_BLAU = "#0000ff";
const LINIE = 0.35;

export interface KopfDaten {
  breite: number;
  formular?: string;
  titel: string;
  kopf: Formularkopf;
  dtg: string;
  logo?: { daten: string; breite: number; hoehe: number };
  /** Ersatz, wenn kein Logo da ist (z. B. „Technisches Hilfswerk"). */
  organisationText?: string;
}

/** Kürzt Text mit „…", damit er in `breite` mm passt. */
export function einpassen(text: string, groesse: number, breite: number, fett = false): string {
  if (textBreite(text, groesse, fett) <= breite) return text;
  let t = text;
  while (t.length > 1 && textBreite(`${t}…`, groesse, fett) > breite) t = t.slice(0, -1);
  return `${t}…`;
}

/**
 * Im schmalen Feld rechts steht der Vermerk wie im Vordruck kurz („VS-NfD").
 * Der volle Wortlaut steht im PDF zusätzlich oben (und unten) auf der Seite.
 */
export function einstufungKurz(text: string, breite: number): string {
  if (textBreite(text, 8, true) <= breite) return text;
  if (/nur f(ü|ue)r den dienstgebrauch/i.test(text)) return "VS-NfD";
  return text;
}

export function kopfleiste(d: KopfDaten): { elemente: Element[]; h: number } {
  const e: Element[] = [];
  const b = d.breite;
  const h1 = 8.5;
  const h2 = 10;
  const hk = { rolle: "kopf" as const };
  const rahmen = (x: number, y: number, w: number, h: number, fuellung = "#ffffff") =>
    e.push({ art: "rechteck", x, y, b: w, h, fuellung, strich: "#000000", staerke: LINIE, herkunft: hk });

  // Zeile 1: Formularnummer | Titel (blau) | Logo
  const c1 = Math.max(18, b * 0.085);
  const c3 = Math.max(26, b * 0.135);
  rahmen(0, 0, c1, h1);
  rahmen(c1, 0, b - c1 - c3, h1, THW_BLAU);
  rahmen(b - c3, 0, c3, h1);
  if (d.formular) e.push({ art: "text", x: c1 / 2, y: h1 * 0.68, text: d.formular, groesse: 11, fett: true, anker: "middle", herkunft: hk });
  e.push({ art: "text", x: c1 + (b - c1 - c3) / 2, y: h1 * 0.68, text: einpassen(d.titel, 11, b - c1 - c3 - 4, true), groesse: 11, fett: true, anker: "middle", farbe: "#ffffff", herkunft: hk });
  if (d.logo) {
    const verh = d.logo.breite / d.logo.hoehe;
    const lh = h1 - 1.4;
    const lb = Math.min(c3 - 2, lh * verh);
    e.push({ art: "bild", x: b - c3 + (c3 - lb) / 2, y: 0.7, b: lb, h: lb / verh, daten: d.logo.daten, herkunft: hk });
  } else if (d.organisationText) {
    const zeilen = d.organisationText.split("\n").slice(0, 2);
    zeilen.forEach((z, i) =>
      e.push({ art: "text", x: b - c3 / 2, y: zeilen.length === 1 ? h1 * 0.66 : 3.4 + i * 3.4, text: einpassen(z, 8, c3 - 2, true), groesse: zeilen.length === 1 ? 9 : 8, fett: true, anker: "middle", farbe: THW_BLAU, herkunft: hk }),
    );
  }

  // Zeile 2: Führungsstelle | für | Stand / F.d.R. / Einstufung
  const y = h1;
  const d1 = b * 0.15;
  const d3 = b * 0.29;
  const d2 = b - d1 - d3;
  rahmen(0, y, d1, h2);
  rahmen(d1, y, d2, h2);
  rahmen(d1 + d2, y, d3, h2);
  const klein = 6.5;
  const wert = 9;
  e.push({ art: "text", x: 1.2, y: y + 2.8, text: "Führungsstelle", groesse: klein, fett: true, anker: "start", herkunft: hk });
  const fs = [d.kopf.fuehrungsstelle, d.kopf.verfasserFunktion].filter(Boolean).join(", ");
  if (fs) e.push({ art: "text", x: 1.2, y: y + 7.6, text: einpassen(fs, wert, d1 - 2.4, true), groesse: wert, fett: true, anker: "start", herkunft: hk });
  e.push({ art: "text", x: d1 + d2 / 2, y: y + 2.8, text: "für", groesse: klein, anker: "middle", herkunft: hk });
  if (d.kopf.fuer) e.push({ art: "text", x: d1 + d2 / 2, y: y + 7.6, text: einpassen(d.kopf.fuer, wert, d2 - 4, true), groesse: wert, fett: true, anker: "middle", herkunft: hk });
  const x3 = d1 + d2 + 1.2;
  e.push({ art: "text", x: x3, y: y + 4, text: "Stand:", groesse: 8, fett: true, anker: "start", herkunft: hk });
  e.push({ art: "text", x: x3 + 11, y: y + 4, text: d.dtg, groesse: 8, anker: "start", herkunft: hk });
  e.push({ art: "text", x: x3, y: y + 8.4, text: "F.d.R.:", groesse: 8, fett: true, anker: "start", herkunft: hk });
  if (d.kopf.fdr) e.push({ art: "text", x: x3 + 11, y: y + 8.4, text: einpassen(d.kopf.fdr, 8, d3 - 13.5), groesse: 8, anker: "start", herkunft: hk });
  if (d.kopf.einstufung) {
    e.push({ art: "text", x: b - 1.2, y: y + 4, text: einpassen(einstufungKurz(d.kopf.einstufung, d3 * 0.5), 8, d3 * 0.5, true), groesse: 8, fett: true, anker: "end", farbe: "#000000", herkunft: hk });
  }
  return { elemente: e, h: h1 + h2 };
}
