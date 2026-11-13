/**
 * Kommunikationsplan nach FwDV 800 Anlage 1 (Muster), A4 quer, aus demselben
 * Datenmodell: Fokus-Stelle → „Führungsstab/Führungsgruppe" mit ihrem
 * Leiter als „Einsatzleiter/EA-Leiter", Unterstellte → Kästen „EA/UA"
 * (fünf je Blatt) an einer Sammelschiene, Rufgruppen als Sechsecke.
 * Maße an der Abbildung der Anlage abgenommen.
 */

import { elternVon } from "../modell/baum";
import { zeitpunktLesbar } from "../modell/dtg";
import type { Funkangabe, KomplanAnsicht, Plan, Stelle } from "../modell/typen";
import { einpassen } from "../szene/kopfleiste";
import type { Element, Herkunft, Szene } from "../szene/typen";
import { textBreite } from "../szene/text";
import { formularFokus, funkWert, stelleKurz, verschieben, wert } from "./fbfue76";

const B = 297, H = 210;
const L = 0.3;
const ZH = 4.2; // Zeilenhöhe in den Kästen
const S = 8;

function box(x: number, y: number, b: number, h: number): Element {
  return { art: "rechteck", x, y, b, h, fuellung: "#ffffff", strich: "#000", staerke: L };
}

function zeile(x: number, y: number, b: number, label: string, w: string, fett = false, herkunft?: Herkunft): Element[] {
  const aus: Element[] = [{ art: "text", x, y, text: label, groesse: S, fett, anker: "start", herkunft }];
  if (w) {
    const lx = x + textBreite(label, S, fett) + 1.2;
    aus.push({ art: "text", x: lx, y, text: einpassen(w, S, x + b - lx), groesse: S, anker: "start", herkunft });
  }
  return aus;
}

const linie = (x1: number, y1: number, x2: number, y2: number, art: "durchgezogen" | "gepunktet" | "gestrichelt" = "durchgezogen", staerke = L): Element => ({
  art: "linie", punkte: [[x1, y1], [x2, y2]], strich: "#000", staerke, linie: art,
});

/** Strich-Punkt-Linie der Anlage: als kurze Striche und Punkte gezeichnet (auch im PDF). */
function strichPunkt(x1: number, y1: number, x2: number, y2: number): Element[] {
  const aus: Element[] = [];
  const laenge = Math.hypot(x2 - x1, y2 - y1);
  const dx = (x2 - x1) / laenge, dy = (y2 - y1) / laenge;
  for (let t = 0; t < laenge; t += 4) {
    const e = Math.min(t + 2.2, laenge);
    aus.push(linie(x1 + dx * t, y1 + dy * t, x1 + dx * e, y1 + dy * e, "durchgezogen", 0.25));
    if (t + 3 < laenge) aus.push({ art: "kreis", x: x1 + dx * (t + 3), y: y1 + dy * (t + 3), r: 0.15, fuellung: "#000" });
  }
  return aus;
}

/** Sechseck „Rufgruppe" mit Text. */
function sechseck(mx: number, my: number, text: string, herkunft?: Herkunft): Element[] {
  const b = Math.max(26, textBreite(text, S) + 10), h = 10, t = 3;
  return [
    { art: "vieleck", punkte: [[mx - b / 2, my], [mx - b / 2 + t, my - h / 2], [mx + b / 2 - t, my - h / 2], [mx + b / 2, my], [mx + b / 2 - t, my + h / 2], [mx - b / 2 + t, my + h / 2]], fuellung: "#ffffff", strich: "#000", staerke: L, herkunft },
    { art: "text", x: mx, y: my + 1.1, text, groesse: S, anker: "middle", herkunft },
  ];
}

const rufgruppen = (s: Stelle | undefined) => (s?.funk.filter((f: Funkangabe) => f.richtung === "unten" || f.richtung === "beide") ?? []).map(funkWert).filter(Boolean).join(" / ");

