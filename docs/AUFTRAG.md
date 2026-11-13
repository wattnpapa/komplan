# Auftrag: Neue Web-App „komplan.app" – Führungsorganisation, Kommunikationsplan und Kommunikationsskizze

## Kontext

Ich (GitHub: wattnpapa) baue eine Familie kostenloser Browser-Tools für BOS und Hilfsorganisationen unter dem Dach **einsatz.tools**: einsatzauftrag.app, erfassungsbogen.app, fmbauplaner.app, nachrichtenvordruck.app, sprechfunk-uebung.de. Die neue App gehört in diese Familie. Schwerpunkt THW, nutzbar aber für alle BOS (Feuerwehr, HiOrgs, Verwaltungsstäbe).

**Bevor du irgendetwas entscheidest:** Schau dir die Schwester-Repos an (mindestens `wattnpapa/einsatzauftrag` und `wattnpapa/erfassungsbogen` inkl. Submodul `bos-vokabulare`). Übernimm von dort Tech-Stack, Build, Projektstruktur, Design-Tokens, Header/Footer, Impressum/Datenschutz, PWA-Setup, Deployment (GitHub Pages) und Code-Konventionen. Die App soll sich anfühlen wie ein Geschwister dieser Tools, nicht wie ein Fremdkörper. Wenn sich die Repos widersprechen, nimm das neuere und sag mir, welches du gewählt hast.

## Was die App können muss

Drei Plantypen auf **einem gemeinsamen Datenmodell**. Man soll einen Plan als Führungsorganisation anlegen, ihn mit Kontaktdaten zum Kommunikationsplan anreichern und aus einzelnen Führungsstellen eine Kommunikationsskizze ableiten können, ohne Daten doppelt einzugeben.

Begriffe nach FwDV 800 / THW DV 1-100 / DV 1-101:
- **Kommunikationsplan**: „Plan zur visuellen Darstellung der Kommunikationsmöglichkeiten" (formalisiert).
- **Kommunikationsskizze**: „Freihändige nicht formalisierte Zeichnung von Kommunikationsmöglichkeiten".
- **Führungsorganisation**: Aufbau und Unterstellungsverhältnisse (wer führt wen).

### 1. Führungsorganisation (strukturierter Editor, Auto-Layout)

