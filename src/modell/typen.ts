/**
 * Datenmodell von komplan. Erläuterung: docs/DATENMODELL.md (dort derselbe
 * Stand, hier die maßgebliche Fassung).
 */

// ─────────────────────────────── Grundtypen ───────────────────────────────

/** Zufällige ID, 10 Zeichen [A-Za-z0-9]. Nur innerhalb eines Plans eindeutig. */
export type Id = string;

/** Lokale Zeit ohne Zone, „2026-11-13T15:00". Stäbe denken in Ortszeit. */
export type Zeitpunkt = string;

export type Linienart = "durchgezogen" | "gestrichelt" | "gepunktet";

/** Organisationskennung für Farbe und Kennzeichnung eigener Zeichen. */
export type Organisation =
  | "thw" | "feuerwehr" | "polizei" | "rettungsdienst" | "hilfsorganisation"
  | "wasserrettung" | "bundeswehr" | "verwaltung" | "sonstige";

// ─────────────────────────────────── Plan ──────────────────────────────────

export interface Plan {
  schemaVersion: 1;
  id: Id;
  /** Name in der Planliste, z. B. „Hochwasser Musterfluss – EAL 2". */
  name: string;
  kopf: Formularkopf;
  stand: Stand;
  /** Vorgabe für neue Stellen und eigene Zeichen. */
  organisation: Organisation;

  /** Alle Stellen des Plans. Baum über `Stelle.kinder`, Wurzeln in `wurzeln`. */
  stellen: Record<Id, Stelle>;
  /** Wurzeln der Führungsorganisation in Reihenfolge (meist eine). */
  wurzeln: Id[];
  /**
   * Stellen, die in keinem Baum hängen, aber in Skizzen vorkommen
   * (Nachbarbehörde, Leitstelle, „Einheiten auf Marsch"). Ableitbar, hier nur
   * zur Sortierung in der Seitenleiste.
   */
  loseStellen: Id[];

  /** Beziehungen außerhalb der Unterstellung (Zusammenarbeit, geplant, Kommunikationsweg). */
  verbindungen: Record<Id, Verbindung>;

  ansichten: Record<Id, Ansicht>;
  ansichtReihenfolge: Id[];

  /** Fußnoten und freie Zeilen auf Planebene, erscheinen unter jeder Ansicht, die sie zeigt. */
  fussnoten: Fussnote[];
  /** Eingebettete Bilder (Logo der Organisation). PNG/JPEG als data-URL. */
  bilder: Record<Id, Bild>;

  angelegt: Zeitpunkt;
  geaendert: Zeitpunkt;
  /** Gesetzt = im Papierkorb. */
  geloeschtAm?: Zeitpunkt;
}

/** Kopfleiste nach „Allgemeines" Fb Fü 76, dazu die Felder des FwDV-800-Musters. */
export interface Formularkopf {
  /** Links: herausgebende Dienststelle/Führungsstelle („EAL 3 THW"). */
  fuehrungsstelle: string;
  /** Links, optional: Funktion des Verfassers („S 6"). */
  verfasserFunktion?: string;
  /** Mitte: „für …" – Verwendungsbereich/Einsatz. */
  fuer: string;
  /** F.d.R.: Zeichner/Herausgeber mit Dienststellung. */
  fdr: string;
  /** Verschlusssachenvermerk, frei, Vorschläge „VS – Nur für den Dienstgebrauch", „NfD". */
  einstufung?: string;
  /** Wo der Vermerk zusätzlich steht (PDF-Export). */
  einstufungPosition?: "kopf" | "kopf-und-fuss";
  logo?: Id;
  /** FwDV 800: Sachbearbeiter, Kennwort. */
  sachbearbeiter?: string;
  kennwort?: string;
}

// ─────────────────────────────────── Stand ─────────────────────────────────

export interface Stand {
  /** Normiert „172027NOV26": TTHHMM + Monat (3 Buchstaben) + JJ. Anzeige wählbar groß/klein. */
  dtg: string;
  /** Derselbe Zeitpunkt maschinenlesbar, für Gültigkeitsprüfung und Sortierung. */
  zeitpunkt: Zeitpunkt;
  /** Laufende Nummer, +1 bei „Neuen Stand anlegen". Erscheint im Seitenfuß. */
  version: number;
  bemerkung?: string;
}

