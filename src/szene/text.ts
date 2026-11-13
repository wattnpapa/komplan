/**
 * Textbreiten ohne DOM, nach den Metriken von Helvetica (AFM, je 1000 em).
 * Arial, Liberation Sans und die PDF-Standardschrift sind dazu metrisch
 * gleich; deshalb steht das Layout im Browser, in Node und im PDF gleich.
 */

import { PT_IN_MM } from "./typen";

const NORMAL = "278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584";
const FETT = "278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584";

const tabelle = (s: string) => s.split(",").map(Number);
const BREITEN = { normal: tabelle(NORMAL), fett: tabelle(FETT) };

/** Umlaute und Sonderzeichen auf einen Grundbuchstaben gleicher Breite abbilden. */
const ERSATZ: Record<string, string> = {
  ä: "a", ö: "o", ü: "u", Ä: "A", Ö: "O", Ü: "U", é: "e", è: "e", á: "a", à: "a", ó: "o", ç: "c", ñ: "n",
  "„": ",", "“": '"', "”": '"', "‚": ",", "‘": "'", "’": "'", "–": "_", "—": "M", "…": "M", "·": ".", "°": "o",
  "↓": "+", "↑": "+", "→": "+", "←": "+", "⋮": ".", "×": "x", "€": "0", "§": "$",
};

export function zeichenBreite(z: string, fett: boolean): number {
  const t = fett ? BREITEN.fett : BREITEN.normal;
  if (z === "ß") return fett ? 611 : 611;
  const c = (ERSATZ[z] ?? z).codePointAt(0)!;
  return c >= 32 && c <= 126 ? t[c - 32]! : 556;
}

/** Breite einer Zeile in mm. */
export function textBreite(text: string, groesse: number, fett = false): number {
  let summe = 0;
  for (const z of text) summe += zeichenBreite(z, fett);
  return (summe / 1000) * groesse * PT_IN_MM;
}

/** Zeilenhöhe in mm (Faktor 1,2). */
export function zeilenHoehe(groesse: number): number {
  return groesse * PT_IN_MM * 1.2;
}

/** Bricht einen Text an Wortgrenzen auf höchstens `breite` mm um. Lange Wörter werden nicht getrennt. */
export function umbrechen(text: string, groesse: number, breite: number, fett = false): string[] {
  const zeilen: string[] = [];
  for (const absatz of text.split("\n")) {
    let zeile = "";
    for (const wort of absatz.split(/\s+/).filter(Boolean)) {
      const versuch = zeile ? `${zeile} ${wort}` : wort;
      if (zeile && textBreite(versuch, groesse, fett) > breite) {
        zeilen.push(zeile);
        zeile = wort;
      } else zeile = versuch;
    }
    zeilen.push(zeile);
  }
  return zeilen;
}
