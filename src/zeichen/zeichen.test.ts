import { describe, expect, it } from "vitest";
import { EIGENE_VORLAGEN, passendeGroesse } from "./eigen/vorlagen";
import { KATALOG, kennungMoeglich, ordnerLaden, svgIdsPraefixen, zeichenKennung, zeichenSvg } from "./katalog";
import { SYNONYME, zeichenSuchen } from "./suche";

describe("Katalog", () => {
  it("enthält die Führungsstellen aus der Sammlung", () => {
    const schluessel = new Set(KATALOG.map((k) => k.schluessel));
    for (const s of ["Führungsstellen/EAL", "Führungsstellen/UEAL", "Führungsstellen/TEL", "Führungsstellen/EL", "Führungsstellen/ÖEL", "Führungsstellen/KatSL", "THW_Einheiten/Zugtrupp_FZ-FK"]) {
      expect(schluessel.has(s), s).toBe(true);
    }
  });

  it("Synonym-Tabelle zeigt nur auf vorhandene Zeichen", () => {
    const schluessel = new Set(KATALOG.map((k) => k.schluessel));
    for (const s of Object.keys(SYNONYME)) expect(schluessel.has(s), s).toBe(true);
  });

  it("liefert SVG aus dem Kern-Katalog, sobald der Ordner geladen ist", async () => {
    expect(zeichenSvg({ quelle: "katalog", schluessel: "Führungsstellen/EAL" })).toContain("stroke-dasharray");
    await ordnerLaden("Führungsstellen");
    const svg = zeichenSvg({ quelle: "katalog", schluessel: "Führungsstellen/EAL" });
    expect(svg).toContain(">EAL</text>");
    expect(svg).toContain('viewBox="0 0 256 256"');
  });
});

describe("Kennung (betrieben durch)", () => {
  it("steht unten rechts in der Fahne einer Katalog-Führungsstelle", async () => {
    await ordnerLaden("Führungsstellen");
    const ref = { quelle: "katalog", schluessel: "Führungsstellen/EAL", kennung: "THW" } as const;
    expect(kennungMoeglich(ref)).toBe(true);
    const svg = zeichenSvg(ref);
    expect(svg).toMatch(/text-anchor: end;" fill="#000000" x="236" y="182">THW<\/text><\/svg>$/);
    expect(zeichenSvg({ quelle: "katalog", schluessel: "Führungsstellen/EAL" })).not.toContain("THW");
  });

  it("überschreibt die Vorgabe eigener Vorlagen, leer blendet sie aus", () => {
    expect(zeichenKennung({ quelle: "eigen", vorlage: "eal-thw" })).toBe("THW");
    expect(zeichenSvg({ quelle: "eigen", vorlage: "eal-thw", kennung: "FW" })).toContain(">FW</text>");
    const leer = zeichenSvg({ quelle: "eigen", vorlage: "eal-thw", kennung: "" });
    expect(leer).not.toContain(">THW</text>");
    expect(zeichenSvg({ quelle: "eigen", vorlage: "elo", kennung: "FW" })).toContain(">FW</text>");
  });

  it("nur bei rechteckigen Zeichen", () => {
    expect(kennungMoeglich({ quelle: "frei", grundform: "fuehrungsstelle", text: "EAL", farbe: "#ffff00" })).toBe(true);
    expect(kennungMoeglich({ quelle: "frei", grundform: "raute", text: "LNA", farbe: "#ffff00" })).toBe(false);
    expect(kennungMoeglich({ quelle: "eigen", vorlage: "hk" })).toBe(false);
    expect(zeichenSvg({ quelle: "frei", grundform: "raute", text: "LNA", farbe: "#ffff00", kennung: "RD" })).not.toContain(">RD<");
    expect(zeichenSvg({ quelle: "frei", grundform: "fuehrungsstelle", text: "EAL", farbe: "#ffff00", kennung: "FW" })).toContain(">FW</text>");
  });
});

describe("Suche", () => {
  it("findet über Kurzname und Synonyme", () => {
    expect(zeichenSuchen("EAL")[0]?.ref).toEqual({ quelle: "katalog", schluessel: "Führungsstellen/EAL" });
    expect(zeichenSuchen("UEAL")[0]?.ref).toEqual({ quelle: "katalog", schluessel: "Führungsstellen/UEAL" });
    expect(zeichenSuchen("Zugtrupp THW").map((t) => t.ref)).toContainEqual({ quelle: "katalog", schluessel: "THW_Einheiten/Zugtrupp" });
    expect(zeichenSuchen("Log-V").slice(0, 3).map((t) => t.titel).join(" ")).toMatch(/Verpflegung/);
    expect(zeichenSuchen("fuehrungsstelle").length).toBeGreaterThan(0);
    expect(zeichenSuchen("ELO")[0]?.ref).toEqual({ quelle: "eigen", vorlage: "elo" });
  });

  it("leere Anfrage → nichts", () => {
    expect(zeichenSuchen("  ")).toEqual([]);
  });
});

describe("Eigene Zeichen", () => {
  it("rendern alle als SVG mit Text", () => {
    for (const v of EIGENE_VORLAGEN) {
      const svg = zeichenSvg({ quelle: "eigen", vorlage: v.id });
      expect(svg.startsWith("<svg"), v.id).toBe(true);
      if (v.vorgabe.text) expect(svg).toContain(v.vorgabe.text.replace("&", "&amp;"));
    }
  });

  it("maskiert Text und passt die Größe an", () => {
    const svg = zeichenSvg({ quelle: "frei", grundform: "stab", text: "<LK & Co>", farbe: "#ff6600" });
    expect(svg).toContain("&lt;LK &amp; Co&gt;");
    expect(passendeGroesse("EAL", 210, 56)).toBe(56);
    expect(passendeGroesse("Einsatzabschnitt", 210, 56)).toBeLessThan(25);
  });

  it("präfixt IDs", () => {
    const svg = '<svg><defs><clipPath id="base"><rect/></clipPath></defs><rect clip-path="url(#base)"/></svg>';
    expect(svgIdsPraefixen(svg, "z1")).toBe('<svg><defs><clipPath id="z1-base"><rect/></clipPath></defs><rect clip-path="url(#z1-base)"/></svg>');
  });
});