function eaKasten(s: Stelle | undefined, x: number, y: number, b: number, h: number): Element[] {
  const hk: Herkunft | undefined = s ? { stelle: s.id, rolle: "kontakt" } : undefined;
  const aus: Element[] = [box(x, y, b, h)];
  let z = y + ZH - 0.8;
  const add = (label: string, w = "", fett = false) => {
    aus.push(...zeile(x + 1.3, z, b - 2.6, label, w, fett, hk));
    z += ZH;
  };
  add("EA/UA:", stelleKurz(s), true);
  aus.push(linie(x, y + ZH + 0.2, x + b, y + ZH + 0.2));
  add("Leiter:", s?.leiter?.name ?? "");
  aus.push(linie(x + 1, z - ZH + 1, x + b - 1, z - ZH + 1, "gepunktet", 0.2));
  add("Rufname:", s?.leiter?.funkrufname ?? "");
  add("Telefon:", s?.leiter?.kontakte.find((k) => k.art === "telefon")?.wert ?? "");
  add("Mobiltel.:", s?.leiter?.kontakte.find((k) => k.art === "mobil")?.wert ?? "");
  add("...");
  aus.push(linie(x + 1, z - ZH + 1, x + b - 1, z - ZH + 1, "gepunktet", 0.2));
  add("Führungsgruppe:", s?.bezeichnung && s.bezeichnung !== stelleKurz(s) ? s.bezeichnung : "");
  add("Rufname:", s?.funkrufname ?? "");
  add("Telefon:", wert(s, "telefon"));
  add("Fax:", wert(s, "fax"));
  add("Mobiltel.:", wert(s, "mobil"));
  add("E-Mail:", wert(s, "email"));
  z += ZH * 0.6;
  add("...");
  return aus;
}

