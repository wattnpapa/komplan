# Architektur komplan.app

Stand: Entwurf zur Freigabe (vor M1). Datenmodell: [DATENMODELL.md](DATENMODELL.md). Kleinere Festlegungen: [DECISIONS.md](DECISIONS.md).

## 1. Herkunft: was von den Schwester-Repos übernommen wird

Angesehen: `wattnpapa/einsatzauftrag` (letzter Commit 30.10.2026) und `wattnpapa/erfassungsbogen` (12.11.2026) mit den Submodulen `bos-vokabulare`, `bos-taktische-zeichen`, `eeb-format`, `bos-meldekopf`.

| Thema | einsatzauftrag | erfassungsbogen | komplan übernimmt |
|---|---|---|---|
| Oberfläche | Vanilla-TS, DOM von Hand | React 19 | **React 19** (erfassungsbogen, neuer; ein Diagramm-Editor mit Seitenleiste, Eigenschaftsformular und Undo braucht Komponenten) |
| Build | Vite 8, `root: web/` | Vite 8, `index.html` im Wurzelordner | Vite 8, Aufbau wie erfassungsbogen (`index.html`, `src/app/`, `public/`, `scripts/`) |
| Sprache | TypeScript 5.9, strict | TypeScript 7, strict, `noUncheckedIndexedAccess` | TypeScript wie erfassungsbogen |
| PWA | eigener `sw.js` per Vite-Plugin | `vite-plugin-pwa` + `workbox-window` | `vite-plugin-pwa` (erfassungsbogen) |
| Tests | Vitest | Vitest mit zwei Projekten `logik` (node) / `oberflaeche` (jsdom), E2E mit Cucumber + Playwright | Vitest-Aufteilung wie erfassungsbogen; E2E mit `@playwright/test` (so im Auftrag verlangt) |
| Gestaltung | Token-CSS aus erfassungsbogen kopiert | `DESIGN.md` „Amtlich, aber wach" | Token-Satz aus `DESIGN.md`/`stil.css` 1:1, Radius 0, vier Anzeigemodi Standard/Feld/Dunkel/Nacht, Archivo Variable lokal |
| Kopf/Fuß | blauer Kopf mit Anzeige-Schalter | Fußzeile mit Version, Impressum/Datenschutz/Über, Werkzeugzeile `einsatz.tools` | beides; Werkzeugzeile um `komplan.app` ergänzt (alphabetisch) |
| Impressum/Datenschutz | `web/impressum.html`, `web/datenschutz.html` | `public/impressum.html`, `public/datenschutz.html` | statische Seiten unter `public/`, Text angepasst (keine Reichweitenmessung) |
| PDF | jsPDF, eigenes Satzmodell „Liste von Zeichenelementen in mm" | pdfmake | **jsPDF** + Satzmodell-Muster aus einsatzauftrag (siehe 3.) |
| Teil-Link | `CompressionStream("deflate-raw")` + base64url im Fragment | QR-Transport | Verfahren aus einsatzauftrag, Fragment `#p=` |
| Deployment | `.github/workflows/pages.yml` → GitHub Pages | Release-Workflow, mehrere Plattformen | Pages-Workflow aus einsatzauftrag, CI-Prüflauf aus erfassungsbogen (ohne Electron/Capacitor) |
| Lizenz | EUPL-1.2 | EUPL-1.2 | EUPL-1.2 |
| Konventionen | deutsche Bezeichner, Conventional Commits, relative Importe mit `.js` | deutsche Bezeichner, Changelog `aenderungen.ts` „Was ist neu" | deutsche Bezeichner, Conventional Commits, Changelog wie erfassungsbogen |

Abweichung von beiden: Beide Apps zählen Aufrufe über GoatCounter. Der Auftrag verbietet externe Requests zur Laufzeit, deshalb gibt es in komplan keine Reichweitenmessung, und die CSP erlaubt `connect-src 'self'` ohne Ausnahme.

## 2. Bausteine

```
src/
  modell/      Typen, Erzeugen/Ändern (reine Funktionen), Migrationen, Validierung, DTG
  zeichen/     Zeichenkatalog (generiert aus Upstream), eigene Zeichen, Suchindex
  layout/      Baum-Layout Führungsorganisation, Formular-Layouts Fb Fü 76 / FwDV 800 / Fb Fü 77
  szene/       Szene = Liste von Zeichenelementen in mm (Rechteck, Pfad, Text, Zeichen, Bild)
  ausgabe/     SVG, PNG, PDF (jsPDF), PPTX (pptxgenjs), JSON, Teil-Link, Druck-CSS
  speicher/    IndexedDB: Pläne, Stände, Papierkorb, Einstellungen, Favoriten
  app/         React-Oberfläche (Planliste, Gliederung, Eigenschaften, Zeichenfläche, Dialoge)
scripts/       zeichen-holen.mts, eigene-zeichen.mts, Icons
public/        impressum.html, datenschutz.html, manifest, Icons, Schriften
e2e/           Playwright inkl. Bildvergleich der Vorlagen
```

