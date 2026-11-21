/**
 * Erzeugen und Ändern von Plänen. Alle Änderungsfunktionen arbeiten auf
 * einem veränderbaren Plan (im Store ein Immer-Entwurf) und halten die
 * Baum-Regeln aus docs/DATENMODELL.md ein: jede Stelle steht höchstens einmal
 * in einem kinder-Array oder in wurzeln, kein Zyklus.
 */

import { elternVon, istVorfahrOderSelbst, nachfahren } from "./baum";
import { dtgAusZeitpunkt, jetzt } from "./dtg";
import { neueId } from "./id";
import type { Ansicht, FuehrungsorgAnsicht, Id, KomplanAnsicht, Organisation, Plan, Stelle } from "./typen";

export const SCHEMA_VERSION = 1 as const;

export function neueStelle(teil: Partial<Stelle> = {}): Stelle {
  return {
    id: neueId(),
    typ: "stelle",
    beschriftung: "",
    zusatzzeilen: [],
    bezeichnung: "",
    kontakte: [],
    funk: [],
    nebenstellen: [],
    kinder: [],
    anbindung: { lage: "unten", linie: "durchgezogen" },
    ...teil,
  };
}

export function neueFuehrungsorgAnsicht(teil: Partial<FuehrungsorgAnsicht> = {}): FuehrungsorgAnsicht {
  return {
    id: neueId(),
    typ: "fuehrungsorganisation",
    name: "Führungsorganisation",
    papier: { format: "A4", ausrichtung: "quer", grosseFlaeche: "einpassen" },
    kopfleiste: false,
    knoten: {},
    hervorhebungen: [],
    zusaetze: [],
    abstandStandard: { waagerecht: 8, senkrecht: 12 },
    ...teil,
  };
}

export function neueKomplanAnsicht(teil: Partial<KomplanAnsicht> = {}): KomplanAnsicht {
  return {
    id: neueId(),
    typ: "kommunikationsplan",
    name: "Kommunikationsplan",
    variante: "organigramm",
    kontaktLage: "unten",
    felder: ["bezeichnung", "betriebDurch", "leiter", "telefon", "fax", "mobil", "email", "funk", "funkrufname"],
    platzhalter: false,
    papier: { format: "A3", ausrichtung: "quer", grosseFlaeche: "einpassen" },
    kopfleiste: true,
    knoten: {},
    hervorhebungen: [],
    zusaetze: [],
    abstandStandard: { waagerecht: 8, senkrecht: 12 },
    ...teil,
  };
}

export function neuerPlan(teil: { name?: string; organisation?: Organisation; zeit?: string } = {}): Plan {
  const zeit = teil.zeit ?? jetzt();
  const ansicht = neueFuehrungsorgAnsicht();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: neueId(),
    name: teil.name ?? "Neuer Plan",
    kopf: { fuehrungsstelle: "", fuer: "", fdr: "" },
    stand: { dtg: dtgAusZeitpunkt(zeit), zeitpunkt: zeit, version: 1 },
    organisation: teil.organisation ?? "thw",
    stellen: {},
    wurzeln: [],
    loseStellen: [],
    verbindungen: {},
    ansichten: { [ansicht.id]: ansicht },
    ansichtReihenfolge: [ansicht.id],
    fussnoten: [],
    bilder: {},
    angelegt: zeit,
    geaendert: zeit,
  };
}

/** Liste, in der die Stelle steht (kinder des Elternteils, wurzeln oder loseStellen). */
function listeVon(plan: Plan, id: Id): Id[] | undefined {
  const eltern = elternVon(plan, id);
  if (eltern) return plan.stellen[eltern]!.kinder;
  if (plan.wurzeln.includes(id)) return plan.wurzeln;
  if (plan.loseStellen.includes(id)) return plan.loseStellen;
  return undefined;
}

function aushaengen(plan: Plan, id: Id): void {
  const liste = listeVon(plan, id);
  if (!liste) return;
  const i = liste.indexOf(id);
  if (i >= 0) liste.splice(i, 1);
}

function einsetzen(liste: Id[], id: Id, index?: number): void {
  const i = index === undefined || index < 0 || index > liste.length ? liste.length : index;
  liste.splice(i, 0, id);
}

/** Ziel einer Stelle im Baum: unter einer Stelle, als Wurzel oder lose. */
export type Ziel = { unter: Id; index?: number } | { wurzel: true; index?: number } | { lose: true; index?: number };

function zielListe(plan: Plan, ziel: Ziel): Id[] {
  if ("unter" in ziel) {
    const eltern = plan.stellen[ziel.unter];
    if (!eltern) throw new Error(`Stelle ${ziel.unter} gibt es nicht`);
    return eltern.kinder;
  }
  return "wurzel" in ziel ? plan.wurzeln : plan.loseStellen;
}

export function stelleAnlegen(plan: Plan, stelle: Stelle, ziel: Ziel = { wurzel: true }): Id {
  plan.stellen[stelle.id] = stelle;
  einsetzen(zielListe(plan, ziel), stelle.id, ziel.index);
  return stelle.id;
}

/**
 * Hängt eine Stelle samt Teilbaum um. Unter sich selbst oder einen eigenen
 * Nachfahren geht nicht (false, nichts geändert).
 */
export function umhaengen(plan: Plan, id: Id, ziel: Ziel): boolean {
  if (!plan.stellen[id]) return false;
  if ("unter" in ziel && istVorfahrOderSelbst(plan, id, ziel.unter)) return false;
  const alteListe = listeVon(plan, id);
  const zielL = zielListe(plan, ziel);
  let index = ziel.index;
  // Innerhalb derselben Liste nach hinten: der eigene Platz fällt weg.
  if (alteListe === zielL && index !== undefined && alteListe.indexOf(id) < index) index--;
  aushaengen(plan, id);
  einsetzen(zielL, id, index);
  return true;
}

