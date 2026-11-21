/**
 * Führungsorganisation: Plan + Ansicht → Szene. Jede Stelle wird zu einem
 * Kasten aus Zeichen, Nummer, Beschriftung und Zusatzzeilen; das Baum-Layout
 * ordnet die Kästen, danach werden Linien, Hervorhebungen und Verbindungen
 * gezeichnet. Linien liegen hinter den Zeichen, damit sie an der
 * Zeichenkante enden, auch bei Haus- oder Rautenform.
 */

import type { FuehrungsorgAnsicht, Id, KomplanAnsicht, Plan, Stelle } from "../modell/typen";
import type { Element, Szene } from "../szene/typen";
import { textBreite, zeilenHoehe } from "../szene/text";
import { baumLayout, waldLayout, type LKnoten } from "./baum";
import { kontaktblock, type Kontaktblock } from "./kontaktblock";
import { kopfleiste } from "../szene/kopfleiste";

/** Kantenlänge des Zeichen-Quadrats (256er viewBox) in mm. */
export const ZEICHEN_MM = 18;
const RAND = 8;
const STRICH = 0.35;
const SCHRIFT_BESCHRIFTUNG = 10;
const SCHRIFT_ZUSATZ = 8.5;
const SCHRIFT_NUMMER = 12;
const STAPEL_VERSATZ = 1.6;

/** Grenzen der Zeichenform in der 256er-viewBox (alle Grundformen der Sammlung). */
const Z = { links: 10 / 256, rechts: 246 / 256, oben: 64 / 256, unten: 192 / 256, mitte: 128 / 256, fuss: 228 / 256 };

type BaumAnsicht = FuehrungsorgAnsicht | KomplanAnsicht;

interface Kasten {
  knoten: LKnoten;
  /** Elemente relativ zur linken oberen Ecke des Kastens. */
  elemente: Element[];
}

