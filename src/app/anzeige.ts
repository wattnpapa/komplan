/** Anzeigemodi wie in erfassungsbogen/einsatzauftrag: dieselben Token, neu belegt. */

export type Anzeigemodus = "standard" | "feld" | "dunkel" | "nacht";
const SCHLUESSEL = "komplan.anzeigemodus.v1";

export const MODI: Array<{ modus: Anzeigemodus; titel: string; erklaerung: string }> = [
  { modus: "standard", titel: "Standard", erklaerung: "Normale, helle Darstellung." },
  { modus: "feld", titel: "Feld", erklaerung: "Große Tippziele und hoher Kontrast für draußen." },
  { modus: "dunkel", titel: "Dunkel", erklaerung: "Heller Text auf dunklem Grund." },
  { modus: "nacht", titel: "Nacht", erklaerung: "Gedimmte, warme Darstellung für Nachteinsätze." },
];

export function anzeigemodusLesen(): Anzeigemodus {
  try {
    const m = localStorage.getItem(SCHLUESSEL);
    if (m === "feld" || m === "dunkel" || m === "nacht" || m === "standard") return m;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dunkel" : "standard";
  } catch {
    return "standard";
  }
}

export function anzeigemodusSetzen(modus: Anzeigemodus): void {
  const html = document.documentElement;
  html.classList.remove("feld-modus", "dunkel-modus", "nacht-modus");
  if (modus !== "standard") html.classList.add(`${modus}-modus`);
  try {
    localStorage.setItem(SCHLUESSEL, modus);
  } catch {
    /* Privatmodus */
  }
}
