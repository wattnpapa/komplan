/**
 * Maßstab für die PDF-Ausgabe: Die Szene wird so vergrößert oder verkleinert,
 * dass die taktischen Zeichen eine gewünschte Breite in mm bekommen. Bezug ist
 * die Breite der Grundform (x = 10 … 246 in der 256er-viewBox) des größten
 * Zeichens der Szene. „Teilen" hält die Breite genau, „einpassen" höchstens,
 * soweit der Plan auf eine Seite passt.
 */

import type { Szene } from "./typen";

/** Vorgabe für die Zeichenbreite im PDF in mm. */
export const ZEICHEN_BREITE_STANDARD = 50;
export const ZEICHEN_BREITE_MIN = 5;
export const ZEICHEN_BREITE_MAX = 300;

/** Anteil der Grundform an der Kantenlänge des Zeichen-Quadrats. */
const FORM_ANTEIL = 236 / 256;

/** Breite der Grundform des größten Zeichens in der Szene (mm), 0 ohne Zeichen. */
export function zeichenBreiteInSzene(szene: Pick<Szene, "elemente">): number {
  let max = 0;
  for (const e of szene.elemente) if (e.art === "zeichen" && e.groesse > max) max = e.groesse;
  return max * FORM_ANTEIL;
}

/** Gewünschte Breite auf den erlaubten Bereich begrenzen; ungültig → Vorgabe. */
export function zeichenBreiteBegrenzen(breite: number | undefined): number {
  if (breite === undefined || !Number.isFinite(breite) || breite <= 0) return ZEICHEN_BREITE_STANDARD;
  return Math.min(ZEICHEN_BREITE_MAX, Math.max(ZEICHEN_BREITE_MIN, breite));
}

/** Faktor Szene-mm → Papier-mm, damit die Zeichen `breite` mm breit werden. Ohne Zeichen 1. */
export function zeichenMassstab(szene: Pick<Szene, "elemente">, breite: number | undefined): number {
  const ist = zeichenBreiteInSzene(szene);
  return ist > 0 ? zeichenBreiteBegrenzen(breite) / ist : 1;
}

/** Seitenmaße (quer) und Ränder der PDF-Ausgabe in mm. */
export const PDF_SEITE: Record<"A4" | "A3", [number, number]> = { A4: [297, 210], A3: [420, 297] };
export const PDF_RAND = 10;
export const PDF_FUSS = 7;
/** Höhe des Einstufungsvermerks oben. */
export const PDF_VERMERK = 5;
/** Größte Vergrößerung beim Einpassen ohne Zeichenbreite. */
const EINPASSEN_MAX = 2;

/** Bedruckbare Fläche einer Seite in mm. */
export function pdfNutzflaeche(format: "A4" | "A3", ausrichtung: "quer" | "hoch", mitVermerk: boolean): { seiteB: number; seiteH: number; nutzB: number; nutzH: number } {
  const [lang, kurz] = PDF_SEITE[format];
  const seiteB = ausrichtung === "quer" ? lang : kurz, seiteH = ausrichtung === "quer" ? kurz : lang;
  return { seiteB, seiteH, nutzB: seiteB - 2 * PDF_RAND, nutzH: seiteH - 2 * PDF_RAND - PDF_FUSS - (mitVermerk ? PDF_VERMERK : 0) };
}

/**
 * Maßstab für „einpassen": so groß, dass der Plan auf die Seite passt, die
 * Zeichen aber höchstens `zeichenBreite` mm breit werden. Ohne Zeichenbreite
 * oder ohne Zeichen höchstens doppelt so groß wie die Szene.
 */
export function einpassMassstab(szene: Pick<Szene, "breite" | "hoehe" | "elemente">, nutzB: number, nutzH: number, zeichenBreite?: number): number {
  const passt = Math.min(nutzB / szene.breite, nutzH / szene.hoehe);
  const grenze = zeichenBreite !== undefined && zeichenBreiteInSzene(szene) > 0 ? zeichenMassstab(szene, zeichenBreite) : EINPASSEN_MAX;
  return Math.min(passt, grenze);
}
