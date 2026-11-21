# Entscheidungen

Kleinere Festlegungen, die ohne Rückfrage getroffen wurden. Neueste oben.

## 2026-11-21

- **Kontaktblock standardmäßig unter dem Zeichen**, mittig unter Zeichen und Beschriftung. Ein Block rechts macht jede Stelle etwa um die Blockbreite breiter; bei sechs Unterstellten wird der Plan dadurch so breit, dass er auf A4 quer nur noch knapp halb so groß gedruckt wird. Vorhandene Ansichten behalten ihre Einstellung, die Vorlage Schadstoffunfall bleibt bei „rechts" wie das Vorbild.
- **Mehrere Wurzeln dicht nebeneinander.** Der Wald legt Teilbäume nicht mehr als ganze Rechtecke nebeneinander, sondern schiebt jeden weiteren Baum so weit nach links, bis ein Kasten oder eine Linie auf gleicher Höhe den Abstand unterschreitet. Eine lose Stelle (z. B. Regionalstelle) steht damit neben der Wurzel des Nachbarbaums statt links neben allen Unterstellten. Innerhalb eines Baums gilt weiter das Block-Layout.
- **Tel./Fax im Skizzen-Kasten nur bei Bedarf**: Ein Stellen-Kasten zeigt nur Kontakte, die die Stelle hat. Neues additives Feld `SkStelle.leereTelFax` für leere Zeilen zum Ausfüllen; die Vorlagen Fb Fü 77 Skizze 1, 3, 4 und 5 setzen es, weil sie Vordrucke sind. Neue Kästen und die Kästen aus „Skizze aus Stelle" sind 16 mm hoch und wachsen mit dem Inhalt; die eigene Stelle bleibt 30 mm hoch, damit die Anschlüsse am Kasten und nicht am Zeichen andocken.
- **Zeichenbereich der Skizze beginnt bei 30 mm** (Kopfleiste 10–28,5 mm plus Luft). Verschieben, Stupsen, Ablegen und Größe ändern halten Elemente darunter; liegt eines schon in der Kopfleiste, geht es nur noch nach unten. Die Hinweisliste meldet solche Elemente (`skizze-im-kopf`, Warnung). Bestehende Lagen werden nicht automatisch verschoben.
- **Kontaktblock unter seitlichen Linien**: Läuft auf der Seite des Kontaktblocks eine Linie auf Höhe der Zeichenmitte (seitlich angehängte Stelle, Kamm), beginnt der Block 1,2 mm unter dieser Linie statt an der Zeichenoberkante.

## 2026-11-21

- **Zeichenbreite auch beim Einpassen**: Der Plan wird so groß wie möglich auf eine Seite gesetzt, die Zeichen aber höchstens so breit wie eingestellt (Vorgabe 50 mm). Passt der Plan dafür nicht auf die Seite, werden die Zeichen kleiner; der PDF-Dialog nennt dann die erreichte Breite. Die bisherige Grenze „höchstens doppelte Größe" gilt nur noch ohne Zeichenbreite. Skizzen (festes Blatt) und Formulare mit festen Blättern bekommen keine Zeichenbreite; „teilen" druckt dort wie früher in Originalgröße.

## 2026-11-19

- **Zeichenbreite im PDF** gilt für „auf Seiten teilen": Die ganze Szene wird so skaliert, dass die Grundform (x = 10 … 246 der 256er-viewBox) des größten Zeichens die gewählte Breite hat, Vorgabe 50 mm, erlaubt 5 bis 300 mm. Texte, Linien und Abstände wachsen mit, damit der Plan wie am Bildschirm aussieht; das Layout bleibt unverändert. „Einpassen" und Formulare mit festen Blättern (Fb Fü 76, FwDV 800) ignorieren den Wert. Bisher teilte „teilen" in Originalgröße (Zeichen etwa 16,6 mm breit); bestehende Ansichten mit „teilen" drucken jetzt größer. Gespeichert additiv als `Papier.zeichenBreite`.

## 2026-11-13 (M4)

