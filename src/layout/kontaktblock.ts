/**
 * Kontaktblock einer Stelle im Kommunikationsplan (Organigramm-Variante):
 * Bezeichnung, Betrieb, Leiter, Telefon/Fax/Mobil/E-Mail (je mehrfach, mit
 * Gültigkeit), Rufgruppen und Kanäle mit Richtungspfeil, Funkrufname,
 * Nebenstellen. Leere Felder werden auf Wunsch als gepunktete Linie zum
 * Ausfüllen gedruckt.
 *
 * Pfeile werden als Fläche gezeichnet, nicht als Zeichen „↓": die
 * PDF-Standardschrift kennt keine Pfeile.
 */

import { zeitpunktZerlegen } from "../modell/dtg";
import type { Funkangabe, Kontakt, KontaktArt, KomplanAnsicht, Richtung, Stelle, Zeitpunkt } from "../modell/typen";
import type { Element } from "../szene/typen";
import { textBreite, zeilenHoehe } from "../szene/text";

export const SCHRIFT_KONTAKT = 8;
const PLATZHALTER_BREITE = 32;
export const FARBE_GUELTIG = "#c4161c";
export const FARBE_LINK = "#1a4fb4";

const BESCHRIFTUNG: Record<KontaktArt, string> = {
  telefon: "Tel.",
  fax: "Fax",
  mobil: "Mobil",
  email: "Mail",
  sat: "Sat",
  messenger: "Messenger",
  sonstig: "",
};

type Feld = KomplanAnsicht["felder"][number];

