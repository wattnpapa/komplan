/**
 * Stand-Verwaltung: „Neuen Stand anlegen" hebt den laufenden Plan auf die
 * nächste Version mit neuem DTG und friert genau diesen Inhalt als
 * Schnappschuss ein. Jeder Schnappschuss zeigt also den Inhalt, der unter
 * seiner Versionsnummer ausgegeben wurde. Der Prüfwert `stand.inhalt` zeigt,
 * ob der Plan seitdem geändert wurde. Der Vergleich listet, was sich zwischen
 * zwei Ständen geändert hat.
 */

import { elternKarte } from "./baum";
import { dtgAusZeitpunkt } from "./dtg";
import { neueId } from "./id";
import type { Funkangabe, Id, Kontakt, Plan, StandSchnappschuss, Stelle, Zeitpunkt } from "./typen";

export function standEinfrieren(plan: Plan, zeit: Zeitpunkt): StandSchnappschuss {
  return { id: neueId(), planId: plan.id, stand: { ...plan.stand }, angelegt: zeit, plan: structuredClone(plan) };
}

/**
 * Prüfwert über den Inhalt des Plans: Stellen, Kontakte, Ansichten, Kopf.
 * Nicht dazu gehören Stand, Zeiten, Papierkorb, ID und Name (Umbenennen in
 * der Planliste oder „(eingelesen)" ist keine inhaltliche Änderung).
 * FNV-1a über die JSON-Form, 32 Bit, hex.
 */
