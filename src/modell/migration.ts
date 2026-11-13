/**
 * Versionierte Datei- und Speicherform. Jede inkompatible Änderung am Modell
 * erhöht SCHEMA_VERSION und bekommt hier einen Schritt vN → vN+1.
 */

import { SCHEMA_VERSION } from "./plan";
import type { Plan, StandSchnappschuss } from "./typen";

export const DATEI_FORMAT = "komplan";

export interface PlanDatei {
  format: typeof DATEI_FORMAT;
  schemaVersion: number;
  plan: Plan;
  staende?: StandSchnappschuss[];
}

type Schritt = (plan: Record<string, unknown>) => Record<string, unknown>;

/** Schritte ab Version n (Index n-1 hebt von n auf n+1). */
export const SCHRITTE: Schritt[] = [];

export class DateiFehler extends Error {}

/** Hebt einen gespeicherten Plan auf die aktuelle Schema-Version. */
export function planMigrieren(roh: unknown): Plan {
  if (!roh || typeof roh !== "object") throw new DateiFehler("Kein Plan in den Daten.");
  let plan = { ...(roh as Record<string, unknown>) };
  let version = Number(plan.schemaVersion);
  if (!Number.isInteger(version) || version < 1) throw new DateiFehler("Die Datei nennt keine gültige Schema-Version.");
  if (version > SCHEMA_VERSION) {
    throw new DateiFehler(`Die Datei stammt aus einer neueren Fassung von komplan (Schema ${version}, diese Fassung kennt ${SCHEMA_VERSION}). Bitte die Seite neu laden.`);
  }
  while (version < SCHEMA_VERSION) {
    const schritt = SCHRITTE[version - 1];
    if (!schritt) throw new DateiFehler(`Kein Migrationsschritt von Schema ${version}.`);
    plan = schritt(plan);
    version++;
    plan.schemaVersion = version;
  }
  planPruefen(plan);
  return plan as unknown as Plan;
}

/** Grobe Formprüfung, damit kaputte oder fremde Dateien nicht die Oberfläche sprengen. */
function planPruefen(p: Record<string, unknown>): void {
  const fehlt = (feld: string) => {
    throw new DateiFehler(`Die Datei ist kein vollständiger Plan (Feld „${feld}" fehlt oder ist falsch).`);
  };
  if (typeof p.id !== "string") fehlt("id");
  if (typeof p.name !== "string") fehlt("name");
  if (!p.stellen || typeof p.stellen !== "object") fehlt("stellen");
  if (!Array.isArray(p.wurzeln)) fehlt("wurzeln");
  if (!p.ansichten || typeof p.ansichten !== "object") fehlt("ansichten");
  if (!Array.isArray(p.ansichtReihenfolge)) fehlt("ansichtReihenfolge");
  if (!p.kopf || typeof p.kopf !== "object") fehlt("kopf");
  if (!p.stand || typeof p.stand !== "object") fehlt("stand");
  for (const [id, s] of Object.entries(p.stellen as Record<string, Record<string, unknown>>)) {
    if (!s || s.id !== id || !Array.isArray(s.kinder) || !Array.isArray(s.kontakte) || !Array.isArray(s.funk)) fehlt(`stellen.${id}`);
  }
  if (!Array.isArray(p.loseStellen)) p.loseStellen = [];
  if (!Array.isArray(p.fussnoten)) p.fussnoten = [];
  if (!p.verbindungen || typeof p.verbindungen !== "object") p.verbindungen = {};
  if (!p.bilder || typeof p.bilder !== "object") p.bilder = {};
}

export function dateiSchreiben(plan: Plan, staende?: StandSchnappschuss[]): string {
  const datei: PlanDatei = { format: DATEI_FORMAT, schemaVersion: SCHEMA_VERSION, plan };
  if (staende?.length) datei.staende = staende;
  return JSON.stringify(datei, null, 2);
}

export function dateiLesen(text: string): { plan: Plan; staende: StandSchnappschuss[] } {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    throw new DateiFehler("Die Datei ist kein gültiges JSON.");
  }
  const d = roh as Partial<PlanDatei>;
  if (!d || d.format !== DATEI_FORMAT) throw new DateiFehler("Das ist keine komplan-Datei.");
  const plan = planMigrieren(d.plan);
  const staende = (Array.isArray(d.staende) ? d.staende : []).map((s) => ({ ...s, plan: planMigrieren(s.plan) }));
  return { plan, staende };
}
