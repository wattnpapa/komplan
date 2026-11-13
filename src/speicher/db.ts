/**
 * Lokale Ablage in IndexedDB. Nichts verlässt das Gerät.
 *
 * Stores:
 *  - plaene:    Plan, Schlüssel id; im Papierkorb mit geloeschtAm
 *  - staende:   StandSchnappschuss, Schlüssel id, Index planId
 *  - werte:     kleine Einstellungen (Favoriten, zuletzt benutzte Zeichen …)
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { planMigrieren } from "../modell/migration";
import type { Plan, StandSchnappschuss } from "../modell/typen";

interface KomplanDb extends DBSchema {
  plaene: { key: string; value: Plan };
  staende: { key: string; value: StandSchnappschuss; indexes: { planId: string } };
  werte: { key: string; value: unknown };
}

const NAME = "komplan";
const VERSION = 1;
/** Pläne im Papierkorb werden nach dieser Zeit endgültig gelöscht. */
export const PAPIERKORB_TAGE = 30;

let verbindung: Promise<IDBPDatabase<KomplanDb>> | undefined;

function db(): Promise<IDBPDatabase<KomplanDb>> {
  verbindung ??= openDB<KomplanDb>(NAME, VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains("plaene")) d.createObjectStore("plaene", { keyPath: "id" });
      if (!d.objectStoreNames.contains("staende")) d.createObjectStore("staende", { keyPath: "id" }).createIndex("planId", "planId");
      if (!d.objectStoreNames.contains("werte")) d.createObjectStore("werte");
    },
  });
  return verbindung;
}

/** Nur für Tests: andere Verbindung (fake-indexeddb) erzwingen. */
export function verbindungZuruecksetzen(): void {
  verbindung = undefined;
}

export async function planSpeichern(plan: Plan): Promise<void> {
  await (await db()).put("plaene", plan);
}

export async function planLaden(id: string): Promise<Plan | undefined> {
  const roh = await (await db()).get("plaene", id);
  return roh ? planMigrieren(roh) : undefined;
}

export interface PlanKurz {
  id: string;
  name: string;
  geaendert: string;
  stand: string;
  stellen: number;
  geloeschtAm?: string;
}

export async function planListe(): Promise<PlanKurz[]> {
  const alle = await (await db()).getAll("plaene");
  return alle
    .map((p) => ({ id: p.id, name: p.name, geaendert: p.geaendert, stand: p.stand.dtg, stellen: Object.keys(p.stellen).length, geloeschtAm: p.geloeschtAm }))
    .sort((a, b) => b.geaendert.localeCompare(a.geaendert));
}

export async function planEndgueltigLoeschen(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(["plaene", "staende"], "readwrite");
  await tx.objectStore("plaene").delete(id);
  const staende = tx.objectStore("staende");
  for (const key of await staende.index("planId").getAllKeys(id)) await staende.delete(key);
  await tx.done;
}

/** Räumt den Papierkorb auf (älter als PAPIERKORB_TAGE). */
export async function papierkorbAufraeumen(jetzt = new Date()): Promise<number> {
  const grenze = new Date(jetzt.getTime() - PAPIERKORB_TAGE * 86400_000).toISOString().slice(0, 16);
  let n = 0;
  for (const p of await planListe()) {
    if (p.geloeschtAm && p.geloeschtAm < grenze) {
      await planEndgueltigLoeschen(p.id);
      n++;
    }
  }
  return n;
}

export async function standSpeichern(s: StandSchnappschuss): Promise<void> {
  await (await db()).put("staende", s);
}

export async function staendeVon(planId: string): Promise<StandSchnappschuss[]> {
  const liste = await (await db()).getAllFromIndex("staende", "planId", planId);
  return liste.sort((a, b) => b.stand.version - a.stand.version);
}

export async function wertLesen<T>(schluessel: string, vorgabe: T): Promise<T> {
  try {
    const w = await (await db()).get("werte", schluessel);
    return (w as T) ?? vorgabe;
  } catch {
    return vorgabe;
  }
}

export async function wertSchreiben(schluessel: string, wert: unknown): Promise<void> {
  await (await db()).put("werte", wert, schluessel);
}

/** Bittet den Browser, die Daten nicht bei Platzmangel zu verwerfen. */
export async function dauerhaftAnfragen(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