export function fwdv800Szene(plan: Plan, ansicht: KomplanAnsicht): Szene {
  const fokusId = formularFokus(plan, ansicht);
  const f = fokusId ? plan.stellen[fokusId] : undefined;
  const hf: Herkunft | undefined = f ? { stelle: f.id, rolle: "knoten" } : undefined;
  const kinder = (f?.kinder ?? []).filter((k) => plan.stellen[k]).map((k) => plan.stellen[k]!);
  const proSeite = 5;
  const seitenZahl = Math.max(1, Math.ceil(kinder.length / proSeite));
  const eltern = fokusId ? elternVon(plan, fokusId) : null;
  const nachbarn = [...new Set([...(ansicht.nachbarn ?? []), ...(eltern ? plan.stellen[eltern]!.kinder.filter((k) => k !== fokusId) : [])])]
    .map((id) => plan.stellen[id]).filter((s): s is Stelle => !!s).map(stelleKurz).join(", ");
  const sonstige = plan.loseStellen.map((id) => plan.stellen[id]).filter((s): s is Stelle => !!s).map(stelleKurz).join(", ");

  const elemente: Element[] = [];
  const seiten: Array<{ y: number; h: number }> = [];
  for (let seite = 0; seite < seitenZahl; seite++) {
    const oy = seite * (H + 10);
    seiten.push({ y: oy, h: H });
    const e: Element[] = [];
    e.push({ art: "text", x: B / 2, y: 22, text: "Kommunikationsunterlagen", groesse: 13, fett: true, anker: "middle" });
    e.push({ art: "text", x: B / 2, y: 28, text: seitenZahl > 1 ? `Kommunikationsplan (Blatt ${seite + 1} von ${seitenZahl})` : "Kommunikationsplan", groesse: 13, fett: true, anker: "middle" });

    // Dienststelle / Sachbearbeiter / Stand
    const zh = 5.4;
    e.push(box(12.5, 44, 64.5, zh * 5));
    for (let i = 1; i < 5; i++) e.push(linie(12.5, 44 + i * zh, 77, 44 + i * zh));
    e.push(...zeile(13.8, 44 + zh - 1.4, 62, "Dienststelle:", ""));
    if (plan.kopf.fuehrungsstelle) e.push({ art: "text", x: 13.8, y: 44 + 2 * zh - 1.4, text: einpassen(plan.kopf.fuehrungsstelle, S, 62), groesse: S, anker: "start" });
    e.push(...zeile(13.8, 44 + 3 * zh - 1.4, 62, "Sachbearbeiter:", ""));
    const sb = plan.kopf.sachbearbeiter ?? plan.kopf.fdr;
    if (sb) e.push({ art: "text", x: 13.8, y: 44 + 4 * zh - 1.4, text: einpassen(sb, S, 62), groesse: S, anker: "start" });
    e.push(...zeile(13.8, 44 + 5 * zh - 1.4, 62, "Stand (Datum/Uhrzeit):", zeitpunktLesbar(plan.stand.zeitpunkt)));

    // Einsatzleiter
    e.push(box(87.6, 44, 36.7, 27));
    e.push(...zeile(89, 50, 34, "Einsatzleiter/", "", true));
    e.push(...zeile(89, 54.2, 34, "EA-Leiter:", "", true));
    e.push(...zeile(89, 58.4, 34, "Name:", f?.leiter?.name ?? "", false, hf));
    e.push(...zeile(89, 62.6, 34, "Rufname:", f?.leiter?.funkrufname ?? "", false, hf));
    e.push(linie(124.3, 57, 131.6, 57));

    // Führungsstab / Führungsgruppe
    const fx = 131.6, fb = 83.4;
    e.push(box(fx, 44, fb, 27));
    for (let i = 1; i < 5; i++) e.push(linie(fx, 44 + i * zh, fx + fb, 44 + i * zh));
    e.push(linie(fx + 36.4, 44 + 2 * zh, fx + 36.4, 71));
    e.push(...zeile(fx + 1.3, 44 + zh - 1.4, fb - 2.6, "Führungsstab/Führungsgruppe:", "", true));
    if (f) e.push({ art: "text", x: fx + 1.3, y: 44 + 2 * zh - 1.4, text: einpassen(f.bezeichnung || stelleKurz(f), S, fb - 3), groesse: S, anker: "start", herkunft: hf });
    e.push(...zeile(fx + 1.3, 44 + 3 * zh - 1.4, 34, "Rufname:", f?.funkrufname ?? "", false, hf));
    e.push(...zeile(fx + 37.7, 44 + 3 * zh - 1.4, fb - 39, "Fax:", wert(f, "fax"), false, hf));
    e.push(...zeile(fx + 1.3, 44 + 4 * zh - 1.4, 34, "Telefon:", wert(f, "telefon"), false, hf));
    e.push(...zeile(fx + 37.7, 44 + 4 * zh - 1.4, fb - 39, "Mobiltel.:", wert(f, "mobil"), false, hf));
    e.push(...zeile(fx + 1.3, 44 + 5 * zh - 1.4, fb - 3, "E-Mail:", wert(f, "email"), false, hf));

    // Benachbarte Kräfte / Sonstige Stellen / Kennwort
    e.push(...strichPunkt(fx + fb, 51.5, 225.3, 51.5));
    e.push(box(225.3, 44, 57, zh * 3));
    for (let i = 1; i < 3; i++) e.push(linie(225.3, 44 + i * zh, 282.3, 44 + i * zh));
    e.push(...zeile(226.6, 44 + zh - 1.4, 54, "Benachbarte Kräfte:", ""));
    if (nachbarn) e.push({ art: "text", x: 226.6, y: 44 + 2 * zh - 1.4, text: einpassen(nachbarn, S, 54), groesse: S, anker: "start" });
    e.push(...zeile(226.6, 44 + 3 * zh - 1.4, 54, "Sonstige Stellen:", sonstige));
    e.push(box(225.3, 65.4, 57, zh));
    e.push(...zeile(226.6, 65.4 + zh - 1.4, 54, "Kennwort:", plan.kopf.kennwort ?? ""));

    // Stamm, Rufgruppe, Sammelschiene
    const mx = fx + fb / 2;
    const busY = 81;
    const spalten = [12.5, 68, 123.7, 178.2, 232.8];
    const eb = 51;
    const teil = kinder.slice(seite * proSeite, (seite + 1) * proSeite);
    e.push(linie(mx, 71, mx, busY));
    const mitten = spalten.map((x) => x + eb / 2);
    e.push(linie(mitten[0]!, busY, mitten[4]!, busY));
    e.push(linie(mitten[4]!, busY, B - 10, busY, "gepunktet", 0.4));
    e.push(...sechseck(mx, busY, rufgruppen(f) || "Rufgruppe", hf));
    for (let i = 0; i < proSeite; i++) {
      const s = teil[i];
      const x = spalten[i]!;
      e.push(linie(mitten[i]!, busY, mitten[i]!, 92));
      e.push(...eaKasten(s, x, 92, eb, 60.5));
      e.push(linie(mitten[i]!, 152.5, mitten[i]!, 158.5));
      e.push(...sechseck(mitten[i]!, 163.5, rufgruppen(s) || "Rufgruppen", s ? { stelle: s.id, rolle: "kontakt" } : undefined));
      e.push(...strichPunkt(mitten[i]!, 168.5, mitten[i]!, 178));
    }
    elemente.push(...e.map((x) => verschieben(x, 0, oy)));
  }
  return { breite: B, hoehe: seitenZahl * (H + 10) - 10, elemente, seiten };
}
