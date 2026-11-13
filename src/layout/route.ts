/**
 * Ports und orthogonale Verbinder der Kommunikationsskizze. Ein Port ist eine
 * Seite eines Elements mit relativem Versatz; verschiebt man das Element,
 * wandert der Verbinder mit. Der Weg ist rechtwinklig: kurzer Stich aus der
 * Seite heraus, dann Z- oder L-Form, oder durch festgehaltene Knickpunkte.
 */

import type { Port, Rahmen, SkVerbinder } from "../modell/typen";

export type Punkt = [number, number];
export type Seite = "l" | "r" | "o" | "u";

const STICH = 3;

export function portPunkt(port: Port, rahmen: (id: string) => Rahmen | undefined): { p: Punkt; seite?: Seite } | undefined {
  if ("punkt" in port) return { p: [port.punkt.x, port.punkt.y] };
  const r = rahmen(port.element);
  if (!r) return undefined;
  const v = Math.max(0, Math.min(1, port.versatz));
  switch (port.seite) {
    case "l": return { p: [r.x, r.y + r.h * v], seite: "l" };
    case "r": return { p: [r.x + r.b, r.y + r.h * v], seite: "r" };
    case "o": return { p: [r.x + r.b * v, r.y], seite: "o" };
    case "u": return { p: [r.x + r.b * v, r.y + r.h], seite: "u" };
  }
}

const RICHTUNG: Record<Seite, Punkt> = { l: [-1, 0], r: [1, 0], o: [0, -1], u: [0, 1] };

/** Nächstliegende Seite und Versatz für einen Punkt (beim Andocken). */
export function naechsterPort(r: Rahmen, x: number, y: number): { seite: Seite; versatz: number } {
  const abst: Array<[Seite, number]> = [
    ["l", Math.abs(x - r.x)],
    ["r", Math.abs(x - (r.x + r.b))],
    ["o", Math.abs(y - r.y)],
    ["u", Math.abs(y - (r.y + r.h))],
  ];
  abst.sort((a, b) => a[1] - b[1]);
  const seite = abst[0]![0];
  const versatz = seite === "l" || seite === "r" ? (y - r.y) / Math.max(r.h, 0.01) : (x - r.x) / Math.max(r.b, 0.01);
  // Auf Viertel einrasten: saubere Linien, gleiche Höhen bei Nachbarn
  const gerastert = Math.round(Math.max(0, Math.min(1, versatz)) * 8) / 8;
  return { seite, versatz: gerastert };
}

function vereinfachen(p: Punkt[]): Punkt[] {
  const aus: Punkt[] = [];
  for (const q of p) {
    const letzter = aus.at(-1);
    if (letzter && Math.abs(letzter[0] - q[0]) < 0.01 && Math.abs(letzter[1] - q[1]) < 0.01) continue;
    aus.push(q);
  }
  // kollineare Mittelpunkte entfernen
  for (let i = aus.length - 2; i > 0; i--) {
    const [a, b, c] = [aus[i - 1]!, aus[i]!, aus[i + 1]!];
    if ((Math.abs(a[0] - b[0]) < 0.01 && Math.abs(b[0] - c[0]) < 0.01) || (Math.abs(a[1] - b[1]) < 0.01 && Math.abs(b[1] - c[1]) < 0.01)) aus.splice(i, 1);
  }
  return aus;
}

/** Rechtwinkliger Weg von a nach b. */
export function route(a: { p: Punkt; seite?: Seite }, b: { p: Punkt; seite?: Seite }, wegpunkte: Array<{ x: number; y: number }> = []): Punkt[] {
  const sa = a.seite ? RICHTUNG[a.seite] : undefined;
  const sb = b.seite ? RICHTUNG[b.seite] : undefined;
  const start: Punkt = sa ? [a.p[0] + sa[0] * STICH, a.p[1] + sa[1] * STICH] : a.p;
  const ende: Punkt = sb ? [b.p[0] + sb[0] * STICH, b.p[1] + sb[1] * STICH] : b.p;
  const punkte: Punkt[] = [a.p, start];
  const ziele: Punkt[] = [...wegpunkte.map((w) => [w.x, w.y] as Punkt), ende];
  let aktuell = start;
  let waagerecht = sa ? sa[0] !== 0 : Math.abs(ende[0] - start[0]) >= Math.abs(ende[1] - start[1]);
  ziele.forEach((z, i) => {
    const letztes = i === ziele.length - 1;
    if (Math.abs(z[0] - aktuell[0]) < 0.01 || Math.abs(z[1] - aktuell[1]) < 0.01) {
      punkte.push(z);
    } else if (letztes && wegpunkte.length === 0 && sa && sb && (sa[0] !== 0) === (sb[0] !== 0)) {
      // Z-Form zwischen gleich ausgerichteten Seiten
      if (sa[0] !== 0) {
        const mx = (aktuell[0] + z[0]) / 2;
        punkte.push([mx, aktuell[1]], [mx, z[1]], z);
      } else {
        const my = (aktuell[1] + z[1]) / 2;
        punkte.push([aktuell[0], my], [z[0], my], z);
      }
    } else if (letztes && sb) {
      // L-Form so, dass der letzte Abschnitt in die Zielseite läuft
      const zielWaagerecht = sb[0] !== 0;
      punkte.push(zielWaagerecht ? [aktuell[0], z[1]] : [z[0], aktuell[1]], z);
    } else {
      punkte.push(waagerecht ? [z[0], aktuell[1]] : [aktuell[0], z[1]], z);
    }
    waagerecht = !waagerecht;
    aktuell = z;
  });
  punkte.push(b.p);
  return vereinfachen(punkte);
}

export function verbinderWeg(v: Pick<SkVerbinder, "von" | "nach" | "wegpunkte">, rahmen: (id: string) => Rahmen | undefined): Punkt[] | undefined {
  const a = portPunkt(v.von, rahmen);
  const b = portPunkt(v.nach, rahmen);
  if (!a || !b) return undefined;
  return route(a, b, v.wegpunkte);
}
