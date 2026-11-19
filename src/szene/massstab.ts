/**
 * Maßstab für die PDF-Ausgabe „auf Seiten teilen": Die Szene wird so
 * vergrößert oder verkleinert, dass die taktischen Zeichen eine gewünschte
 * Breite in mm bekommen. Bezug ist die Breite der Grundform (x = 10 … 246 in
 * der 256er-viewBox) des größten Zeichens der Szene.
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
