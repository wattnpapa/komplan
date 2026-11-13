/**
 * Szene → PowerPoint mit pptxgenjs. Jedes Szenenelement wird ein eigenes,
 * editierbares Objekt: Rechtecke und Kreise als Formen, Linienzüge und
 * Fahnen als Freiform, Texte als Textfelder (Arial, metrisch gleich mit
 * dem Layout). Taktische Zeichen werden als PNG eingebettet (4-fach
 * gerastert, Schrift eingebettet). Formulare mit Folgeblättern ergeben eine
 * Folie je Blatt. Läuft im Browser; wird erst beim Export geladen.
 */

import PptxGenJS from "pptxgenjs";
import type { Element, Szene } from "../szene/typen";
import { PT_IN_MM } from "../szene/typen";
import { textBreite, zeilenHoehe } from "../szene/text";
import { svgIdsPraefixen, zeichenSvg } from "../zeichen/katalog";
import type { ZeichenRef } from "../modell/typen";

/** Freiform: zur Laufzeit vorhanden, in den Typen von pptxgenjs 4 nicht aufgeführt. */
const FREIFORM = "custGeom" as unknown as PptxGenJS.ShapeType;
const ZOLL = 25.4;
const zoll = (mm: number) => mm / ZOLL;
const pt = (mm: number) => (mm * 72) / ZOLL;
const farbe = (f: string | undefined) => (f && f !== "none" ? f.replace("#", "").toUpperCase().padEnd(6, "0").slice(0, 6) : undefined);
const strich = (linie: string | undefined): "solid" | "dash" | "sysDot" => (linie === "gestrichelt" ? "dash" : linie === "gepunktet" ? "sysDot" : "solid");

