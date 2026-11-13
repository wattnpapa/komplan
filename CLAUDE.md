# Hinweise für Claude Code

komplan.app: Führungsorganisation, Kommunikationsplan und Kommunikationsskizze. Stack und Gestaltung wie erfassungsbogen.app (React 19, Vite 8, TypeScript strict, vite-plugin-pwa, Design-Token „Amtlich, aber wach").

## Regeln

- Kontaktdaten gibt es im Plan genau einmal (`Plan.stellen`). Ansichten speichern nur Darstellung und Lage.
- `src/modell`, `src/layout`, `src/szene`, `src/zeichen` bleiben ohne DOM- und React-Importe (laufen in den `logik`-Tests unter node).
- Layout rechnet eine Szene in mm; SVG/PNG/PDF/PPTX zeichnen nur die Szene. Gleiche Eingabe, gleiche Szene.
- Modelländerung: additiv oder `SCHEMA_VERSION` + Schritt in `src/modell/migration.ts` mit Test. `docs/DATENMODELL.md` nachziehen.
- Sichtbare Änderungen: im selben Commit einen Satz in `src/app/aenderungen.ts`.
- Keine Laufzeit-Requests an fremde Hosts, keine Reichweitenmessung.
- `_intern/` nur lesen: keine Namen, Nummern, Adressen, Rufgruppen oder Vorschriftentexte daraus ins Repo. Beispiele mit Musterstadt, 0999…, example.org.
- Kleinere Festlegungen in `docs/DECISIONS.md`.
- Commits: Conventional Commits, deutsch.
