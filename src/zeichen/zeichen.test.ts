import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EIGENE_VORLAGEN, passendeGroesse } from "./eigen/vorlagen";
import { KATALOG, katalogEinspielen, svgIdsPraefixen, zeichenSvg } from "./katalog";
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

  it("liefert SVG nach dem Einspielen", () => {
    const daten = JSON.parse(readFileSync(new URL("./katalog/Führungsstellen.json", import.meta.url), "utf8"));
    katalogEinspielen(daten);
    const svg = zeichenSvg({ quelle: "katalog", schluessel: "Führungsstellen/EAL" });
    expect(svg).toContain(">EAL</text>");
    expect(svg).toContain('viewBox="0 0 256 256"');
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
