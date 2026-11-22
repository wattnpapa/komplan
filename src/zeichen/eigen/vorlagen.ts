/**
 * Eigene, parametrisierte Zeichen im Stil von jonas-koeritz/Taktische-Zeichen
 * (256 × 256, Strich 5, Roboto Slab Bold). Sie decken ab, was in der Sammlung
 * fehlt oder dort nur fest beschriftet vorliegt: Führungsstellen mit
 * beliebigem Text und Organisationskennung, die Haus-Zeichen der
 * Verwaltungsstäbe, Versorgungs-/Leitstellen-Kreise mit freiem Text, Rauten
 * der rettungsdienstlichen Führung, Einheiten in Organisationsfarbe mit
 * Stärkepunkten. Liste für Upstream-Issues: docs/ZEICHEN-FEHLEN.md.
 *
 * Getrennt vom Katalog der Sammlung (Kern @bos/taktische-zeichen/katalog).
 */

import type { Grundform, Organisation } from "../../modell/typen";

export const SCHRIFT = "font-family: 'Roboto Slab'; font-weight: bold;";

export function xml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Organisationsfarben wie in der Sammlung (Einheiten-Zeichen). */
export const ORG_FARBE: Record<Organisation, { fond: string; schrift: string; kennung: string }> = {
  thw: { fond: "#003399", schrift: "#FFFFFF", kennung: "THW" },
  feuerwehr: { fond: "#FF0000", schrift: "#FFFFFF", kennung: "FW" },
  polizei: { fond: "#13A538", schrift: "#FFFFFF", kennung: "POL" },
  rettungsdienst: { fond: "#FFFFFF", schrift: "#000000", kennung: "RD" },
  hilfsorganisation: { fond: "#FFFFFF", schrift: "#000000", kennung: "" },
  wasserrettung: { fond: "#FFFFFF", schrift: "#000000", kennung: "WR" },
  bundeswehr: { fond: "#7E5835", schrift: "#FFFFFF", kennung: "BW" },
  verwaltung: { fond: "#FF6600", schrift: "#000000", kennung: "" },
  sonstige: { fond: "#FFFFFF", schrift: "#000000", kennung: "" },
};

const GELB = "#FFFF00";
const ORANGE = "#FF6600";

