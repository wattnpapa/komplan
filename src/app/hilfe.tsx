import type { ZeichenRef } from "../modell/typen";

/**
 * Kurze Kontext-Hilfen mit Fundstelle. Bewusst knapp und in eigenen Worten,
 * keine Vorschriftentexte.
 */
export const HILFE = {
  fuehrungsorganisation: "Führungsorganisation: Aufbau und Unterstellungsverhältnisse, also wer wen führt (THW DV 1-100 Kap. 3, DV 1-101 Kap. 3.2).",
  kommunikationsplan: "Kommunikationsplan: formalisierte Darstellung der Kommunikationsmöglichkeiten (FwDV 800, Begriffsbestimmungen; THW Fb Fü 76).",
  kommunikationsskizze: "Kommunikationsskizze: freihändige, nicht formalisierte Zeichnung der Kommunikationsmöglichkeiten (FwDV 800; THW Fb Fü 77).",
};

const ABKUERZUNGEN: Record<string, string> = {
  EAL: "Einsatzabschnittsleitung: führt einen räumlich oder sachlich abgegrenzten Einsatzabschnitt (DV 1-101 Kap. 3.4.3).",
  UEAL: "Unterabschnittsleitung: weitere Gliederungsebene unterhalb eines Einsatzabschnitts (DV 1-101 Kap. 3.4.3).",
  TEL: "Technische Einsatzleitung: Führungsebene bei Großschadenereignissen und im Katastrophenfall (vgl. DV 1-101 Kap. 3.4.4).",
  EL: "Einsatzleitung bzw. Einsatzleiter (DV 1-101 Kap. 3.4.2).",
  ELO: "Einsatzleitung Ort: Führungsstelle vor Ort unterhalb eines Verwaltungsstabs; Aufgaben regelt der jeweilige Einsatzplan.",
  PuMA: "Presse- und Medienarbeit.",
  BW: "Bundeswehr, z. B. Verbindungsstelle im Stab.",
  ÖEL: "Örtliche Einsatzleitung (Bezeichnung nach Landesrecht).",
  KatSL: "Katastrophenschutzleitung (Bezeichnung nach Landesrecht).",
  LuK: "Leitung und Koordinierung, z. B. Ortsverband oder Regionalstelle des THW.",
  LtS: "Leitstelle: rückwärtige Führungseinrichtung (DV 1-101 Kap. 3.4.2).",
  HK: "Havariekommando: gemeinsame Einrichtung von Bund und Küstenländern für komplexe Schadenslagen auf See.",
  "FZ-FK": "Fachzug Führung und Kommunikation des THW.",
};

export function Hilfe({ zeichen }: { zeichen?: ZeichenRef }) {
  const kurz = zeichen?.quelle === "katalog" ? zeichen.schluessel.split("/").pop()!.replace(/^Zugtrupp_/, "") : zeichen?.quelle === "eigen" ? zeichen.text ?? zeichen.vorlage.toUpperCase() : undefined;
  const text = kurz ? ABKUERZUNGEN[kurz] ?? ABKUERZUNGEN[kurz.toUpperCase()] : undefined;
  if (!text) return null;
  return <p className="hinweis hilfe">ⓘ {text}</p>;
}
