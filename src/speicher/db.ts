/**
 * Lokale Ablage in IndexedDB. Nichts verlässt das Gerät.
 *
 * Stores:
 *  - plaene:    Plan, Schlüssel id; im Papierkorb mit geloeschtAm
 *  - staende:   StandSchnappschuss, Schlüssel id, Index planId
 *  - werte:     kleine Einstellungen (Favoriten, zuletzt benutzte Zeichen …)
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { neueId } from "../modell/id";
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
    // Browserdaten gelöscht oder Verbindung vom Browser beendet: beim nächsten Zugriff neu öffnen
    terminated() {
      verbindung = undefined;
    },
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

/*
 * Revision je Plan (Store „werte", Schlüssel „rev:<id>"): jeder Schreibvorgang
 * setzt eine neue. Der Editor schreibt nur, wenn die Revision noch die ist,
 * von der er ausging; sonst hat ein anderer Tab oder die Planliste den Plan
 * inzwischen geändert und er meldet einen Konflikt statt still zu überschreiben.
 */
const revSchluessel = (id: string) => `rev:${id}`;
const KANAL = "komplan-plaene";

/** Meldung an andere Tabs desselben Browsers: Plan `planId` hat Revision `rev`. */
export interface PlanGeaendert {
  planId: string;
  rev: string;
  /** Kennung des meldenden Tabs; eigene Meldungen werden nicht gehört. */
  quelle?: string;
}

const DIESER_TAB = neueId();

function melden(planId: string, rev: string): void {
  try {
    const k = new BroadcastChannel(KANAL);
    k.postMessage({ planId, rev, quelle: DIESER_TAB } satisfies PlanGeaendert);
    k.close();
  } catch {
    // ohne BroadcastChannel greift die Revisionsprüfung beim Speichern
  }
}

/** Hört auf Änderungen aus anderen Tabs. Gibt die Abmeldung zurück. */
export function planAenderungenHoeren(f: (m: PlanGeaendert) => void): () => void {
  try {
    const k = new BroadcastChannel(KANAL);
    k.onmessage = (e: MessageEvent<PlanGeaendert>) => e.data?.quelle !== DIESER_TAB && f(e.data);
    return () => k.close();
  } catch {
    return () => {};
  }
}

/** Speichert ohne Rückfrage (Planliste, Einlesen, Stand als Kopie). Gibt die neue Revision zurück. */
export async function planSpeichern(plan: Plan): Promise<string> {
  const rev = neueId();
  const tx = (await db()).transaction(["plaene", "werte"], "readwrite");
  await Promise.all([tx.objectStore("plaene").put(plan), tx.objectStore("werte").put(rev, revSchluessel(plan.id)), tx.done]);
  melden(plan.id, rev);
  return rev;
}

/**
 * Speichert nur, wenn die gespeicherte Revision noch `erwartet` ist (eine
 * Transaktion, also ohne Lücke zwischen Prüfen und Schreiben).
 */
export async function planSpeichernWenn(plan: Plan, erwartet: string | undefined): Promise<{ ok: true; rev: string } | { ok: false; grund: "konflikt" | "fehlt" }> {
  const tx = (await db()).transaction(["plaene", "werte"], "readwrite");
  const werte = tx.objectStore("werte");
  const [aktuell, da] = await Promise.all([werte.get(revSchluessel(plan.id)) as Promise<string | undefined>, tx.objectStore("plaene").getKey(plan.id)]);
  if (da === undefined || aktuell !== erwartet) {
    await tx.done;
    // Plan fehlt ganz: Browserdaten gelöscht oder anderswo endgültig gelöscht
    return { ok: false, grund: da === undefined ? "fehlt" : "konflikt" };
  }
  const rev = neueId();
  await Promise.all([tx.objectStore("plaene").put(plan), werte.put(rev, revSchluessel(plan.id)), tx.done]);
  melden(plan.id, rev);
  return { ok: true, rev };
}

export async function planLaden(id: string): Promise<Plan | undefined> {
  return (await planLadenMitRev(id))?.plan;
}

/** Plan samt Revision, von der aus der Editor weiterarbeitet. */
export async function planLadenMitRev(id: string): Promise<{ plan: Plan; rev: string | undefined } | undefined> {
  const tx = (await db()).transaction(["plaene", "werte"], "readonly");
  const [roh, rev] = await Promise.all([tx.objectStore("plaene").get(id), tx.objectStore("werte").get(revSchluessel(id)), tx.done]);
  return roh ? { plan: planMigrieren(roh), rev: rev as string | undefined } : undefined;
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
  const tx = d.transaction(["plaene", "staende", "werte"], "readwrite");
  await tx.objectStore("plaene").delete(id);
  await tx.objectStore("werte").delete(revSchluessel(id));
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

/** Alle Pläne außerhalb des Papierkorbs samt Ständen, für die Sammelsicherung. */
export async function alleMitStaenden(): Promise<Array<{ plan: Plan; staende: StandSchnappschuss[] }>> {
  const plaene = (await planListe()).filter((p) => !p.geloeschtAm);
  const aus: Array<{ plan: Plan; staende: StandSchnappschuss[] }> = [];
  for (const k of plaene) {
    const plan = await planLaden(k.id);
    if (plan) aus.push({ plan, staende: await staendeVon(k.id) });
  }
  return aus;
}

/** Wann welcher Plan zuletzt als Datei gesichert wurde (Plan-ID → Zeitpunkt). */
export async function sicherungenLesen(): Promise<Record<string, string>> {
  return wertLesen<Record<string, string>>("gesichert", {});
}

export async function gesichertMerken(planIds: string[], zeit: string): Promise<void> {
  try {
    const alt = await sicherungenLesen();
    for (const id of planIds) alt[id] = zeit;
    await wertSchreiben("gesichert", alt);
  } catch {
    // nur ein Hinweis, die Sicherung selbst ist schon heruntergeladen
  }
}

export interface AblageStatus {
  /** true: Browser verwirft die Daten nicht bei Platzmangel; undefined: unbekannt. */
  dauerhaft?: boolean;
  belegt?: number;
  verfuegbar?: number;
}

export async function ablageStatus(): Promise<AblageStatus> {
  const aus: AblageStatus = {};
  try {
    if (navigator.storage?.persisted) aus.dauerhaft = await navigator.storage.persisted();
    const s = await navigator.storage?.estimate?.();
    if (s) {
      aus.belegt = s.usage;
      aus.verfuegbar = s.quota;
    }
  } catch {
    // unbekannt
  }
  return aus;
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