- **Fb Fü 76 aus dem Baum**: eigene Stelle = Fokus der Ansicht (Vorgabe: oberste Stelle). Obere Reihe: übergeordnete Stelle, dann die in der Ansicht gewählten Nachbarn, dann Geschwister (vier Plätze). Die vier Kanalfelder zeigen die ersten vier Funkangaben der eigenen Stelle mit ihrem Richtungspfeil. Unterstellte: vier im Raster, fünf in der Reihe „Takt. Einheit", weitere auf Folgeblättern. Kanal oben im Kasten einer Unterstellten: deren Funk mit Richtung ↑, sonst der Führungskanal (↓) der eigenen Stelle; unten: deren Funk mit Richtung ↓.
- **FwDV 800 aus dem Baum**: Fokus-Stelle = „Führungsstab/Führungsgruppe", ihr Leiter = „Einsatzleiter/EA-Leiter", Unterstellte = „EA/UA" (Leiter oben, Stelle als Führungsgruppe unten), fünf je Blatt. Rufgruppen-Sechsecke zeigen Funk mit Richtung ↓. Dienststelle, Sachbearbeiter (sonst F.d.R.) und Kennwort aus dem Kopf; „Benachbarte Kräfte" aus Nachbarn und Geschwistern, „Sonstige Stellen" aus den losen Stellen. Der Vermerk „(Muster)" und „Anlage 1" entfallen.
- **Folgeblätter** liegen in der Szene untereinander (`Szene.seiten`); PDF und PowerPoint machen daraus je eine Seite bzw. Folie.
- **PowerPoint**: jede Form ein eigenes Objekt (Rechteck, Ellipse, Freiform für Linienzüge und Fahnen, Textfeld in Arial), taktische Zeichen als PNG mit 512 px. Freiformen nutzen den Formtyp `custGeom`, den pptxgenjs 4 kann, aber nicht in seinen Typen führt.
- **Teil-Link**: Fragment `#p=` (Plan als JSON, deflate-raw, base64url), ohne Stände. Erst nach Bestätigen des Hinweises auf die enthaltenen Daten; Logo optional weglassen. Ab 8 000 Zeichen Hinweis auf abgeschnittene Links, ab 60 000 kein Link, sondern Verweis auf den JSON-Export. Beim Öffnen wird der Plan angezeigt und erst nach „Übernehmen" als Kopie gespeichert.
- **Simbach-Beispiele** nach den Ausbildungsfolien „Betriebsunterlagen" (Rufnamen und Kanäle wie dort, Telefonnummern erfunden). Ein Plan, drei Ansichten: Fb Fü 76, Skizze FGr FK, Skizze ZTr; die drei Vorlagen öffnen jeweils eine davon zuerst.
- **Dateinamen** nur noch aus ASCII-Buchstaben, Ziffern und `._-`; Umlaute werden umschrieben. Chromium hat Namen mit Sonderzeichen verworfen.
- **Offline**: Der Service Worker hält jetzt auch die TTF-Schrift (PDF) und die Lizenztexte vor; im Kopf steht „offline", solange das Gerät kein Netz hat. Ein E2E-Test lädt die App ohne Netz neu.
- **Drucken** über den Browser: nur das Blatt, A4 quer, ohne Bedienelemente.
- **`image-size` per `overrides` auf ^2.1.0**: pptxgenjs 4.0.1 verlangt 1.x mit einer DoS-Lücke (GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr). Im Browser-Bundle von pptxgenjs wird das Paket nicht geladen; der Override hält nur `npm audit` sauber und kann entfallen, sobald pptxgenjs nachzieht.

## 2026-11-13 (M3)

