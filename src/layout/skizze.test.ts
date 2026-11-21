import { describe, expect, it } from "vitest";
import { neuerPlan, neueStelle, stelleAnlegen, stelleLoeschen } from "../modell/plan";
import { elementAnlegen, elementeKopieren, elementeLoeschen, neueSkizzenAnsicht, skizzeAusStelle, skizzeAusVorlage, SKIZZEN_VORLAGEN } from "../modell/skizze";
import type { Plan, SkizzenAnsicht } from "../modell/typen";
import { planPruefen } from "../modell/validierung";
import type { Element } from "../szene/typen";
import { naechsterPort, route } from "./route";
import { textBreite } from "../szene/text";
import { skizzeSzene } from "./skizze";

const texte = (e: Element[]) => e.filter((x): x is Extract<Element, { art: "text" }> => x.art === "text").map((x) => x.text);
const rechtwinklig = (w: Array<[number, number]>) => w.every((p, i) => i === 0 || Math.abs(p[0] - w[i - 1]![0]) < 1e-6 || Math.abs(p[1] - w[i - 1]![1]) < 1e-6);

describe("Routing", () => {
  it("führt Verbinder rechtwinklig mit Stich aus der Seite", () => {
    const w = route({ p: [10, 10], seite: "r" }, { p: [50, 30], seite: "l" });
    expect(rechtwinklig(w)).toBe(true);
    expect(w[0]).toEqual([10, 10]);
    expect(w.at(-1)).toEqual([50, 30]);
    expect(w[1]![0]).toBeGreaterThan(10);
  });
  it("nutzt Knickpunkte und bleibt rechtwinklig", () => {
    const w = route({ p: [0, 0], seite: "u" }, { p: [40, 40], seite: "o" }, [{ x: 20, y: 20 }]);
    expect(rechtwinklig(w)).toBe(true);
    // Der Knickpunkt liegt auf dem Weg (kann auf einer Geraden liegen und wird dann zusammengefasst)
    const aufWeg = w.some((p, i) => i > 0 && Math.min(p[0], w[i - 1]![0]) <= 20 && Math.max(p[0], w[i - 1]![0]) >= 20 && Math.min(p[1], w[i - 1]![1]) <= 20 && Math.max(p[1], w[i - 1]![1]) >= 20);
    expect(aufWeg).toBe(true);
  });
  it("findet die nächste Seite beim Andocken", () => {
    expect(naechsterPort({ x: 0, y: 0, b: 20, h: 10 }, 19.5, 5)).toEqual({ seite: "r", versatz: 0.5 });
    expect(naechsterPort({ x: 0, y: 0, b: 20, h: 10 }, 5, -1).seite).toBe("o");
  });
});

function beispiel(): { plan: Plan; eal: string; ea: string[] } {
  const plan = neuerPlan({ zeit: "2026-11-13T10:00" });
  const el = stelleAnlegen(plan, neueStelle({ beschriftung: "EL", funkrufname: "Florian Muster 1" }));
  const eal = stelleAnlegen(plan, neueStelle({
    beschriftung: "EAL 3", funkrufname: "Heros Muster 10",
    kontakte: [{ id: "t", art: "telefon", wert: "0999 4080" }, { id: "f", art: "fax", wert: "0999 2904" }],
    funk: [{ id: "k", art: "analog", band: "4m", kanal: "501", betriebsart: "G/U", richtung: "unten" }],
  }), { unter: el });
  const ea = [1, 2, 3].map((i) => stelleAnlegen(plan, neueStelle({ beschriftung: `UEAL ${i}`, funkrufname: `Heros Muster ${i}1/10` }), { unter: eal }));
  return { plan, eal, ea };
}