Abhängigkeitsrichtung: `app → ausgabe → szene → layout → modell`, `zeichen` wird von `layout`/`szene` gelesen. `modell`, `layout`, `szene` haben keine DOM- und keine React-Importe und laufen im Test unter `node`.

## 3. Rendering: eigene SVG-Szene statt Diagramm-Bibliothek

Keine der Schwester-Apps hat eine Diagramm-Bibliothek. Geprüft:

| Kriterium | Eigene Szene + eigenes Layout | React Flow (xyflow) | AntV X6 | tldraw | elkjs (nur Layout) |
|---|---|---|---|---|---|
| Vektor-Export SVG/PDF | direkt, die Szene *ist* Vektor | Knoten sind HTML-Divs, Export nur über DOM-zu-Bild oder Nachbau | SVG, aber Knoten oft `foreignObject` | eigenes Format, SVG-Export ok | – |
| PPTX-Mapping | jedes Szenenelement → genau ein PPTX-Objekt | Nachbau nötig | Nachbau nötig | Nachbau nötig | – |
| Formular-Varianten (Fb Fü 76, FwDV 800) | gleiche Szene, anderes Layout | passt nicht (Formular ist kein Graph) | passt nicht | passt nicht | – |
| Offline/Bundle (min+gz, grob geschätzt) | 0 kB fremd | ca. 50 kB | ca. 200 kB | ca. 350 kB | ca. 400 kB (GWT-Kompilat) |
| Lizenz | – | MIT | MIT | tldraw-Lizenz (Wasserzeichen ohne Kauf) | EPL-2.0 |
| Sammelschiene/Seitenanbau wie in den Vorlagen | genau so baubar | Kantenrouting selbst schreiben | eigener Router | frei gezeichnet | orthogonal ja, Sammelschiene und „seitlich angehängt" nur angenähert |

Entscheidung: **eigene Szene, eigenes Layout.** Das ist das Muster aus einsatzauftrag (`satz.ts` rechnet Zeichenelemente, `zeichnen.ts` zeichnet sie, die Web-Vorschau nutzt dieselbe Liste) auf Diagramme übertragen:

1. `layout/` rechnet aus Plan + Ansicht eine **Szene**: flache Liste von Elementen mit Koordinaten in mm auf dem Blatt, jedes mit Verweis auf seine Herkunft (`stelleId`, `elementId`) für Auswahl und Klick.
2. `ausgabe/svg.ts` macht daraus SVG. Dieselbe Funktion zeichnet den Editor (React rendert `<svg>` mit Interaktions-Ebene darüber) und den SVG-/PNG-Export.
3. `ausgabe/pdf.ts` zeichnet die Szene mit jsPDF (Linien, Flächen, Text als echte PDF-Objekte), taktische Zeichen über `svg2pdf.js` als Vektor.
4. `ausgabe/pptx.ts` legt je Element ein PowerPoint-Objekt an (Rechteck, Linie, Fünfeck-Fahne als Freiform, Textfeld); Zeichen als eingebettetes Bild.

Gleiche Eingabe, gleiche Szene: Die Szene ist deterministisch, damit Bildvergleichstests stabil sind.

### Baum-Layout

Eigene Umsetzung (~400 Zeilen, mit Tests) des „tidy tree" nach Reingold-Tilford/Walker mit variablen Knotengrößen, Ausgabe orthogonaler Linien mit gemeinsamer Sammelschiene:

- Kinder `horizontal` (Standard): Sammelschiene unter dem Elternknoten, senkrechte Stiche zu den Kindern.
- Kinder `vertikal`: Kinder untereinander, Linie seitlich als Kamm (wie Einheitenlisten unter EAL in RÜBEX24).
- `seitlich links/rechts`: Knoten neben dem Elternknoten auf gleicher Höhe, waagerechte Linie (Gegenstab, FZ FK neben ÜL, LtS gestrichelt neben E). Zählt nicht in die Breite des Teilbaums darunter.
- Abstand je Knoten überschreibbar, eingeklappte Teilbäume zeigen „+n".
- Kontaktblöcke (Komplan-Organigramm) gehen als Teil der Knotengröße ins Layout ein (rechts oder unter dem Zeichen).

### Fb Fü 77 Skizze

Kein Auto-Layout. Elemente haben eigene Positionen in mm. Verbinder docken an **Ports** (Seite + relativer Versatz) und werden orthogonal geführt; der Router ist ein einfacher Manhattan-Router mit Mittelknick und optional festgehaltenen Wegpunkten. Raster 2,5 mm, Fangen an Raster und Kanten anderer Elemente.

