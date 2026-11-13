/**
 * Stand-Verwaltung: „Neuen Stand anlegen" friert den bisherigen Plan als
 * Schnappschuss ein und hebt den laufenden Plan auf die nächste Version mit
 * neuem DTG. Der Vergleich listet, was sich zwischen zwei Ständen geändert hat.
 */

import { elternKarte } from "./baum";
import { dtgAusZeitpunkt } from "./dtg";
import { neueId } from "./id";
import type { Funkangabe, Id, Kontakt, Plan, StandSchnappschuss, Stelle, Zeitpunkt } from "./typen";

export function standEinfrieren(plan: Plan, zeit: Zeitpunkt): StandSchnappschuss {
  return { id: neueId(), planId: plan.id, stand: { ...plan.stand }, angelegt: zeit, plan: structuredClone(plan) };
}

/** Neuer Stand für den laufenden Plan (verändert `plan`). */
export function standWeiterzaehlen(plan: Plan, neuerZeitpunkt: Zeitpunkt, bemerkung?: string): void {
  plan.stand = { dtg: dtgAusZeitpunkt(neuerZeitpunkt), zeitpunkt: neuerZeitpunkt, version: plan.stand.version + 1, ...(bemerkung ? { bemerkung } : {}) };
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
