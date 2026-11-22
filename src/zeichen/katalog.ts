/**
 * Zugriff auf die Zeichen. Der Katalog (Verzeichnis und SVG-Quelltexte der
 * Sammlung von Jonas Köritz) kommt aus dem geteilten Kern
 * `@bos/taktische-zeichen/katalog` (Submodul vendor/bos-taktische-zeichen);
 * hier liegen die eigenen Zeichen und das Zeichnen einer `ZeichenRef`.
 *
 * Der Renderer braucht SVG synchron. Deshalb: vor dem Zeichnen eines Plans
 * `zeichenVorladen(refs)` abwarten; bis dahin zeichnet `zeichenSvg` einen
 * neutralen Platzhalter.
 */

import { istGeladen, KATALOG, KATALOG_QUELLE, katalogEinspielen, katalogEintrag, katalogSvg, ordnerLaden, zeichenLaden, type KatalogEintrag } from "@bos/taktische-zeichen/katalog";
import type { Organisation, ZeichenRef } from "../modell/typen";
import { eigeneVorlage, einheit, fahrzeug, fuehrungsstelle, GRUNDFORMEN, kennungText, versorgung, xml } from "./eigen/vorlagen";

export { istGeladen, KATALOG, KATALOG_QUELLE, katalogEinspielen, katalogEintrag, ordnerLaden, type KatalogEintrag };

/** Lädt die Ordner aller genannten Katalogzeichen. */
export async function zeichenVorladen(refs: Iterable<ZeichenRef | undefined>): Promise<void> {
  const schluessel: string[] = [];
  for (const r of refs) if (r?.quelle === "katalog") schluessel.push(r.schluessel);
  await zeichenLaden(schluessel);
}

const PLATZHALTER = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect x="10" y="64" width="236" height="128" fill="#FFFFFF" stroke="#999999" stroke-width="5" stroke-dasharray="12 8" /></svg>`;

/** SVG-Quelltext eines Zeichens (256 × 256). Unbekannt oder noch nicht geladen → Platzhalter. */
export function zeichenSvg(ref: ZeichenRef | undefined, organisation?: Organisation): string {
  if (!ref) return PLATZHALTER;
  switch (ref.quelle) {
    case "katalog": {
      const svg = katalogSvg(ref.schluessel);
      if (!svg) return PLATZHALTER;
      return ref.kennung && KATALOG_RECHTECK.test(svg) ? svg.replace(/<\/svg>\s*$/, `${kennungText(ref.kennung, "#000000")}</svg>`) : svg;
    }
    case "eigen": {
      const v = eigeneVorlage(ref.vorlage);
      if (!v) return PLATZHALTER;
      return v.form({
        ...v.vorgabe,
        ...(ref.text !== undefined ? { text: ref.text } : {}),
        ...(ref.staerke !== undefined ? { staerke: ref.staerke } : {}),
        ...(ref.kennung !== undefined ? { kennung: ref.kennung || undefined } : {}),
      });
    }
    case "frei": {
      const form = GRUNDFORMEN[ref.grundform] ?? GRUNDFORMEN.einheit;
      const kennung = KENNUNG_GRUNDFORMEN.has(ref.grundform) ? ref.kennung || undefined : undefined;
      return form({ text: ref.text, farbe: ref.farbe, textfarbe: ref.textfarbe, kennung, staerke: undefined });
    }
  }
  void organisation;
  return PLATZHALTER;
}

/** Grundrechteck der Führungsstellen in der Sammlung; nur dort passt die Kennung unten rechts. */
const KATALOG_RECHTECK = /<rect [^>]*x="10" y="64" width="236" height="128"/;
const KENNUNG_GRUNDFORMEN = new Set(["fuehrungsstelle", "einheit", "fahrzeug"]);
const KENNUNG_FORMEN = new Set([fuehrungsstelle, einheit, fahrzeug, versorgung]);

/** Kann dieses Zeichen eine Kennung („THW", „FW") unten rechts tragen? */
export function kennungMoeglich(ref: ZeichenRef | undefined): boolean {
  if (!ref) return false;
  if (ref.quelle === "katalog") return KATALOG_RECHTECK.test(katalogSvg(ref.schluessel) ?? "");
  if (ref.quelle === "eigen") {
    const v = eigeneVorlage(ref.vorlage);
    return !!v && KENNUNG_FORMEN.has(v.form);
  }
  return KENNUNG_GRUNDFORMEN.has(ref.grundform);
}

/** Kennung, die das Zeichen tatsächlich zeigt (Vorgabe der eigenen Vorlage eingerechnet). */
export function zeichenKennung(ref: ZeichenRef | undefined): string {
  if (!ref) return "";
  if (ref.quelle === "eigen" && ref.kennung === undefined) return eigeneVorlage(ref.vorlage)?.vorgabe.kennung ?? "";
  return ref.kennung ?? "";
}

/** Anzeigename eines Zeichens für Gliederung und Suche. */
export function zeichenName(ref: ZeichenRef | undefined): string {
  if (!ref) return "";
  if (ref.quelle === "katalog") return katalogEintrag(ref.schluessel)?.titel ?? ref.schluessel;
  if (ref.quelle === "eigen") return ref.text || eigeneVorlage(ref.vorlage)?.titel || ref.vorlage;
  return ref.text;
}

/** Kurzform für Listen: „EAL" statt „Einsatzabschnittsleitung". */
export function zeichenKurz(ref: ZeichenRef | undefined): string {
  if (!ref) return "";
  if (ref.quelle === "katalog") {
    const name = ref.schluessel.split("/").pop()!.replaceAll("_", " ");
    return name.length <= 10 ? name : katalogEintrag(ref.schluessel)?.titel ?? name;
  }
  if (ref.quelle === "eigen") {
    const v = eigeneVorlage(ref.vorlage);
    return ref.text ?? (v?.vorgabe.text || v?.titel || ref.vorlage);
  }
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
