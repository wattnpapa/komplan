/**
 * Datum-Zeit-Gruppe im THW-Format: TTHHMM + Monat (drei Buchstaben) + JJ,
 * z. B. „172027NOV26" = 17.11.2026, 20:27 Uhr. In Vorlagen kommt sie klein
 * („172027oct15") und groß („010730JUN16") vor, mit englischen Monatskürzeln.
 * Der Parser nimmt beides an und dazu die deutschen Kürzel.
 */

import type { Zeitpunkt } from "./typen";

/** Ausgabe-Kürzel (englisch, wie in den THW-Vorlagen). */
const MONATE = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

/** Eingabe-Kürzel: englisch und deutsch. */
const MONAT_EINGABE: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, MRZ: 3, "MÄR": 3, APR: 4, MAY: 5, MAI: 5, JUN: 6, JUL: 7,
  AUG: 8, SEP: 9, OCT: 10, OKT: 10, NOV: 11, DEC: 12, DEZ: 12,
};

export type DtgSchreibweise = "gross" | "klein";

const zwei = (n: number) => String(n).padStart(2, "0");

/** Zeitpunkt („2026-11-17T20:27") → DTG („172027NOV26"). */
export function dtgAusZeitpunkt(zeitpunkt: Zeitpunkt, schreibweise: DtgSchreibweise = "gross"): string {
  const t = zeitpunktZerlegen(zeitpunkt);
  if (!t) return "";
  const dtg = `${zwei(t.tag)}${zwei(t.stunde)}${zwei(t.minute)}${MONATE[t.monat - 1]}${zwei(t.jahr % 100)}`;
  return schreibweise === "klein" ? dtg.toLowerCase() : dtg;
}

/**
 * DTG → Zeitpunkt. Leerzeichen sind erlaubt („17 2027 NOV 26"). Zweistellige
 * Jahre gelten als 20xx. Ungültige Eingabe (31. Februar, 25 Uhr) → undefined.
 */
export function zeitpunktAusDtg(eingabe: string): Zeitpunkt | undefined {
  const m = eingabe.replace(/\s+/g, "").toUpperCase().match(/^(\d{2})(\d{2})(\d{2})([A-ZÄ]{3})(\d{2}|\d{4})$/);
  if (!m) return undefined;
  const [, tagT, stundeT, minuteT, monatT, jahrT] = m;
  const monat = MONAT_EINGABE[monatT!];
  if (!monat) return undefined;
  const jahr = jahrT!.length === 2 ? 2000 + Number(jahrT) : Number(jahrT);
  const tag = Number(tagT), stunde = Number(stundeT), minute = Number(minuteT);
  if (stunde > 23 || minute > 59 || tag < 1 || tag > tageImMonat(jahr, monat)) return undefined;
  return `${jahr}-${zwei(monat)}-${zwei(tag)}T${zwei(stunde)}:${zwei(minute)}`;
}

/** Normiert eine DTG-Eingabe; ungültig → undefined. */
export function dtgNormieren(eingabe: string, schreibweise: DtgSchreibweise = "gross"): string | undefined {
  const z = zeitpunktAusDtg(eingabe);
  return z ? dtgAusZeitpunkt(z, schreibweise) : undefined;
}

/** Aktuelle Ortszeit als Zeitpunkt, auf die Minute. */
export function jetzt(datum: Date = new Date()): Zeitpunkt {
  return `${datum.getFullYear()}-${zwei(datum.getMonth() + 1)}-${zwei(datum.getDate())}T${zwei(datum.getHours())}:${zwei(datum.getMinutes())}`;
}

/** „2026-11-17T20:27" → „17.11.2026 20:27". */
export function zeitpunktLesbar(zeitpunkt: Zeitpunkt): string {
  const t = zeitpunktZerlegen(zeitpunkt);
  if (!t) return zeitpunkt;
  return `${zwei(t.tag)}.${zwei(t.monat)}.${t.jahr} ${zwei(t.stunde)}:${zwei(t.minute)}`;
}

export function zeitpunktZerlegen(z: Zeitpunkt): { jahr: number; monat: number; tag: number; stunde: number; minute: number } | undefined {
  const m = z.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return undefined;
  return { jahr: Number(m[1]), monat: Number(m[2]), tag: Number(m[3]), stunde: Number(m[4]), minute: Number(m[5]) };
}

function tageImMonat(jahr: number, monat: number): number {
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}