/** Eine Stelle in ihrer Liste um `schritt` Plätze verschieben. */
export function verschieben(plan: Plan, id: Id, schritt: number): void {
  const liste = listeVon(plan, id);
  if (!liste) return;
  const i = liste.indexOf(id);
  const neu = Math.max(0, Math.min(liste.length - 1, i + schritt));
  if (neu === i) return;
  liste.splice(i, 1);
  liste.splice(neu, 0, id);
}

/**
 * Löscht eine Stelle. Ohne `mitTeilbaum` rücken die Kinder an ihren Platz.
 * Bezüge in Ansichten und Verbindungen werden aufgeräumt.
 */
export function stelleLoeschen(plan: Plan, id: Id, mitTeilbaum = false): Id[] {
  const stelle = plan.stellen[id];
  if (!stelle) return [];
  const weg = mitTeilbaum ? [id, ...nachfahren(plan, id)] : [id];
  const liste = listeVon(plan, id);
  if (liste) {
    const i = liste.indexOf(id);
    liste.splice(i, 1, ...(mitTeilbaum ? [] : stelle.kinder));
  }
  const wegSet = new Set(weg);
  for (const ansicht of Object.values(plan.ansichten)) if (ansicht.typ === "skizze") ansichtAufraeumen(ansicht, wegSet, plan);
  for (const w of weg) delete plan.stellen[w];
  plan.wurzeln = plan.wurzeln.filter((x) => !wegSet.has(x));
  plan.loseStellen = plan.loseStellen.filter((x) => !wegSet.has(x));
  for (const [vid, v] of Object.entries(plan.verbindungen)) {
    if (wegSet.has(v.von) || wegSet.has(v.nach)) delete plan.verbindungen[vid];
  }
  for (const ansicht of Object.values(plan.ansichten)) if (ansicht.typ !== "skizze") ansichtAufraeumen(ansicht, wegSet);
  return weg;
}

function ansichtAufraeumen(ansicht: Ansicht, weg: Set<Id>, plan?: Plan): void {
  if (ansicht.typ === "skizze") {
    // Kästen, Zeichen und Tabellen der Stelle fallen weg (samt Verbindern);
    // Anschlüsse behalten den letzten Wert als freien Text.
    const raus: Id[] = [];
    for (const e of Object.values(ansicht.elemente)) {
      if ((e.art === "stelle" || e.art === "nst-tabelle") && weg.has(e.stelle)) raus.push(e.id);
      if (e.art === "zeichen" && e.stelle && weg.has(e.stelle)) raus.push(e.id);
      if (e.art === "anschluss" && e.bezug && weg.has(e.bezug.stelle)) {
        const s = plan?.stellen[e.bezug.stelle];
        const k = s?.kontakte.find((x) => x.id === e.bezug!.eintrag);
        const f = s?.funk.find((x) => x.id === e.bezug!.eintrag);
        e.text = k?.wert ?? (f ? (f.art === "digital" ? f.rufgruppe : `${f.kanal} ${f.betriebsart}`) : e.text);
        delete e.bezug;
      }
    }
    const rausSet = new Set(raus);
    for (const e of Object.values(ansicht.elemente)) {
      if (e.art === "verbinder" && [e.von, e.nach].some((p) => "element" in p && rausSet.has(p.element))) rausSet.add(e.id);
    }
    for (const id of rausSet) delete ansicht.elemente[id];
    ansicht.reihenfolge = ansicht.reihenfolge.filter((id) => !rausSet.has(id));
    if (ansicht.fokus && weg.has(ansicht.fokus)) delete ansicht.fokus;
    return;
  }
  for (const id of weg) delete ansicht.knoten[id];
  if (ansicht.wurzel && weg.has(ansicht.wurzel)) delete ansicht.wurzel;
  for (const h of ansicht.hervorhebungen) h.stellen = h.stellen.filter((s) => !weg.has(s));
  ansicht.hervorhebungen = ansicht.hervorhebungen.filter((h) => h.stellen.length > 0);
  if (ansicht.typ === "kommunikationsplan") {
    if (ansicht.fokus && weg.has(ansicht.fokus)) delete ansicht.fokus;
    if (ansicht.nachbarn) ansicht.nachbarn = ansicht.nachbarn.filter((n) => !weg.has(n));
  }
}

/** Kopiert eine Stelle (mit Teilbaum) mit neuen IDs direkt hinter das Original. */
export function stelleDuplizieren(plan: Plan, id: Id): Id | undefined {
  const quelle = plan.stellen[id];
  if (!quelle) return undefined;
  const kopieren = (sid: Id): Id => {
    const s = plan.stellen[sid]!;
    const kopie: Stelle = structuredClone(s);
    kopie.id = neueId();
    for (const k of kopie.kontakte) k.id = neueId();
    for (const f of kopie.funk) f.id = neueId();
    for (const n of kopie.nebenstellen) n.id = neueId();
    kopie.kinder = s.kinder.map(kopieren);
    plan.stellen[kopie.id] = kopie;
    return kopie.id;
  };
  const neu = kopieren(id);
  const liste = listeVon(plan, id);
  if (liste) liste.splice(liste.indexOf(id) + 1, 0, neu);
  return neu;
}

/** Plan unter neuem Namen mit neuer ID (Planliste „Duplizieren"). */
export function planDuplizieren(plan: Plan, name: string, zeit: string = jetzt()): Plan {
  const kopie = structuredClone(plan);
  kopie.id = neueId();
  kopie.name = name;
  kopie.angelegt = zeit;
  kopie.geaendert = zeit;
  delete kopie.geloeschtAm;
  return kopie;
}
