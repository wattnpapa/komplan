# Vorlagen und Referenzmaterial

Grundlage für den Nachbau der Formulare und Beispielpläne. Arbeitsauftrag: `docs/AUFTRAG.md`.

## thw-formulare/

Originale Word-Vorlagen des THW, dazu PDF-Export und PNG je Seite (zum Ansehen ohne Word).

| Datei | Inhalt |
|---|---|
| `fb-fue-76_kommunikationsplan.*` | Fb Fü 76 Kommunikationsplan. Seite 1 = „Allgemeines" (Regeln zu Kopfleiste, F.d.R., taktische vs. technische Skizze), Seite 2 = Formular A4 quer |
| `fb-fue-77_kommunikationsskizze_1-5.*` | Fb Fü 77 Kommunikationsskizze 1–5 (Skizze 2 leer, 1/3/4/5 mit Grundstruktur, verschiedene NSt-Tabellen) |

## beispiele/

Muster und Ausbildungsbeispiele mit fiktiven Daten.

| Datei | Inhalt |
|---|---|
| `fwdv800_anlage1_kommunikationsplan-muster.png` | FwDV 800 Anlage 1, S. 28: Kommunikationsplan (Muster) mit EL, Führungsstab, EA/UA, Rufgruppen-Sechsecken |
| `fwdv800_anlage1_taktischer-organisations-kommunikationsplan.png` | FwDV 800 Anlage 1, S. 29: Taktischer Organisations-/Kommunikationsplan (E, A I–V, BR, LtS) |
| `fb-fue-76_beispiel-flut-simbach.png` | Ausgefülltes Fb Fü 76, Ausbildungsbeispiel „Flut Simbach" |
| `fb-fue-77_leer-skizze-1-und-4.png` | Leere Fb Fü 77 Skizze 1 und 4 aus den Ausbildungsfolien |
| `fb-fue-77_beispiel-fgr-fk-simbach.png` | Technisch-/Taktische Kommunikationsskizze FGr FK (Simbach), Farbkonvention rot = Funk, blau = Draht |
| `fb-fue-77_beispiel-ztr-simbach.png` | Kommunikationsskizze Zugtrupp (Simbach), Einheiten unten an Sammelschiene |
| `fb-fue-77_beispiel-musterstadt.*` | Ausgefüllte Fb Fü 77 „Unterstützung Asylsuchende", Musterstadt. Trägt im Kopf den Vermerk „VS – Nur für den Dienstgebrauch" als Formularbestandteil, Inhalt ist Musterdaten |

## ausbildung/

| Datei | Inhalt |
|---|---|
| `betriebsunterlagen_fb-fue-38-44-76-77.pptx` | THW-Bereichsausbildung Sprechfunk-Führung: Betriebsunterlagen (Nachrichtenvordruck, Betriebsbuch, Fb Fü 76, Fb Fü 77 mit Beispielen). © THW-Leitung, Referat EA 3 |

## Nicht im Repo: `_intern/` (per .gitignore ausgeschlossen)

Liegt nur lokal neben dem Repo, Claude Code darf es lesen, aber nichts daraus in Code, Vorlagen, Tests oder Commits übernehmen außer Struktur und Gestaltung.

- `beispiele-echtdaten/`: NLWKN SUB 2026 (Führungsorganisation, Kommunikationsplan, Ablauf), RÜBEX24-Kommunikationsplan, PPTX „Führungsorganisation digital" mit Symbolbogen. Enthalten echte Namen, Telefonnummern, Mailadressen und Rufgruppen. Der Symbolbogen in `fuehrungsorganisation-digital_vorlagen-und-symbole.pptx` (Folie 7) ist die beste Referenz für die Liste fehlender Zeichen.
- `vorschriften/`: FwDV 800 (2017), THW DV 1-100 (1999), THW DV 1-101 (2006). Nachdruck nur mit Genehmigung, deshalb nicht öffentlich. Kurze Auszüge stehen in `VORSCHRIFTEN-AUSZUG.md`.