Baum aus Führungsstellen/Einheiten mit Unterstellungslinien. Vorbilder (Dateien in `_intern/beispiele-echtdaten/` und `docs/vorlagen/beispiele/`):
- NLWKN-Schadstoffunfallbekämpfung: HK (Havariekommando) → LG NLWKN (Lenkungsgruppe) → je Landkreis/Stadt ein Stab („LK Musterkreis, Einsatzstab Land") → ELO → mehrere EAL (EA Musterinsel A, EA Musterinsel B …). Seitlich am Stab ein „Gegenstab LK – wird gestellt durch LK".
- RÜBEX24-Übung: ÜL (Übungsleitung) mit FZ FK daneben → Log, PuMA, Bereitstellungsraum, EAL Szenarien → darunter Einheiten (Log-V, BÖH, OKPZ, Stapel von Fahrzeugen, Szenario A-1 … F-4 als Auslassung „⋮").
- THW-Einsatzstruktur: TEL → EAL 1–4 (mit Nummer und Ortsname darunter) → UEAL; ein Bereich kann farbig hinterlegt sein (Planspiel-Hervorhebung), darunter nummerierte Pfeile.
- DV 1-101: Führungsorganisation bei Gruppe, Zug, Verband, mit Einsatzabschnitten.

Anforderungen:
- Bearbeitung über Gliederungsansicht (Seitenleiste, Baum) + Eigenschaftsformular; Drag & Drop zum Umhängen; Knoten einklappen.
- Auto-Layout (tidy tree, orthogonale Linien, gemeinsame Sammelschiene wie in den Vorlagen). Pro Knoten überschreibbar: Kinder horizontal/vertikal, Abstand, „seitlich angehängt" (Gegenstab, FZ FK neben ÜL, LtS gestrichelt neben E).
- Linienarten: Unterstellung (durchgezogen), Zusammenarbeit/Verbindung (gestrichelt), geplant/optional (gepunktet).
- Knotenbeschriftung: Zeichen + Text rechts/unten + Nummer (Abschnitt „1", „2") + freie Zusatzzeilen.
- Auslassungs-Knoten („…", „⋮") und gestapelte Einheiten (Mehrfachzeichen versetzt).
- Hervorhebungsrahmen/-flächen über mehrere Knoten.

### 2. Kommunikationsplan (strukturiert, gleiche Daten + Kontaktblöcke)

Gleicher Baum wie die Führungsorganisation, jeder Knoten bekommt einen Kontaktblock. Felder aus den Vorlagen (FwDV 800 Anlage 1, THW Fb Fü 76, NLWKN-Komplan):
- Bezeichnung, Betrieb durch (z. B. „THW FK Musterstadt"), Leiter, Funkrufname
- Telefon, Fax, Mobil, E-Mail – jeweils **mehrfach**, mit optionaler **Gültigkeit** („Mail 1 ab 13.11. 15:00", „Mail 2 bis 13.11. 15:00"), die farbig hervorgehoben wird
- Rufgruppen Digitalfunk: TMO/DMO, Gruppenname (z. B. `TBZ_9901_UNI`, `T_MS-MUST-1`), Richtung (↓ = Rufgruppe zu den unterstellten Stellen)
- Analogfunk: Band (4 m / 2 m), Kanal, Betriebsart (W/U, G/U)
- Freie Zeilen und Fußnoten auf Planebene („Die jeweiligen EAL werden durch FZ FK Musterstadt Nord dargestellt", „Heros *** 10: *** hier wird der Name der EAL eingetragen")
- Platzhalter-Darstellung leerer Felder als gepunktete Linie (zum Ausfüllen auf Papier)

Darstellungsvarianten (umschaltbar, gleiche Daten):
- **Organigramm** mit Kontaktblöcken neben/unter den Knoten (NLWKN-Stil)
- **Formular Fb Fü 76** (THW): Kopf + Reihe übergeordneter/benachbarter FüSt + eigene FüSt + Raster unterstellter Stellen mit Kanalangaben
- **FwDV 800 Anlage 1** (Muster): Dienststelle/Sachbearbeiter/Stand, Einsatzleiter, Führungsstab, Benachbarte Kräfte, Sonstige Stellen, Kennwort, Rufgruppen-Sechsecke zwischen den Ebenen

### 3. Kommunikationsskizze Fb Fü 77 (freier Canvas)

Freie Zeichenfläche mit Formularkopf. Vorbilder: THW Fb Fü 77 (Kommunikationsskizze 1 und 4), Beispiele „FGr FK" und „ZTr" aus der Einsatzübung Simbach.
- Kopf: Fb Fü 77 | Titel („Kommunikationsskizze" / „Technisch-/Taktische Kommunikationsskizze") | Führungsstelle/Standort | für (Einsatz) | Stand (DTG) | F.d.R. | Einstufung (z. B. VS-NfD) | Logo der Organisation optional
- Elemente:
  - Führungsstellen-/Einheitenkasten mit taktischem Zeichen, Rufname, Tel/Fax/Mobil
  - **Anschluss-Pfeile** (Fünfeck-„Fahne", wie in den Vorlagen) für Funk (Wellensymbol ~~~, Kanal + Betriebsart bzw. Rufgruppe, TMO/DMO-Kennung), Telefon, Fax, Mobilfunk, E-Mail, PC, Mobilfunkadapter, Richtung links/rechts
  - Geräte-Kästchen: 4 m, 2 m, Mob Fu, Fax, PC, Handy
  - **Nebenstellenanlagen-Tabelle**: Anschlussart (C Wähl, ISDN UK0, a/b, DECT …), NSt-Nr., Teilnehmer; frei erweiterbar
  - Platzhalterkästen (gestrichelt) für noch nicht belegte Stellen, Kasten „Einheiten auf Marsch"
  - Fahrzeuge/Einheiten als taktische Zeichen mit Rufname darunter
- Verbinder: orthogonal, an Ports andockend (bleiben beim Verschieben verbunden), Farbe frei (Konvention in den Beispielen: rot = Funk, blau = Draht/Telefon), durchgezogen/gestrichelt, Abzweigpunkte/Sammelschienen.
- Raster/Fangen, Mehrfachauswahl, Ausrichten/Verteilen, Gruppieren, Ebenenreihenfolge, Zoom/Pan, Undo/Redo, Tastaturkürzel, Kopieren/Einfügen.
- **Aus Plan ableiten:** Rechtsklick auf Knoten im Komplan → „Skizze erzeugen": legt eigene Stelle mittig, übergeordnete links oben, Unterstellte rechts bzw. unten an, inkl. ihrer Kontaktdaten. Danach frei editierbar; Änderungen an Kontaktdaten bleiben mit dem Datenmodell verknüpft (Single Source of Truth), Position ist skizzenspezifisch.

### Original-Vorlagen des THW (Fb Fü 76 / Fb Fü 77)

Alle Unterlagen liegen unter `docs/vorlagen/`, Übersicht in `docs/vorlagen/README.md`. Die THW-Word-Vorlagen sind in `docs/vorlagen/thw-formulare/` (docx + PDF + PNG je Seite), Musterbeispiele in `docs/vorlagen/beispiele/`. Fundstellen der Vorschriften: `docs/vorlagen/VORSCHRIFTEN-AUSZUG.md`.

Der Ordner `_intern/` ist per `.gitignore` ausgeschlossen und enthält Echtdaten (NLWKN, RÜBEX24) und die Vorschriften-Volltexte. Du darfst ihn lesen, um Struktur, Layout und Symbolik zu verstehen. Übernimm daraus **keine** Namen, Telefonnummern, Mailadressen oder Rufgruppen in Code, Vorlagen, Tests, Screenshots oder Commits, und kopiere keine Vorschriftentexte ins Repo. Bau die Formular-Varianten **originalgetreu** danach nach, Abweichungen nur, wo sie digital klar besser sind (und dann in `docs/DECISIONS.md` notieren).

Was die Vorlagen festlegen:
- **Kopfleiste**, dreigeteilt (Allgemeines zu Fb Fü 76): links herausgebende Dienststelle/Führungsstelle und ggf. Funktion des Verfassers; Mitte Art der Skizze/des Plans und Verwendungsbereich („für …"); rechts Gültigkeitsvermerk (Stand) und Verschlusssachenvermerk (NfD), dazu **F.d.R.** (Zeichner/Herausgeber mit Dienststellung). Darüber blauer Balken mit Formularnummer links, Titel mittig, Logo rechts. Mindestformat A4, Querformat bevorzugt.
- **Zwei Detailstufen** (ebenfalls aus den Hinweisen): *taktische* Skizze für Führungskräfte (Fernmeldestellen nur als taktisches Zeichen der Einheit, technische Details nur soweit taktisch relevant) und *technische/betriebliche* Skizze für das Betriebspersonal (alle Einzelheiten, fernmeldetaktische/-technische Zeichen und Schaltzeichen). Umsetzen als Schalter pro Skizze, der technische Elemente (NSt-Tabelle, Geräte, Anschlussarten) ein-/ausblendet.
- **Fb Fü 76 Kommunikationsplan** (A4 quer): oben eine Reihe von 4 Kästen für übergeordnete/benachbarte Führungsstellen (FüSt, FuRN, Kanal, Tel., Fax); darunter die eigene Führungsstelle (Zeichen-Kasten, Bezeichnung, Funkrufname, MobilfunkNr, Telefax, Telefon) mit 4 Kanalfeldern (Kanal 4 m, Kanal 4 m, Kanal, Kanal 2 m, jeweils mit „Bedingung" und Richtungspfeil ↑/↓ bzw. gestrichelt); darunter ein Raster unterstellter Stellen (je: Kanal 2/4 m oben und unten mit Pfeil, FüSt, FuRN, Tel.) und eine untere Reihe „Takt. Einheit" mit Kanal 2/4 m, FuRN, Kanal 2 m; rechts ein Feld NSt. Das ist die Formularansicht desselben Datenmodells: übergeordnete/benachbarte Knoten → obere Reihe, ausgewählter Knoten → Mitte, Unterstellte → Raster. Bei mehr Unterstellten als Plätzen: Folgeseite.
- **Fb Fü 77 Kommunikationsskizze 1–5**: Skizze 2 ist leer (nur Kopf + ein Zeichen-Kasten), 1/3/4/5 sind vorstrukturierte Layouts mit Anschluss-Pfeilen links (Mobilfunk, Fax, PC, Mobilfunkadapter, Tel), eigener FüSt mit Geräten (4 m, 4 m, Mob Fu/Handy, Fax, PC) und NSt-Tabelle (Varianten: C Wähl/ISDN S0/Analog a/b; CAWITEL/AWINAP; C OB mit AZ und Teilnehmer 1–10), rechts gestapelte Gegenstellen (Zeichen-Kasten, Funkrufname, Tel., Fax, zwei Funk-Pfeile) und in Skizze 5 eine untere Sammelschiene mit gestrichelten Platzhalterkästen. Alle fünf als Startvorlagen anbieten.

## Taktische Zeichen

Nutze **https://github.com/jonas-koeritz/Taktische-Zeichen**.
- Lizenzen laut README: fertige Zeichen im Release CC0 1.0, Repo-Code CC BY 4.0, Schrift RobotoSlab Apache 2.0. Prüf das selbst im LICENSE nach und setz die Attribution in Impressum/Über-Seite.
- Einbinden als Release-Assets (SVG) oder Git-Submodul + Build-Schritt; generiere einen durchsuchbaren Index (Name, Kategorie, Organisation, Suchbegriffe/Synonyme).
- Symbolpalette mit Suche („EAL", „UEAL", „Zugtrupp THW", „Log-V") und Favoriten/Zuletzt benutzt.
- Fehlende Zeichen, die ich brauche (prüf, was davon im Repo fehlt): EAL, UEAL, ELO, TEL, EL, ÖEL, KatSL, LuK, BW, HK, LG/NLWKN-Stab (orangenes „Haus"-Zeichen für Verwaltungsstäbe mit Text LK/Stadt/NLWKN/HK), Gegenstab, LtS, BR, Logistik-Zeichen (Log, Log-V, Log-M, Log-VG, Versorgungsstellen), PuMA, Sack/Sand, FZ FK, Bereitstellungsraum. Für fehlende: im gleichen Stil als eigene parametrisierte SVG-Vorlagen im Projekt anlegen (Grundform + Text + Organisationskennung „THW"/„FW" + Stärkepunkte), sauber getrennt von den Upstream-Zeichen, und mir eine Liste geben, damit ich sie upstream als Issue einreichen kann.
- **Freies Textzeichen**: Grundform wählen (Führungsstelle mit Fahne, Stab-Haus, Kreis, Raute, Fahrzeug-Rechteck), Text und Farbe frei – damit Nutzer nicht blockiert sind, wenn ein Zeichen fehlt.

## Vorlagen (beim Anlegen eines Plans wählbar)

Leer · FwDV 800 Anlage 1 Kommunikationsplan · THW Fb Fü 76 · THW Fb Fü 77 Skizze 1–5 · Beispiele „FGr FK" und „ZTr" (Einsatz Simbach, aus den Ausbildungsfolien) · Führungsorganisation THW Zug / Verband / mit Einsatzabschnitten (DV 1-101) · Beispiel NLWKN-Schadstoffunfall (mit fiktiven Namen/Nummern!) · Beispiel Logistik in der Führungsorganisation.
Alle Beispieldaten fiktiv (Musterstadt, 0999/…, @example.org), keine echten Personen oder Rufnummern.

## Export / Import

- **PDF** A4 und A3, quer/hoch, Vektor (z. B. SVG → PDF via svg2pdf.js/jsPDF oder was zum Stack passt), Seitenfuß mit Stand und Version, optional Einstufungsvermerk oben/unten, Seitenteilung bei großen Plänen oder „auf Seite einpassen".
- **SVG** und **PNG** (wählbare Auflösung, transparenter/weißer Hintergrund).
- **PPTX** (z. B. pptxgenjs): Formen, Linien und Texte als **editierbare** PowerPoint-Objekte, Zeichen als eingebettete Bilder. Ziel: Wer bisher mit den PowerPoint-Vorlagen arbeitet, kann weitermachen.
- **JSON** speichern/laden (versioniertes Schema mit `schemaVersion` und Migrationen).
- **Teil-Link**: kompletter Plan komprimiert im URL-Fragment (`#…`, z. B. lz-string), kein Server. Vor dem Erzeugen deutlicher Hinweis, dass der Link Telefonnummern und Namen enthält. Bei zu großen Plänen Hinweis auf JSON-Export.
- Drucken über Browser mit eigenem Print-CSS.

## Speicherung, Offline, Datenschutz

- Nur lokal: IndexedDB mit Autosave, Liste aller Pläne, Duplizieren, Umbenennen, Löschen (mit Bestätigung/Papierkorb).
- **Stand-Verwaltung**: Stand als DTG (THW-Format, z. B. `172027oct15` / `010730JUN16`, Eingabe über Picker, „jetzt"-Button). „Neuen Stand anlegen" erzeugt einen Snapshot; alte Stände ansehen und vergleichen.
- PWA, voll offline nutzbar (Stabsräume ohne Netz).
- Keine Telemetrie, keine externen Requests zur Laufzeit (Fonts lokal).

## Validierung (nicht blockierend, als Hinweisliste)

Knoten ohne Rufname/Erreichbarkeit, doppelte Rufgruppen auf einer Ebene, abgelaufene Gültigkeiten von Kontaktangaben bezogen auf den Stand, Skizzenelemente ohne Verbindung, verwaiste Verweise.

## Bedienung / UX

- Desktop/Laptop im Stab ist Hauptnutzung, Tablet muss bedienbar sein. Kein Smartphone-Editor nötig, aber Ansicht/Export auf dem Handy.
- Deutsch, Fachbegriffe der BOS. Kurze Kontext-Hilfen (was ist ELO, EAL, Fb Fü 77) mit Quellenangabe der Vorschrift.
- Gute Druckbarkeit in Schwarzweiß (Linienarten nicht nur über Farbe unterscheiden).

## Technische Leitplanken

- Stack wie die Schwester-Apps. Wenn dort keine Diagramm-Lib existiert: wähle bewusst (z. B. eigenes SVG-Rendering + elkjs/d3-hierarchy für Layout vs. React Flow/X6/tldraw). Begründe die Wahl kurz in `docs/ARCHITECTURE.md`, bevor du implementierst. Kriterien: Vektor-Export, PPTX-Mapping, Offline, Bundle-Größe, Lizenz.
- Datenmodell zuerst entwerfen und mir zeigen (TypeScript-Typen): `Plan`, `Node` (Führungsstelle/Einheit, Zeichen-Ref, Kontakt, Kanäle), `Edge` (Unterstellung/Verbindung, Medium), `View` (FüOrg / Komplan-Variante / Skizze mit eigenen Positionen), `Stand`.
- Tests: Unit-Tests für Modell, Layout, Migrationen, DTG-Parser; Playwright-E2E für Anlegen → Bearbeiten → Export; visuelle Regressionstests für die Vorlagen.
- README, Lizenz wie Schwester-Repos, Attribution der Zeichen.

## Vorgehen

1. Schwester-Repos analysieren, mir Stack-/Struktur-Entscheidung kurz zusammenfassen.
2. Datenmodell + Architektur-Doc vorschlagen, auf mein OK warten.
3. Meilensteine, jeweils lauffähig und deploybar:
   - M1: Grundgerüst, Planverwaltung, Zeichen-Integration + Palette, Führungsorganisation mit Auto-Layout, SVG/PNG/JSON-Export
   - M2: Kommunikationsplan (Organigramm-Variante), Kontaktblöcke, PDF-Export, Stand-Verwaltung
   - M3: Kommunikationsskizze Fb Fü 77 (Canvas, Anschluss-Pfeile, NSt-Tabelle, Verbinder), „Skizze aus Knoten erzeugen"
   - M4: Fb-Fü-76- und FwDV-800-Variante, PPTX-Export, Teil-Link, Vorlagen, Validierung, PWA-Feinschliff
4. Nach jedem Meilenstein: kurze Liste, was fertig ist, was offen ist, was du angenommen hast.

Frag nach, wenn eine Entscheidung echte Folgen hat. Kleinigkeiten entscheidest du selbst und schreibst sie in `docs/DECISIONS.md`.