/** Eingefrorener Plan. Eigener IndexedDB-Store, im JSON-Export optional. */
export interface StandSchnappschuss {
  id: Id;
  planId: Id;
  stand: Stand;
  angelegt: Zeitpunkt;
  /** Kompletter Plan ohne Schnappschüsse, mit eigener schemaVersion (wird beim Laden migriert). */
  plan: Plan;
}

// ─────────────────────────────────── Stelle ────────────────────────────────

export interface Stelle {
  id: Id;
  typ: "stelle" | "auslassung";

  // Darstellung im Diagramm
  zeichen?: ZeichenRef;
  /** >1: gestapeltes Zeichen (mehrere gleiche Einheiten, versetzt gezeichnet). */
  stapel?: number;
  /** Kurztext am Zeichen („Musterkreis", „Heros Musterstadt 10"). */
  beschriftung: string;
  beschriftungPosition?: "rechts" | "unten" | "links";
  /** Abschnittsnummer („1", „2"), groß am Zeichen. */
  nummer?: string;
  zusatzzeilen: string[];
  /** Nur bei typ "auslassung". */
  auslassung?: "…" | "⋮";

  // Stammdaten
  /** Volle Bezeichnung („Einsatzabschnittsleitung Musterinsel"). */
  bezeichnung: string;
  /** „Betrieb durch", z. B. „THW FK Musterstadt". */
  betriebDurch?: string;
  leiter?: Person;
  funkrufname?: string;

  /** Telefon, Fax, Mobil, E-Mail … beliebig viele, jeweils mit Gültigkeit. */
  kontakte: Kontakt[];
  /** Rufgruppen und Kanäle. */
  funk: Funkangabe[];
  /** Nebenstellen dieser Stelle (Fb Fü 76 Feld „NSt", Fb Fü 77 NSt-Tabelle). */
  nebenstellen: Nebenstelle[];

  // Unterstellung
  /** Unterstellte Stellen in Reihenfolge. Eltern werden daraus abgeleitet. */
  kinder: Id[];
  /** Wie diese Stelle an ihrer übergeordneten hängt. */
  anbindung: Anbindung;
  /** Vorgaben für das Auto-Layout der Kinder; Ansichten können überschreiben. */
  layout?: KnotenLayout;

  bemerkung?: string;
}

export interface Person {
  name: string;
  dienststellung?: string;
  funkrufname?: string;
  kontakte: Kontakt[];
}

export interface Anbindung {
  /** "unten" = normale Unterstellung. "seitlich-*" = neben der übergeordneten Stelle (Gegenstab, FZ FK, LtS). */
  lage: "unten" | "seitlich-links" | "seitlich-rechts";
  linie: Linienart;
  /** Beschriftung an der Linie („wird gestellt durch LK"). */
  text?: string;
}

export interface KnotenLayout {
  kinder?: "horizontal" | "vertikal";
  /** Abstand zu den Kindern in mm (Standard aus der Ansicht). */
  abstand?: number;
  /** Zusätzlicher senkrechter Versatz dieser Stelle unter der Sammelschiene in mm (DV 1-101: EAL unter der Einsatzleitung). */
  versatz?: number;
}

// ────────────────────────────── Erreichbarkeiten ───────────────────────────

export type KontaktArt = "telefon" | "fax" | "mobil" | "email" | "sat" | "messenger" | "sonstig";

export interface Kontakt {
  id: Id;
  art: KontaktArt;
  /** Leer = Platzhalter, wird als gepunktete Linie zum Ausfüllen gedruckt. */
  wert: string;
  /** „Mail 1", „HVB", „Abfrage". */
  bezeichnung?: string;
  gueltigAb?: Zeitpunkt;
  gueltigBis?: Zeitpunkt;
}

/** Richtung bezogen auf die Stelle, die den Eintrag trägt. */
export type Richtung =
  | "unten"   // ↓ zu den unterstellten Stellen (Führungskreis, den diese Stelle führt)
  | "oben"    // ↑ zur übergeordneten Stelle
  | "beide"
  | "keine";

