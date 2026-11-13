# komplan.app

Führungsorganisation, Kommunikationsplan und Kommunikationsskizze (Fb Fü 76/77, FwDV 800 Anlage 1) im Browser, auf einem gemeinsamen Datenmodell. Teil der Werkzeugfamilie einsatz.tools. Läuft ohne Server; Pläne liegen nur in der lokalen Datenbank des Geräts und starten nach dem ersten Aufruf auch ohne Netz.

Stand: Meilenstein 3 (Führungsorganisation, Kommunikationsplan als Organigramm, Kommunikationsskizze Fb Fü 77, PDF, Stände). Formularansichten Fb Fü 76 und FwDV 800, PPTX, Teil-Link und Hinweisliste folgen.

## Entwicklung

```bash
git submodule update --init --recursive
npm install
npm run dev          # Entwicklungsserver
npm test             # Vitest: logik (node) und oberflaeche (jsdom)
npm run typecheck
npm run test:e2e     # Playwright: Ablauf und Bildvergleich der Vorlagen
npm run build        # dist/, GitHub Pages
npm run zeichen:holen  # Zeichen aus dem Release der Sammlung neu holen
```

Der Workflow `.github/workflows/pages.yml` baut bei jedem Push auf `main` und veröffentlicht unter komplan.app (Pages-Quelle „GitHub Actions", Domain über `public/CNAME`).

## Dokumentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Aufbau, Rendering, Begründung der Bibliothekswahl
- [docs/DATENMODELL.md](docs/DATENMODELL.md): Typen und Regeln
- [docs/DECISIONS.md](docs/DECISIONS.md): Festlegungen und Abweichungen
- [docs/ZEICHEN-FEHLEN.md](docs/ZEICHEN-FEHLEN.md): Abgleich mit der Zeichensammlung, Liste für Upstream-Issues
- [docs/AUFTRAG.md](docs/AUFTRAG.md), [docs/vorlagen/](docs/vorlagen/): Auftrag und Vorlagen

## Lizenz

Code: EUPL-1.2, siehe [LICENSE](LICENSE).

Taktische Zeichen: Sammlung [Taktische-Zeichen](https://github.com/jonas-koeritz/Taktische-Zeichen) von Jonas Köritz, Release v2.0.0, bearbeitet (Schrift ausgelagert, viewBox korrigiert). Laut Projekt fertige Zeichen CC0 1.0, Quellcode CC BY 4.0. Schrift der Zeichen: Roboto Slab, Apache License 2.0. Die eigenen Zeichen in `src/zeichen/eigen/` stehen unter EUPL-1.2.

Kein amtliches Angebot des THW oder einer anderen Behörde.
