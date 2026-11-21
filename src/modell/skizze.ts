/**
 * Kommunikationsskizze im Modell: neue Skizzen-Ansicht, Elemente anlegen,
 * Startvorlagen nach THW Fb Fü 77 (Skizze 1–5) und „Skizze aus Stelle
 * erzeugen". Koordinaten in mm auf A4 quer; die Kopfleiste belegt oben
 * 10–28,5 mm.
 */

import { elternVon } from "./baum";
import { neueId } from "./id";
import { neueStelle } from "./plan";
import type { Id, Medium, Plan, Port, SkAnschluss, SkizzenAnsicht, SkizzenElement, SkStelle, SkVerbinder } from "./typen";

export const FARBE_FUNK = "#d0021b";
export const FARBE_DRAHT = "#1a4fb4";
export const FARBE_SCHWARZ = "#000000";

/** Unterkante der Kopfleiste (Rand 10 mm + 18,5 mm) plus 1,5 mm Luft: darüber liegen keine Elemente. */
export const ZEICHENBEREICH_OBEN = 30;

/**
 * Senkrechte Verschiebung so begrenzen, dass kein Element (Verbinder
 * ausgenommen) in die Kopfleiste rutscht. Liegt schon eines darin, geht es
 * nur noch nach unten.
 */
export function dyBegrenzen(elemente: Iterable<Pick<SkizzenElement, "art" | "y">>, dy: number): number {
  let oben = Infinity;
  for (const e of elemente) if (e.art !== "verbinder") oben = Math.min(oben, e.y);
  if (oben === Infinity) return dy;
  return Math.max(dy, Math.min(0, ZEICHENBEREICH_OBEN - oben));
}

export type SkizzenVorlage = "leer" | "skizze-1" | "skizze-2" | "skizze-3" | "skizze-4" | "skizze-5";

export const SKIZZEN_VORLAGEN: Array<{ id: SkizzenVorlage; titel: string; beschreibung: string }> = [
  { id: "leer", titel: "Leer", beschreibung: "Nur Kopf." },
  { id: "skizze-1", titel: "Fb Fü 77 Skizze 1", beschreibung: "Anschlüsse links, eigene FüSt mit Geräten und NSt-Tabelle (C Wähl, ISDN S0, Analog a/b), vier Gegenstellen rechts." },
  { id: "skizze-2", titel: "Fb Fü 77 Skizze 2", beschreibung: "Kopf und ein Zeichen-Kasten, sonst frei." },
  { id: "skizze-3", titel: "Fb Fü 77 Skizze 3", beschreibung: "Wie Skizze 1, NSt-Tabelle CAWITEL/AWINAP, drei Gegenstellen." },
  { id: "skizze-4", titel: "Fb Fü 77 Skizze 4", beschreibung: "Wie Skizze 1, Vermittlung C OB mit Amtszusätzen und zehn Teilnehmern." },
  { id: "skizze-5", titel: "Fb Fü 77 Skizze 5", beschreibung: "Eigene FüSt oben, Gegenstellen links und rechts, unten Sammelschiene mit Platzhaltern." },
];

export function neueSkizzenAnsicht(teil: Partial<SkizzenAnsicht> = {}): SkizzenAnsicht {
  return {
    id: neueId(),
    typ: "skizze",
    name: "Kommunikationsskizze",
    formular: "fb-fue-77",
    titel: "Kommunikationsskizze",
    detail: "technisch",
    papier: { format: "A4", ausrichtung: "quer", grosseFlaeche: "einpassen" },
    kopfleiste: true,
    elemente: {},
    reihenfolge: [],
    raster: 2.5,
    ...teil,
  };
}

type OhneId<T> = T extends unknown ? Omit<T, "id"> : never;

export function elementAnlegen(a: SkizzenAnsicht, e: OhneId<SkizzenElement>): Id {
  const id = neueId();
  a.elemente[id] = { ...e, id } as SkizzenElement;
  a.reihenfolge.push(id);
  return id;
}

/** Löscht Elemente samt daran hängender Verbinder. */
export function elementeLoeschen(a: SkizzenAnsicht, ids: Id[]): void {
  const weg = new Set(ids);
  for (const e of Object.values(a.elemente)) {
    if (e.art === "verbinder" && [e.von, e.nach].some((p) => "element" in p && weg.has(p.element))) weg.add(e.id);
    if (e.gruppe && weg.has(e.gruppe)) weg.add(e.id);
  }
  for (const id of weg) delete a.elemente[id];
  a.reihenfolge = a.reihenfolge.filter((id) => !weg.has(id));
}

