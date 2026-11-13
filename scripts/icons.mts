/**
 * Rendert public/icon.svg zu den PNG-Icons für Manifest und Apple-Touch.
 * Braucht Playwright mit Chromium (in der Entwicklungsumgebung vorhanden).
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const svg = readFileSync(fileURLToPath(new URL("../public/icon.svg", import.meta.url)), "utf8");
const ziele: Array<[string, number, number]> = [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["icon-maskable-512.png", 512, 0.1],
  ["apple-touch-icon.png", 180, 0],
];
const LOKAL = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const browser = await chromium.launch(existsSync(LOKAL) ? { executablePath: LOKAL } : {});
const seite = await browser.newPage();
for (const [datei, groesse, rand] of ziele) {
  await seite.setViewportSize({ width: groesse, height: groesse });
  const innen = Math.round(groesse * (1 - 2 * rand));
  await seite.setContent(`<html><body style="margin:0;background:#12275e;display:grid;place-items:center;width:${groesse}px;height:${groesse}px">${svg.replace("<svg ", `<svg width="${innen}" height="${innen}" `)}</body></html>`);
  await seite.screenshot({ path: fileURLToPath(new URL(`../public/${datei}`, import.meta.url)) });
}
await browser.close();
console.log("Icons geschrieben.");
