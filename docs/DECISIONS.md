# Entscheidungen

Kleinere Festlegungen, die ohne Rückfrage getroffen wurden. Neueste oben.

## 2026-11-13 (M1)

- **Zeichenkatalog vorerst in komplan statt im Kern-Baustein.** Abgesprochen war, den vollständigen Katalog in `bos-taktische-zeichen` aufzunehmen. Schreibzugriff auf dieses Repo bekam die Sitzung nicht. Das Holskript (`scripts/zeichen-holen.mts`) und die Ablage (`src/zeichen/katalog/*.json`, Index, eigene Zeichen in `src/zeichen/eigen/`) sind deshalb ohne DOM- und React-Importe gebaut und lassen sich als neues Modul `katalog` in den Kern umziehen; das Submodul ist schon eingebunden. Aufnahmeregel 5 (Bundle-Budget von erfassungsbogen) bleibt gewahrt, wenn der Katalog dort als eigener Einstiegspunkt liegt und nicht in `index.ts` exportiert wird.
- **Submodule** `bos-vokabulare` und `eeb-format` (Peer von vokabulare) auf denselben Commits wie in erfassungsbogen gepinnt. Benutzt wird in M1 nur `thw-ov` (Vorschläge für „Betrieb durch"); importiert wird das Einzelmodul, damit die Berufeliste nicht ins Bundle kommt.
- **Schrift im Plan: Helvetica-Metrik** (`Helvetica, Arial, Liberation Sans`). Das Layout misst Text ohne DOM mit den AFM-Breiten; Arial, Liberation Sans und die PDF-Standardschrift sind metrisch gleich, so steht der Plan in Browser, Node-Tests und (ab M2) PDF gleich. Taktische Zeichen behalten Roboto Slab.
- **Baum-Layout als Block-Layout** (Teilbaum = Rechteck) statt Reingold-Tilford mit Konturen. Etwas breiter, dafür schiebt sich kein Teilbaum unter einen Nachbarn, wie bei gezeichneten Plänen. Stellen gleicher Ebene stehen auf gleicher Höhe, solange die Kinder nebeneinander liegen.
- **Linien enden hinter den Zeichen.** Die Unterstellungslinie läuft bis zur Rechteckkante der 256er-viewBox (y = 64) und liegt unter dem Zeichen; bei Haus, Raute und Kreis endet sie so sichtbar an der Form. Hat eine Stelle ihre Beschriftung unten, beginnt die Linie nach unten unter dem Text.
- **Neu im Modell (additiv, ohne Schema-Sprung):** `KnotenLayout.versatz` setzt eine Stelle unter der Sammelschiene tiefer (DV 1-101: EAL unterhalb der grau hinterlegten Einsatzleitung). `Freielement.bezug` hängt Pfeile/Text an eine Stelle statt an Blattkoordinaten (nummerierte Pfeile unter den UEAL).
- **DV-1-101-Vorlagen**: Einsatzleiter als weiße Raute mit Stärkepunkten, LtS als weißer Kreis mit Dach, Einsatzleitung als grau hinterlegte, gestrichelt umrandete Fläche. Einheiten und EAL hängen wie in der Vorschrift unterhalb der Fläche („Tiefer setzen" in den Eigenschaften).
- **Eigene Zeichen ohne gesicherte Langform**: ELO, PuMA und BW tragen nur das Kürzel. Die Langformen standen in keiner Unterlage; bitte ergänzen, dann kommen sie in Suche und Hilfe.
- **Kein Smartphone-Editor**: unter 44 rem Breite stapeln sich Gliederung, Fläche und Eigenschaften; bedienbar, aber nicht optimiert, wie im Auftrag vereinbart.
- **Bildvergleich** (`e2e/__bilder__/`) mit 2 % Toleranz. Die Bilder entstehen unter Linux mit Liberation Sans; weicht die CI-Schrift ab, müssen sie dort einmal neu erzeugt werden (`npm run test:e2e -- --update-snapshots=all`).

## 2026-11-13 (Planung)

- **Stack nach erfassungsbogen, nicht einsatzauftrag.** Die Repos widersprechen sich bei der Oberfläche (Vanilla-TS gegen React 19) und beim Service Worker (eigenes Plugin gegen vite-plugin-pwa). erfassungsbogen hat den neueren Stand (letzter Commit 12.11.2026 gegen 30.10.2026) und ist das Repo, aus dem einsatzauftrag sein Design-System kopiert hat. Aus einsatzauftrag kommen trotzdem das Satzmodell-Muster (Szene aus Zeichenelementen in mm), jsPDF, der Teil-Link mit `CompressionStream` und der GitHub-Pages-Workflow.
- **Keine Reichweitenmessung.** Beide Schwester-Apps nutzen GoatCounter; der Auftrag verbietet externe Requests zur Laufzeit. CSP ohne Fremd-Host.
- **Keine Diagramm-Bibliothek, eigenes Layout.** Begründung in ARCHITECTURE.md Abschnitt 3.
- **Zeichen-Lizenz.** Upstream-README (Stand Release v2.0.0): Code CC BY 4.0, fertige Zeichen aus `release.zip` CC0 1.0; Schrift Roboto Slab Apache 2.0; `LICENSE` im Repo ist der CC-BY-4.0-Text. Das README von `wattnpapa/bos-taktische-zeichen` nennt für dieselben Zeichen dagegen CC BY 4.0. komplan nennt Jonas Köritz in Impressum und Über-Dialog in jedem Fall mit Link und Lizenzangabe, damit beide Lesarten erfüllt sind.
- **Zeichen-Version v2.0.0** festgeschrieben (wie bos-taktische-zeichen), Aktualisierung per Skript mit Diff-Prüfung.
- **E2E mit `@playwright/test`** statt Cucumber wie in erfassungsbogen, weil der Auftrag Playwright-E2E und Bildvergleich ausdrücklich nennt und `toHaveScreenshot` dort eingebaut ist.
- **Bezeichner deutsch** (`Stelle` statt `Node`, `Ansicht` statt `View`), wie in den Schwester-Repos.
- **DTG-Normalform** `TTHHMMMONJJ` mit Monat in Großbuchstaben (`172027NOV26`). Der Parser nimmt Groß- und Kleinschreibung an (`172027oct15`, `010730JUN16`), englische und deutsche Monatskürzel (OKT/OCT, MAI/MAY, DEZ/DEC). Anzeige wählbar.
- **Zeitangaben ohne Zeitzone** (`2026-11-13T15:00`). Gültigkeiten und Stand beziehen sich auf die Ortszeit des Stabs.
