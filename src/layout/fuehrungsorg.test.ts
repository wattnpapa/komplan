import { describe, expect, it } from "vitest";
import { neueFuehrungsorgAnsicht, neuerPlan, neueStelle, stelleAnlegen } from "../modell/plan";
import type { Plan, Stelle } from "../modell/typen";
import type { Szene } from "../szene/typen";
import { szeneZuSvg } from "../ausgabe/svg";
import { fuehrungsorgSzene } from "./fuehrungsorg";

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
});
