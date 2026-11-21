/**
 * Allgemeines Baum-Layout für Organigramme in der Art der Vorlagen:
 * Elternknoten mittig über seinen Kindern, Kinder nebeneinander an einer
 * gemeinsamen Sammelschiene (orthogonal), wahlweise untereinander als Kamm,
 * dazu seitlich angehängte Knoten auf Höhe des Elternknotens (Gegenstab,
 * FZ FK neben ÜL, LtS neben E).
 *
 * Verfahren: Teilbäume als Blöcke von unten nach oben (Walker-artig ohne
 * Kontur-Verschachtelung). Das ist etwas weniger dicht als Reingold-Tilford,
 * dafür ohne Überraschungen: kein Teilbaum schiebt sich unter einen
 * Nachbarn, so wie es von Hand gezeichnete Pläne auch halten.
 *
 * Alle Maße in mm, Ursprung oben links.
 */

import type { Linienart } from "../modell/typen";

export interface LKnoten {
  id: string;
  /** Kasten des Knotens samt Beschriftung. */
  b: number;
  h: number;
  /** x des Ankers (Mitte des Zeichens) im Kasten. */
  ax: number;
  /** y, an dem die Linie von oben endet. */
  oben: number;
  /** y, an dem die Linie nach unten beginnt. */
  unten: number;
  /** y der Zeichenmitte (seitliche Anbindung, Kamm). */
  mitteY: number;
  /** x der linken/rechten Zeichenkante im Kasten (seitliche Anbindung, Kamm). */
  zLinks: number;
  zRechts: number;
  kinder: LKnoten[];
  seitlich: Array<{ knoten: LKnoten; seite: "links" | "rechts" }>;
  richtung: "horizontal" | "vertikal";
  /** Linienart der Linie von der übergeordneten Stelle zu diesem Knoten. */
  linie: Linienart;
  /** Abstände zu den Kindern. */
  abstandX: number;
  abstandY: number;
  /** Zusätzlicher Versatz nach unten gegenüber den Geschwistern. */
  versatz?: number;
}

export interface LPlatz {
  id: string;
  x: number;
  y: number;
}

export interface LLinie {
  /** Unterstellter oder seitlicher Knoten, zu dem die Linie gehört. */
  nach: string;
  von: string;
  punkte: Array<[number, number]>;
  linie: Linienart;
}

export interface LBlock {
  b: number;
  h: number;
  /** Anker des Wurzelknotens im Block. */
  ax: number;
  /** Lage des Wurzelknotens im Block. */
  wx: number;
  wy: number;
  plaetze: LPlatz[];
  linien: LLinie[];
}

/** Abstand zwischen Knoten und seitlich angehängtem Knoten. */
const SEIT_ABSTAND = 8;
/** Einzug der Kamm-Kinder rechts vom Anker. */
const KAMM_EINZUG = 6;

function verschieben(block: LBlock, dx: number, dy: number): LBlock {
  return {
    ...block,
    ax: block.ax + dx,
    wx: block.wx + dx,
    wy: block.wy + dy,
    plaetze: block.plaetze.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
    linien: block.linien.map((l) => ({ ...l, punkte: l.punkte.map(([x, y]) => [x + dx, y + dy] as [number, number]) })),
  };
}

/** Rahmen (minX, minY, maxX, maxY) über alle Plätze und Linien eines Blocks. */
function rahmen(plaetze: LPlatz[], groesse: Map<string, { b: number; h: number }>, linien: LLinie[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of plaetze) {
    const g = groesse.get(p.id)!;
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x + g.b); y1 = Math.max(y1, p.y + g.h);
  }
  for (const l of linien) for (const [x, y] of l.punkte) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

export function baumLayout(wurzel: LKnoten): { block: LBlock; groessen: Map<string, { b: number; h: number }> } {
  const groessen = new Map<string, { b: number; h: number }>();
  const zeilen: number[] = [];
  zeilenHoehen(wurzel, 0, zeilen);
  const block = layout(wurzel, groessen, zeilen, 0);
  return { block, groessen };
}

/** Höhe eines Knotens samt seitlich angehängter Knoten (ohne deren Kinder). */
function clusterHoehe(k: LKnoten): number {
  let h = k.h;
  for (const s of k.seitlich) h = Math.max(h, k.mitteY - s.knoten.mitteY + s.knoten.h);
  return h;
}

/**
 * Größte Clusterhöhe je Ebene, damit Stellen gleicher Ebene auf einer Höhe
 * stehen (wie in den Vorlagen). Gilt nur, solange die Kinder nebeneinander
 * liegen; unter einem Kamm rechnet jeder Teilbaum für sich.
 */
