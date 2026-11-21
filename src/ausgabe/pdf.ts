/**
 * Szene → PDF mit jsPDF (wie einsatzauftrag): Linien, Flächen und Texte als
 * echte PDF-Objekte in der Standardschrift Helvetica, taktische Zeichen als
 * Vektor über svg2pdf.js mit eingebetteter Roboto Slab. Läuft im Browser
 * (svg2pdf braucht ein DOM); wird erst beim Export nachgeladen.
 *
 * Große Pläne: „einpassen" bringt den Plan auf eine Seite, die taktischen
 * Zeichen dabei höchstens auf die gewählte Breite (Standard 50 mm); „teilen"
 * bringt die Zeichen genau auf diese Breite und verteilt den Plan auf mehrere
 * Seiten mit 10 mm Überlappung und Seitenmarken.
 */

import { jsPDF } from "jspdf";
import "svg2pdf.js";
import type { Szene, Element } from "../szene/typen";
import { strichmuster } from "../szene/typen";
import { einpassMassstab, PDF_RAND as RAND, PDF_VERMERK, pdfNutzflaeche, zeichenMassstab } from "../szene/massstab";
import { svgIdsPraefixen, zeichenSvg } from "../zeichen/katalog";

export interface PdfOptionen {
  format: "A4" | "A3";
  ausrichtung: "quer" | "hoch";
  grosseFlaeche: "einpassen" | "teilen";
  /** Breite der taktischen Zeichen in mm: bei "teilen" genau, bei "einpassen" höchstens. Ohne Angabe: teilen in Originalgröße, einpassen bis Faktor 2. */
  zeichenBreite?: number;
  /** Seitenfuß links. */
  fuss: { titel: string; dtg: string; version: number };
  /** Verschlusssachenvermerk oben und/oder unten mittig. */
  einstufung?: { text: string; position: "kopf" | "kopf-und-fuss" };
  /** Roboto Slab als TTF (base64). Ohne sie fällt der Zeichentext auf Helvetica zurück. */
  zeichenSchriftTtf?: string;
}

const UEBERLAPPUNG = 10;

/** Zeichen außerhalb von WinAnsi ersetzen, sonst setzt jsPDF die ganze Zeile falsch. */
const ERSATZ: Record<string, string> = { "→": "->", "←": "<-", "↓": "v", "↑": "^", "⋮": ":", "−": "-", "✓": "x", "★": "*" };
export function pdfText(t: string): string {
  return t.replace(/[^\u0000-ÿ€‚-„–—‘’•…‰]/g, (z) => ERSATZ[z] ?? "?");
}

function farbe(hex: string | undefined): [number, number, number] | undefined {
  if (!hex || hex === "none") return undefined;
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex === "white" ? [255, 255, 255] : [0, 0, 0];
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
}

interface Abbildung {
  s: number;
  ox: number;
  oy: number;
}