/** Kopiert Elemente (mit Verbindern zwischen ihnen) versetzt; liefert die neuen IDs. */
export function elementeKopieren(a: SkizzenAnsicht, quelle: SkizzenElement[], dx: number, dy: number): Id[] {
  const zuordnung = new Map<Id, Id>();
  for (const e of quelle) zuordnung.set(e.id, neueId());
  const neu: Id[] = [];
  for (const e of quelle) {
    const kopie = structuredClone(e) as SkizzenElement;
    kopie.id = zuordnung.get(e.id)!;
    kopie.x += dx;
    kopie.y += dy;
    if (kopie.gruppe) kopie.gruppe = zuordnung.get(kopie.gruppe);
    if (kopie.art === "verbinder") {
      const ports = [kopie.von, kopie.nach].map((p): Port | undefined => ("element" in p ? (zuordnung.has(p.element) ? { ...p, element: zuordnung.get(p.element)! } : undefined) : { punkt: { x: p.punkt.x + dx, y: p.punkt.y + dy } }));
      if (!ports[0] || !ports[1]) continue;
      kopie.von = ports[0];
      kopie.nach = ports[1];
      kopie.wegpunkte = kopie.wegpunkte.map((w) => ({ x: w.x + dx, y: w.y + dy }));
    }
    a.elemente[kopie.id] = kopie;
    a.reihenfolge.push(kopie.id);
    neu.push(kopie.id);
  }
  return neu;
}

// ───────────────────────────── Bausteine ─────────────────────────────

const port = (element: Id, seite: "l" | "r" | "o" | "u", versatz = 0.5): Port => ({ element, seite, versatz });

function verbinde(a: SkizzenAnsicht, von: Port, nach: Port, farbe = FARBE_SCHWARZ, linie: SkVerbinder["linie"] = "gestrichelt", wegpunkte: SkVerbinder["wegpunkte"] = [], medium?: Medium): Id {
  return elementAnlegen(a, { art: "verbinder", x: 0, y: 0, b: 0, h: 0, von, nach, wegpunkte, farbe, linie, ...(medium ? { medium } : {}) });
}

function stelle(a: SkizzenAnsicht, stelleId: Id, x: number, y: number, b: number, h: number, extra: Partial<SkStelle> = {}): Id {
  return elementAnlegen(a, { art: "stelle", stelle: stelleId, x, y, b, h, ...extra });
}

function anschluss(a: SkizzenAnsicht, medium: SkAnschluss["medium"], x: number, y: number, b = 72, extra: Partial<SkAnschluss> = {}): Id {
  return elementAnlegen(a, { art: "anschluss", medium, spitze: "beide", x, y, b, h: 5.2, ...extra });
}

function geraet(a: SkizzenAnsicht, g: "4m" | "2m" | "mobfu" | "fax" | "pc" | "handy" | "tel" | "sonstig", x: number, y: number, extra: { text?: string } = {}): Id {
  return elementAnlegen(a, { art: "geraet", geraet: g, x, y, b: 8, h: 7.5, technisch: true, ...extra });
}

/** Lose Stelle als Platzhalter für eine Gegenstelle der Vorlage. */
function leereStelle(plan: Plan, name: string): Id {
  // Ohne Zeichen: der Kasten bleibt weiß wie im Vordruck, bis ein Zeichen gewählt ist.
  const s = neueStelle({ bezeichnung: name });
  plan.stellen[s.id] = s;
  plan.loseStellen.push(s.id);
  return s.id;
}

