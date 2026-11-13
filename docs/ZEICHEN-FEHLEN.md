# Abgleich der gewünschten Zeichen mit der Sammlung

Stand: Release v2.0.0 von [jonas-koeritz/Taktische-Zeichen](https://github.com/jonas-koeritz/Taktische-Zeichen), geprüft am 13.11.2026. Grundlage der Wunschliste: Auftrag und Symbolbogen „Führungsorganisation digital".

## Vorhanden (wird aus der Sammlung benutzt)

| Wunsch | Zeichen in der Sammlung |
|---|---|
| EAL | `Führungsstellen/EAL` |
| UEAL | `Führungsstellen/UEAL` |
| TEL | `Führungsstellen/TEL` |
| EL | `Führungsstellen/EL`, Person `Personen/Einsatzleiter` |
| ÖEL | `Führungsstellen/ÖEL` |
| KatSL | `Führungsstellen/KatSL` |
| BR, Bereitstellungsraum | `Einrichtungen/Bereitstellungsraum` (auch mit Führungsstelle/Meldekopf), `Führungsstellen/BR500`, `THW_Einheiten/BR_Stab` |
| FZ FK | `THW_Einheiten/Zugtrupp_FZ-FK`, `THW_Einheiten/Fachzug_Führung_Kommunikation` |
| Log (Logistikstützpunkt) | `Einrichtungen/Logistikstützpunkt` |
| Versorgungsstellen (Piktogramm) | `Einrichtungen/Versorgungsstelle_Verpflegung`, `…_Materialerhaltung`, `…_Verbrauchsgüter` |
| Log-V, Log-M, Log-VG als Einheit | `THW_Einheiten/FGr_Logistik-Verpflegung`, `…_Materialwirtschaft`, `…_Materialwirtschaft_Verbrauchsgüterversorgungstrupp` |
| LNA, OrgL, Melder | `Rettungswesen_Personen/Leitender_Notarzt`, `…/Organisatorischer_Leiter_Rettungsdienst`, `Personen/Melder` |

## Fehlen (in komplan als eigenes Zeichen nachgebaut, Vorschlag für Upstream-Issues)

Die eigenen Zeichen liegen in `src/zeichen/eigen/vorlagen.ts`, im Stil der Sammlung (256 × 256, Strich 5, Roboto Slab Bold).

1. **ELO** (Einsatzleitung Ort): Führungsstelle (gelbe Fahne) mit Text „ELO". Allgemeiner: Führungsstelle mit frei wählbarem Kurztext, die Sammlung hat nur feste Texte.
2. **LuK**: Führungsstelle „LuK", auch mit Kennung „THW" und Unterzeile „Ortsverband"/„Regionalstelle".
3. **BW** als Führungsstelle (Bundeswehr), gelbe Fahne mit „BW".
4. **EAL/UEAL mit Organisationskennung**: „THW" bzw. „FW" klein unten rechts im Kasten.
5. **Haus-Zeichen der Verwaltungsstäbe** (orange, weißes Textfeld): HK (Havariekommando), Lenkungsgruppe/NLWKN, LK (Landkreis), Stadt. Besser als Vorlage mit freiem Text.
6. **Gegenstab**: Haus-Zeichen mit gestricheltem Umriss.
7. **LtS** in der Schreibweise der FwDV 800 und DV 1-101 mit freier Füllfarbe (rot mit weißer Schrift, weiß); die Sammlung hat `Einrichtungen/Leitstelle` gelb mit „LSt".
8. **Versorgungsstellen mit Text** statt Piktogramm: Log, Log-V, Log-M, Log-VG, jeweils mit Kennung „THW".
9. **Sandsackfüllstelle** („Sack/Sand").
10. **PuMA** (Presse- und Medienarbeit) als Führungsstelle mit Text.
11. **Raute mit Text frei** und weißer Füllung für EL/EAL nach DV 1-101 (Abbildungen Kap. 3.4).
12. **Führungsstelle „unbesetzt"** (Fahne mit „……").

Nicht als Zeichen, sondern im Plan gelöst: gestapelte Einheiten (Mehrfachzeichen versetzt) und Auslassungen („…", „⋮").