- **Skizze als eigene Ansicht im selben Plan.** Stellen-Kästen, Zeichen, NSt-Tabellen und Anschlüsse mit Bezug lesen Funkrufname, Telefon, Fax und Funk aus `Plan.stellen`; die Skizze speichert nur Lage, Größe und Darstellung. Ändert man eine Nummer in der Skizze über „Kontaktdaten dieser Stelle bearbeiten", ändert sie sich in allen Ansichten.
- **Gegenstellen der Vorlagen sind lose Stellen** ohne Zeichen (weißer Kasten wie im Vordruck). Wer sie ausfüllt, füllt echte Stellen, die man danach in die Führungsorganisation ziehen kann.
- **Verbinder rechtwinklig** mit 3 mm Stich aus der Seite und Z- bzw. L-Form; ein verschiebbarer Knick (ein Wegpunkt) reicht für die Vorlagen. Ports rasten beim Andocken auf Achtel der Seite ein, damit benachbarte Linien gleich hoch liegen.
- **Farbe neuer Verbinder „auto"**: Funk (Funk-Anschluss oder 4-m/2-m-Gerät an einem Ende) rot, sonst schwarz; rot/blau/schwarz wählbar (Konvention der Ausbildungsbeispiele: rot Funk, blau Draht). Linienart ist zusätzlich wählbar, damit der Schwarzweißdruck unterscheidbar bleibt.
- **Detailstufe**: „taktisch" blendet Geräte, NSt-Tabellen, Anschlüsse außer Funk, als technisch markierte Elemente und Tel./Fax in den Kästen aus; Verbinder zu ausgeblendeten Elementen fallen mit weg.
- **Neue Modellfelder (additiv)**: `SkStelle.leereFunk` (leere Funk-Fahnen der Vorlagen), `SkStelle.inhalt` ("rahmen" für die eigene FüSt, deren Geräte und Tabellen eigene Elemente sind), `SkNstTabelle.gruppen` (vorgegebene Anschlussarten mit Zeilenzahl).
- **Vorlage Skizze 4 (C OB)**: Der Vordruck hat zwei Teilnehmerspalten 1–10. Die Tabelle hat eine Teilnehmerspalte mit Gruppen „C OB", „AZ 1", „AZ 2" und Leerzeilen; zehn Teilnehmer passen in die Zeilen.
- **Vorlage Skizze 5**: Der Vordruck überlappt (vier Gegenstellen je Seite plus Platzhalterreihe auf A4). Hier drei je Seite, die Platzhalter unten an einer gestrichelten Sammelschiene im Rahmen „Einheiten auf Marsch".
- **Bedienung**: Gummiband zum Auswählen, Ansicht verschieben mit Alt+Ziehen oder mittlerer Maustaste (linkes Ziehen auf leerer Fläche ist die Auswahl). Die Werkzeugleiste ändert ihre Höhe nicht mit der Auswahl, damit die Fläche nicht springt.
- **Zwischenablage** nur innerhalb der App (Elemente samt Verbindern zwischen ihnen), nicht die des Systems.

## 2026-11-13 (M2)

- **PDF direkt mit jsPDF**, nicht SVG → PDF im Ganzen: Linien, Flächen und Texte entstehen als PDF-Objekte in der Standardschrift Helvetica (nicht eingebettet, metrisch gleich mit dem Layout). Nur die taktischen Zeichen gehen über svg2pdf.js. jsPDF und svg2pdf (ca. 156 kB gz) werden erst beim Export geladen.
- **Roboto Slab als TTF**: jsPDF bettet nur TrueType ein. `scripts/woff-zu-ttf.mts` packt die WOFF-Datei aus dem Zeichen-Release verlustfrei zu TTF um; Lizenztext in `public/schrift/LIZENZ-ROBOTO-SLAB.txt`.
- **Keine Sonderzeichen im PDF-Text**: Richtungspfeile der Rufgruppen sind gezeichnete Flächen, Auslassungen drei Punkte. Was nicht in WinAnsi liegt, ersetzt `pdfText` (wie einsatzauftrag „→" zu „->").
- **Einpassen** vergrößert kleine Pläne höchstens auf das Doppelte. **Teilen** druckt in Originalgröße mit 10 mm Überlappung; der Seitenfuß nennt Zeile/Spalte.
- **Einstufung**: Im schmalen Feld der Kopfleiste steht „VS-NfD" (wie „N f D" im Vordruck), der volle Wortlaut oben und wahlweise unten auf jeder PDF-Seite.
- **Kontaktblock**: Mehrere E-Mail-Adressen werden „Mail 1", „Mail 2" nummeriert (wie im NLWKN-Plan). Gültigkeiten stehen rot hinter dem Eintrag; abgelaufene Einträge bleiben sichtbar, die Hinweisliste meldet sie. Platzhalterlinien gibt es für leere Bezeichnung, Tel., Fax, Mail und Rufname sowie für Kontakte ohne Wert.
- **Neue Ansicht** übernimmt Einklapp-/Layout-Einstellungen und Hervorhebungen der gerade offenen Ansicht, damit der Kommunikationsplan aussieht wie die Führungsorganisation.
- **Stand anlegen** friert den laufenden Plan als Schnappschuss ein (eigener IndexedDB-Store, im JSON-Export enthalten) und setzt den Plan auf Version +1 mit dem aktuellen Zeitpunkt. Der Vergleich listet Stellen, Kontakte, Funk, Nebenstellen, Unterstellung und Kopf.
- **Logo** wird beim Laden auf höchstens 600 px gerastert und als PNG im Plan gespeichert, auch bei SVG-Dateien (kein Skript aus fremden SVG im Plan).
- **Modell additiv erweitert**: `KnotenEinstellung.kontaktLage` (je Stelle und Ansicht rechts/links/unten/aus), `KontaktLage` um „links".
- Fb Fü 76 und FwDV 800 sind in der Auswahl der Darstellung sichtbar, aber gesperrt, bis M4 sie liefert.