async function elementZeichnen(pdf: jsPDF, e: Element, a: Abbildung, nr: number): Promise<void> {
  const X = (x: number) => a.ox + x * a.s;
  const Y = (y: number) => a.oy + y * a.s;
  const strichSetzen = (strich: string | undefined, staerke: number | undefined, linie?: Parameters<typeof strichmuster>[0]) => {
    const f = farbe(strich);
    if (!f) return false;
    pdf.setDrawColor(...f);
    pdf.setLineWidth((staerke ?? 0.3) * a.s);
    const m = strichmuster(linie, (staerke ?? 0.3));
    pdf.setLineDashPattern(m ? m.map((v) => Math.max(v * a.s, 0.05)) : [], 0);
    pdf.setLineCap(linie === "gepunktet" ? "round" : "butt");
    return true;
  };
  const fuellSetzen = (f: string | undefined) => {
    const c = farbe(f);
    if (c) pdf.setFillColor(...c);
    return !!c;
  };
  switch (e.art) {
    case "rechteck": {
      const fuell = e.deckkraft === 0 ? false : fuellSetzen(e.fuellung);
      const strich = strichSetzen(e.strich, e.staerke, e.linie);
      if (fuell || strich) pdf.rect(X(e.x), Y(e.y), e.b * a.s, e.h * a.s, fuell && strich ? "FD" : fuell ? "F" : "S");
      return;
    }
    case "linie": {
      if (!strichSetzen(e.strich, e.staerke, e.linie) || e.punkte.length < 2) return;
      const [x0, y0] = e.punkte[0]!;
      const deltas = e.punkte.slice(1).map(([x, y], i) => [(x - e.punkte[i]![0]) * a.s, (y - e.punkte[i]![1]) * a.s]);
      pdf.lines(deltas, X(x0), Y(y0), [1, 1], "S", false);
      return;
    }
    case "vieleck": {
      const fuell = fuellSetzen(e.fuellung);
      const strich = strichSetzen(e.strich, e.staerke, e.linie);
      if (!fuell && !strich) return;
      const [x0, y0] = e.punkte[0]!;
      const deltas = e.punkte.slice(1).map(([x, y], i) => [(x - e.punkte[i]![0]) * a.s, (y - e.punkte[i]![1]) * a.s]);
      pdf.setLineDashPattern([], 0);
      pdf.lines(deltas, X(x0), Y(y0), [1, 1], fuell && strich ? "FD" : fuell ? "F" : "S", true);
      return;
    }
    case "kreis": {
      const fuell = fuellSetzen(e.fuellung);
      const strich = strichSetzen(e.strich, e.staerke);
      if (fuell || strich) pdf.circle(X(e.x), Y(e.y), e.r * a.s, fuell && strich ? "FD" : fuell ? "F" : "S");
      return;
    }
    case "text": {
      const groesse = e.groesse * a.s;
      pdf.setFont("helvetica", e.fett ? "bold" : "normal");
      pdf.setFontSize(groesse);
      pdf.setTextColor(...(farbe(e.farbe) ?? [0, 0, 0]));
      const t = pdfText(e.text);
      pdf.text(t, X(e.x), Y(e.y), { align: e.anker === "middle" ? "center" : e.anker === "end" ? "right" : "left", baseline: "alphabetic" });
      if (e.unterstrichen) {
        const w = pdf.getTextWidth(t);
        const x0 = e.anker === "middle" ? X(e.x) - w / 2 : e.anker === "end" ? X(e.x) - w : X(e.x);
        pdf.setDrawColor(...(farbe(e.farbe) ?? [0, 0, 0]));
        pdf.setLineWidth(0.15 * a.s);
        pdf.setLineDashPattern([], 0);
        pdf.line(x0, Y(e.y) + 0.5 * a.s, x0 + w, Y(e.y) + 0.5 * a.s);
      }
      return;
    }
    case "bild": {
      const format = e.daten.startsWith("data:image/png") ? "PNG" : "JPEG";
      pdf.addImage(e.daten, format, X(e.x), Y(e.y), e.b * a.s, e.h * a.s);
      return;
    }
    case "zeichen": {
      const svgText = svgIdsPraefixen(zeichenSvg(e.ref), `p${nr}`);
      const huelle = document.createElement("div");
      huelle.style.cssText = "position:absolute;left:-10000px;top:0;";
      huelle.innerHTML = svgText;
      document.body.appendChild(huelle);
      try {
        const svg = huelle.querySelector("svg")!;
        // svg2pdf liest font-family aus dem style-Attribut; Schriftname ohne Anführungszeichen
        for (const t of svg.querySelectorAll("text")) {
          const st = t.getAttribute("style") ?? "";
          t.setAttribute("style", st.replace(/'Roboto Slab'/g, "Roboto Slab"));
        }
        // svg2pdf setzt Strichmuster, Linienenden und -ecken nur, wenn das SVG
        // sie nennt, und erbt sonst den jsPDF-Zustand: nach einer gestrichelten
        // Verbindung würden alle folgenden Zeichen gestrichelt umrandet.
        pdf.setLineDashPattern([], 0);
        pdf.setLineCap("butt");
        pdf.setLineJoin("miter");
        await pdf.svg(svg, { x: X(e.x), y: Y(e.y), width: e.groesse * a.s, height: e.groesse * a.s });
      } finally {
        huelle.remove();
      }
      return;
    }
  }
}

async function szeneZeichnen(pdf: jsPDF, szene: Szene, a: Abbildung): Promise<void> {
  let nr = 0;
  for (const e of szene.elemente) await elementZeichnen(pdf, e, a, nr++);
  pdf.setLineDashPattern([], 0);
}