/** Schriftgröße, die den Text in `breite` Einheiten hält (Roboto Slab Bold: Versalien ≈ 0,72 em, sonst ≈ 0,58 em). */
export function passendeGroesse(text: string, breite: number, hoechstens: number): number {
  let em = 0;
  for (const z of text) em += /[A-ZÄÖÜMW0-9]/.test(z) ? 0.72 : /[il.,:;|'!]/.test(z) ? 0.32 : 0.58;
  return Math.max(16, Math.min(hoechstens, Math.floor(breite / Math.max(em, 0.6))));
}

function text(t: string, x: number, y: number, breite: number, hoechstens: number, farbe = "#000000", anker = "middle"): string {
  if (!t) return "";
  const g = passendeGroesse(t, breite, hoechstens);
  return `<text style="${SCHRIFT} font-size: ${g}px; text-anchor: ${anker};" fill="${farbe}" x="${x}" y="${y}">${xml(t)}</text>`;
}

export function kennungText(k: string | undefined, farbe: string, x = 236, y = 182): string {
  if (!k) return "";
  return `<text style="${SCHRIFT} font-size: 26px; text-anchor: end;" fill="${farbe}" x="${x}" y="${y}">${xml(k)}</text>`;
}

/** Stärkepunkte über dem Zeichen: 1–3 Punkte, 4–6 senkrechte Striche (Verband/Bereitschaft). */
function staerke(n: number | undefined, y = 48): string {
  if (!n || n < 1) return "";
  const anzahl = n <= 3 ? n : n - 3;
  const xs = anzahl === 1 ? [128] : anzahl === 2 ? [96, 160] : [64, 128, 192];
  return xs
    .map((x) => (n <= 3 ? `<ellipse cx="${x}" cy="${y}" rx="10" ry="10" fill="#000000" />` : `<line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y + 14}" stroke="#000000" stroke-width="8" />`))
    .join("");
}

const svg = (inhalt: string) => `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${inhalt}</svg>`;

export interface Parameter {
  text?: string;
  /** Kleine Kennung unten rechts („THW", „FW"). */
  kennung?: string;
  /** Zeile unter dem Kasten („Regionalstelle", „Ortsverband"). */
  untertext?: string;
  farbe?: string;
  textfarbe?: string;
  staerke?: number;
  gestrichelt?: boolean;
}

/** Führungsstelle: Kasten mit Fahnenstock links unten (wie Führungsstellen/EAL). */
export function fuehrungsstelle(p: Parameter): string {
  const strich = p.gestrichelt ? ' stroke-dasharray="14 10"' : "";
  return svg(
    `<rect fill="${p.farbe ?? GELB}" stroke="#000000" stroke-width="5"${strich} x="10" y="64" width="236" height="128" />` +
      `<line stroke="#000000" stroke-width="5" x1="10" y1="194" x2="10" y2="225" />` +
      staerke(p.staerke) +
      text(p.text ?? "", 128, p.kennung ? 145 : 150, 210, 56, p.textfarbe) +
      kennungText(p.kennung, p.textfarbe ?? "#000000") +
      (p.untertext ? `<text style="${SCHRIFT} font-size: 22px; text-anchor: start;" x="18" y="218">${xml(p.untertext)}</text>` : ""),
  );
}

/** Haus-Zeichen der Verwaltungsstäbe (HK, Lenkungsgruppe, LK, Stadt). */
export function stab(p: Parameter): string {
  const strich = p.gestrichelt ? ' stroke-dasharray="14 10"' : "";
  return svg(
    `<path d="M10,98 L128,40 L246,98 L246,226 L10,226 Z" fill="${p.farbe ?? ORANGE}" stroke="#000000" stroke-width="6"${strich} stroke-linejoin="miter" />` +
      `<rect x="44" y="112" width="168" height="78" fill="#FFFFFF" stroke="#000000" stroke-width="2" />` +
      text(p.text ?? "", 128, 168, 150, 52, p.textfarbe),
  );
}

/** Versorgungs-/Logistikstelle: Kreis mit schwarzem Bodensegment (wie Einrichtungen/Logistikstützpunkt). */
export function versorgung(p: Parameter): string {
  return svg(
    `<defs><clipPath id="base"><ellipse cx="128" cy="128" rx="64" ry="64" /></clipPath></defs>` +
      `<ellipse fill="${p.farbe ?? GELB}" stroke="#000000" stroke-width="5" cx="128" cy="128" rx="64" ry="64" />` +
      text(p.text ?? "", 128, 137, 112, 48, p.textfarbe) +
      `<rect x="64" y="160" width="128" height="32" clip-path="url(#base)" />` +
      kennungText(p.kennung, "#000000", 236, 206),
  );
}

/** Leitstelle: Kreis mit Dach (wie Einrichtungen/Leitstelle), Farbe und Text frei. */
export function leitstelle(p: Parameter): string {
  return svg(
    `<defs><clipPath id="base"><ellipse cx="128" cy="128" rx="64" ry="64" /></clipPath></defs>` +
      `<ellipse fill="${p.farbe ?? GELB}" stroke="#000000" stroke-width="5" cx="128" cy="128" rx="64" ry="64" />` +
      `<rect x="64" y="64" width="128" height="32" clip-path="url(#base)" />` +
      text(p.text ?? "LtS", 128, 153, 112, 48, p.textfarbe) +
      `<path d="M10 80 L128 48 L246 80" stroke-width="5" stroke="#000000" fill="none" />`,
  );
}

/** Raute mit schwarzer Spitze oben (Führung im Rettungswesen: LNA, OrgL, EL …). */
export function raute(p: Parameter): string {
  return svg(
    `<defs><clipPath id="raute"><path d="M128,20 L236,128 L128,236 L20,128 Z" /></clipPath></defs>` +
      `<path d="M128,20 L236,128 L128,236 L20,128 Z" fill="${p.farbe ?? GELB}" stroke="#000000" stroke-width="5" />` +
      `<rect x="20" y="20" width="216" height="40" clip-path="url(#raute)" />` +
      staerke(p.staerke, 10) +
      text(p.text ?? "", 128, 144, 150, 44, p.textfarbe),
  );
}

/** Einheit: Rechteck in Organisationsfarbe mit Stärkepunkten (wie THW_Einheiten/Technischer_Zug). */
export function einheit(p: Parameter): string {
  const fond = p.farbe ?? "#FFFFFF";
  const schrift = p.textfarbe ?? "#000000";
  return svg(
    `<rect x="10" y="64" width="236" height="128" fill="${fond}" stroke="#000000" stroke-width="5" />` +
      staerke(p.staerke) +
      text(p.text ?? "", 128, 145, 200, 48, schrift) +
      kennungText(p.kennung, schrift, 236, 180),
  );
}

/** Fahrzeug-Grundform mit Wanne (wie Fahrzeuge/Fahrzeug). */
export function fahrzeug(p: Parameter): string {
  return svg(
    `<path d="M10,64 L10,192 L246,192 L246,64 Q128,100 10,64 Z" fill="${p.farbe ?? "#FFFFFF"}" stroke="#000000" stroke-width="5" />` +
      text(p.text ?? "", 128, 160, 200, 48, p.textfarbe) +
      kennungText(p.kennung, p.textfarbe ?? "#000000", 236, 184),
  );
}

export function kreis(p: Parameter): string {
  return svg(
    `<circle fill="${p.farbe ?? "#FFFFFF"}" stroke="#000000" stroke-width="5" cx="128" cy="128" r="64" />` + text(p.text ?? "", 128, 145, 112, 48, p.textfarbe),
  );
}

export const GRUNDFORMEN: Record<Grundform, (p: Parameter) => string> = {
  fuehrungsstelle,
  stab,
  einheit,
  fahrzeug,
  kreis,
  raute,
};

export interface EigeneVorlage {
  id: string;
  titel: string;
  /** Suchbegriffe und Synonyme. */
  begriffe: string[];
  /** Grundform und Vorgaben; `text` ist überschreibbar. */
  form: (p: Parameter) => string;
  vorgabe: Parameter;
  /** Steht nur deshalb hier, weil die Sammlung es nicht hat → Liste ZEICHEN-FEHLEN.md. */
  fehltUpstream: boolean;
}

const fs = (id: string, titel: string, t: string, begriffe: string[], extra: Parameter = {}, fehlt = true): EigeneVorlage => ({
  id, titel, begriffe, form: fuehrungsstelle, vorgabe: { text: t, ...extra }, fehltUpstream: fehlt,
});

export const EIGENE_VORLAGEN: EigeneVorlage[] = [
  fs("fuehrungsstelle", "Führungsstelle (Text frei)", "", ["führungsstelle", "fahne", "frei", "……"], {}, false),
  fs("elo", "Einsatzleitung Ort (ELO)", "ELO", ["elo", "einsatzleitung ort", "einsatzleitung", "örtlich"]),
  fs("luk", "Leitung und Koordinierung (LuK)", "LuK", ["luk", "leitung und koordinierung", "koordinierungsstelle"]),
  fs("luk-thw-ov", "LuK THW, Ortsverband", "LuK", ["luk", "ortsverband", "ov"], { kennung: "THW", untertext: "Ortsverband" }),
  fs("luk-thw-rst", "LuK THW, Regionalstelle", "LuK", ["luk", "regionalstelle", "rst"], { kennung: "THW", untertext: "Regionalstelle" }),
  fs("bw", "Bundeswehr (BW)", "BW", ["bw", "bundeswehr", "verbindung bundeswehr"]),
  fs("eal-thw", "EAL mit Kennung THW", "EAL", ["eal", "einsatzabschnittsleitung", "thw"], { kennung: "THW" }),
  fs("ueal-thw", "UEAL mit Kennung THW", "UEAL", ["ueal", "unterabschnitt", "thw"], { kennung: "THW" }),
  fs("eal-fw", "EAL mit Kennung FW", "EAL", ["eal", "einsatzabschnittsleitung", "feuerwehr", "fw"], { kennung: "FW", textfarbe: "#000000" }),
  fs("ueal-fw", "UEAL mit Kennung FW", "UEAL", ["ueal", "unterabschnitt", "feuerwehr", "fw"], { kennung: "FW" }),
  fs("fuehrungsstelle-leer", "Führungsstelle, noch nicht besetzt (……)", "……", ["platzhalter", "leer", "unbesetzt"]),
  { id: "hk", titel: "Havariekommando (HK)", begriffe: ["hk", "havariekommando", "stab", "haus"], form: stab, vorgabe: { text: "HK" }, fehltUpstream: true },
  { id: "stab", titel: "Verwaltungsstab (Haus, Text frei)", begriffe: ["stab", "verwaltungsstab", "krisenstab", "haus", "lk", "landkreis", "stadt", "lenkungsgruppe", "lg"], form: stab, vorgabe: { text: "LK" }, fehltUpstream: true },
  { id: "stab-stadt", titel: "Stab Stadt", begriffe: ["stadt", "stab", "haus", "krisenstab"], form: stab, vorgabe: { text: "Stadt" }, fehltUpstream: true },
  { id: "stab-nlwkn", titel: "Lenkungsgruppe (NLWKN)", begriffe: ["nlwkn", "lenkungsgruppe", "lg", "stab", "haus"], form: stab, vorgabe: { text: "NLWKN" }, fehltUpstream: true },
  { id: "gegenstab", titel: "Gegenstab (gestrichelt)", begriffe: ["gegenstab", "stab", "haus", "spiegel"], form: stab, vorgabe: { text: "GSt", gestrichelt: true }, fehltUpstream: true },
  { id: "lts", titel: "Leitstelle (LtS, Farbe frei)", begriffe: ["lts", "leitstelle", "ils", "lst"], form: leitstelle, vorgabe: { text: "LtS", farbe: "#FF0000", textfarbe: "#FFFFFF" }, fehltUpstream: true },
  { id: "log-thw", titel: "Logistikstützpunkt THW", begriffe: ["log", "logistik", "logistikstützpunkt", "thw"], form: versorgung, vorgabe: { text: "Log", kennung: "THW" }, fehltUpstream: true },
  { id: "log-v", titel: "Versorgungsstelle Verpflegung (Log-V)", begriffe: ["log-v", "verpflegung", "versorgungsstelle"], form: versorgung, vorgabe: { text: "Log-V", kennung: "THW" }, fehltUpstream: true },
  { id: "log-m", titel: "Versorgungsstelle Materialerhaltung (Log-M)", begriffe: ["log-m", "materialerhaltung", "versorgungsstelle"], form: versorgung, vorgabe: { text: "Log-M", kennung: "THW" }, fehltUpstream: true },
  { id: "log-vg", titel: "Versorgungsstelle Verbrauchsgüter (Log-VG)", begriffe: ["log-vg", "verbrauchsgüter", "versorgungsstelle"], form: versorgung, vorgabe: { text: "Log-VG", kennung: "THW" }, fehltUpstream: true },
  { id: "sack-sand", titel: "Sandsackfüllstelle (Sack/Sand)", begriffe: ["sack", "sand", "sandsack", "sandsackfüllplatz", "füllstelle"], form: versorgung, vorgabe: { text: "Sand", farbe: "#C8A165" }, fehltUpstream: true },
  fs("puma", "Presse- und Medienarbeit (PuMA)", "PuMA", ["puma", "presse", "medienarbeit", "öffentlichkeitsarbeit", "pressestelle"]),
  { id: "versorgungsstelle", titel: "Versorgungsstelle (Text frei)", begriffe: ["versorgungsstelle", "kreis", "logistik"], form: versorgung, vorgabe: { text: "" }, fehltUpstream: false },
  { id: "raute-lna", titel: "Leitender Notarzt (Raute)", begriffe: ["lna", "leitender notarzt", "rettungsdienst"], form: raute, vorgabe: { text: "LNA" }, fehltUpstream: false },
  { id: "raute-orgl", titel: "Organisatorischer Leiter (Raute)", begriffe: ["orgl", "organisatorischer leiter", "rettungsdienst"], form: raute, vorgabe: { text: "OrgL" }, fehltUpstream: false },
  { id: "raute-frei", titel: "Führung Rettungswesen (Raute, Text frei)", begriffe: ["raute", "rettungsdienst", "pol", "bw"], form: raute, vorgabe: { text: "" }, fehltUpstream: false },
  { id: "raute-el", titel: "Einsatzleiter (Raute, DV 1-101)", begriffe: ["el", "einsatzleiter", "einsatzleitung", "raute"], form: raute, vorgabe: { text: "EL", farbe: "#FFFFFF" }, fehltUpstream: false },
  { id: "raute-eal", titel: "Einsatzabschnittsleiter (Raute, DV 1-101)", begriffe: ["eal", "einsatzabschnittsleiter", "raute"], form: raute, vorgabe: { text: "EAL", farbe: "#FFFFFF" }, fehltUpstream: true },
  { id: "melder", titel: "Melder (Raute)", begriffe: ["me", "melder", "kurier"], form: raute, vorgabe: { text: "Me", farbe: "#FFFFFF" }, fehltUpstream: false },
  { id: "lts-weiss", titel: "Leitstelle (weiß, DV 1-101)", begriffe: ["lts", "leitstelle", "rückwärtige führungseinrichtung"], form: leitstelle, vorgabe: { text: "LtS", farbe: "#FFFFFF" }, fehltUpstream: true },
  { id: "einheit-thw", titel: "THW-Einheit (Text frei)", begriffe: ["einheit", "thw", "tz", "zug", "gruppe"], form: einheit, vorgabe: { text: "", farbe: ORG_FARBE.thw.fond, textfarbe: "#FFFFFF", kennung: "THW", staerke: 3 }, fehltUpstream: false },
  { id: "einheit-fw", titel: "Feuerwehr-Einheit (Text frei)", begriffe: ["einheit", "feuerwehr", "fw", "zug"], form: einheit, vorgabe: { text: "", farbe: ORG_FARBE.feuerwehr.fond, textfarbe: "#FFFFFF", kennung: "FW", staerke: 3 }, fehltUpstream: false },
];

export function eigeneVorlage(id: string): EigeneVorlage | undefined {
  return EIGENE_VORLAGEN.find((v) => v.id === id);
}