/** Fb Fü 77 Skizze 1/3/4: gemeinsames Gerüst; NSt-Tabelle und Gegenstellen je Variante. */
function geruest(plan: Plan, a: SkizzenAnsicht, eigen: Id, variante: "1" | "3" | "4"): void {
  // Zwei übergeordnete/benachbarte Stellen oben links
  const sa = stelle(a, leereStelle(plan, "Übergeordnete Stelle"), 11, 33, 58, 22, { leereFunk: 1, leereTelFax: true });
  const sb = stelle(a, leereStelle(plan, "Benachbarte Stelle"), 74, 33, 58, 22, { leereFunk: 1, leereTelFax: true });
  // Eigene FüSt mit Geräten
  const fuest = stelle(a, eigen, 100, 74, 112, 53, { inhalt: "rahmen" });
  const g4a = geraet(a, "4m", 102.5, 89);
  const g4b = geraet(a, "4m", 102.5, 98);
  const mob = geraet(a, "mobfu", 102.5, 107);
  elementAnlegen(a, { art: "text", text: "(Handy)", groesse: 7, x: 112, y: 107.5, b: 12, h: 4 });
  const fax = geraet(a, "fax", 114, 116);
  const pc = geraet(a, "pc", 130, 118);
  const leer = geraet(a, "sonstig", 141, 90);
  const g4c = geraet(a, "4m", 141, 99);
  anschluss(a, "funk-analog", 152, 91, 56, { technisch: true });
  anschluss(a, "funk-analog", 152, 100, 56, { technisch: true });
  void leer;
  // NSt-Tabelle
  const nst =
    variante === "1"
      ? { spalten: ["anschlussart", "technik", "nummer", "teilnehmer"] as const, gruppen: [{ anschlussart: "C Wähl", zeilen: 2 }, { anschlussart: "Mobilfunk", zeilen: 2 }, { anschlussart: "ISDN S0", zeilen: 4 }, { anschlussart: "Analog a/b", zeilen: 4 }], leer: 0 }
      : variante === "3"
        ? { spalten: ["anschlussart", "nummer", "teilnehmer"] as const, gruppen: [{ anschlussart: "CAWITEL", zeilen: 2 }, { anschlussart: "AWINAP", zeilen: 2 }], leer: 8 }
        : { spalten: ["anschlussart", "nummer", "teilnehmer"] as const, gruppen: [{ anschlussart: "C OB", zeilen: 2 }, { anschlussart: "AZ 1", zeilen: 2 }, { anschlussart: "AZ 2", zeilen: 2 }], leer: 4 };
  elementAnlegen(a, { art: "nst-tabelle", stelle: eigen, x: 100, y: 128, b: 112, h: 58, spalten: [...nst.spalten], gruppen: nst.gruppen, leerzeilen: nst.leer, technisch: true });

  // Anschlüsse links
  const links: Array<[SkAnschluss["medium"], number, Id | undefined, Partial<SkAnschluss>]> = [
    ["mobil", 101.5, mob, {}],
    ["fax", 113, fax, {}],
    ["pc", 122, pc, {}],
    ["mobilfunkadapter", 130.5, undefined, { form: "kasten", b: 30, h: 7 }],
    ["mobil", 141, undefined, {}],
    [variante === "3" ? "sonstig" : "telefon", 150.5, undefined, {}],
    [variante === "3" ? "sonstig" : "telefon", 160, undefined, {}],
    ["telefon", 169.5, undefined, variante === "1" ? {} : { medium: "sonstig" }],
    ["sonstig", 179, undefined, {}],
  ];
  for (const [medium, y, ziel, extra] of links) {
    const id = anschluss(a, medium, 17, y, 72, { technisch: true, ...extra });
    if (ziel) verbinde(a, port(id, "r"), port(ziel, "l"));
    else if (medium !== "mobilfunkadapter") verbinde(a, port(id, "r"), { element: fuest, seite: "l", versatz: 0.9 });
  }
  // Funkverbindungen der oberen Stellen zu den 4-m-Geräten
  verbinde(a, port(sa, "r", 0.8), port(g4a, "l"));
  verbinde(a, port(sb, "u", 0.1), port(g4b, "l"));
  // Gegenstellen rechts
  const anzahl = variante === "3" ? 3 : 4;
  for (let i = 0; i < anzahl; i++) {
    const g = stelle(a, leereStelle(plan, `Gegenstelle ${i + 1}`), 224, 32 + i * 41, 59, 36, { leereFunk: 2, leereTelFax: true });
    verbinde(a, port(fuest, "r", 0.25), port(g, "l", 0.75), FARBE_SCHWARZ, "gestrichelt");
  }
  verbinde(a, port(g4c, "r"), port(fuest, "r", 0.5));
}

function skizze5(plan: Plan, a: SkizzenAnsicht, eigen: Id): void {
  const fuest = stelle(a, eigen, 118, 33, 62, 40, { leereFunk: 3, leereTelFax: true });
  const spalte = (x: number) =>
    [0, 1, 2].map((i) => stelle(a, leereStelle(plan, `Gegenstelle ${x < 100 ? "L" : "R"}${i + 1}`), x, 33 + i * 40, 58, 34, { leereFunk: 2, leereTelFax: true }));
  const links = spalte(28);
  const rechts = spalte(212);
  for (const g of links) verbinde(a, port(g, "r", 0.7), port(fuest, "l", 0.7));
  for (const g of rechts) verbinde(a, port(g, "l", 0.7), port(fuest, "r", 0.7));
  const schiene = 166;
  for (let i = 0; i < 9; i++) {
    const p = elementAnlegen(a, { art: "platzhalter", x: 18 + i * 29.5, y: 176, b: 20, h: 13 });
    verbinde(a, port(fuest, "u"), port(p, "o"), FARBE_SCHWARZ, "gestrichelt", [{ x: 149, y: schiene }]);
  }
  elementAnlegen(a, { art: "rahmen", x: 12, y: 171, b: 274, h: 22, linie: "gepunktet" });
  elementAnlegen(a, { art: "text", text: "Einheiten auf Marsch / noch nicht zugeordnet", groesse: 7.5, x: 13, y: 193.5, b: 70, h: 4 });
}