/** Seitenaufteilung für „teilen": Spalten × Zeilen in Originalgröße. */
export function kacheln(szene: Pick<Szene, "breite" | "hoehe">, nutzB: number, nutzH: number): Array<{ x: number; y: number; spalte: number; zeile: number }> {
  const schrittX = nutzB - UEBERLAPPUNG, schrittY = nutzH - UEBERLAPPUNG;
  const spalten = Math.max(1, Math.ceil((szene.breite - UEBERLAPPUNG) / schrittX));
  const zeilen = Math.max(1, Math.ceil((szene.hoehe - UEBERLAPPUNG) / schrittY));
  const k: Array<{ x: number; y: number; spalte: number; zeile: number }> = [];
  for (let z = 0; z < zeilen; z++) for (let s = 0; s < spalten; s++) k.push({ x: s * schrittX, y: z * schrittY, spalte: s + 1, zeile: z + 1 });
  return k;
}

export async function pdfErzeugen(szene: Szene, o: PdfOptionen): Promise<Blob> {
  const quer = o.ausrichtung === "quer";
  const { seiteB, seiteH, nutzB, nutzH } = pdfNutzflaeche(o.format, o.ausrichtung, !!o.einstufung?.text);
  const pdf = new jsPDF({ unit: "mm", format: o.format.toLowerCase(), orientation: quer ? "landscape" : "portrait", compress: true });
  pdf.setProperties({ title: o.fuss.titel, subject: `Stand ${o.fuss.dtg}`, creator: "komplan.app" });
  if (o.zeichenSchriftTtf) {
    pdf.addFileToVFS("RobotoSlab-Bold.ttf", o.zeichenSchriftTtf);
    pdf.addFont("RobotoSlab-Bold.ttf", "Roboto Slab", "bold");
    pdf.addFont("RobotoSlab-Bold.ttf", "Roboto Slab", "normal");
  }
  const oben = RAND + (o.einstufung?.text ? PDF_VERMERK : 0);

  const seiten: Array<{ a: Abbildung; clip?: [number, number, number, number]; marke?: string }> = [];
  if (szene.seiten?.length) {
    // Formular mit festen Seiten: jede Seite eingepasst und zugeschnitten
    for (const [i, sb] of szene.seiten.entries()) {
      const s = Math.min(nutzB / szene.breite, nutzH / sb.h, 2);
      seiten.push({ a: { s, ox: RAND + (nutzB - szene.breite * s) / 2, oy: oben - sb.y * s }, clip: [RAND, oben, nutzB, nutzH], marke: szene.seiten.length > 1 ? `Blatt ${i + 1}` : undefined });
    }
  } else if (o.grosseFlaeche === "einpassen") {
    const s = einpassMassstab(szene, nutzB, nutzH, o.zeichenBreite);
    seiten.push({ a: { s, ox: RAND + (nutzB - szene.breite * s) / 2, oy: oben + (nutzH - szene.hoehe * s) / 2 } });
  } else {
    const s = o.zeichenBreite === undefined ? 1 : zeichenMassstab(szene, o.zeichenBreite);
    const k = kacheln({ breite: szene.breite * s, hoehe: szene.hoehe * s }, nutzB, nutzH);
    const spalten = Math.max(...k.map((x) => x.spalte)), zeilen = Math.max(...k.map((x) => x.zeile));
    for (const t of k) {
      seiten.push({ a: { s, ox: RAND - t.x, oy: oben - t.y }, clip: [RAND, oben, nutzB, nutzH], marke: k.length > 1 ? `Teil ${t.zeile}/${t.spalte} (Zeile/Spalte von ${zeilen}×${spalten})` : undefined });
    }
  }

  for (let i = 0; i < seiten.length; i++) {
    const seite = seiten[i]!;
    if (i > 0) pdf.addPage();
    if (seite.clip) {
      pdf.saveGraphicsState();
      pdf.rect(...seite.clip, null);
      pdf.clip();
      pdf.discardPath();
    }
    await szeneZeichnen(pdf, szene, seite.a);
    if (seite.clip) pdf.restoreGraphicsState();

    // Fuß: Titel, Stand, Version, Seite
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(60, 60, 60);
    const fussY = seiteH - RAND + 1;
    pdf.text(pdfText(`${o.fuss.titel} · Stand ${o.fuss.dtg} · Version ${o.fuss.version}${seite.marke ? ` · ${seite.marke}` : ""}`), RAND, fussY);
    pdf.text(`Seite ${i + 1} von ${seiten.length} · komplan.app`, seiteB - RAND, fussY, { align: "right" });
    if (o.einstufung?.text) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(pdfText(o.einstufung.text), seiteB / 2, RAND + 2, { align: "center" });
      if (o.einstufung.position === "kopf-und-fuss") pdf.text(pdfText(o.einstufung.text), seiteB / 2, fussY - 4, { align: "center" });
    }
  }
  return pdf.output("blob");
}
