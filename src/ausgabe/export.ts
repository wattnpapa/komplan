/**
 * Export im Browser: SVG, PNG (über <canvas>) und JSON als Download.
 * Die Zeichen-Schrift wird für den Export eingebettet, damit die Datei auch
 * auf Rechnern ohne Roboto Slab gleich aussieht.
 */

import { dateiSchreiben } from "../modell/migration";
import type { Plan, StandSchnappschuss } from "../modell/typen";
import type { Szene } from "../szene/typen";
import { szeneZuSvg } from "./svg";

let schriftBase64: Promise<string> | undefined;

/** Roboto Slab Bold als base64 (einmal geladen, liegt im Offline-Speicher). */
export function zeichenSchrift(): Promise<string> {
  schriftBase64 ??= fetch(new URL("schrift/roboto-slab-bold.woff", document.baseURI))
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`Schrift: ${r.status}`))))
    .then((buf) => {
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    })
    .catch(() => "");
  return schriftBase64;
}

export function herunterladen(daten: Blob, dateiname: string): void {
  const url = URL.createObjectURL(daten);
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Dateiname aus Planname und Stand, ohne Zeichen, die Dateisysteme stören. */
export function dateiname(plan: Plan, endung: string, zusatz = ""): string {
  const basis = `${plan.name || "komplan"}${zusatz ? ` ${zusatz}` : ""} ${plan.stand.dtg}`
    .normalize("NFC")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return `${basis}.${endung}`;
}

export async function svgExport(szene: Szene, hintergrund?: string): Promise<string> {
  return szeneZuSvg(szene, { hintergrund, zeichenSchriftBase64: await zeichenSchrift() });
}

/** Pixel je mm bei Faktor 1 (96 dpi). */
export const PX_JE_MM = 96 / 25.4;

/** SVG → PNG. `faktor` 1 = 96 dpi, 2 = 192 dpi … Höchstens 16 000 px Kantenlänge. */
export async function pngExport(szene: Szene, faktor: number, hintergrund?: string): Promise<Blob> {
  const svg = await svgExport(szene, hintergrund);
  const grenze = 16000;
  const f = Math.min(faktor, grenze / (szene.breite * PX_JE_MM), grenze / (szene.hoehe * PX_JE_MM));
  const b = Math.max(1, Math.round(szene.breite * PX_JE_MM * f));
  const h = Math.max(1, Math.round(szene.hoehe * PX_JE_MM * f));
  const bild = new Image();
  bild.decoding = "sync";
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((ok, fehler) => {
      bild.onload = () => ok();
      bild.onerror = () => fehler(new Error("Das Bild ließ sich nicht erzeugen."));
      bild.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = b;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    if (hintergrund) {
      ctx.fillStyle = hintergrund;
      ctx.fillRect(0, 0, b, h);
    }
    ctx.drawImage(bild, 0, 0, b, h);
    return await new Promise<Blob>((ok, fehler) => canvas.toBlob((blob) => (blob ? ok(blob) : fehler(new Error("PNG fehlgeschlagen"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function jsonExport(plan: Plan, staende?: StandSchnappschuss[]): Blob {
  return new Blob([dateiSchreiben(plan, staende)], { type: "application/json" });
}