## 2026-11-13 (M1)

- **Zeichenkatalog im Kern-Baustein** (umgezogen nach Freigabe des Schreibzugriffs): `bos-taktische-zeichen` hat den eigenen Einstiegspunkt `@bos/taktische-zeichen/katalog` mit allen Ordnern der Sammlung, je Ordner nachladbar und nicht aus `index.ts` exportiert (Aufnahmeregel 5). Der Wochen-Workflow des Kerns zieht ihn mit `symbole.ts` zusammen nach. komplan pinnt das Submodul; Suche, Synonyme und eigene Zeichen bleiben in komplan, weil nur komplan sie nutzt (Aufnahmeregel 1). Die Schrift (Roboto Slab) liegt in komplan unter `public/schrift/`.
- **Submodule** `bos-vokabulare` und `eeb-format` (Peer von vokabulare) auf denselben Commits wie in erfassungsbogen gepinnt. Benutzt wird in M1 nur `thw-ov` (Vorschläge für „Betrieb durch"); importiert wird das Einzelmodul, damit die Berufeliste nicht ins Bundle kommt.
- **Schrift im Plan: Helvetica-Metrik** (`Helvetica, Arial, Liberation Sans`). Das Layout misst Text ohne DOM mit den AFM-Breiten; Arial, Liberation Sans und die PDF-Standardschrift sind metrisch gleich, so steht der Plan in Browser, Node-Tests und (ab M2) PDF gleich. Taktische Zeichen behalten Roboto Slab.
- **Baum-Layout als Block-Layout** (Teilbaum = Rechteck) statt Reingold-Tilford mit Konturen. Etwas breiter, dafür schiebt sich kein Teilbaum unter einen Nachbarn, wie bei gezeichneten Plänen. Stellen gleicher Ebene stehen auf gleicher Höhe, solange die Kinder nebeneinander liegen.
- **Linien enden hinter den Zeichen.** Die Unterstellungslinie läuft bis zur Rechteckkante der 256er-viewBox (y = 64) und liegt unter dem Zeichen; bei Haus, Raute und Kreis endet sie so sichtbar an der Form. Hat eine Stelle ihre Beschriftung unten, beginnt die Linie nach unten unter dem Text.
- **Neu im Modell (additiv, ohne Schema-Sprung):** `KnotenLayout.versatz` setzt eine Stelle unter der Sammelschiene tiefer (DV 1-101: EAL unterhalb der grau hinterlegten Einsatzleitung). `Freielement.bezug` hängt Pfeile/Text an eine Stelle statt an Blattkoordinaten (nummerierte Pfeile unter den UEAL).
- **DV-1-101-Vorlagen**: Einsatzleiter als weiße Raute mit Stärkepunkten, LtS als weißer Kreis mit Dach, Einsatzleitung als grau hinterlegte, gestrichelt umrandete Fläche. Einheiten und EAL hängen wie in der Vorschrift unterhalb der Fläche („Tiefer setzen" in den Eigenschaften).
- **Langformen** (vom Auftraggeber nachgereicht): ELO = Einsatzleitung Ort, PuMA = Presse- und Medienarbeit, BW = Bundeswehr. PuMA ist damit keine Versorgungsstelle mehr (Kreis mit schwarzem Boden), sondern eine Führungsstelle mit Text.
- **Kein Smartphone-Editor**: unter 44 rem Breite stapeln sich Gliederung, Fläche und Eigenschaften; bedienbar, aber nicht optimiert, wie im Auftrag vereinbart.
- **Bildvergleich** (`e2e/__bilder__/`) mit 2 % Toleranz. Die Bilder entstehen unter Linux mit Liberation Sans; weicht die CI-Schrift ab, müssen sie dort einmal neu erzeugt werden (`npm run test:e2e -- --update-snapshots=all`).

## 2026-11-13 (Planung)

- **Stack nach erfassungsbogen, nicht einsatzauftrag.** Die Repos widersprechen sich bei der Oberfläche (Vanilla-TS gegen React 19) und beim Service Worker (eigenes Plugin gegen vite-plugin-pwa). erfassungsbogen hat den neueren Stand (letzter Commit 12.11.2026 gegen 30.10.2026) und ist das Repo, aus dem einsatzauftrag sein Design-System kopiert hat. Aus einsatzauftrag kommen trotzdem das Satzmodell-Muster (Szene aus Zeichenelementen in mm), jsPDF, der Teil-Link mit `CompressionStream` und der GitHub-Pages-Workflow.
- ~~**Keine Reichweitenmessung.**~~ Überholt durch den Eintrag vom 2026-11-13 (Reichweitenmessung).
- **Keine Diagramm-Bibliothek, eigenes Layout.** Begründung in ARCHITECTURE.md Abschnitt 3.
- **Zeichen-Lizenz.** Upstream-README (Stand Release v2.0.0): Code CC BY 4.0, fertige Zeichen aus `release.zip` CC0 1.0; Schrift Roboto Slab Apache 2.0; `LICENSE` im Repo ist der CC-BY-4.0-Text. Das README von `wattnpapa/bos-taktische-zeichen` nennt für dieselben Zeichen dagegen CC BY 4.0. komplan nennt Jonas Köritz in Impressum und Über-Dialog in jedem Fall mit Link und Lizenzangabe, damit beide Lesarten erfüllt sind.
- **Zeichen-Version v2.0.0** festgeschrieben (wie bos-taktische-zeichen), Aktualisierung per Skript mit Diff-Prüfung.
- **E2E mit `@playwright/test`** statt Cucumber wie in erfassungsbogen, weil der Auftrag Playwright-E2E und Bildvergleich ausdrücklich nennt und `toHaveScreenshot` dort eingebaut ist.
- **Bezeichner deutsch** (`Stelle` statt `Node`, `Ansicht` statt `View`), wie in den Schwester-Repos.
- **DTG-Normalform** `TTHHMMMONJJ` mit Monat in Großbuchstaben (`172027NOV26`). Der Parser nimmt Groß- und Kleinschreibung an (`172027oct15`, `010730JUN16`), englische und deutsche Monatskürzel (OKT/OCT, MAI/MAY, DEZ/DEC). Anzeige wählbar.
- **Zeitangaben ohne Zeitzone** (`2026-11-13T15:00`). Gültigkeiten und Stand beziehen sich auf die Ortszeit des Stabs.

## 2026-11-13 (Reichweitenmessung)

- **Reichweitenmessung mit GoatCounter**, wie in den Schwester-Apps, auf ausdrücklichen Wunsch des Auftraggebers; ersetzt die frühere Festlegung „Keine Reichweitenmessung".
- **Nie ein Fragment senden.** Im Fragment stehen Plan-IDs und bei Teil-Links der ganze Plan mit Kontaktdaten. `window.goatcounter` setzt deshalb `path` fest auf `location.pathname`, `no_events` ist gesetzt; count.js zählt ohnehin nicht beim Hash-Wechsel. `e2e/zaehlung.spec.ts` prüft, dass in keiner Zähl-URL `#`, `p=` oder eine Plan-ID steht.
- **Skript erst nach dem load-Event**, mit https://, damit eine hängende Verbindung zu gc.zgo.at nicht die Ladeanzeige hält. Widerspruch über localStorage `skipgc` (Kästchen „Nicht mitzählen" auf der Datenschutzseite).
- **CSP** nur um `https://gc.zgo.at` (script-src) und `https://komplan.goatcounter.com` (img-src, connect-src) erweitert. count.js wird vom Service Worker nicht gecacht; offline fällt die Zählung still aus.
- **E2E-Tests** brechen Requests an gc.zgo.at und *.goatcounter.com zentral per Fixture ab (`e2e/fixture.ts`).