/** Skizzen-Ansicht aus einer Vorlage; legt dafür lose Stellen im Plan an. */
export function skizzeAusVorlage(plan: Plan, vorlage: SkizzenVorlage, eigeneStelle?: Id): SkizzenAnsicht {
  const nr = vorlage.replace("skizze-", "");
  const a = neueSkizzenAnsicht({ vorlage, titel: vorlage === "leer" ? "Kommunikationsskizze" : `Kommunikationsskizze ${nr}`, name: vorlage === "leer" ? "Kommunikationsskizze" : `Skizze ${nr}` });
  if (vorlage === "leer") return a;
  const eigen = eigeneStelle ?? leereStelle(plan, "Eigene Führungsstelle");
  a.fokus = eigen;
  if (vorlage === "skizze-2") stelle(a, eigen, 20, 36, 70, 30, { inhalt: "rahmen" });
  else if (vorlage === "skizze-5") skizze5(plan, a, eigen);
  else geruest(plan, a, eigen, nr as "1" | "3" | "4");
  return a;
}

// ──────────────────────── Skizze aus Stelle erzeugen ────────────────────────

const KONTAKT_MEDIUM: Record<string, SkAnschluss["medium"]> = { telefon: "telefon", fax: "fax", mobil: "mobil", email: "email", sat: "sonstig", messenger: "sonstig", sonstig: "sonstig" };

/**
 * Eigene Stelle mittig, übergeordnete links oben, Unterstellte rechts (bis
 * vier) oder unten an einer Sammelschiene (ab fünf). Eigene Kontakte als
 * Anschluss-Fahnen links, verknüpft mit dem Plan. Funk rot, Draht blau
 * (Farbkonvention der THW-Ausbildungsbeispiele).
 */
export function skizzeAusStelle(plan: Plan, stelleId: Id): SkizzenAnsicht {
  const s = plan.stellen[stelleId];
  if (!s) throw new Error(`Stelle ${stelleId} gibt es nicht`);
  const name = [s.nummer, s.beschriftung].filter(Boolean).join(" ") || s.bezeichnung || "Stelle";
  const a = neueSkizzenAnsicht({ vorlage: "aus-stelle", fokus: stelleId, name: `Skizze ${name}`, titel: "Technisch-/Taktische Kommunikationsskizze" });

  const eigen = stelle(a, stelleId, 110, 62, 72, 30);
  const elternId = elternVon(plan, stelleId);
  const funkFarbe = (x?: { funk: unknown[] }) => (x && x.funk.length ? FARBE_FUNK : FARBE_SCHWARZ);

  let linksY = 34;
  if (elternId) {
    const oben = stelle(a, elternId, 12, 34, 64, 16);
    verbinde(a, port(oben, "r", 0.75), port(eigen, "l", 0.8), funkFarbe(plan.stellen[elternId]), "durchgezogen", [], "funk-digital");
    linksY = 82;
  }
  // Eigene Kontakte als Anschlüsse links
  for (const k of s.kontakte.filter((k) => k.wert)) {
    const an = anschluss(a, KONTAKT_MEDIUM[k.art] ?? "sonstig", 12, linksY, 64, { bezug: { stelle: stelleId, eintrag: k.id }, technisch: true, spitze: "links" });
    verbinde(a, port(an, "r"), port(eigen, "l", 0.3), FARBE_DRAHT, "durchgezogen", [], k.art === "email" ? "daten" : "draht");
    linksY += 8;
  }

  const kinder = s.kinder.filter((k) => plan.stellen[k]);
  if (kinder.length <= 4) {
    kinder.forEach((k, i) => {
      const id = stelle(a, k, 214, 34 + i * 42, 70, 16);
      verbinde(a, port(eigen, "r", 0.7), port(id, "l", 0.8), funkFarbe(s), "durchgezogen", [], "funk-digital");
    });
  } else {
    const schiene = 150;
    const breite = Math.min(28, 270 / kinder.length);
    kinder.forEach((k, i) => {
      const x = 14 + i * breite;
      const id = elementAnlegen(a, { art: "zeichen", stelle: k, x, y: 158, b: breite - 4, h: breite - 4 });
      verbinde(a, port(eigen, "u", 0.5), port(id, "o", 0.5), funkFarbe(s), "durchgezogen", [{ x: 146, y: schiene }], "funk-digital");
    });
  }
  return a;
}
