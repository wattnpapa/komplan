# Entscheidungen

Kleinere Festlegungen, die ohne Rückfrage getroffen wurden. Neueste oben.

## 2026-11-13

- **Stack nach erfassungsbogen, nicht einsatzauftrag.** Die Repos widersprechen sich bei der Oberfläche (Vanilla-TS gegen React 19) und beim Service Worker (eigenes Plugin gegen vite-plugin-pwa). erfassungsbogen hat den neueren Stand (letzter Commit 12.11.2026 gegen 30.10.2026) und ist das Repo, aus dem einsatzauftrag sein Design-System kopiert hat. Aus einsatzauftrag kommen trotzdem das Satzmodell-Muster (Szene aus Zeichenelementen in mm), jsPDF, der Teil-Link mit `CompressionStream` und der GitHub-Pages-Workflow.
- **Keine Reichweitenmessung.** Beide Schwester-Apps nutzen GoatCounter; der Auftrag verbietet externe Requests zur Laufzeit. CSP ohne Fremd-Host.
- **Keine Diagramm-Bibliothek, eigenes Layout.** Begründung in ARCHITECTURE.md Abschnitt 3.
- **Zeichen-Lizenz.** Upstream-README (Stand Release v2.0.0): Code CC BY 4.0, fertige Zeichen aus `release.zip` CC0 1.0; Schrift Roboto Slab Apache 2.0; `LICENSE` im Repo ist der CC-BY-4.0-Text. Das README von `wattnpapa/bos-taktische-zeichen` nennt für dieselben Zeichen dagegen CC BY 4.0. komplan nennt Jonas Köritz in Impressum und Über-Dialog in jedem Fall mit Link und Lizenzangabe, damit beide Lesarten erfüllt sind.
- **Zeichen-Version v2.0.0** festgeschrieben (wie bos-taktische-zeichen), Aktualisierung per Skript mit Diff-Prüfung.
- **E2E mit `@playwright/test`** statt Cucumber wie in erfassungsbogen, weil der Auftrag Playwright-E2E und Bildvergleich ausdrücklich nennt und `toHaveScreenshot` dort eingebaut ist.
- **Bezeichner deutsch** (`Stelle` statt `Node`, `Ansicht` statt `View`), wie in den Schwester-Repos.
- **DTG-Normalform** `TTHHMMMONJJ` mit Monat in Großbuchstaben (`172027NOV26`). Der Parser nimmt Groß- und Kleinschreibung an (`172027oct15`, `010730JUN16`), englische und deutsche Monatskürzel (OKT/OCT, MAI/MAY, DEZ/DEC). Anzeige wählbar.
- **Zeitangaben ohne Zeitzone** (`2026-11-13T15:00`). Gültigkeiten und Stand beziehen sich auf die Ortszeit des Stabs.
