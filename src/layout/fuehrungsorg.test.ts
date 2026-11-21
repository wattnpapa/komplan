import { describe, expect, it } from "vitest";
import { neueFuehrungsorgAnsicht, neueKomplanAnsicht, neuerPlan, neueStelle, stelleAnlegen } from "../modell/plan";
import type { Plan, Stelle } from "../modell/typen";
import type { Szene } from "../szene/typen";
import { szeneZuSvg } from "../ausgabe/svg";
import { fuehrungsorgSzene } from "./fuehrungsorg";
import { textBreite } from "../szene/text";

const eal = (t: Partial<Stelle> = {}) => neueStelle({ zeichen: { quelle: "katalog", schluessel: "Führungsstellen/EAL" }, ...t });

function einsatzstruktur(): { plan: Plan; tel: string; eas: string[] } {
  const plan = neuerPlan({ zeit: "2026-11-13T10:00" });
  const tel = stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "katalog", schluessel: "Führungsstellen/TEL" } }));
  const eas = ["Nord", "Mitte", "Süd", "Hafen"].map((ort, i) => stelleAnlegen(plan, eal({ nummer: String(i + 1), beschriftung: ort }), { unter: tel }));
  for (let i = 0; i < 3; i++) stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "katalog", schluessel: "Führungsstellen/UEAL" }, beschriftung: `UEAL ${i}` }), { unter: eas[2]! });
  return { plan, tel, eas };
}

/** Rahmen je Stelle aus den Zeichen-Elementen der Szene. */
function zeichenRahmen(szene: Szene): Map<string, { x: number; y: number; g: number }> {
  const m = new Map<string, { x: number; y: number; g: number }>();
  for (const e of szene.elemente) if (e.art === "zeichen" && e.herkunft?.stelle) m.set(e.herkunft.stelle, { x: e.x, y: e.y, g: e.groesse });
  return m;
}

