/**
 * Notsicherung beim Verlassen der Seite. IndexedDB schreibt asynchron; beim
 * Neuladen bricht der Browser eine laufende Transaktion ab. localStorage
 * schreibt synchron und übersteht deshalb F5 direkt nach einer Eingabe. Der
 * Editor übernimmt die Sicherung beim nächsten Öffnen und löscht sie nach dem
 * nächsten erfolgreichen Speichern.
 */

import type { Plan } from "../modell/typen";

const schluessel = (planId: string) => `komplan:notsicherung:${planId}`;

export interface Notsicherung {
  plan: Plan;
  /** Revision der Ablage, von der aus diese Fassung entstand. */
  basisRev: string | undefined;
}

export function notsicherungSchreiben(plan: Plan, basisRev: string | undefined): void {
  try {
    localStorage.setItem(schluessel(plan.id), JSON.stringify({ plan, basisRev } satisfies Notsicherung));
  } catch {
    // voll oder gesperrt: dann bleibt nur das asynchrone Speichern
  }
}

export function notsicherungLesen(planId: string): Notsicherung | undefined {
  try {
    const roh = localStorage.getItem(schluessel(planId));
    if (!roh) return undefined;
    const n = JSON.parse(roh) as Notsicherung;
    return n?.plan?.id === planId ? n : undefined;
  } catch {
    return undefined;
  }
}

export function notsicherungLoeschen(planId: string): void {
  try {
    localStorage.removeItem(schluessel(planId));
  } catch {
    // nichts zu tun
  }
}