export type Funkangabe = FunkDigital | FunkAnalog;

export interface FunkBasis {
  id: Id;
  richtung: Richtung;
  /** Fb Fü 76: „Bedingung" unter dem Kanalfeld. */
  bedingung?: string;
  bezeichnung?: string;
  gueltigAb?: Zeitpunkt;
  gueltigBis?: Zeitpunkt;
}

export interface FunkDigital extends FunkBasis {
  art: "digital";
  betrieb: "TMO" | "DMO";
  /** Rufgruppe, frei („TBZ_9901_UNI", „T_MS-THW-1"). */
  rufgruppe: string;
}

export interface FunkAnalog extends FunkBasis {
  art: "analog";
  band: "4m" | "2m";
  kanal: string;
  /** „W/U", „G/U", „RS" oder frei. */
  betriebsart: string;
}

export interface Nebenstelle {
  id: Id;
  /** „C Wähl", „ISDN S0", „ISDN UK0", „Analog a/b", „DECT", „CAWITEL", „AWINAP", „C OB" … frei. */
  anschlussart: string;
  /** Technik-Spalte (Fb Fü 77 Skizze 1). */
  technik?: string;
  nummer: string;
  teilnehmer: string;
}

// ─────────────────────────────── Verbindungen ──────────────────────────────

export type Medium =
  | "funk-analog" | "funk-digital" | "telefon" | "fax" | "mobil"
  | "email" | "daten" | "draht" | "melder" | "sonstig";

export interface Verbindung {
  id: Id;
  von: Id;  // Stelle
  nach: Id; // Stelle
  art: "zusammenarbeit" | "geplant" | "kommunikation";
  medium?: Medium;
  /** Verweis auf die Funkangabe/den Kontakt, über die die Verbindung läuft. */
  ueber?: { stelle: Id; eintrag: Id };
  linie: Linienart;
  text?: string;
}

// ─────────────────────────────────── Zeichen ───────────────────────────────

export type ZeichenRef =
  /** Zeichen aus jonas-koeritz/Taktische-Zeichen, Schlüssel „Ordner/Dateiname". */
  | { quelle: "katalog"; schluessel: string }
  /** Eigene parametrisierte Vorlage (src/zeichen/eigen). */
  | { quelle: "eigen"; vorlage: string; text?: string; organisation?: Organisation; staerke?: number }
  /** Freies Textzeichen. */
  | { quelle: "frei"; grundform: Grundform; text: string; farbe: string; textfarbe?: string };

export type Grundform =
  | "fuehrungsstelle"  // Rechteck mit Fahne
  | "stab"             // Haus-Form der Verwaltungsstäbe
  | "einheit"          // Rechteck
  | "fahrzeug"         // Fahrzeug-Rechteck mit Wanne
  | "kreis" | "raute";

// ─────────────────────────────────── Ansichten ─────────────────────────────

export type Ansicht = FuehrungsorgAnsicht | KomplanAnsicht | SkizzenAnsicht;

export interface Papier {
  format: "A4" | "A3";
  ausrichtung: "quer" | "hoch";
  /** "einpassen" skaliert auf eine Seite, "teilen" verteilt auf mehrere. */
  grosseFlaeche: "einpassen" | "teilen";
  /** Bei "teilen": Breite der taktischen Zeichen auf dem Papier in mm (Standard 50). */
  zeichenBreite?: number;
}

export interface AnsichtBasis {
  id: Id;
  name: string;
  papier: Papier;
  /** Kopfleiste (Fb Fü 76/77) zeigen. */
  kopfleiste: boolean;
  /** Fußnoten-IDs, die diese Ansicht zeigt (Standard: alle). */
  fussnoten?: Id[];
}

