/**
 * Szene: flache Liste von Zeichenelementen in mm auf dem Blatt. Das Layout
 * rechnet sie aus, SVG/PNG/PDF/PPTX zeichnen sie. Muster aus einsatzauftrag
 * (satz.ts → zeichnen.ts). Reihenfolge = Zeichenreihenfolge (hinten → vorn).
 */

import type { Id, Linienart, ZeichenRef } from "../modell/typen";

/** Woher ein Element stammt: für Auswahl, Klick und Kontextmenü. */
export interface Herkunft {
  stelle?: Id;
  /** Skizzenelement (Fb Fü 77). */
  element?: Id;
  rolle?: "knoten" | "beschriftung" | "kontakt" | "unterstellung" | "verbindung" | "hervorhebung" | "kopf" | "einklapp" | "fussnote" | "skizze";
}

interface Basis {
  herkunft?: Herkunft;
}

export interface Rechteck extends Basis {
  art: "rechteck";
  x: number; y: number; b: number; h: number;
  fuellung?: string;
  strich?: string;
  staerke?: number; // mm
  linie?: Linienart;
  deckkraft?: number;
}

export interface Linienzug extends Basis {
  art: "linie";
  punkte: Array<[number, number]>;
  strich: string;
  staerke: number; // mm
  linie: Linienart;
}

export interface Text extends Basis {
  art: "text";
  /** x am Anker, y = Grundlinie. */
  x: number; y: number;
  text: string;
  groesse: number; // pt
  fett?: boolean;
  anker: "start" | "middle" | "end";
  farbe?: string;
  /** Unterstrichen oder Hinweisfarbe (z. B. Gültigkeit). */
  unterstrichen?: boolean;
}

export interface Zeichen extends Basis {
  art: "zeichen";
  /** Quadrat, in das die 256er-viewBox des Zeichens gelegt wird. */
  x: number; y: number; groesse: number;
  ref?: ZeichenRef;
}

export interface Vieleck extends Basis {
  art: "vieleck";
  punkte: Array<[number, number]>;
  fuellung?: string;
  strich?: string;
  staerke?: number;
  linie?: Linienart;
}

export interface Kreis extends Basis {
  art: "kreis";
  x: number; y: number; r: number;
  fuellung?: string;
  strich?: string;
  staerke?: number;
}

/** Rasterbild (Logo), PNG/JPEG als data-URL. */
export interface Bild extends Basis {
  art: "bild";
  x: number; y: number; b: number; h: number;
  daten: string;
}

export type Element = Rechteck | Linienzug | Text | Zeichen | Vieleck | Kreis | Bild;

export interface Szene {
  breite: number; // mm
  hoehe: number;  // mm
  elemente: Element[];
  /**
   * Formularansichten mit Folgeseiten: Seiten liegen untereinander in der
   * Szene; das PDF gibt jede als eigene Seite aus.
   */
  seiten?: Array<{ y: number; h: number }>;
}

/** Strichmuster in mm für SVG/PDF; schwarzweiß unterscheidbar. */
export function strichmuster(linie: Linienart | undefined, staerke: number): number[] | undefined {
  if (linie === "gestrichelt") return [staerke * 8, staerke * 5];
  if (linie === "gepunktet") return [staerke * 0.1, staerke * 3];
  return undefined;
}

export const PT_IN_MM = 25.4 / 72;