/** „13.11. 15:00", Jahr nur, wenn es vom Stand abweicht. */
export function kurzZeit(z: Zeitpunkt, standJahr?: number): string {
  const t = zeitpunktZerlegen(z);
  if (!t) return z;
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${zwei(t.tag)}.${zwei(t.monat)}.${standJahr && t.jahr !== standJahr ? t.jahr : ""} ${zwei(t.stunde)}:${zwei(t.minute)}`;
}

export function gueltigkeitText(e: { gueltigAb?: Zeitpunkt; gueltigBis?: Zeitpunkt }, standJahr?: number): string {
  const teile: string[] = [];
  if (e.gueltigAb) teile.push(`ab ${kurzZeit(e.gueltigAb, standJahr)}`);
  if (e.gueltigBis) teile.push(`bis ${kurzZeit(e.gueltigBis, standJahr)}`);
  return teile.join(" ");
}

export function funkText(f: Funkangabe): { bezeichnung: string; wert: string } {
  if (f.art === "digital") return { bezeichnung: f.bezeichnung || `Rufgruppe ${f.betrieb}`, wert: f.rufgruppe };
  return { bezeichnung: f.bezeichnung || `${f.band === "4m" ? "4 m" : "2 m"} Kanal`, wert: [f.kanal, f.betriebsart].filter(Boolean).join(" ") };
}

/** Kleiner Pfeil (Richtung) als Fläche, links oben bei x/y, Höhe h. */
export function richtungsPfeil(x: number, y: number, h: number, richtung: Richtung): Element[] {
  if (richtung === "keine") return [];
  const b = h * 0.55;
  const mitte = x + b / 2;
  const kopf = h * 0.42;
  const schaft = b * 0.18;
  const unten = (y0: number, y1: number): Array<[number, number]> => [
    [mitte - schaft, y0], [mitte + schaft, y0], [mitte + schaft, y1 - kopf], [x + b, y1 - kopf], [mitte, y1], [x, y1 - kopf], [mitte - schaft, y1 - kopf],
  ];
  const spiegeln = (p: Array<[number, number]>): Array<[number, number]> => p.map(([px, py]) => [px, 2 * y + h - py]);
  const elemente: Element[] = [];
  if (richtung === "unten" || richtung === "beide") elemente.push({ art: "vieleck", punkte: unten(y, y + h), fuellung: "#000000" });
  if (richtung === "oben") elemente.push({ art: "vieleck", punkte: spiegeln(unten(y, y + h)), fuellung: "#000000" });
  if (richtung === "beide") elemente.push({ art: "vieleck", punkte: spiegeln(unten(y, y + h)).map(([px, py]) => [px + b * 1.1, py] as [number, number]), fuellung: "#000000" });
  return elemente;
}

interface Zeile {
  teile: Array<{ text: string; fett?: boolean; farbe?: string; unterstrichen?: boolean }>;
  pfeil?: Richtung;
  platzhalter?: boolean;
}

export interface Kontaktblock {
  b: number;
  h: number;
  elemente: Element[];
}

/**
 * Setzt den Block mit linker oberer Ecke bei 0/0. `stand` dient nur der
 * Jahresangabe; abgelaufene Einträge bleiben stehen (die Hinweisliste meldet sie).
 */
export function kontaktblock(stelle: Stelle, ansicht: Pick<KomplanAnsicht, "felder" | "platzhalter">, stand?: Zeitpunkt): Kontaktblock {
  const standJahr = stand ? zeitpunktZerlegen(stand)?.jahr : undefined;
  const felder = new Set<Feld>(ansicht.felder);
  const zeilen: Zeile[] = [];
  const platzhalter = ansicht.platzhalter;
  const leer = (label: string) => platzhalter && zeilen.push({ teile: [{ text: `${label}` }], platzhalter: true });

  if (felder.has("bezeichnung")) {
    if (stelle.bezeichnung) zeilen.push({ teile: [{ text: stelle.bezeichnung, fett: true }] });
    else leer("Bezeichnung:");
  }
  if (felder.has("betriebDurch")) {
    if (stelle.betriebDurch) zeilen.push({ teile: [{ text: `Betrieb: ${stelle.betriebDurch}` }] });
  }
  if (felder.has("leiter")) {
    if (stelle.leiter?.name) zeilen.push({ teile: [{ text: `Leiter: ${stelle.leiter.name}${stelle.leiter.dienststellung ? `, ${stelle.leiter.dienststellung}` : ""}` }] });
    for (const k of stelle.leiter?.kontakte ?? []) zeilen.push(kontaktZeile(k, standJahr, "Leiter "));
  }
  for (const art of ["telefon", "fax", "mobil", "email", "sat", "messenger", "sonstig"] as const) {
    if (!felder.has(art)) continue;
    const liste = stelle.kontakte.filter((k) => k.art === art);
    const nummeriert = liste.length > 1 && art === "email";
    liste.forEach((k, i) => {
      if (!k.wert && platzhalter) zeilen.push({ teile: [{ text: `${k.bezeichnung || BESCHRIFTUNG[art]}:` }], platzhalter: true });
      else if (k.wert) zeilen.push(kontaktZeile(k, standJahr, "", nummeriert ? i + 1 : undefined));
    });
    if (liste.length === 0 && (art === "telefon" || art === "fax" || art === "email")) leer(`${BESCHRIFTUNG[art]}:`);
  }
  if (felder.has("funk")) {
    for (const f of stelle.funk) {
      const { bezeichnung, wert } = funkText(f);
      const g = gueltigkeitText(f, standJahr);
      zeilen.push({
        teile: [{ text: `${bezeichnung}` }, { text: ": " }, { text: wert }, ...(g ? [{ text: ` ${g}`, farbe: FARBE_GUELTIG }] : []), ...(f.bedingung ? [{ text: ` (${f.bedingung})` }] : [])],
        pfeil: f.richtung,
      });
    }
  }
  if (felder.has("funkrufname")) {
    if (stelle.funkrufname) zeilen.push({ teile: [{ text: `Rufname: ${stelle.funkrufname}` }] });
    else leer("Rufname:");
  }
  if (felder.has("nebenstellen")) {
    for (const n of stelle.nebenstellen) zeilen.push({ teile: [{ text: `NSt ${n.nummer}: ${n.teilnehmer}${n.anschlussart ? ` (${n.anschlussart})` : ""}` }] });
  }

  return setzen(zeilen, stelle.id);
}

function kontaktZeile(k: Kontakt, standJahr: number | undefined, vorsatz: string, nummer?: number): Zeile {
  const label = k.bezeichnung || `${BESCHRIFTUNG[k.art]}${nummer ? ` ${nummer}` : ""}`;
  const g = gueltigkeitText(k, standJahr);
  return {
    teile: [
      { text: `${vorsatz}${label}${label ? ": " : ""}` },
      { text: k.wert, farbe: k.art === "email" ? FARBE_LINK : undefined, unterstrichen: k.art === "email" },
      ...(g ? [{ text: ` ${g}`, farbe: FARBE_GUELTIG }] : []),
    ],
  };
}

function setzen(zeilen: Zeile[], stelleId: string): Kontaktblock {
  const g = SCHRIFT_KONTAKT;
  const zh = zeilenHoehe(g);
  const pfeilB = zh * 0.75;
  const elemente: Element[] = [];
  let breite = 0;
  zeilen.forEach((z, i) => {
    const grund = (i + 1) * zh - zh * 0.25;
    let x = 0;
    z.teile.forEach((t, j) => {
      // Pfeil nach der Bezeichnung (vor dem Doppelpunkt)
      if (z.pfeil && z.pfeil !== "keine" && j === 1) {
        elemente.push(...richtungsPfeil(x + 0.3, grund - zh * 0.62, zh * 0.62, z.pfeil).map((e) => ({ ...e, herkunft: { stelle: stelleId, rolle: "kontakt" as const } })));
        x += z.pfeil === "beide" ? pfeilB * 1.6 : pfeilB;
      }
      if (!t.text) return;
      elemente.push({ art: "text", x, y: grund, text: t.text, groesse: g, fett: t.fett, anker: "start", farbe: t.farbe, unterstrichen: t.unterstrichen, herkunft: { stelle: stelleId, rolle: "kontakt" } });
      x += textBreite(t.text, g, !!t.fett);
    });
    if (z.platzhalter) {
      x += 1;
      elemente.push({ art: "linie", punkte: [[x, grund + 0.3], [x + PLATZHALTER_BREITE, grund + 0.3]], strich: "#000000", staerke: 0.25, linie: "gepunktet", herkunft: { stelle: stelleId, rolle: "kontakt" } });
      x += PLATZHALTER_BREITE;
    }
    breite = Math.max(breite, x);
  });
  return { b: breite, h: zeilen.length * zh, elemente };
}
