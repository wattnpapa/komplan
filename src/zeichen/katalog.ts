/**
 * Zugriff auf die Zeichen: Index (immer geladen, für Suche und Anzeige) und
 * SVG-Quelltexte (je Ordner nachgeladen und danach synchron verfügbar).
 *
 * Der Renderer braucht SVG synchron. Deshalb: vor dem Zeichnen eines Plans
 * `zeichenVorladen(refs)` abwarten; bis dahin zeichnet `zeichenSvg` einen
 * neutralen Platzhalter.
 */

import indexDaten from "./katalog/index.json";
import type { Organisation, ZeichenRef } from "../modell/typen";
import { eigeneVorlage, GRUNDFORMEN, xml } from "./eigen/vorlagen";

export interface KatalogEintrag {
  schluessel: string;
  titel: string;
  ordner: string;
}

export const KATALOG_QUELLE = {
  url: indexDaten.quelle,
  version: indexDaten.version,
  urheber: indexDaten.urheber,
  bearbeitet: indexDaten.bearbeitet,
};

export const KATALOG: KatalogEintrag[] = indexDaten.zeichen.map((z) => ({
  schluessel: z.s,
  titel: z.t || z.s.split("/").pop()!.replaceAll("_", " "),
  ordner: z.s.split("/")[0]!,
}));

const NACH_SCHLUESSEL = new Map(KATALOG.map((e) => [e.schluessel, e]));

export function katalogEintrag(schluessel: string): KatalogEintrag | undefined {
  return NACH_SCHLUESSEL.get(schluessel);
}

type OrdnerLader = () => Promise<{ default: Record<string, string> }>;
const LADER: Record<string, OrdnerLader> = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: Record<string, string> }>("./katalog/*.json")).filter(([p]) => !p.endsWith("/index.json")).map(([pfad, lader]) => [
    pfad.replace("./katalog/", "").replace(".json", ""),
    lader,
  ]),
);

const svgCache = new Map<string, string>();
const geladeneOrdner = new Map<string, Promise<void>>();

export function ordnerLaden(ordner: string): Promise<void> {
  let laden = geladeneOrdner.get(ordner);
  if (!laden) {
    const lader = LADER[ordner];
    laden = lader
      ? lader().then((m) => {
          for (const [k, v] of Object.entries(m.default)) svgCache.set(k, v);
        })
      : Promise.resolve();
    geladeneOrdner.set(ordner, laden);
  }
  return laden;
}

/** Lädt die Ordner aller genannten Katalogzeichen. */
export async function zeichenVorladen(refs: Iterable<ZeichenRef | undefined>): Promise<void> {
  const ordner = new Set<string>();
  for (const r of refs) if (r?.quelle === "katalog") ordner.add(r.schluessel.split("/")[0]!);
  await Promise.all([...ordner].map(ordnerLaden));
}

/** Für Tests und Node-Skripte: Ordner direkt einspielen. */
export function katalogEinspielen(eintraege: Record<string, string>): void {
  for (const [k, v] of Object.entries(eintraege)) svgCache.set(k, v);
}

export function istGeladen(schluessel: string): boolean {
  return svgCache.has(schluessel);
}

const PLATZHALTER = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect x="10" y="64" width="236" height="128" fill="#FFFFFF" stroke="#999999" stroke-width="5" stroke-dasharray="12 8" /></svg>`;

/** SVG-Quelltext eines Zeichens (256 × 256). Unbekannt oder noch nicht geladen → Platzhalter. */
export function zeichenSvg(ref: ZeichenRef | undefined, organisation?: Organisation): string {
  if (!ref) return PLATZHALTER;
  switch (ref.quelle) {
    case "katalog":
      return svgCache.get(ref.schluessel) ?? PLATZHALTER;
    case "eigen": {
      const v = eigeneVorlage(ref.vorlage);
      if (!v) return PLATZHALTER;
      return v.form({ ...v.vorgabe, ...(ref.text !== undefined ? { text: ref.text } : {}), ...(ref.staerke !== undefined ? { staerke: ref.staerke } : {}) });
    }
    case "frei": {
      const form = GRUNDFORMEN[ref.grundform] ?? GRUNDFORMEN.einheit;
      return form({ text: ref.text, farbe: ref.farbe, textfarbe: ref.textfarbe, kennung: undefined, staerke: undefined });
    }
  }
  void organisation;
  return PLATZHALTER;
}

/** Anzeigename eines Zeichens für Gliederung und Suche. */
export function zeichenName(ref: ZeichenRef | undefined): string {
  if (!ref) return "";
  if (ref.quelle === "katalog") return katalogEintrag(ref.schluessel)?.titel ?? ref.schluessel;
  if (ref.quelle === "eigen") return ref.text || eigeneVorlage(ref.vorlage)?.titel || ref.vorlage;
  return ref.text;
}

/**
 * Macht IDs im SVG eindeutig (clipPath „symbol"/„base" kommen in fast jedem
 * Zeichen vor; inline nebeneinander würden sie sich gegenseitig überschreiben).
 */
export function svgIdsPraefixen(svg: string, praefix: string): string {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]!);
  let aus = svg;
  for (const id of new Set(ids)) {
    aus = aus.replaceAll(`id="${id}"`, `id="${praefix}-${id}"`).replaceAll(`url(#${id})`, `url(#${praefix}-${id})`).replaceAll(`href="#${id}"`, `href="#${praefix}-${id}"`);
  }
  return aus;
}

/** Inneres eines Zeichens (ohne äußeres <svg>) für das Einbetten in ein größeres SVG. */
export function zeichenInhalt(svg: string): string {
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

export { xml };
