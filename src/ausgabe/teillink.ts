/**
 * Teil-Link: der ganze Plan im Fragment eines Links (`#p=…`). JSON,
 * deflate-raw über die eingebaute CompressionStream, base64url, wie in
 * einsatzauftrag. Das Fragment schickt der Browser an keinen Server.
 * Läuft im Browser und in Node ≥ 18 (CompressionStream global).
 */

import { dateiLesen, dateiSchreiben } from "../modell/migration";
import type { Plan } from "../modell/typen";

export const FRAGMENT = "#p=";
/** Ab hier warnt die App: lange Links brechen in Messengern und Mailprogrammen. */
export const LINK_EMPFOHLEN = 8000;
/** Ab hier gibt es keinen Link, sondern den Hinweis auf den JSON-Export. */
export const LINK_HOECHSTENS = 60000;
/** Obergrenze des entpackten Inhalts gegen präparierte Links. */
const ENTPACKT_HOECHSTENS = 8 * 1024 * 1024;

export const BESCHAEDIGT = "Der Link ist beschädigt oder unvollständig. Bitte den ganzen Link kopieren oder die JSON-Datei verwenden.";

async function durch(bytes: Uint8Array, strom: CompressionStream | DecompressionStream, grenze = Infinity): Promise<Uint8Array> {
  const leser = new Blob([bytes as BlobPart]).stream().pipeThrough(strom).getReader();
  const teile: Uint8Array[] = [];
  let laenge = 0;
  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    laenge += value.length;
    if (laenge > grenze) {
      await leser.cancel();
      throw new Error(BESCHAEDIGT);
    }
    teile.push(value);
  }
  const ganz = new Uint8Array(laenge);
  let stelle = 0;
  for (const t of teile) {
    ganz.set(t, stelle);
    stelle += t.length;
  }
  return ganz;
}

function zuBase64url(bytes: Uint8Array): string {
  let binaer = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binaer += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binaer).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function ausBase64url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) throw new Error(BESCHAEDIGT);
  const binaer = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return bytes;
}

/** Plan → Fragment-Text (ohne „#p="). Bilder (Logo) optional weglassen, sie machen den Link lang. */
export async function planKodieren(plan: Plan, ohneBilder = false): Promise<string> {
  const kopie: Plan = ohneBilder ? { ...plan, bilder: {}, kopf: { ...plan.kopf, logo: undefined } } : plan;
  const json = dateiSchreiben(kopie).replace(/\n\s*/g, "");
  return zuBase64url(await durch(new TextEncoder().encode(json), new CompressionStream("deflate-raw")));
}

export async function planDekodieren(text: string): Promise<Plan> {
  let json: string;
  try {
    const bytes = await durch(ausBase64url(text.trim()), new DecompressionStream("deflate-raw"), ENTPACKT_HOECHSTENS);
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(BESCHAEDIGT);
  }
  return dateiLesen(json).plan;
}

/** Vollständiger Link zur aktuellen Seite. */
export function linkMit(daten: string, basis: string): string {
  return `${basis.split("#")[0]}${FRAGMENT}${daten}`;
}

/** Daten aus dem Fragment, falls vorhanden. */
export function datenAusFragment(hash: string): string | undefined {
  return hash.startsWith(FRAGMENT) ? hash.slice(FRAGMENT.length) : undefined;
}
