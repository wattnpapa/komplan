/**
 * Suche über Katalog und eigene Zeichen. Treffer nach Rang: exakter Kurzname,
 * Synonym, Wortanfang im Titel, Teilwort. Umlaute und Groß-/Kleinschreibung
 * werden angeglichen („fuehrung" findet „Führung").
 */

import type { Organisation, ZeichenRef } from "../modell/typen";
import { EIGENE_VORLAGEN } from "./eigen/vorlagen";
import { KATALOG } from "./katalog";

export interface Suchtreffer {
  ref: ZeichenRef;
  titel: string;
  /** Ordner oder „Eigene Zeichen". */
  kategorie: string;
  organisation?: Organisation;
  rang: number;
}

/** Synonyme, die nicht im Dateinamen oder Titel stehen. Schlüssel = Katalogschlüssel. */
export const SYNONYME: Record<string, string[]> = {
  "Führungsstellen/EAL": ["einsatzabschnittsleitung", "abschnitt", "ea"],
  "Führungsstellen/UEAL": ["unterabschnitt", "uea", "unterabschnittsleitung"],
  "Führungsstellen/TEL": ["technische einsatzleitung"],
  "Führungsstellen/EL": ["einsatzleitung", "einsatzleiter"],
  "Führungsstellen/ÖEL": ["örtliche einsatzleitung", "oel"],
  "Führungsstellen/KatSL": ["katastrophenschutzleitung", "katsl"],
  "Führungsstellen/Führungsstab": ["füstab", "stab"],
  "Einrichtungen/Leitstelle": ["lts", "lst"],
  "Einrichtungen/Bereitstellungsraum": ["br", "bereitstellung"],
  "Einrichtungen/Logistikstützpunkt": ["log", "logistik"],
  "Einrichtungen/Versorgungsstelle_Verpflegung": ["log-v", "verpflegung"],
  "Einrichtungen/Versorgungsstelle_Materialerhaltung": ["log-m"],
  "Einrichtungen/Versorgungsstelle_Verbrauchsgüter": ["log-vg"],
  "THW_Einheiten/Zugtrupp": ["ztr", "zugtrupp thw", "zug trupp"],
  "THW_Einheiten/Zugtrupp_FZ-FK": ["fz fk", "fzfk", "fachzug führung kommunikation", "zugtrupp fk"],
  "THW_Einheiten/Fachzug_Führung_Kommunikation": ["fz fk", "fzfk"],
  "THW_Einheiten/FGr_Führung-Kommunikation": ["fgr fk", "fk"],
  "THW_Einheiten/FGr_Logistik-Verpflegung": ["log-v", "logv"],
  "THW_Einheiten/FGr_Logistik_Materialwirtschaft": ["log-mw", "log-m"],
  "THW_Einheiten/FGr_Logistik_Materialerhaltungstrupp": ["log-me"],
  "THW_Einheiten/FGr_Logistik_Materialwirtschaft_Verbrauchsgüterversorgungstrupp": ["log-vg", "verbrauchsgüter"],
  "THW_Einheiten/BR_Stab": ["br", "bereitstellungsraum"],
  "THW_Einheiten/Technischer_Zug": ["tz", "techn. zug"],
};

const ORDNER_ORG: Array<[RegExp, Organisation]> = [
  [/^THW_/, "thw"],
  [/^Feuerwehr_/, "feuerwehr"],
  [/^Polizei_/, "polizei"],
  [/^Rettungswesen_/, "rettungsdienst"],
  [/^Wasserrettung_/, "wasserrettung"],
  [/^Bundeswehr_/, "bundeswehr"],
];

export function ordnerOrganisation(ordner: string): Organisation | undefined {
  return ORDNER_ORG.find(([r]) => r.test(ordner))?.[1];
}