function zeilenHoehen(k: LKnoten, tiefe: number, zeilen: number[]): void {
  zeilen[tiefe] = Math.max(zeilen[tiefe] ?? 0, clusterHoehe(k));
  if (k.richtung === "horizontal") for (const c of k.kinder) zeilenHoehen(c, tiefe + 1, zeilen);
}

function layout(k: LKnoten, groessen: Map<string, { b: number; h: number }>, zeilen: number[] | undefined, tiefe: number): LBlock {
  groessen.set(k.id, { b: k.b, h: k.h });
  let plaetze: LPlatz[] = [{ id: k.id, x: 0, y: 0 }];
  let linien: LLinie[] = [];

  // 1. Seitlich angehängte Knoten auf Höhe der Zeichenmitte.
  let links = 0; // linke Kante des bisherigen Clusters
  let rechts = k.b;
  for (const s of k.seitlich) {
    const sb = layout(s.knoten, groessen, undefined, 0);
    const dy = k.mitteY - (sb.wy + s.knoten.mitteY);
    if (s.seite === "rechts") {
      // Linke Kante des Seitenblocks (normiert auf 0) an `rechts + Abstand`
      const korr = rechts + SEIT_ABSTAND;
      const fertig = verschieben(sb, korr, dy);
      plaetze = plaetze.concat(fertig.plaetze);
      linien = linien.concat(fertig.linien);
      linien.push({
        von: k.id,
        nach: s.knoten.id,
        punkte: [[k.zRechts, k.mitteY], [fertig.wx + s.knoten.zLinks, k.mitteY]],
        linie: s.knoten.linie,
      });
      rechts = korr + sb.b;
    } else {
      const korr = links - SEIT_ABSTAND - sb.b;
      const fertig = verschieben(sb, korr, dy);
      plaetze = plaetze.concat(fertig.plaetze);
      linien = linien.concat(fertig.linien);
      linien.push({
        von: k.id,
        nach: s.knoten.id,
        punkte: [[fertig.wx + s.knoten.zRechts, k.mitteY], [k.zLinks, k.mitteY]],
        linie: s.knoten.linie,
      });
      links = korr;
    }
  }

  // Unterkante des Clusters (Knoten und Seitenblöcke)
  const clusterUnten = rahmen(plaetze, groessen, linien)[3];

  // 2. Kinder
  if (k.kinder.length > 0) {
    const bloecke = k.kinder.map((c) => layout(c, groessen, k.richtung === "horizontal" ? zeilen : undefined, tiefe + 1));
    if (k.richtung === "vertikal") {
      let y = Math.max(k.h, clusterUnten) + k.abstandY * 0.6;
      const xLinie = k.ax;
      let letzteMitte = k.unten;
      bloecke.forEach((cb, i) => {
        const c = k.kinder[i]!;
        // linke Zeichenkante des Kindes an xLinie + Einzug
        const dx = xLinie + KAMM_EINZUG - (cb.wx + c.zLinks);
        const v = verschieben(cb, dx, y);
        plaetze = plaetze.concat(v.plaetze);
        linien = linien.concat(v.linien);
        const mitte = v.wy + c.mitteY;
        linien.push({ von: k.id, nach: c.id, punkte: [[xLinie, mitte], [v.wx + c.zLinks, mitte]], linie: c.linie });
        letzteMitte = mitte;
        y += cb.h + k.abstandY * 0.5;
      });
      linien.unshift({ von: k.id, nach: k.kinder.at(-1)!.id, punkte: [[xLinie, k.unten], [xLinie, letzteMitte]], linie: "durchgezogen" });
    } else {
      // nebeneinander
      let x = 0;
      const platziert = bloecke.map((cb) => {
        const v = verschieben(cb, x, 0);
        x += cb.b + k.abstandX;
        return v;
      });
      const anker = platziert.map((p) => p.ax);
      const mitte = (anker[0]! + anker.at(-1)!) / 2;
      const zeileY = Math.max(k.h, clusterUnten, zeilen?.[tiefe] ?? 0) + k.abstandY;
      const dx = k.ax - mitte;
      const reihe = platziert.map((p, i) => verschieben(p, dx, zeileY + (k.kinder[i]!.versatz ?? 0)));
      const minOben = Math.min(...reihe.map((r, i) => r.wy - (k.kinder[i]!.versatz ?? 0) + k.kinder[i]!.oben));
      const schieneY = k.unten + (minOben - k.unten) * 0.5;
      for (const r of reihe) {
        plaetze = plaetze.concat(r.plaetze);
        linien = linien.concat(r.linien);
      }
      const ankerX = reihe.map((r) => r.ax);
      const minX = Math.min(k.ax, ...ankerX);
      const maxX = Math.max(k.ax, ...ankerX);
      const alleGleich = k.kinder.every((c) => c.linie === k.kinder[0]!.linie);
      const stammLinie: Linienart = alleGleich ? k.kinder[0]!.linie : "durchgezogen";
      if (reihe.length === 1 && Math.abs(ankerX[0]! - k.ax) < 0.01) {
        linien.push({ von: k.id, nach: k.kinder[0]!.id, punkte: [[k.ax, k.unten], [k.ax, reihe[0]!.wy + k.kinder[0]!.oben]], linie: k.kinder[0]!.linie });
      } else {
        linien.push({ von: k.id, nach: k.kinder[0]!.id, punkte: [[k.ax, k.unten], [k.ax, schieneY]], linie: stammLinie });
        linien.push({ von: k.id, nach: k.kinder[0]!.id, punkte: [[minX, schieneY], [maxX, schieneY]], linie: stammLinie });
        reihe.forEach((r, i) => {
          const c = k.kinder[i]!;
          linien.push({ von: k.id, nach: c.id, punkte: [[r.ax, schieneY], [r.ax, r.wy + c.oben]], linie: c.linie });
        });
      }
    }
  }

  // 3. Normieren: linke obere Ecke auf 0/0
  const [x0, y0, x1, y1] = rahmen(plaetze, groessen, linien);
  const block: LBlock = { b: x1 - x0, h: y1 - y0, ax: k.ax, wx: 0, wy: 0, plaetze, linien };
  return verschieben(block, -x0, -y0);
}