export interface BaumAnsichtBasis extends AnsichtBasis {
  /** Teilbaum zeigen statt aller Wurzeln. */
  wurzel?: Id;
  /** Pro Stelle: einklappen, ausblenden, Layout überschreiben. */
  knoten: Record<Id, KnotenEinstellung>;
  hervorhebungen: Hervorhebung[];
  /** Nummerierte Pfeile/Freitexte unter dem Baum (THW-Einsatzstruktur, Planspiel). */
  zusaetze: Freielement[];
  abstandStandard: { waagerecht: number; senkrecht: number };
}

export interface FuehrungsorgAnsicht extends BaumAnsichtBasis {
  typ: "fuehrungsorganisation";
}

export interface KomplanAnsicht extends BaumAnsichtBasis {
  typ: "kommunikationsplan";
  variante: "organigramm" | "fb-fue-76" | "fwdv-800";
  /** Organigramm: wo der Kontaktblock steht. */
  kontaktLage: KontaktLage;
  /** Welche Angaben im Block erscheinen. */
  felder: Array<"bezeichnung" | "betriebDurch" | "leiter" | "funkrufname" | KontaktArt | "funk" | "nebenstellen">;
  /** Leere Felder als gepunktete Linie drucken (Papier zum Ausfüllen). */
  platzhalter: boolean;
  /** Fb Fü 76: die eigene Führungsstelle in der Mitte. Ober-/Nachbarstellen und Unterstellte folgen aus dem Baum. */
  fokus?: Id;
  /** Fb Fü 76: zusätzlich in der oberen Reihe gezeigte Nachbarn (Stellen ohne Unterstellungsbezug). */
  nachbarn?: Id[];
}

export type KontaktLage = "rechts" | "unten" | "links";

/** Einstellungen einer Stelle in einer Baum-Ansicht. */
export interface KnotenEinstellung {
  eingeklappt?: boolean;
  ausgeblendet?: boolean;
  layout?: KnotenLayout;
  /** Kommunikationsplan: Lage des Kontaktblocks dieser Stelle; "aus" blendet ihn aus. */
  kontaktLage?: KontaktLage | "aus";
}

export interface Hervorhebung {
  id: Id;
  stellen: Id[];
  stil: "flaeche" | "rahmen";
  farbe: string;
  linie: Linienart;
  text?: string;
}

// ─────────────────────────────────── Skizze ────────────────────────────────

export interface SkizzenAnsicht extends AnsichtBasis {
  typ: "skizze";
  formular: "fb-fue-77";
  /** Titel im blauen Balken („Kommunikationsskizze", „Technisch-/Taktische Kommunikationsskizze"). */
  titel: string;
  /** Aus welcher Vorlage entstanden (nur zur Info). */
  vorlage?: "leer" | "skizze-1" | "skizze-2" | "skizze-3" | "skizze-4" | "skizze-5" | "aus-stelle";
  /** taktisch blendet Geräte, NSt-Tabelle und Anschlussarten aus. */
  detail: "taktisch" | "technisch";
  /** Eigene Stelle, falls aus Knoten erzeugt. */
  fokus?: Id;
  elemente: Record<Id, SkizzenElement>;
  /** Zeichenreihenfolge (hinten → vorn). */
  reihenfolge: Id[];
  raster: number; // mm, Standard 2.5
}

export interface Rahmen { x: number; y: number; b: number; h: number }

export interface ElementBasis extends Rahmen {
  id: Id;
  gruppe?: Id;
  /** Nur in technischer Detailstufe zeigen. */
  technisch?: boolean;
}

export type SkizzenElement =
  | SkStelle | SkAnschluss | SkGeraet | SkNstTabelle | SkPlatzhalter
  | SkZeichen | SkText | SkRahmen | SkKnotenpunkt | SkVerbinder;

/** Kasten einer Stelle. Daten kommen aus plan.stellen, hier nur Lage und Auswahl. */
export interface SkStelle extends ElementBasis {
  art: "stelle";
  stelle: Id;
  /** Welche Kontakte/Funkangaben im Kasten stehen. Leer = alle. */
  zeige?: Id[];
  /** Mindestzahl Funk-Fahnen im Kasten; fehlende bleiben leer zum Ausfüllen (Vorlagen). */
  leereFunk?: number;
  /** "rahmen": nur Zeichen, Funkrufname und leerer Kasten; Geräte und Tabellen liegen als eigene Elemente darin (eigene FüSt der Vorlagen). */
  inhalt?: "voll" | "rahmen";
}