export function normalisieren(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[_\-./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Eintrag {
  ref: ZeichenRef;
  titel: string;
  kategorie: string;
  organisation?: Organisation;
  kurz: string;
  begriffe: string[];
  heuhaufen: string;
}

let index: Eintrag[] | undefined;

function aufbauen(): Eintrag[] {
  const liste: Eintrag[] = [];
  for (const k of KATALOG) {
    const name = k.schluessel.split("/").pop()!;
    const begriffe = (SYNONYME[k.schluessel] ?? []).map(normalisieren);
    liste.push({
      ref: { quelle: "katalog", schluessel: k.schluessel },
      titel: k.titel,
      kategorie: k.ordner.replaceAll("_", " "),
      organisation: ordnerOrganisation(k.ordner),
      kurz: normalisieren(name),
      begriffe,
      heuhaufen: normalisieren(`${name} ${k.titel} ${k.ordner} ${begriffe.join(" ")}`),
    });
  }
  for (const v of EIGENE_VORLAGEN) {
    const begriffe = v.begriffe.map(normalisieren);
    liste.push({
      ref: { quelle: "eigen", vorlage: v.id },
      titel: v.titel,
      kategorie: "Eigene Zeichen",
      kurz: normalisieren(v.vorgabe.text ?? v.id),
      begriffe,
      heuhaufen: normalisieren(`${v.titel} ${v.id} ${begriffe.join(" ")}`),
    });
  }
  return liste;
}

/**
 * Sucht Zeichen. Mehrere Wörter müssen alle vorkommen. `organisation`
 * bevorzugt passende Ordner, filtert aber nicht.
 */
export function zeichenSuchen(anfrage: string, optionen: { organisation?: Organisation; grenze?: number } = {}): Suchtreffer[] {
  index ??= aufbauen();
  const q = normalisieren(anfrage);
  if (!q) return [];
  const woerter = q.split(" ");
  const treffer: Suchtreffer[] = [];
  for (const e of index) {
    if (!woerter.every((w) => e.heuhaufen.includes(w))) continue;
    let rang = 0;
    if (e.kurz === q) rang += 100;
    else if (e.begriffe.includes(q)) rang += 90;
    if (e.kurz.startsWith(q)) rang += 40;
    if (normalisieren(e.titel).startsWith(q)) rang += 30;
    if (woerter.every((w) => e.heuhaufen.split(" ").some((t) => t.startsWith(w)))) rang += 20;
    if (optionen.organisation && e.organisation === optionen.organisation) rang += 15;
    if (e.kategorie === "Führungsstellen") rang += 5;
    // Bei Gleichstand das Original aus der Sammlung vor der eigenen Variante.
    if (e.kategorie === "Eigene Zeichen") rang -= 40;
    rang -= e.titel.length / 100;
    treffer.push({ ref: e.ref, titel: e.titel, kategorie: e.kategorie, organisation: e.organisation, rang });
  }
  treffer.sort((a, b) => b.rang - a.rang || a.titel.localeCompare(b.titel, "de"));
  return treffer.slice(0, optionen.grenze ?? 60);
}

/** Alle Kategorien in Anzeigereihenfolge (für das Blättern ohne Suche). */
export function kategorien(): Array<{ kategorie: string; eintraege: Suchtreffer[] }> {
  index ??= aufbauen();
  const gruppen = new Map<string, Suchtreffer[]>();
  for (const e of index) {
    const liste = gruppen.get(e.kategorie) ?? [];
    liste.push({ ref: e.ref, titel: e.titel, kategorie: e.kategorie, organisation: e.organisation, rang: 0 });
    gruppen.set(e.kategorie, liste);
  }
  const vorne = ["Eigene Zeichen", "Führungsstellen", "THW Einheiten", "Feuerwehr Einheiten", "Einrichtungen", "Einheiten"];
  return [...gruppen.entries()]
    .sort(([a], [b]) => {
      const ia = vorne.indexOf(a), ib = vorne.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, "de");
    })
    .map(([kategorie, eintraege]) => ({ kategorie, eintraege }));
}