function stelleKasten(stelle: Stelle, eingeklappt: number): Kasten {
  const elemente: Element[] = [];
  const herkunft = { stelle: stelle.id, rolle: "knoten" as const };

  if (stelle.typ === "auslassung") {
    // Drei Punkte als Kreise: „⋮" kennt die PDF-Standardschrift nicht.
    const senkrecht = (stelle.auslassung ?? "⋮") === "⋮";
    const b = senkrecht ? 6 : 12;
    const h = senkrecht ? 12 : 6;
    elemente.push({ art: "rechteck", x: 0, y: 0, b, h, fuellung: "#ffffff", deckkraft: 0, herkunft });
    for (let i = 0; i < 3; i++) {
      elemente.push({ art: "kreis", x: senkrecht ? b / 2 : 2 + i * 4, y: senkrecht ? 2 + i * 4 : h / 2, r: 0.9, fuellung: "#000000", herkunft });
    }
    return {
      knoten: knoten(stelle, { b, h, ax: b / 2, oben: 0, unten: h, mitteY: h / 2, zLinks: 0, zRechts: b }),
      elemente,
    };
  }

  const s = ZEICHEN_MM;
  const stapel = Math.max(1, Math.min(6, stelle.stapel ?? 1));
  const stapelB = (stapel - 1) * STAPEL_VERSATZ;
  const lage = stelle.beschriftungPosition ?? "unten";
  const zeilen = [stelle.beschriftung, ...stelle.zusatzzeilen].filter((z) => z.trim() !== "");
  const nummer = stelle.nummer?.trim() ?? "";
  const nummerB = nummer ? textBreite(nummer, SCHRIFT_NUMMER, false) + 1.5 : 0;
  const zeilenB = zeilen.map((z, i) => textBreite(z, i === 0 ? SCHRIFT_BESCHRIFTUNG : SCHRIFT_ZUSATZ, i === 0));
  const textB = Math.max(0, ...zeilenB);
  const zh = (i: number) => zeilenHoehe(i === 0 ? SCHRIFT_BESCHRIFTUNG : SCHRIFT_ZUSATZ);

  // Zeichen-Quadrat: links oben im Kasten bei (zx, zy)
  let zx = 0;
  const zy = stapelB;
  let b = s + stapelB + nummerB;
  let h = s * Z.fuss + stapelB;

  if (lage === "unten") {
    const breite = Math.max(s * (Z.rechts - Z.links) + stapelB + nummerB * 2, textB);
    zx = (breite - (s + stapelB)) / 2;
    b = Math.max(b, breite);
    let y = zy + s * Z.fuss;
    zeilen.forEach((z, i) => {
      y += zh(i);
      elemente.push({ art: "text", x: b / 2, y: y - zh(i) * 0.22, text: z, groesse: i === 0 ? SCHRIFT_BESCHRIFTUNG : SCHRIFT_ZUSATZ, fett: i === 0, anker: "middle", herkunft: { stelle: stelle.id, rolle: "beschriftung" } });
    });
    h = Math.max(h, y + 0.5);
  } else {
    // rechts oder links neben dem Zeichen, unten bündig zur Zeichenform
    const textX0 = s + stapelB + nummerB + 1;
    const blockH = zeilen.reduce((summe, _, i) => summe + zh(i), 0);
    let y = Math.max(zy + s * Z.oben, zy + s * Z.unten - blockH + zh(0));
    if (lage === "links") {
      zx = textB + 2;
      zeilen.forEach((z, i) => {
        elemente.push({ art: "text", x: textB, y: y - zh(i) * 0.22, text: z, groesse: i === 0 ? SCHRIFT_BESCHRIFTUNG : SCHRIFT_ZUSATZ, fett: i === 0, anker: "end", herkunft: { stelle: stelle.id, rolle: "beschriftung" } });
        y += zh(i + 1);
      });
      b = zx + s + stapelB + nummerB;
    } else {
      zeilen.forEach((z, i) => {
        elemente.push({ art: "text", x: textX0, y: y - zh(i) * 0.22, text: z, groesse: i === 0 ? SCHRIFT_BESCHRIFTUNG : SCHRIFT_ZUSATZ, fett: i === 0, anker: "start", herkunft: { stelle: stelle.id, rolle: "beschriftung" } });
        y += zh(i + 1);
      });
      b = textX0 + textB;
    }
    h = Math.max(h, y - zh(zeilen.length) + 1);
  }

  // Gestapelt: hinterstes Zeichen zuerst, nach rechts oben versetzt
  for (let i = stapel - 1; i >= 0; i--) {
    elemente.push({ art: "zeichen", x: zx + i * STAPEL_VERSATZ, y: zy - i * STAPEL_VERSATZ, groesse: s, ref: stelle.zeichen, herkunft });
  }
  if (nummer) {
    elemente.push({ art: "text", x: zx + s * Z.rechts + stapelB + 1, y: zy + s * Z.unten, text: nummer, groesse: SCHRIFT_NUMMER, anker: "start", herkunft });
  }
  if (eingeklappt > 0) {
    const t = `+${eingeklappt}`;
    elemente.push({ art: "text", x: zx + s / 2, y: h + zeilenHoehe(8), text: t, groesse: 8, anker: "middle", farbe: "#555555", herkunft: { stelle: stelle.id, rolle: "einklapp" } });
    h += zeilenHoehe(8) + 0.5;
  }

  return {
    knoten: knoten(stelle, {
      b,
      h,
      ax: zx + s / 2,
      oben: zy + s * Z.oben,
      unten: zy + s * Z.unten,
      mitteY: zy + s * Z.mitte,
      zLinks: zx + s * Z.links,
      zRechts: zx + s * Z.rechts + stapelB,
    }),
    elemente,
  };
}

const BLOCK_ABSTAND = 2.5;

/** Abstand des Kontaktblocks unter einer waagerechten Linie auf Höhe der Zeichenmitte. */
const UNTER_LINIE = 1.2;

/**
 * Hängt den Kontaktblock rechts, links oder unter den Kasten einer Stelle.
 * `linieAufSeite`: auf dieser Seite läuft eine Linie auf Höhe der
 * Zeichenmitte (seitlich angehängte Stelle, Kamm); der Block beginnt dann
 * unter der Linie statt an der Zeichenoberkante.
 */
function blockAnhaengen(kasten: Kasten, block: Kontaktblock, lage: "rechts" | "links" | "unten", linieAufSeite: { links: boolean; rechts: boolean }): void {
  const k = kasten.knoten;
  const yBlock = (seite: "links" | "rechts") => (linieAufSeite[seite] ? k.mitteY + UNTER_LINIE : Math.max(0, k.oben - 1));
  if (lage === "rechts") {
    const x = k.b + BLOCK_ABSTAND;
    const y = yBlock("rechts");
    kasten.elemente.push(...block.elemente.map((e) => verschiebeElement(e, x, y)));
    k.b = x + block.b;
    k.h = Math.max(k.h, y + block.h);
  } else if (lage === "links") {
    const dx = block.b + BLOCK_ABSTAND;
    kasten.elemente = kasten.elemente.map((e) => verschiebeElement(e, dx, 0));
    k.ax += dx; k.zLinks += dx; k.zRechts += dx; k.b += dx;
    const y = yBlock("links");
    kasten.elemente.push(...block.elemente.map((e) => verschiebeElement(e, 0, y)));
    k.h = Math.max(k.h, y + block.h);
  } else {
    const x = Math.max(0, k.zLinks);
    const y = k.h + 1;
    kasten.elemente.push(...block.elemente.map((e) => verschiebeElement(e, x, y)));
    k.b = Math.max(k.b, x + block.b);
    k.h = y + block.h;
    k.unten = k.h;
  }
}