/** Rechtecke (x0, y0, x1, y1) der Kästen und Liniensegmente eines Blocks. */
function belegung(block: LBlock, groessen: Map<string, { b: number; h: number }>): Array<[number, number, number, number]> {
  const r: Array<[number, number, number, number]> = [];
  for (const p of block.plaetze) {
    const g = groessen.get(p.id)!;
    r.push([p.x, p.y, p.x + g.b, p.y + g.h]);
  }
  for (const l of block.linien) {
    for (let i = 1; i < l.punkte.length; i++) {
      const [ax, ay] = l.punkte[i - 1]!, [bx, by] = l.punkte[i]!;
      r.push([Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)]);
    }
  }
  return r;
}

/** Senkrechter Mindestabstand, unter dem zwei Wurzelblöcke als überlappend gelten. */
const WALD_LUFT_Y = 3;

/**
 * Mehrere Wurzeln nebeneinander, so dicht wie möglich: Jeder weitere Baum
 * rückt nach links, bis ein Kasten oder eine Linie auf gleicher Höhe den
 * Abstand unterschreitet. Eine einzelne Stelle neben einem breiten Baum steht
 * so neben dessen Wurzel statt links neben allen Unterstellten.
 */
export function waldLayout(wurzeln: LKnoten[], abstand: number): { block: LBlock; groessen: Map<string, { b: number; h: number }> } {
  const groessen = new Map<string, { b: number; h: number }>();
  let plaetze: LPlatz[] = [];
  let linien: LLinie[] = [];
  let belegt: Array<[number, number, number, number]> = [];
  const zeilen: number[] = [];
  for (const w of wurzeln) zeilenHoehen(w, 0, zeilen);
  for (const w of wurzeln) {
    const roh = layout(w, groessen, zeilen, 0);
    const neu = belegung(roh, groessen);
    let dx = belegt.length ? -Infinity : 0;
    for (const [ax0, ay0, ax1, ay1] of belegt) {
      for (const [bx0, by0, , by1] of neu) {
        if (ay0 < by1 + WALD_LUFT_Y && by0 < ay1 + WALD_LUFT_Y) dx = Math.max(dx, ax1 + abstand - bx0);
      }
    }
    if (!Number.isFinite(dx)) dx = Math.max(...belegt.map((r) => r[2])) + abstand;
    const b = verschieben(roh, dx, 0);
    plaetze = plaetze.concat(b.plaetze);
    linien = linien.concat(b.linien);
    belegt = belegt.concat(neu.map(([x0, y0, x1, y1]) => [x0 + dx, y0, x1 + dx, y1] as [number, number, number, number]));
  }
  const [x0, y0, x1, y1] = rahmen(plaetze, groessen, linien);
  const block = verschieben({ b: x1 - x0, h: y1 - y0, ax: 0, wx: 0, wy: 0, plaetze, linien }, -x0, -y0);
  return { block: { ...block, ax: 0, wx: 0, wy: 0 }, groessen };
}