async function zeichenPng(ref: ZeichenRef | undefined, schriftBase64: string, cache: Map<string, string>): Promise<string> {
  const schluessel = JSON.stringify(ref ?? null);
  const vorhanden = cache.get(schluessel);
  if (vorhanden) return vorhanden;
  const stil = schriftBase64 ? `<style>@font-face{font-family:'Roboto Slab';font-weight:bold;src:url(data:font/woff;base64,${schriftBase64}) format('woff');}</style>` : "";
  const svg = svgIdsPraefixen(zeichenSvg(ref), "pp").replace(/^<svg([^>]*)>/, `<svg$1>${stil}`);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const bild = new Image();
    await new Promise<void>((ok, fehler) => {
      bild.onload = () => ok();
      bild.onerror = () => fehler(new Error("Zeichen nicht lesbar"));
      bild.src = url;
    });
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    c.getContext("2d")!.drawImage(bild, 0, 0, 512, 512);
    const daten = c.toDataURL("image/png");
    cache.set(schluessel, daten);
    return daten;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Freiform aus Punkten (mm, absolut) → Rahmen und relative Punkte in Zoll. */
function freiform(punkte: Array<[number, number]>, schliessen: boolean) {
  const xs = punkte.map((p) => p[0]), ys = punkte.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const b = Math.max(Math.max(...xs) - x0, 0.01), h = Math.max(Math.max(...ys) - y0, 0.01);
  const pts: NonNullable<PptxGenJS.ShapeProps["points"]> = punkte.map(([x, y], i) => ({ x: zoll(x - x0), y: zoll(y - y0), ...(i === 0 ? { moveTo: true } : {}) }));
  if (schliessen) pts.push({ close: true });
  return { x: zoll(x0), y: zoll(y0), w: zoll(b), h: zoll(h), points: pts };
}

async function element(pptx: PptxGenJS, folie: PptxGenJS.Slide, e: Element, dy: number, schrift: string, cache: Map<string, string>): Promise<void> {
  const Y = (y: number) => zoll(y - dy);
  switch (e.art) {
    case "rechteck": {
      const fuell = e.deckkraft === 0 ? undefined : farbe(e.fuellung);
      folie.addShape(pptx.ShapeType.rect, {
        x: zoll(e.x), y: Y(e.y), w: zoll(e.b), h: zoll(e.h),
        fill: fuell ? { color: fuell, transparency: e.deckkraft !== undefined ? Math.round((1 - e.deckkraft) * 100) : 0 } : { type: "none" },
        line: e.strich ? { color: farbe(e.strich), width: pt(e.staerke ?? 0.3), dashType: strich(e.linie) } : { type: "none" },
      });
      return;
    }
    case "linie": {
      if (e.punkte.length < 2) return;
      const f = freiform(e.punkte.map(([x, y]) => [x, y - dy] as [number, number]), false);
      folie.addShape(FREIFORM, { ...f, fill: { type: "none" }, line: { color: farbe(e.strich), width: pt(e.staerke), dashType: strich(e.linie) } });
      return;
    }
    case "vieleck": {
      const f = freiform(e.punkte.map(([x, y]) => [x, y - dy] as [number, number]), true);
      folie.addShape(FREIFORM, {
        ...f,
        fill: farbe(e.fuellung) ? { color: farbe(e.fuellung) } : { type: "none" },
        line: e.strich ? { color: farbe(e.strich), width: pt(e.staerke ?? 0.3), dashType: strich(e.linie) } : { type: "none" },
      });
      return;
    }
    case "kreis":
      folie.addShape(pptx.ShapeType.ellipse, {
        x: zoll(e.x - e.r), y: Y(e.y - e.r), w: zoll(2 * e.r), h: zoll(2 * e.r),
        fill: farbe(e.fuellung) ? { color: farbe(e.fuellung) } : { type: "none" },
        line: e.strich ? { color: farbe(e.strich), width: pt(e.staerke ?? 0.3) } : { type: "none" },
      });
      return;
    case "text": {
      const breite = textBreite(e.text, e.groesse, !!e.fett) + 1;
      const hoehe = zeilenHoehe(e.groesse);
      const x = e.anker === "middle" ? e.x - breite / 2 : e.anker === "end" ? e.x - breite : e.x;
      // Grundlinie → Oberkante des Textfelds
      const y = e.y - e.groesse * PT_IN_MM * 0.95;
      folie.addText(e.text, {
        x: zoll(x), y: Y(y), w: zoll(breite), h: zoll(hoehe),
        fontFace: "Arial", fontSize: e.groesse, bold: !!e.fett, color: farbe(e.farbe) ?? "000000", underline: e.unterstrichen ? { style: "sng" } : undefined,
        align: e.anker === "middle" ? "center" : e.anker === "end" ? "right" : "left", valign: "top", margin: 0, fit: "none", wrap: false,
      });
      return;
    }
    case "bild":
      folie.addImage({ data: e.daten, x: zoll(e.x), y: Y(e.y), w: zoll(e.b), h: zoll(e.h) });
      return;
    case "zeichen":
      folie.addImage({ data: await zeichenPng(e.ref, schrift, cache), x: zoll(e.x), y: Y(e.y), w: zoll(e.groesse), h: zoll(e.groesse) });
      return;
  }
}

export async function pptxErzeugen(szene: Szene, titel: string, schriftBase64: string): Promise<Blob> {
  const pptx = new PptxGenJS();
  const seiten = szene.seiten?.length ? szene.seiten : [{ y: 0, h: szene.hoehe }];
  pptx.defineLayout({ name: "komplan", width: zoll(szene.breite), height: zoll(seiten[0]!.h) });
  pptx.layout = "komplan";
  pptx.title = titel;
  pptx.company = "komplan.app";
  const cache = new Map<string, string>();
  for (const s of seiten) {
    const folie = pptx.addSlide();
    folie.background = { color: "FFFFFF" };
    for (const e of szene.elemente) {
      // Elemente der Folie: alles, was im Blatt liegt (Formulare) bzw. alles (eine Folie)
      const oben = e.art === "linie" || e.art === "vieleck" ? Math.min(...e.punkte.map((p) => p[1])) : e.y;
      if (seiten.length > 1 && (oben < s.y - 0.01 || oben > s.y + s.h)) continue;
      await element(pptx, folie, e, s.y, schriftBase64, cache);
    }
  }
  return (await pptx.write({ outputType: "blob" })) as Blob;
}
