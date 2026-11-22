import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { Szene } from "../szene/typen";
import { pdfErzeugen } from "./pdf";

/** Alle Inhaltsströme eines jsPDF-Dokuments entpackt hintereinander. */
async function inhalt(blob: Blob): Promise<string> {
  const roh = Buffer.from(await blob.arrayBuffer());
  const text = roh.toString("latin1");
  const teile: string[] = [];
  for (const m of text.matchAll(/stream\r?\n/g)) {
    const anfang = m.index! + m[0].length;
    const ende = text.indexOf("endstream", anfang);
    try {
      teile.push(inflateSync(roh.subarray(anfang, ende)).toString("latin1"));
    } catch {
      // Schrift- oder Bildströme ohne Flate
    }
  }
  return teile.join("\n");
}

// jsdom misst keinen Text; svg2pdf braucht die Breite nur zum Ausrichten.
(SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () => ({ x: 0, y: 0, width: 10, height: 10 }) as DOMRect;

describe("PDF", () => {
  it("Zeichen nach einer gestrichelten Verbindung bleiben durchgezogen", async () => {
    const szene: Szene = {
      breite: 100,
      hoehe: 40,
      elemente: [
        { art: "linie", punkte: [[0, 5], [100, 5]], strich: "#000000", staerke: 0.4, linie: "gestrichelt" },
        { art: "zeichen", x: 10, y: 10, groesse: 20, ref: { quelle: "frei", grundform: "einheit", text: "TZ", farbe: "#003399" } },
      ],
    };
    const s = await inhalt(await pdfErzeugen(szene, { format: "A4", ausrichtung: "quer", grosseFlaeche: "einpassen", fuss: { titel: "Test", dtg: "211032NOV26", version: 1 } }));
    // Das Zeichen (Fläche mit Rand) wird mit „B" gezeichnet; maßgeblich ist das letzte Strichmuster davor.
    const vorZeichen = s.slice(0, s.search(/\nB\n/));
    const muster = [...vorZeichen.matchAll(/\[([^\]]*)\]\s+[\d.]+\s+d\b/g)].map((m) => m[1]!.trim());
    expect(muster.length).toBeGreaterThan(1);
    expect(muster[0]).not.toBe("");
    expect(muster.at(-1)).toBe("");
  });
});