function knoten(stelle: Stelle, m: Pick<LKnoten, "b" | "h" | "ax" | "oben" | "unten" | "mitteY" | "zLinks" | "zRechts">): LKnoten {
  return { id: stelle.id, ...m, kinder: [], seitlich: [], richtung: "horizontal", linie: stelle.anbindung.linie, abstandX: 0, abstandY: 0 };
}

/** Welche Wurzeln eine Ansicht zeigt. */
export function sichtbareWurzeln(plan: Plan, ansicht: BaumAnsicht): Id[] {
  if (ansicht.wurzel && plan.stellen[ansicht.wurzel]) return [ansicht.wurzel];
  return plan.wurzeln.filter((id) => plan.stellen[id] && !ansicht.knoten[id]?.ausgeblendet);
}

function zaehleNachfahren(plan: Plan, id: Id, tiefe = 0): number {
  if (tiefe > 500) return 0;
  return (plan.stellen[id]?.kinder ?? []).reduce((n, k) => n + 1 + zaehleNachfahren(plan, k, tiefe + 1), 0);
}

export interface FuehrungsorgOptionen {
  /** Titelzeile mit Planname und Stand. */
  titel?: boolean;
}

/** Plan + Baum-Ansicht → Szene. */
export function fuehrungsorgSzene(plan: Plan, ansicht: BaumAnsicht, optionen: FuehrungsorgOptionen = {}): Szene {
  const kaesten = new Map<Id, Kasten>();
  const besucht = new Set<Id>();

  /** `linieVon`: Seite, auf der die Linie von der übergeordneten Stelle ankommt. */
  const bauen = (id: Id, linieVon?: "links" | "rechts"): LKnoten | undefined => {
    const stelle = plan.stellen[id];
    if (!stelle || besucht.has(id)) return undefined;
    besucht.add(id);
    const einstellung = ansicht.knoten[id];
    if (einstellung?.ausgeblendet) return undefined;
    const eingeklappt = einstellung?.eingeklappt ? zaehleNachfahren(plan, id) : 0;
    const kasten = stelleKasten(stelle, eingeklappt);
    kaesten.set(id, kasten);
    const k = kasten.knoten;
    const mitBlock = ansicht.typ === "kommunikationsplan" && ansicht.variante === "organigramm" && stelle.typ === "stelle";
    const blockLage = mitBlock ? einstellung?.kontaktLage ?? ansicht.kontaktLage : "aus";
    const layout = { ...stelle.layout, ...einstellung?.layout };
    k.richtung = layout.kinder ?? "horizontal";
    k.abstandX = layout.abstand ?? ansicht.abstandStandard.waagerecht;
    k.abstandY = layout.abstand ?? ansicht.abstandStandard.senkrecht;
    k.versatz = layout.versatz;
    // Beschriftung unter dem Zeichen: die Linie nach unten beginnt unter dem Text.
    if ((stelle.beschriftungPosition ?? "unten") === "unten" && (stelle.beschriftung.trim() || stelle.zusatzzeilen.some((z) => z.trim()))) k.unten = k.h;
    const sichtbareKinder = eingeklappt ? [] : stelle.kinder.filter((c) => plan.stellen[c] && !besucht.has(c) && !ansicht.knoten[c]?.ausgeblendet);
    if (mitBlock && blockLage !== "aus") {
      const block = kontaktblock(stelle, ansicht as KomplanAnsicht, plan.stand.zeitpunkt);
      const seitlich = (lage: string) => sichtbareKinder.some((c) => plan.stellen[c]!.anbindung.lage === lage);
      const linieAufSeite = { links: linieVon === "links" || seitlich("seitlich-links"), rechts: linieVon === "rechts" || seitlich("seitlich-rechts") };
      if (block.h > 0) blockAnhaengen(kasten, block, blockLage, linieAufSeite);
    }
    if (!eingeklappt) {
      for (const kindId of stelle.kinder) {
        const lage = plan.stellen[kindId]?.anbindung.lage;
        // seitlich rechts angehängt: Linie kommt von links an; Kamm: ebenfalls von links
        const kind = bauen(kindId, lage === "seitlich-rechts" || (lage === "unten" && k.richtung === "vertikal") ? "links" : lage === "seitlich-links" ? "rechts" : undefined);
        if (!kind || !lage) continue;
        if (lage === "unten") k.kinder.push(kind);
        else k.seitlich.push({ knoten: kind, seite: lage === "seitlich-links" ? "links" : "rechts" });
      }
    }
    return k;
  };

  const wurzeln = sichtbareWurzeln(plan, ansicht).map((id) => bauen(id)).filter((k): k is LKnoten => !!k);
  const elemente: Element[] = [];
  if (wurzeln.length === 0) return { breite: 2 * RAND + 80, hoehe: 2 * RAND + 20, elemente };

  const { block } = wurzeln.length === 1 ? baumLayout(wurzeln[0]!) : waldLayout(wurzeln, ansicht.abstandStandard.waagerecht * 2);

  const titelH = optionen.titel ? 14 : 0;
  const ox = RAND;
  const oy = RAND + titelH;
  const platz = new Map(block.plaetze.map((p) => [p.id, { x: p.x + ox, y: p.y + oy }]));

  // Hervorhebungen (ganz hinten)
  for (const hv of ansicht.hervorhebungen) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const sid of hv.stellen) {
      const p = platz.get(sid);
      const k = kaesten.get(sid);
      if (!p || !k) continue;
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x + k.knoten.b); y1 = Math.max(y1, p.y + k.knoten.h);
    }
    if (!Number.isFinite(x0)) continue;
    const pad = 2.5;
    elemente.push({
      art: "rechteck",
      x: x0 - pad, y: y0 - pad, b: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad,
      fuellung: hv.stil === "flaeche" ? hv.farbe : undefined,
      strich: hv.stil === "rahmen" ? hv.farbe : hv.linie !== "durchgezogen" ? "#000000" : undefined,
      staerke: hv.stil === "rahmen" ? 0.7 : 0.3,
      linie: hv.linie,
      herkunft: { rolle: "hervorhebung" },
    });
    if (hv.text) {
      elemente.push({ art: "text", x: x1 + pad, y: y0 - pad - 1, text: hv.text, groesse: 7, fett: true, anker: "end", herkunft: { rolle: "hervorhebung" } });
    }
  }

  // Unterstellungslinien
  for (const l of block.linien) {
    elemente.push({
      art: "linie",
      punkte: l.punkte.map(([x, y]) => [x + ox, y + oy] as [number, number]),
      strich: "#000000",
      staerke: STRICH,
      linie: l.linie,
      herkunft: { stelle: l.nach, rolle: "unterstellung" },
    });
  }

  // Verbindungen außerhalb der Unterstellung
  for (const v of Object.values(plan.verbindungen)) {
    const a = kaesten.get(v.von), b = kaesten.get(v.nach);
    const pa = platz.get(v.von), pb = platz.get(v.nach);
    if (!a || !b || !pa || !pb) continue;
    const ka = a.knoten, kb = b.knoten;
    const aRechts = pa.x + ka.ax <= pb.x + kb.ax;
    const x1 = aRechts ? pa.x + ka.zRechts : pa.x + ka.zLinks;
    const x2 = aRechts ? pb.x + kb.zLinks : pb.x + kb.zRechts;
    const y1 = pa.y + ka.mitteY, y2 = pb.y + kb.mitteY;
    const xm = (x1 + x2) / 2;
    const punkte: Array<[number, number]> = Math.abs(y1 - y2) < 0.01 ? [[x1, y1], [x2, y2]] : [[x1, y1], [xm, y1], [xm, y2], [x2, y2]];
    const linie = v.linie ?? (v.art === "geplant" ? "gepunktet" : "gestrichelt");
    elemente.push({ art: "linie", punkte, strich: "#000000", staerke: STRICH, linie, herkunft: { rolle: "verbindung" } });
    if (v.text) {
      elemente.push({ art: "text", x: xm, y: Math.min(y1, y2) - 1.2, text: v.text, groesse: 7.5, anker: "middle", herkunft: { rolle: "verbindung" } });
    }
  }

  // Kästen
  for (const [id, kasten] of kaesten) {
    const p = platz.get(id);
    if (!p) continue;
    for (const e of kasten.elemente) elemente.push(verschiebeElement(e, p.x, p.y));
  }

  // Titelzeile
  const breite = block.b + 2 * RAND;
  if (optionen.titel) {
    elemente.push({ art: "text", x: RAND, y: RAND + 6, text: plan.name, groesse: 14, fett: true, anker: "start", herkunft: { rolle: "kopf" } });
    elemente.push({ art: "text", x: breite - RAND, y: RAND + 6, text: `Stand: ${plan.stand.dtg}`, groesse: 10, anker: "end", herkunft: { rolle: "kopf" } });
  }

  // Freie Zusätze (nummerierte Pfeile, Text) unter dem Baum
  let hoehe = block.h + oy + RAND;
  if (ansicht.zusaetze.length) {
    for (const z of ansicht.zusaetze) {
      let x = z.x + ox, y = z.y + oy;
      if (z.bezug) {
        const p = platz.get(z.bezug), k = kaesten.get(z.bezug);
        if (!p || !k) continue;
        x = p.x + k.knoten.ax - z.b / 2 + z.x;
        y = p.y + k.knoten.h + z.y;
      }
      if (z.art === "text") {
        elemente.push({ art: "text", x, y: y + zeilenHoehe(z.groesse) * 0.8, text: z.text, groesse: z.groesse, anker: "start" });
      } else {
        elemente.push(pfeil(x, y, z.b, z.h, z.richtung, z.farbe));
        if (z.nummer) elemente.push({ art: "text", x: x + z.b / 2, y: y + z.h * 0.72, text: z.nummer, groesse: 11, fett: true, anker: "middle" });
      }
      hoehe = Math.max(hoehe, y + z.h + RAND);
    }
  }
  let gesamtBreite = Math.max(breite, optionen.titel ? textBreite(plan.name, 14, true) + 50 : 0);

  // Fußnoten
  const fussnoten = plan.fussnoten.filter((f) => !ansicht.fussnoten || ansicht.fussnoten.includes(f.id));
  if (fussnoten.length) {
    let y = hoehe - RAND + 4;
    for (const f of fussnoten) {
      y += zeilenHoehe(8);
      const t = `${f.marke ? `${f.marke} ` : ""}${f.text}`;
      elemente.push({ art: "text", x: RAND, y, text: t, groesse: 8, anker: "start", herkunft: { rolle: "fussnote" } });
      gesamtBreite = Math.max(gesamtBreite, textBreite(t, 8) + 2 * RAND);
    }
    hoehe = y + RAND;
  }

  // Kopfleiste (Fb Fü) über allem
  if (ansicht.kopfleiste && ansicht.typ === "kommunikationsplan") {
    gesamtBreite = Math.max(gesamtBreite, 200);
    const bild = plan.kopf.logo ? plan.bilder[plan.kopf.logo] : undefined;
    const kopf = kopfleiste({
      breite: gesamtBreite - 2 * RAND,
      formular: ansicht.variante === "fb-fue-76" ? "Fb Fü 76" : undefined,
      titel: "Kommunikationsplan",
      kopf: plan.kopf,
      dtg: plan.stand.dtg,
      logo: bild ? { daten: bild.daten, breite: bild.breite, hoehe: bild.hoehe } : undefined,
      organisationText: plan.organisation === "thw" ? "Technisches\nHilfswerk" : undefined,
    });
    const dy = kopf.h + 6;
    const verschoben = elemente.map((e) => verschiebeElement(e, 0, dy));
    elemente.length = 0;
    elemente.push(...kopf.elemente.map((e) => verschiebeElement(e, RAND, RAND)), ...verschoben);
    hoehe += dy;
  }
  return { breite: gesamtBreite, hoehe, elemente };
}

