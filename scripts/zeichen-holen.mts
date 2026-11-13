/**
 * Holt die taktischen Zeichen aus dem Release-Archiv von
 * github.com/jonas-koeritz/Taktische-Zeichen und legt sie als JSON je Ordner
 * unter src/zeichen/katalog/ ab, dazu einen Index (Schlüssel, Titel, Ordner)
 * für die Suche, ohne dass dafür alle Zeichen geladen werden müssen.
 *
 * Aufbereitung je Datei wie in vendor/bos-taktische-zeichen/scripts/holen.mts:
 *  - eingebettete Schrift raus (sie liegt einmal unter public/schrift/ und wird
 *    per @font-face bzw. im PDF per addFont eingebunden),
 *  - `viewbox` → `viewBox`, DOCTYPE, <title> und Einrückung raus.
 * Anders als dort werden alle Ordner übernommen: komplan braucht auch
 * Führungsstellen, Einrichtungen, Fernmeldewesen und Personen.
 *
 * Das Archiv schreibt Umlaute in Ordnernamen als „#U00fc"; das wird hier
 * zurückübersetzt.
 *
 *     npm run zeichen:holen            # festgeschriebene Version
 *     npm run zeichen:holen -- v2.1.0  # andere Version
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = process.argv[2] ?? "v2.0.0";
const RELEASE = `https://github.com/jonas-koeritz/Taktische-Zeichen/releases/download/${VERSION}/release.zip`;
const ZIEL = fileURLToPath(new URL("../src/zeichen/katalog/", import.meta.url));
const SCHRIFT = fileURLToPath(new URL("../public/schrift/roboto-slab-bold.woff", import.meta.url));

/** Tippfehler der Quellsammlung im Dateinamen (wie in bos-taktische-zeichen). */
const SCHLUESSEL_KORREKTUR: [string, string][] = [["FGr_Wassserschaden-Pumpen", "FGr_Wasserschaden-Pumpen"]];

export function namenEntschluesseln(name: string): string {
  return name.replace(/#U([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

export function aufbereiten(roh: string): { svg: string; titel: string; schrift?: string } {
  const titel = roh.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
  const schrift = roh.match(/url\("data:application\/font-woff;charset=utf-8;base64,([A-Za-z0-9+/=]+)"\)/)?.[1];
  let svg = roh
    .replace(/^<!DOCTYPE[^>]*>\s*/, "")
    .replace(/\s*<style type="text\/css">[\s\S]*?<\/style>/g, "")
    .replace(/\s*<title>[\s\S]*?<\/title>/g, "")
    .replace(/<defs>\s*<\/defs>/g, "")
    .replace(/\bviewbox=/g, "viewBox=");
  svg = svg.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
  return { svg, titel, schrift };
}

function main(): void {
  const tmp = mkdtempSync(join(tmpdir(), "tz-"));
  try {
    console.log(`Lade ${RELEASE} …`);
    execFileSync("curl", ["-sSfL", "-o", join(tmp, "release.zip"), RELEASE], { stdio: "inherit" });
    execFileSync("unzip", ["-q", "-o", join(tmp, "release.zip"), "svg/*", "-d", tmp]);

    rmSync(ZIEL, { recursive: true, force: true });
    mkdirSync(ZIEL, { recursive: true });
    const index: Array<{ s: string; t: string }> = [];
    let schriftGeschrieben = false;
    let bytes = 0;
    const ordnerListe = readdirSync(join(tmp, "svg")).sort();
    for (const ordnerRoh of ordnerListe) {
      const ordner = namenEntschluesseln(ordnerRoh);
      const dateien = readdirSync(join(tmp, "svg", ordnerRoh)).filter((d) => d.endsWith(".svg")).sort();
      const inhalt: Record<string, string> = {};
      for (const datei of dateien) {
        let schluessel = `${ordner}/${namenEntschluesseln(datei.replace(/\.svg$/, ""))}`;
        for (const [falsch, richtig] of SCHLUESSEL_KORREKTUR) schluessel = schluessel.replace(falsch, richtig);
        const { svg, titel, schrift } = aufbereiten(readFileSync(join(tmp, "svg", ordnerRoh, datei), "utf8"));
        if (schrift && !schriftGeschrieben) {
          mkdirSync(fileURLToPath(new URL("../public/schrift/", import.meta.url)), { recursive: true });
          writeFileSync(SCHRIFT, Buffer.from(schrift, "base64"));
          schriftGeschrieben = true;
        }
        inhalt[schluessel] = svg;
        bytes += svg.length;
        index.push({ s: schluessel, t: titel });
      }
      writeFileSync(join(ZIEL, `${ordner}.json`), JSON.stringify(inhalt) + "\n");
      console.log(`  ${ordner}: ${dateien.length}`);
    }
    index.sort((a, b) => a.s.localeCompare(b.s, "de"));
    writeFileSync(
      join(ZIEL, "index.json"),
      JSON.stringify({
        quelle: "https://github.com/jonas-koeritz/Taktische-Zeichen",
        version: VERSION,
        urheber: "Jonas Köritz",
        bearbeitet: "eingebettete Schrift entfernt, viewBox korrigiert, DOCTYPE/Titel/Einrückung entfernt",
        zeichen: index,
      }) + "\n",
    );
    console.log(`\n${index.length} Zeichen (${(bytes / 1024).toFixed(0)} kB) → ${ZIEL}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
