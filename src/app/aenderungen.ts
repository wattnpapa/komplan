/**
 * Änderungsverlauf „Was ist neu" (Fußzeile → Versionsnummer). Wie in
 * erfassungsbogen: jeder sichtbare Commit trägt hier im selben Commit einen
 * Satz nach, neueste oben, ein Eintrag je Tag.
 */

export interface Aenderung {
  datum: string;
  punkte: string[];
}

export const AENDERUNGEN: Aenderung[] = [
  {
    datum: "2026-11-13",
    punkte: [
      "Erste Fassung: Pläne anlegen, umbenennen, duplizieren, in den Papierkorb legen und wiederherstellen, alles nur auf diesem Gerät.",
      "Führungsorganisation mit Gliederung, Ziehen zum Umhängen, Einklappen, automatischem Layout, seitlich angehängten Stellen und Hervorhebungen.",
      "Taktische Zeichen aus der Sammlung von Jonas Köritz mit Suche, Favoriten und zuletzt benutzten Zeichen, dazu eigene Zeichen für Stäbe, ELO, LuK, Logistik und ein freies Textzeichen.",
      "Export als SVG, PNG und JSON; JSON-Dateien lassen sich wieder einlesen.",
      "Kommunikationsplan als Organigramm: jede Stelle mit Kontaktblock aus Bezeichnung, Betrieb, Leiter, Telefon, Fax, Mobil, E-Mail, Rufgruppen und Kanälen, Gültigkeiten in Rot, leere Felder auf Wunsch als Linie zum Ausfüllen.",
      "Mehrere Ansichten je Plan (Führungsorganisation und Kommunikationsplan) auf denselben Daten, mit Kopfleiste nach Fb Fü, Fußnoten und eigenem Logo.",
      "PDF in A4 oder A3, quer oder hoch, auf eine Seite eingepasst oder auf mehrere Seiten geteilt, mit Stand, Version und Einstufungsvermerk.",
      "Stände: einen Stand einfrieren, frühere Stände ansehen, mit dem aktuellen vergleichen oder als Kopie öffnen.",
    ],
  },
];