## 4. Zustand, Undo, Speicher

- Zustand: ein Store je geöffnetem Plan (`useSyncExternalStore`), Änderungen nur über Befehle im Modell (`stelleAnlegen`, `umhaengen`, …), umgesetzt mit **Immer** `produceWithPatches`. Undo/Redo aus den inversen Patches, je Plan bis 200 Schritte, Zusammenfassen von Tipp-Eingaben im selben Feld.
- IndexedDB über **idb** (1 kB): Stores `plaene`, `staende`, `einstellungen`. Autosave 800 ms nach der letzten Änderung und beim Verlassen der Seite. Papierkorb = Plan mit `geloeschtAm`, endgültig nach 30 Tagen oder per Hand.
- `navigator.storage.persist()` wird beim ersten Speichern angefragt, wie in erfassungsbogen.

## 5. Zeichen

- `scripts/zeichen-holen.mts` lädt das Release-Archiv von jonas-koeritz/Taktische-Zeichen in einer festgeschriebenen Version (v2.0.0), wie `bos-taktische-zeichen/scripts/holen.mts`: eingebettete Schrift raus, `viewbox` → `viewBox`, DOCTYPE/Titel raus. Anders als dort werden **alle** Ordner übernommen (Führungsstellen, Einrichtungen, Fernmeldewesen, Personen …), als JSON je Ordner, in der App per `import()` nachgeladen und vom Service Worker vorgehalten.
- Die Schrift der Zeichen (Roboto Slab Bold, Apache 2.0) liegt einmal lokal unter `public/schrift/` und ist in SVG per `@font-face`, in PDF per `addFont` eingebunden.
- Suchindex: Name, Ordner, Organisation, Synonyme aus einer handgepflegten Tabelle (`zeichen/synonyme.ts`, z. B. „Zugtrupp THW" → `THW_Einheiten/Zugtrupp`, „Log-V" → `FGr_Logistik-Verpflegung`).
- Eigene Zeichen in `src/zeichen/eigen/` als parametrisierte Funktionen (Grundform, Text, Kennung, Stärkepunkte), getrennt vom Generat. Liste der fehlenden Zeichen für Upstream-Issues: `docs/ZEICHEN-FEHLEN.md` (entsteht in M1).
- Freies Textzeichen: Grundform + Text + Farbe, wird wie ein eigenes Zeichen gerendert.

## 6. Ausgabe

| Format | Weg | Nachgeladen |
|---|---|---|
| SVG | Szene → SVG-String, Schrift als `@font-face` mit eingebettetem woff2 | nein |
| PNG | SVG → `<canvas>` (Faktor 1–4), Hintergrund weiß/transparent | nein |
| PDF | jsPDF + svg2pdf.js, A4/A3, quer/hoch, „einpassen" oder Seitenteilung mit Überlappung und Seitenmarken | ja (`import()`) |
| PPTX | pptxgenjs, Folie = Blattgröße, Formen editierbar | ja |
| JSON | `{ format: "komplan", schemaVersion, plan, staende? }` | nein |
| Teil-Link | deflate-raw + base64url im Fragment `#p=`, Grenze ~32 kB Fragment, sonst Hinweis auf JSON | nein |
| Druck | Druck-CSS, nur das Blatt | nein |

## 7. Sicherheit und Datenschutz

- Keine Laufzeit-Requests außer zur eigenen Herkunft. CSP im Build wie erfassungsbogen (Hashes für Inline-Skripte), ohne GoatCounter-Ausnahme.
- Alle Daten nur in IndexedDB des Geräts. Teil-Link und JSON enthalten personenbezogene Daten; vor dem Erzeugen ein Hinweis-Dialog.
- Eingelesene JSON/Links werden gegen das Schema geprüft, SVG-Logos werden nicht als SVG übernommen, sondern zu PNG gerastert (kein Skript im eingebetteten SVG).

## 8. Tests

- `logik` (node): Modellbefehle, Migrationen, DTG-Parser, Layout (Koordinaten-Schnappschüsse kleiner Bäume, Überlappungsfreiheit als Eigenschaftstest), Validierung, Teil-Link-Rundlauf.
- `oberflaeche` (jsdom): Formulare, Gliederung, Tastaturkürzel.
- E2E (`@playwright/test`, Chromium aus der Umgebung): Plan anlegen → Stelle hinzufügen → Kontakt → Export SVG/PDF/JSON, Teil-Link öffnen, offline neu laden.
- Bildvergleich: jede Vorlage einmal als PNG, `toHaveScreenshot` mit kleiner Toleranz.
