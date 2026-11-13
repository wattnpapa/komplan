import { describe, expect, it } from "vitest";
import { neuerPlan } from "../modell/plan";
import { dateiname } from "./export";

describe("Dateiname", () => {
  it("ist ASCII und behält den Inhalt lesbar", () => {
    const p = neuerPlan({ name: "Einsatzübung Simbach (Ausbildung) – Größe/Maß", zeit: "2026-11-13T10:00" });
    expect(dateiname(p, "pptx", "Fb Fü 76")).toBe("Einsatzuebung_Simbach_Ausbildung_Groesse_Mass_Fb_Fue_76_131000NOV26.pptx");
    expect(dateiname({ ...p, name: "///" }, "svg")).toBe("131000NOV26.svg");
  });
});