describe("Kommunikationsskizze", () => {
  it("erzeugt aus einer Stelle: übergeordnete links, Unterstellte rechts, Kontakte als Anschlüsse", () => {
    const { plan, eal, ea } = beispiel();
    const a = skizzeAusStelle(plan, eal);
    const stellenKaesten = Object.values(a.elemente).filter((e) => e.art === "stelle");
    expect(stellenKaesten).toHaveLength(5);
    const lage = (id: string) => stellenKaesten.find((e) => e.art === "stelle" && e.stelle === id)!;
    const eigen = lage(eal);
    expect(lage(ea[0]!).x).toBeGreaterThan(eigen.x + eigen.b);
    const anschluesse = Object.values(a.elemente).filter((e) => e.art === "anschluss");
    expect(anschluesse.map((e) => e.art === "anschluss" && e.bezug?.eintrag)).toEqual(["t", "f"]);
    const t = texte(skizzeSzene(plan, a).elemente);
    expect(t).toContain("0999 4080");
    expect(t).toContain("Heros Muster 10");
    expect(t).toContain("501 G/U");
  });

  it("bleibt verknüpft: Telefonnummer im Plan ändern ändert die Skizze", () => {
    const { plan, eal } = beispiel();
    const a = skizzeAusStelle(plan, eal);
    plan.stellen[eal]!.kontakte[0]!.wert = "0999 1111";
    expect(texte(skizzeSzene(plan, a).elemente)).toContain("0999 1111");
  });

  it("ordnet ab fünf Unterstellten unten an einer Sammelschiene an", () => {
    const { plan, eal } = beispiel();
    for (let i = 4; i <= 6; i++) stelleAnlegen(plan, neueStelle({ beschriftung: `UEAL ${i}` }), { unter: eal });
    const a = skizzeAusStelle(plan, eal);
    expect(Object.values(a.elemente).filter((e) => e.art === "zeichen")).toHaveLength(6);
  });

  it("bricht lange Rufnamen unter Zeichen um, nebeneinander überlagert sich nichts", () => {
    const { plan, eal } = beispiel();
    for (const ort of ["Musterstadt-Nord", "Musterhausen", "Beispieldorf", "Quackenmusterbrück"]) {
      stelleAnlegen(plan, neueStelle({ beschriftung: ort, funkrufname: `Heros ${ort} 21/10` }), { unter: eal });
    }
    const a = skizzeAusStelle(plan, eal);
    const unter = skizzeSzene(plan, a).elemente.filter((e): e is Extract<typeof e, { art: "text" }> => e.art === "text" && e.anker === "middle" && e.groesse === 7.5);
    const zeilen = new Map<number, Array<[number, number]>>();
    for (const t of unter) {
      const b = textBreite(t.text, t.groesse, t.fett);
      const y = Math.round(t.y * 10);
      zeilen.set(y, [...(zeilen.get(y) ?? []), [t.x - b / 2, t.x + b / 2]]);
    }
    for (const spannen of zeilen.values()) {
      spannen.sort((p, q) => p[0] - q[0]);
      for (let i = 1; i < spannen.length; i++) expect(spannen[i]![0]).toBeGreaterThanOrEqual(spannen[i - 1]![1]);
    }
    expect(unter.map((t) => t.text)).toContain("21/10");
  });

  it("taktisch blendet Geräte, NSt-Tabelle und Draht aus, technisch zeigt sie", () => {
    const plan = neuerPlan();
    const a = skizzeAusVorlage(plan, "skizze-1");
    const technisch = texte(skizzeSzene(plan, a).elemente);
    expect(technisch).toContain("Teilnehmer");
    expect(technisch).toContain("Mobilfunkadapter");
    const taktisch = texte(skizzeSzene(plan, { ...a, detail: "taktisch" }).elemente);
    expect(taktisch).not.toContain("Teilnehmer");
    expect(taktisch).not.toContain("Mobilfunkadapter");
    expect(taktisch).toContain("Kommunikationsskizze 1");
  });

  it("alle Vorlagen sind gültig und zeichenbar", () => {
    for (const v of SKIZZEN_VORLAGEN) {
      const plan = neuerPlan();
      const a = skizzeAusVorlage(plan, v.id);
      plan.ansichten[a.id] = a;
      expect(planPruefen(plan).filter((h) => h.stufe === "fehler"), v.id).toEqual([]);
      expect(skizzeSzene(plan, a).elemente.length).toBeGreaterThan(5);
    }
  });

  it("löschen, kopieren und aufräumen beim Löschen einer Stelle", () => {
    const { plan, eal } = beispiel();
    const a = skizzeAusStelle(plan, eal);
    plan.ansichten[a.id] = a;
    const anschluss = Object.values(a.elemente).find((e) => e.art === "anschluss")!;
    const kasten = Object.values(a.elemente).find((e) => e.art === "stelle" && e.stelle === eal)!;
    // Kopieren nimmt Verbinder zwischen kopierten Elementen mit
    const verb = Object.values(a.elemente).find((e) => e.art === "verbinder" && "element" in e.von && e.von.element === anschluss.id)!;
    const vorher = Object.keys(a.elemente).length;
    const neu = elementeKopieren(a, [anschluss, kasten, verb], 5, 5);
    expect(neu).toHaveLength(3);
    expect(Object.keys(a.elemente).length).toBe(vorher + 3);
    elementeLoeschen(a, neu.slice(0, 1));
    expect(Object.keys(a.elemente).length).toBe(vorher + 1); // Verbinder fiel mit weg
    // Stelle löschen: Kasten weg, Anschluss behält den Wert als Text
    stelleLoeschen(plan, eal, true);
    const a2 = plan.ansichten[a.id] as SkizzenAnsicht;
    expect(Object.values(a2.elemente).some((e) => e.art === "stelle" && e.stelle === eal)).toBe(false);
    const rest = a2.elemente[anschluss.id];
    expect(rest?.art === "anschluss" && rest.text).toBe("0999 4080");
    expect(planPruefen(plan).filter((h) => h.regel === "skizze-verwaist")).toEqual([]);
  });

  it("meldet unverbundene Elemente als Hinweis", () => {
    const plan = neuerPlan();
    const a = neueSkizzenAnsicht();
    elementAnlegen(a, { art: "geraet", geraet: "4m", x: 10, y: 40, b: 8, h: 7.5 });
    plan.ansichten[a.id] = a;
    expect(planPruefen(plan).map((h) => h.regel)).toContain("skizze-unverbunden");
  });
});