export function inhaltsSchluessel(plan: Plan): string {
  const { stand: _s, geaendert: _g, geloeschtAm: _l, angelegt: _a, schemaVersion: _v, id: _i, name: _n, ...inhalt } = plan;
  const text = JSON.stringify(inhalt);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Hält den jetzigen Inhalt als Inhalt des laufenden Stands fest (verändert `plan`). */
export function standInhaltFesthalten(plan: Plan): void {
  plan.stand.inhalt = inhaltsSchluessel(plan);
}

/** Wurde der Plan seit dem Festlegen seines Stands geändert? Ohne Prüfwert: nein. */
export function seitStandGeaendert(plan: Plan): boolean {
  return plan.stand.inhalt !== undefined && plan.stand.inhalt !== inhaltsSchluessel(plan);
}

/**
 * Neuer Stand für den laufenden Plan (verändert `plan`). `version` erlaubt,
 * eine Nummer zu überspringen, die schon ein Schnappschuss trägt.
 */
export function standWeiterzaehlen(plan: Plan, neuerZeitpunkt: Zeitpunkt, bemerkung?: string, version = plan.stand.version + 1): void {
  plan.stand = { dtg: dtgAusZeitpunkt(neuerZeitpunkt), zeitpunkt: neuerZeitpunkt, version, ...(bemerkung ? { bemerkung } : {}) };
  standInhaltFesthalten(plan);
}

/**
 * Was „Neuen Stand anlegen" tun soll: Ist der laufende Stand unverändert und
 * noch nicht eingefroren, wird er selbst festgehalten. Sonst kommt die nächste
 * freie Version (höher als alle eingefrorenen, auch nach Rückgängig).
 */
export function naechsterStand(plan: Plan, eingefroren: number[]): { weiterzaehlen: false } | { weiterzaehlen: true; version: number } {
  if (!seitStandGeaendert(plan) && !eingefroren.includes(plan.stand.version)) return { weiterzaehlen: false };
  return { weiterzaehlen: true, version: Math.max(plan.stand.version, ...eingefroren) + 1 };
}

export interface Aenderung {
  art: "neu" | "entfernt" | "geaendert";
  stelle?: Id;
  text: string;
}

function name(s: Stelle): string {
  const z = s.zeichen?.quelle === "katalog" ? s.zeichen.schluessel.split("/").pop()!.replaceAll("_", " ") : s.zeichen?.quelle === "eigen" ? s.zeichen.text ?? s.zeichen.vorlage.toUpperCase() : s.zeichen?.text;
  return [z, s.nummer, s.beschriftung].filter(Boolean).join(" ") || s.bezeichnung || "(ohne Namen)";
}

const kontaktText = (k: Kontakt) => `${k.bezeichnung || k.art} ${k.wert || "(leer)"}${k.gueltigAb ? ` ab ${k.gueltigAb.replace("T", " ")}` : ""}${k.gueltigBis ? ` bis ${k.gueltigBis.replace("T", " ")}` : ""}`;
const funkText = (f: Funkangabe) => (f.art === "digital" ? `${f.betrieb} ${f.rufgruppe}` : `${f.band} Kanal ${f.kanal} ${f.betriebsart}`) + (f.richtung !== "keine" ? ` (${f.richtung})` : "");

function listeVergleichen<T extends { id: Id }>(alt: T[], neu: T[], text: (x: T) => string, was: string, stelle: Stelle, aus: Aenderung[]): void {
  const altK = new Map(alt.map((x) => [x.id, x]));
  const neuK = new Map(neu.map((x) => [x.id, x]));
  for (const [id, n] of neuK) {
    const a = altK.get(id);
    if (!a) aus.push({ art: "neu", stelle: stelle.id, text: `${name(stelle)}: ${was} ${text(n)} hinzugefügt` });
    else if (text(a) !== text(n)) aus.push({ art: "geaendert", stelle: stelle.id, text: `${name(stelle)}: ${was} ${text(a)} → ${text(n)}` });
  }
  for (const [id, a] of altK) if (!neuK.has(id)) aus.push({ art: "entfernt", stelle: stelle.id, text: `${name(stelle)}: ${was} ${text(a)} entfernt` });
}

/** Änderungen von `alt` nach `neu`. */
export function planVergleichen(alt: Plan, neu: Plan): Aenderung[] {
  const aus: Aenderung[] = [];
  const elternAlt = elternKarte(alt), elternNeu = elternKarte(neu);
  for (const s of Object.values(neu.stellen)) {
    const a = alt.stellen[s.id];
    if (!a) {
      aus.push({ art: "neu", stelle: s.id, text: `${name(s)} hinzugefügt` });
      continue;
    }
    const felder: Array<[string, (x: Stelle) => string | undefined]> = [
      ["Zeichen", (x) => JSON.stringify(x.zeichen ?? null)],
      ["Beschriftung", (x) => [x.nummer, x.beschriftung, ...x.zusatzzeilen].filter(Boolean).join(" ")],
      ["Bezeichnung", (x) => x.bezeichnung],
      ["Funkrufname", (x) => x.funkrufname],
      ["Betrieb durch", (x) => x.betriebDurch],
      ["Leiter", (x) => x.leiter?.name],
    ];
    for (const [f, wert] of felder) {
      const va = wert(a) ?? "", vn = wert(s) ?? "";
      if (va !== vn) aus.push({ art: "geaendert", stelle: s.id, text: f === "Zeichen" ? `${name(s)}: Zeichen geändert` : `${name(s)}: ${f} „${va}" → „${vn}"` });
    }
    const pa = elternAlt.get(s.id), pn = elternNeu.get(s.id);
    if (pa !== pn) {
      const t = (p: Id | null | undefined, plan: Plan) => (p && plan.stellen[p] ? name(plan.stellen[p]!) : "keiner Stelle");
      aus.push({ art: "geaendert", stelle: s.id, text: `${name(s)}: unterstellt unter ${t(pa, alt)} → ${t(pn, neu)}` });
    }
    listeVergleichen(a.kontakte, s.kontakte, kontaktText, "Kontakt", s, aus);
    listeVergleichen(a.funk, s.funk, funkText, "Funk", s, aus);
    listeVergleichen(a.nebenstellen, s.nebenstellen, (n) => `${n.nummer} ${n.teilnehmer}`, "Nebenstelle", s, aus);
  }
  for (const a of Object.values(alt.stellen)) if (!neu.stellen[a.id]) aus.push({ art: "entfernt", stelle: a.id, text: `${name(a)} entfernt` });
  for (const f of ["fuehrungsstelle", "fuer", "fdr", "einstufung"] as const) {
    if ((alt.kopf[f] ?? "") !== (neu.kopf[f] ?? "")) aus.push({ art: "geaendert", text: `Kopf ${f}: „${alt.kopf[f] ?? ""}" → „${neu.kopf[f] ?? ""}"` });
  }
  return aus;
}
