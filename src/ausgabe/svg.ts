/**
 * Szene → SVG. Dieselbe Funktion zeichnet die Vorschau im Editor und den
 * SVG-/PNG-Export. Einheiten: mm (viewBox in mm, width/height in mm).
 */

import type { Element, Szene } from "../szene/typen";
import { strichmuster } from "../szene/typen";
import { svgIdsPraefixen, xml, zeichenInhalt, zeichenSvg } from "../zeichen/katalog";

export const PLAN_SCHRIFT = "Helvetica, Arial, 'Liberation Sans', 'Nimbus Sans', sans-serif";
export const ZEICHEN_SCHRIFT = "Roboto Slab";

export interface SvgOptionen {
  /** Hintergrund; undefined = transparent. */
  hintergrund?: string;
  /** Roboto Slab als base64-WOFF einbetten (Export). Im Editor kommt sie aus dem Stylesheet. */
  zeichenSchriftBase64?: string;
  /** data-*-Attribute für Auswahl im Editor. */
  mitHerkunft?: boolean;
  /** Feste Abmessung in CSS-Einheiten statt mm. */
  breite?: string;
  hoehe?: string;
}

const z = (n: number) => (Math.round(n * 100) / 100).toString();

function muster(linie: Parameters<typeof strichmuster>[0], staerke: number): string {
  const m = strichmuster(linie, staerke);
  if (!m) return "";
  const kappe = linie === "gepunktet" ? ' stroke-linecap="round"' : "";
  return ` stroke-dasharray="${m.map(z).join(" ")}"${kappe}`;
}

function herkunftAttr(e: Element, an: boolean): string {
  if (!an || !e.herkunft) return "";
  let s = "";
  if (e.herkunft.stelle) s += ` data-stelle="${xml(e.herkunft.stelle)}"`;
  if (e.herkunft.rolle) s += ` data-rolle="${e.herkunft.rolle}"`;
  return s;
}

function elementSvg(e: Element, nr: number, optionen: SvgOptionen): string {
  const h = herkunftAttr(e, !!optionen.mitHerkunft);
  switch (e.art) {
    case "rechteck": {
      const fuellung = e.fuellung ?? "none";
      const strich = e.strich ? ` stroke="${e.strich}" stroke-width="${z(e.staerke ?? 0.3)}"${muster(e.linie, e.staerke ?? 0.3)}` : "";
      const deck = e.deckkraft !== undefined ? ` fill-opacity="${e.deckkraft}"` : "";
      return `<rect x="${z(e.x)}" y="${z(e.y)}" width="${z(e.b)}" height="${z(e.h)}" fill="${fuellung}"${deck}${strich}${h}/>`;
    }
    case "linie":
      return `<polyline points="${e.punkte.map(([x, y]) => `${z(x)},${z(y)}`).join(" ")}" fill="none" stroke="${e.strich}" stroke-width="${z(e.staerke)}" stroke-linejoin="miter"${muster(e.linie, e.staerke)}${h}/>`;
    case "vieleck": {
      const strich = e.strich ? ` stroke="${e.strich}" stroke-width="${z(e.staerke ?? 0.3)}"${muster(e.linie, e.staerke ?? 0.3)}` : "";
      return `<polygon points="${e.punkte.map(([x, y]) => `${z(x)},${z(y)}`).join(" ")}" fill="${e.fuellung ?? "none"}"${strich}${h}/>`;
    }
    case "text": {
      const groesseMm = (e.groesse * 25.4) / 72;
      const fett = e.fett ? ' font-weight="bold"' : "";
      const farbe = e.farbe ? ` fill="${e.farbe}"` : "";
      const unter = e.unterstrichen ? ' text-decoration="underline"' : "";
      return `<text x="${z(e.x)}" y="${z(e.y)}" font-size="${z(groesseMm)}" text-anchor="${e.anker}"${fett}${farbe}${unter}${h} xml:space="preserve">${xml(e.text)}</text>`;
    }
    case "kreis": {
      const strich = e.strich ? ` stroke="${e.strich}" stroke-width="${z(e.staerke ?? 0.3)}"` : "";
      return `<circle cx="${z(e.x)}" cy="${z(e.y)}" r="${z(e.r)}" fill="${e.fuellung ?? "none"}"${strich}${h}/>`;
    }
    case "bild":
      return `<image x="${z(e.x)}" y="${z(e.y)}" width="${z(e.b)}" height="${z(e.h)}" href="${xml(e.daten)}" preserveAspectRatio="xMidYMid meet"${h}/>`;
    case "zeichen": {
      const quelle = svgIdsPraefixen(zeichenSvg(e.ref), `z${nr}`);
      return `<svg x="${z(e.x)}" y="${z(e.y)}" width="${z(e.groesse)}" height="${z(e.groesse)}" viewBox="0 0 256 256" overflow="visible"${h}>${zeichenInhalt(quelle)}</svg>`;
    }
  }
}

export function szeneZuSvg(szene: Szene, optionen: SvgOptionen = {}): string {
  const b = z(szene.breite), hh = z(szene.hoehe);
  const schrift = optionen.zeichenSchriftBase64
    ? `<style>@font-face{font-family:'${ZEICHEN_SCHRIFT}';font-weight:bold;src:url(data:font/woff;base64,${optionen.zeichenSchriftBase64}) format('woff');}</style>`
    : "";
  const grund = optionen.hintergrund ? `<rect x="0" y="0" width="${b}" height="${hh}" fill="${optionen.hintergrund}"/>` : "";
  const inhalt = szene.elemente.map((e, i) => elementSvg(e, i, optionen)).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${optionen.breite ?? `${b}mm`}" height="${optionen.hoehe ?? `${hh}mm`}" viewBox="0 0 ${b} ${hh}" font-family="${PLAN_SCHRIFT}">` +
    schrift +
    grund +
    inhalt +
    `</svg>`
  );
}
