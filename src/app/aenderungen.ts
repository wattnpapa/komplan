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
      "Ablage: Die Startseite sagt, dass die Pläne nur in diesem Browser liegen, ob der Browser sie dauerhaft behält und welche Pläne seit der letzten Änderung nicht als Datei gesichert sind; „Alle Pläne als Datei sichern“ legt eine Sammelsicherung an, die „Plan einlesen“ wieder liest. Scheitert das Speichern, nennt ein Band den Grund und bietet „Als Datei sichern“ und „Erneut versuchen“, und der Editor fragt vor dem Verlassen. Eine Sicherung desselben Plans wieder einzulesen, nimmt dem Original keine Stände mehr weg.",
      "Ohne Maus: Die gewählte Stelle hat Knöpfe für Unterstellte, Duplizieren, Skizze und Löschen, ein Feld „Untersteht“ und Knöpfe zum Verschieben und eine Ebene höher; das Kontextmenü gibt es auch in der Gliederung und per langem Drücken, und es schließt erst mit Esc oder Tipp daneben. Duplizieren einer Stelle funktioniert wieder.",
      "Sicherer: Löschen einer Stelle mit Unterstellten hat ein „Abbrechen“, Esc und Enter löschen nichts mehr; zwei offene Tabs mit demselben Plan überschreiben sich nicht mehr still; Eingaben überstehen Neuladen direkt nach dem Tippen; der Stand-Knopf zeigt „geändert“, Export und Druck bieten dann einen neuen Stand an, und der Ausdruck trägt Stand und Version (sonst ENTWURF).",
      "Erste Fassung: Pläne anlegen, umbenennen, duplizieren, in den Papierkorb legen und wiederherstellen, alles nur auf diesem Gerät.",
      "Führungsorganisation mit Gliederung, Ziehen zum Umhängen, Einklappen, automatischem Layout, seitlich angehängten Stellen und Hervorhebungen.",
      "Taktische Zeichen aus der Sammlung von Jonas Köritz mit Suche, Favoriten und zuletzt benutzten Zeichen, dazu eigene Zeichen für Stäbe, ELO, LuK, Logistik und ein freies Textzeichen.",
      "Export als SVG, PNG und JSON; JSON-Dateien lassen sich wieder einlesen.",
      "Kommunikationsplan als Organigramm: jede Stelle mit Kontaktblock aus Bezeichnung, Betrieb, Leiter, Telefon, Fax, Mobil, E-Mail, Rufgruppen und Kanälen, Gültigkeiten in Rot, leere Felder auf Wunsch als Linie zum Ausfüllen.",
      "Mehrere Ansichten je Plan (Führungsorganisation und Kommunikationsplan) auf denselben Daten, mit Kopfleiste nach Fb Fü, Fußnoten und eigenem Logo.",
      "PDF in A4 oder A3, quer oder hoch, auf eine Seite eingepasst oder auf mehrere Seiten geteilt, mit Stand, Version und Einstufungsvermerk.",
      "Stände: einen Stand einfrieren, frühere Stände ansehen, mit dem aktuellen vergleichen oder als Kopie öffnen.",
      "Kommunikationsskizze nach Fb Fü 77 als freie Zeichenfläche: Stellen-Kästen, Anschluss-Fahnen, Geräte, NSt-Tabelle, Platzhalter, Rahmen und Verbinder, die beim Verschieben an den Elementen hängen bleiben.",
      "Skizze aus einer Stelle erzeugen (Rechtsklick im Plan): eigene Stelle mittig, übergeordnete links, unterstellte rechts oder unten, mit den Kontaktdaten aus dem Plan.",
      "Die fünf Vorlagen Kommunikationsskizze 1 bis 5 des THW als Startvorlagen, umschaltbar zwischen taktischer und technischer Skizze.",
      "Kommunikationsplan auch als Formular THW Fb Fü 76 und als Muster nach FwDV 800 Anlage 1, aus denselben Daten, mit Folgeblättern bei vielen Unterstellten.",
      "Export als PowerPoint mit bearbeitbaren Formen und Texten, Drucken direkt aus dem Browser.",
      "Plan als Link teilen: der ganze Plan steckt im Link, nach einem deutlichen Hinweis auf die enthaltenen Kontaktdaten; wer den Link öffnet, übernimmt eine Kopie.",
      "Hinweisliste mit Sprung zur betroffenen Stelle, Anzeige „offline“ im Kopf, neue Beispiele FwDV 800 und Einsatzübung Simbach (Fb Fü 76, Skizzen FGr FK und ZTr).",
      "Zeichen ELO, PuMA und BW mit Langform (Einsatzleitung Ort, Presse- und Medienarbeit, Bundeswehr) in Suche und Hilfe; PuMA steht jetzt als Führungsstelle statt als Versorgungsstelle.",
      "Dateinamen von Exporten enthalten keine Umlaute und Sonderzeichen mehr; vorher hieß die Datei in manchen Browsern nur „download“.",
    ],
  },
];