function pfeil(x: number, y: number, b: number, h: number, richtung: "oben" | "unten" | "links" | "rechts", farbe = "#FF4500"): Element {
  const s = b * 0.3; // Schaftbreite/2 Rand
  const k = h * 0.4; // Kopflänge
  let punkte: Array<[number, number]> = [
    [x + b / 2, y], [x + b, y + k], [x + b - s, y + k], [x + b - s, y + h], [x + s, y + h], [x + s, y + k], [x, y + k],
  ];
  if (richtung === "unten") punkte = punkte.map(([px, py]) => [px, 2 * y + h - py]);
  if (richtung === "links" || richtung === "rechts") {
    const cx = x + b / 2, cy = y + h / 2;
    const dreh = richtung === "rechts" ? 1 : -1;
    punkte = punkte.map(([px, py]) => [cx - dreh * (py - cy), cy + dreh * (px - cx)]);
  }
  return { art: "vieleck", punkte, fuellung: farbe, strich: "#000000", staerke: 0.3 };
}

export function verschiebeElement(e: Element, dx: number, dy: number): Element {
  switch (e.art) {
    case "kreis":
      return { ...e, x: e.x + dx, y: e.y + dy };
    case "linie":
    case "vieleck":
      return { ...e, punkte: e.punkte.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
    default:
      return { ...e, x: e.x + dx, y: e.y + dy };
  }
}