describe("Führungsorganisation", () => {
  it("setzt den Elternknoten mittig über die Kinder", () => {
    const { plan, tel, eas } = einsatzstruktur();
    const ansicht = Object.values(plan.ansichten)[0]! as ReturnType<typeof neueFuehrungsorgAnsicht>;
    const r = zeichenRahmen(fuehrungsorgSzene(plan, ansicht));
    const mitte = (id: string) => r.get(id)!.x + r.get(id)!.g / 2;
    expect(mitte(tel)).toBeCloseTo((mitte(eas[0]!) + mitte(eas[3]!)) / 2, 5);
    // Kinder auf einer Höhe, unter dem Elternknoten
    const ys = eas.map((e) => r.get(e)!.y);
    expect(new Set(ys.map((y) => y.toFixed(3))).size).toBe(1);
    expect(ys[0]!).toBeGreaterThan(r.get(tel)!.y + 10);
  });

  it("lässt Linien vor dem Zeichen und über den Stärkepunkten enden", () => {
    const { plan, tel, eas } = einsatzstruktur();
    const szene = fuehrungsorgSzene(plan, neueFuehrungsorgAnsicht());
    const r = zeichenRahmen(szene);
    const linien = szene.elemente.filter((e) => e.art === "linie" && e.herkunft?.rolle === "unterstellung");
    for (const id of eas) {
      const z = r.get(id)!;
      const ende = Math.max(...linien.filter((l) => l.art === "linie" && l.herkunft?.stelle === id).flatMap((l) => (l.art === "linie" ? l.punkte.map(([, y]) => y) : [])));
      // Stärkepunkte beginnen bei 34/256 der Zeichengröße, die Form bei 64/256
      expect(ende).toBeLessThan(z.y + z.g * (34 / 256));
      expect(ende).toBeGreaterThan(z.y);
    }
    // Stamm beginnt unterhalb der Zeichenform des Elternknotens, nicht an der Kante
    const tz = r.get(tel)!;
    const anfang = Math.min(...linien.flatMap((l) => (l.art === "linie" ? l.punkte.filter(([x]) => Math.abs(x - (tz.x + tz.g / 2)) < 0.01).map(([, y]) => y) : [])));
    expect(anfang).toBeGreaterThan(tz.y + tz.g * (192 / 256));
  });

  it("überlappt keine Zeichen", () => {
    const { plan } = einsatzstruktur();
    const ansicht = neueFuehrungsorgAnsicht();
    const kaesten = [...zeichenRahmen(fuehrungsorgSzene(plan, ansicht)).values()];
    for (let i = 0; i < kaesten.length; i++) for (let j = i + 1; j < kaesten.length; j++) {
      const a = kaesten[i]!, b = kaesten[j]!;
      const ueber = a.x < b.x + b.g && b.x < a.x + a.g && a.y < b.y + b.g && b.y < a.y + a.g;
      expect(ueber).toBe(false);
    }
  });

  it("legt seitlich angehängte Stellen auf gleiche Höhe", () => {
    const plan = neuerPlan();
    const stab = stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "eigen", vorlage: "stab" } }));
    const gegen = stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "eigen", vorlage: "gegenstab" }, anbindung: { lage: "seitlich-rechts", linie: "gestrichelt" } }), { unter: stab });
    const elo = stelleAnlegen(plan, eal(), { unter: stab });
    const szene = fuehrungsorgSzene(plan, neueFuehrungsorgAnsicht());
    const r = zeichenRahmen(szene);
    expect(r.get(gegen)!.y).toBeCloseTo(r.get(stab)!.y, 5);
    expect(r.get(gegen)!.x).toBeGreaterThan(r.get(stab)!.x + 18);
    expect(r.get(elo)!.y).toBeGreaterThan(r.get(stab)!.y);
    const gestrichelt = szene.elemente.filter((e) => e.art === "linie" && e.linie === "gestrichelt");
    expect(gestrichelt).toHaveLength(1);
  });

  it("stellt mehrere seitlich angehängte Stellen einer Seite untereinander", () => {
    const plan = neuerPlan();
    const fuest = stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "eigen", vorlage: "stab" } }));
    const rechts = { lage: "seitlich-rechts", linie: "durchgezogen" } as const;
    const a = stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "eigen", vorlage: "log-thw" }, anbindung: rechts }), { unter: fuest });
    const b = stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "eigen", vorlage: "log-thw" }, anbindung: rechts }), { unter: fuest });
    const kind = stelleAnlegen(plan, eal(), { unter: fuest });
    const r = zeichenRahmen(fuehrungsorgSzene(plan, neueFuehrungsorgAnsicht()));
    expect(r.get(a)!.y).toBeCloseTo(r.get(fuest)!.y, 5);
    expect(r.get(b)!.x).toBeCloseTo(r.get(a)!.x, 5);
    expect(r.get(b)!.y).toBeGreaterThan(r.get(a)!.y + r.get(a)!.g);
    expect(r.get(kind)!.y).toBeGreaterThan(r.get(b)!.y + r.get(b)!.g);
  });

  it("stapelt Kinder untereinander, wenn vertikal gewählt", () => {
    const plan = neuerPlan();
    const log = stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "eigen", vorlage: "log-thw" }, layout: { kinder: "vertikal" } }));
    const kinder = ["log-v", "log-m", "log-vg"].map((v) => stelleAnlegen(plan, neueStelle({ zeichen: { quelle: "eigen", vorlage: v } }), { unter: log }));
    const r = zeichenRahmen(fuehrungsorgSzene(plan, neueFuehrungsorgAnsicht()));
    const xs = kinder.map((k) => r.get(k)!.x);
    expect(new Set(xs.map((x) => x.toFixed(3))).size).toBe(1);
    expect(r.get(kinder[1]!)!.y).toBeGreaterThan(r.get(kinder[0]!)!.y);
  });

  it("klappt ein und zählt verborgene Stellen", () => {
    const { plan, eas } = einsatzstruktur();
    const ansicht = neueFuehrungsorgAnsicht({ knoten: { [eas[2]!]: { eingeklappt: true } } });
    const szene = fuehrungsorgSzene(plan, ansicht);
    expect(zeichenRahmen(szene).size).toBe(5);
    expect(szene.elemente.some((e) => e.art === "text" && e.text === "+3")).toBe(true);
  });

  it("ist deterministisch und erzeugt gültiges SVG", () => {
    const { plan } = einsatzstruktur();
    const ansicht = neueFuehrungsorgAnsicht();
    const a = szeneZuSvg(fuehrungsorgSzene(plan, ansicht));
    const b = szeneZuSvg(fuehrungsorgSzene(plan, ansicht));
    expect(a).toBe(b);
    expect(a).toMatch(/^<svg [^>]*viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(a).toContain(">Süd</text>");
  });

  it("Kontaktblock rückt unter die Linie zu einer seitlich angehängten Stelle", () => {
    const plan = neuerPlan({ zeit: "2026-11-13T10:00" });
    const funk = (rg: string) => [{ id: rg, art: "digital" as const, betrieb: "TMO" as const, rufgruppe: rg, richtung: "unten" as const }];
    const a = stelleAnlegen(plan, eal({ beschriftung: "Musterstadt", funkrufname: "Heros Musterstadt 1", funk: funk("T_MUSTER-1") }));
    stelleAnlegen(plan, eal({ beschriftung: "Nord", funkrufname: "Heros Musterstadt 10", funk: funk("T_MUSTER-2"), anbindung: { lage: "seitlich-rechts", linie: "gestrichelt" } }), { unter: a });
    for (const lage of ["rechts", "links"] as const) {
      const ansicht = neueKomplanAnsicht({ kontaktLage: lage });
      const szene = fuehrungsorgSzene(plan, ansicht);
      const waagerecht = szene.elemente.filter((e): e is Extract<typeof e, { art: "linie" }> => e.art === "linie" && e.herkunft?.rolle === "unterstellung" && e.punkte.length === 2 && Math.abs(e.punkte[0]![1] - e.punkte[1]![1]) < 1e-6);
      expect(waagerecht.length).toBeGreaterThan(0);
      for (const l of waagerecht) {
        const [x0, x1] = [Math.min(l.punkte[0]![0], l.punkte[1]![0]), Math.max(l.punkte[0]![0], l.punkte[1]![0])];
        const ly = l.punkte[0]![1];
        for (const t of szene.elemente) {
          if (t.art !== "text" || t.herkunft?.rolle !== "kontakt") continue;
          const breite = textBreite(t.text, t.groesse, !!t.fett);
          const tx0 = t.anker === "end" ? t.x - breite : t.anker === "middle" ? t.x - breite / 2 : t.x;
          if (tx0 + breite < x0 || tx0 > x1) continue;
          // Text liegt ganz unter oder ganz über der Linie
          const oben = t.y - t.groesse * 0.3528 * 0.75;
          expect(oben > ly || t.y + 0.5 < ly, `${lage}: „${t.text}" kreuzt die Linie bei y=${ly.toFixed(1)}`).toBe(true);
        }
      }
    }
  });
  it("Kontaktblock rückt unter eine freie Verbindung (Regionalstelle gestrichelt zur Führungsstelle)", () => {
    const plan = neuerPlan({ zeit: "2026-11-13T10:00" });
    const funk = (rg: string) => [{ id: rg, art: "digital" as const, betrieb: "TMO" as const, rufgruppe: rg, richtung: "unten" as const }];
    const luk = stelleAnlegen(plan, eal({ beschriftung: "Musterdorf", funkrufname: "Heros Musterdorf 85", funk: funk("T_MUSTER-1") }));
    const fst = stelleAnlegen(plan, eal({ beschriftung: "Nordwest", funkrufname: "Heros Nordwest 10", funk: funk("T_MUSTER-2") }));
    for (let i = 0; i < 3; i++) stelleAnlegen(plan, eal({ beschriftung: `TZ ${i}`, funk: funk(`T_MUSTER-${i + 3}`) }), { unter: fst });
    plan.verbindungen = { v: { id: "v", von: luk, nach: fst, art: "zusammenarbeit", linie: "gestrichelt" } };
    for (const lage of ["rechts", "links"] as const) {
      const szene = fuehrungsorgSzene(plan, neueKomplanAnsicht({ kontaktLage: lage }));
      const v = szene.elemente.find((e): e is Extract<typeof e, { art: "linie" }> => e.art === "linie" && e.herkunft?.rolle === "verbindung")!;
      expect(v).toBeDefined();
      for (let i = 1; i < v.punkte.length; i++) {
        const [[ax, ay], [bx, by]] = [v.punkte[i - 1]!, v.punkte[i]!];
        if (Math.abs(ay - by) > 1e-6) continue;
        const [x0, x1] = [Math.min(ax, bx), Math.max(ax, bx)];
        for (const t of szene.elemente) {
          if (t.art !== "text" || t.herkunft?.rolle !== "kontakt") continue;
          const breite = textBreite(t.text, t.groesse, !!t.fett);
          const tx0 = t.anker === "end" ? t.x - breite : t.anker === "middle" ? t.x - breite / 2 : t.x;
          if (tx0 + breite < x0 || tx0 > x1) continue;
          const oben = t.y - t.groesse * 0.3528 * 0.75;
          expect(oben > ay || t.y + 0.5 < ay, `${lage}: „${t.text}" kreuzt die Verbindung bei y=${ay.toFixed(1)}`).toBe(true);
        }
      }
    }
  });
});
