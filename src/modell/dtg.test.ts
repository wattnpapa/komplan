import { describe, expect, it } from "vitest";
import { dtgAusZeitpunkt, dtgNormieren, jetzt, zeitpunktAusDtg, zeitpunktLesbar } from "./dtg";

describe("DTG", () => {
  it("liest die Schreibweisen aus den Vorlagen", () => {
    expect(zeitpunktAusDtg("172027oct15")).toBe("2015-10-17T20:27");
    expect(zeitpunktAusDtg("010730JUN16")).toBe("2016-06-01T07:30");
    expect(zeitpunktAusDtg("17 2027 NOV 26")).toBe("2026-11-17T20:27");
  });

  it("nimmt deutsche Monatskürzel und vierstellige Jahre", () => {
    expect(zeitpunktAusDtg("051200OKT26")).toBe("2026-10-05T12:00");
    expect(zeitpunktAusDtg("241800dez2026")).toBe("2026-12-24T18:00");
    expect(zeitpunktAusDtg("010000MÄR27")).toBe("2027-03-01T00:00");
    expect(zeitpunktAusDtg("150900MAI27")).toBe("2027-05-15T09:00");
  });

  it("lehnt Unsinn ab", () => {
    expect(zeitpunktAusDtg("312400JAN26")).toBeUndefined();
    expect(zeitpunktAusDtg("301200FEB26")).toBeUndefined();
    expect(zeitpunktAusDtg("291200FEB24")).toBe("2024-02-29T12:00");
    expect(zeitpunktAusDtg("101260JAN26")).toBeUndefined();
    expect(zeitpunktAusDtg("101200XYZ26")).toBeUndefined();
    expect(zeitpunktAusDtg("")).toBeUndefined();
  });

  it("schreibt groß oder klein", () => {
    expect(dtgAusZeitpunkt("2026-11-17T20:27")).toBe("172027NOV26");
    expect(dtgAusZeitpunkt("2015-10-17T20:27", "klein")).toBe("172027oct15");
    expect(dtgNormieren("172027oct15")).toBe("172027OCT15");
    expect(dtgNormieren("kaputt")).toBeUndefined();
  });

  it("jetzt und lesbar", () => {
    expect(jetzt(new Date(2026, 10, 13, 8, 5, 59))).toBe("2026-11-13T08:05");
    expect(zeitpunktLesbar("2026-11-13T08:05")).toBe("13.11.2026 08:05");
  });
});
