/**
 * Wandelt die WOFF-1.0-Schrift der Zeichen (Roboto Slab Bold, Apache 2.0) in
 * TTF um. jsPDF bettet nur TTF ein; die PDF-Ausgabe braucht die Schrift, damit
 * die Texte in den taktischen Zeichen als Vektor in der richtigen Schrift stehen.
 *
 *     node --import tsx scripts/woff-zu-ttf.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

export function woffZuTtf(woff: Buffer): Buffer {
  if (woff.readUInt32BE(0) !== 0x774f4646) throw new Error("Keine WOFF-1.0-Datei");
  const flavor = woff.readUInt32BE(4);
  const anzahl = woff.readUInt16BE(12);
  const tabellen: Array<{ tag: number; pruef: number; daten: Buffer }> = [];
  for (let i = 0; i < anzahl; i++) {
    const o = 44 + i * 20;
    const tag = woff.readUInt32BE(o);
    const start = woff.readUInt32BE(o + 4);
    const laengeKomp = woff.readUInt32BE(o + 8);
    const laenge = woff.readUInt32BE(o + 12);
    const pruef = woff.readUInt32BE(o + 16);
    const roh = woff.subarray(start, start + laengeKomp);
    tabellen.push({ tag, pruef, daten: laengeKomp < laenge ? inflateSync(roh) : Buffer.from(roh) });
  }
  let potenz = 1, exp = 0;
  while (potenz * 2 <= anzahl) { potenz *= 2; exp++; }
  const kopf = Buffer.alloc(12 + 16 * anzahl);
  kopf.writeUInt32BE(flavor, 0);
  kopf.writeUInt16BE(anzahl, 4);
  kopf.writeUInt16BE(potenz * 16, 6);
  kopf.writeUInt16BE(exp, 8);
  kopf.writeUInt16BE(anzahl * 16 - potenz * 16, 10);
  let versatz = kopf.length;
  const teile: Buffer[] = [kopf];
  tabellen.forEach((t, i) => {
    const o = 12 + i * 16;
    kopf.writeUInt32BE(t.tag, o);
    kopf.writeUInt32BE(t.pruef, o + 4);
    kopf.writeUInt32BE(versatz, o + 8);
    kopf.writeUInt32BE(t.daten.length, o + 12);
    const auffuellen = (4 - (t.daten.length % 4)) % 4;
    teile.push(t.daten, Buffer.alloc(auffuellen));
    versatz += t.daten.length + auffuellen;
  });
  return Buffer.concat(teile);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const quelle = fileURLToPath(new URL("../public/schrift/roboto-slab-bold.woff", import.meta.url));
  const ziel = fileURLToPath(new URL("../public/schrift/roboto-slab-bold.ttf", import.meta.url));
  writeFileSync(ziel, woffZuTtf(readFileSync(quelle)));
  console.log(`→ ${ziel}`);
}