/** Fünfeck-„Fahne" für einen Anschluss. */
export interface SkAnschluss extends ElementBasis {
  art: "anschluss";
  medium: Medium | "pc" | "mobilfunkadapter";
  spitze: "links" | "rechts" | "beide";
  /** Verknüpft mit Kontakt/Funkangabe einer Stelle → Text kommt von dort. */
  bezug?: { stelle: Id; eintrag: Id };
  /** Nur ohne Bezug: freier Text. */
  text?: string;
  /** Kleiner Kasten „Mobilfunkadapter" statt Fahne. */
  form?: "fahne" | "kasten";
}

export interface SkGeraet extends ElementBasis {
  art: "geraet";
  geraet: "4m" | "2m" | "mobfu" | "handy" | "fax" | "pc" | "tel" | "sonstig";
  text?: string;
}

export interface SkNstTabelle extends ElementBasis {
  art: "nst-tabelle";
  /** Zeilen kommen aus stelle.nebenstellen; Gruppierung nach anschlussart. */
  stelle: Id;
  spalten: Array<"anschlussart" | "technik" | "nummer" | "teilnehmer">;
  /** Leerzeilen zum Ausfüllen. */
  leerzeilen: number;
  /**
   * Vorgegebene Gruppen der Anschlussart-Spalte mit Mindestzahl an Zeilen
   * (Vorlagen: „C Wähl", „ISDN S0", „Analog a/b" …). Fehlt ein Eintrag mit
   * dieser Anschlussart, bleiben die Zeilen leer zum Ausfüllen.
   */
  gruppen?: Array<{ anschlussart: string; zeilen: number }>;
}

export interface SkPlatzhalter extends ElementBasis {
  art: "platzhalter";
  text?: string;
}

export interface SkZeichen extends ElementBasis {
  art: "zeichen";
  /** Entweder eine Stelle (dann Zeichen + Funkrufname von dort) oder frei. */
  stelle?: Id;
  zeichen?: ZeichenRef;
  text?: string;
}

export interface SkText extends ElementBasis {
  art: "text";
  text: string;
  groesse: number; // pt
  fett?: boolean;
  farbe?: string;
}

export interface SkRahmen extends ElementBasis {
  art: "rahmen";
  linie: Linienart;
  text?: string; // „Einheiten auf Marsch"
}

/** Abzweigpunkt oder Sammelschiene (b oder h = 0). */
export interface SkKnotenpunkt extends ElementBasis {
  art: "knotenpunkt";
}

export type Port =
  | { element: Id; seite: "l" | "r" | "o" | "u"; versatz: number /* 0..1 entlang der Seite */ }
  | { punkt: { x: number; y: number } };

export interface SkVerbinder extends ElementBasis {
  art: "verbinder";
  von: Port;
  nach: Port;
  /** Festgehaltene Knickpunkte; leer = automatisch orthogonal. */
  wegpunkte: Array<{ x: number; y: number }>;
  farbe: string;       // Konvention der Beispiele: rot = Funk, blau = Draht
  linie: Linienart;
  medium?: Medium;
}

// ──────────────────────────────── Sonstiges ────────────────────────────────

export interface Fussnote {
  id: Id;
  /** Optionales Zeichen am Text („***", „1)"). */
  marke?: string;
  text: string;
}

export interface Bild {
  id: Id;
  mime: "image/png" | "image/jpeg";
  daten: string; // data-URL
  breite: number;
  hoehe: number;
}

/**
 * Freie Elemente in Baum-Ansichten (nummerierte Pfeile, Text). Position relativ
 * zum Blatt oder, mit `bezug`, relativ zur Mitte unter dieser Stelle.
 */
export type Freielement =
  | ({ art: "text"; id: Id; text: string; groesse: number; bezug?: Id } & Rahmen)
  | ({ art: "pfeil"; id: Id; nummer?: string; richtung: "unten" | "oben" | "links" | "rechts"; farbe?: string; bezug?: Id } & Rahmen);
