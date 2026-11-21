/**
 * Allgemeines Baum-Layout für Organigramme in der Art der Vorlagen:
 * Elternknoten mittig über seinen Kindern, Kinder nebeneinander an einer
 * gemeinsamen Sammelschiene (orthogonal), wahlweise untereinander als Kamm,
 * dazu seitlich angehängte Knoten auf Höhe des Elternknotens (Gegenstab,
 * FZ FK neben ÜL, LtS neben E); mehrere auf derselben Seite untereinander.
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
/** Senkrechter Abstand zwischen mehreren seitlich angehängten Knoten einer Seite. */
const SEIT_STAPEL = 6;
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
  for (const seite of ["rechts", "links"] as const) {
    const eintraege = k.seitlich.filter((s) => s.seite === seite).map((s) => s.knoten);
    if (eintraege.length === 0) continue;
    let unten = k.mitteY - eintraege[0]!.mitteY;
    for (const s of eintraege) unten += s.h + SEIT_STAPEL;
    h = Math.max(h, unten - SEIT_STAPEL);
  }
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

  // 1. Seitlich angehängte Knoten. Der erste je Seite steht auf Höhe der
  //    Zeichenmitte, weitere darunter in einer Spalte (Zeichen mittig
  //    übereinander), angebunden über eine senkrechte Schiene. Die
  //    Sammelschiene zu den Kindern liegt unter so einer Spalte, damit sie
  //    nicht durch deren Beschriftung läuft.
  let seitUnten = -Infinity;
  for (const seite of ["rechts", "links"] as const) {
    const eintraege = k.seitlich.filter((s) => s.seite === seite).map((s) => s.knoten);
    if (eintraege.length === 0) continue;
    const bloecke = eintraege.map((s) => layout(s, groessen, undefined, 0));
    const spalteX = seite === "rechts"
      ? k.b + SEIT_ABSTAND + Math.max(...bloecke.map((b) => b.ax))
      : -SEIT_ABSTAND - Math.max(...bloecke.map((b) => b.b - b.ax));
    let y = k.mitteY - (bloecke[0]!.wy + eintraege[0]!.mitteY);
    const fertig = bloecke.map((sb) => {
      const v = verschieben(sb, spalteX - sb.ax, y);
      y += sb.h + SEIT_STAPEL;
      return v;
    });
    fertig.forEach((f) => {
      if (eintraege.length > 1) seitUnten = Math.max(seitUnten, f.wy + f.h);
      plaetze = plaetze.concat(f.plaetze);
      linien = linien.concat(f.linien);
    });
    const kante = seite === "rechts" ? k.zRechts : k.zLinks;
    const zeichenKante = (i: number): number => fertig[i]!.wx + (seite === "rechts" ? eintraege[i]!.zLinks : eintraege[i]!.zRechts);
    const waagerecht = (x0: number, x1: number, yy: number): Array<[number, number]> =>
      seite === "rechts" ? [[x0, yy], [x1, yy]] : [[x1, yy], [x0, yy]];
    if (eintraege.length === 1) {
      linien.push({ von: k.id, nach: eintraege[0]!.id, punkte: waagerecht(kante, zeichenKante(0), k.mitteY), linie: eintraege[0]!.linie });
    } else {
      const schieneX = seite === "rechts" ? k.b + SEIT_ABSTAND / 2 : -SEIT_ABSTAND / 2;
      const alleGleich = eintraege.every((s) => s.linie === eintraege[0]!.linie);
      const stamm: Linienart = alleGleich ? eintraege[0]!.linie : "durchgezogen";
      const mitten = fertig.map((f, i) => f.wy + eintraege[i]!.mitteY);
      linien.push({ von: k.id, nach: eintraege[0]!.id, punkte: waagerecht(kante, schieneX, k.mitteY), linie: stamm });
      linien.push({ von: k.id, nach: eintraege[0]!.id, punkte: [[schieneX, k.mitteY], [schieneX, mitten.at(-1)!]], linie: stamm });
      eintraege.forEach((s, i) => {
        linien.push({ von: k.id, nach: s.id, punkte: waagerecht(schieneX, zeichenKante(i), mitten[i]!), linie: s.linie });
      });
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
      const schieneOben = Math.max(k.unten, seitUnten);
      const schieneY = schieneOben + (minOben - schieneOben) * 0.5;
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

/** Mehrere Wurzeln nebeneinander. */
export function waldLayout(wurzeln: LKnoten[], abstand: number): { block: LBlock; groessen: Map<string, { b: number; h: number }> } {
  const groessen = new Map<string, { b: number; h: number }>();
  let x = 0;
  let plaetze: LPlatz[] = [];
  let linien: LLinie[] = [];
  let h = 0;
  const zeilen: number[] = [];
  for (const w of wurzeln) zeilenHoehen(w, 0, zeilen);
  for (const w of wurzeln) {
    const b = verschieben(layout(w, groessen, zeilen, 0), x, 0);
    plaetze = plaetze.concat(b.plaetze);
    linien = linien.concat(b.linien);
    x += b.b + abstand;
    h = Math.max(h, b.h);
  }
  return { block: { b: Math.max(0, x - abstand), h, ax: 0, wx: 0, wy: 0, plaetze, linien }, groessen };
}
