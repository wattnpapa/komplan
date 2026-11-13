/**
 * Startvorlagen beim Anlegen eines Plans. Alle Namen, Orte und Nummern sind
 * erfunden (Musterstadt, 0999 …, example.org). Weitere Vorlagen (Fb Fü 76,
 * Fb Fü 77, FwDV 800) kommen mit den jeweiligen Ansichten dazu.
 */

import { neueFuehrungsorgAnsicht, neuerPlan, neueStelle, stelleAnlegen } from "./plan";
import { neueId } from "./id";
import type { Id, Plan, Stelle, ZeichenRef } from "./typen";

const kat = (schluessel: string): ZeichenRef => ({ quelle: "katalog", schluessel });
const eigen = (vorlage: string, text?: string): ZeichenRef => ({ quelle: "eigen", vorlage, ...(text !== undefined ? { text } : {}) });

export interface Vorlage {
  id: string;
  titel: string;
  beschreibung: string;
  gruppe: "Leer" | "Führungsorganisation" | "Beispiele";
  erzeugen: (zeit?: string) => Plan;
}

function mit(plan: Plan, f: (an: (s: Partial<Stelle>, unter?: Id) => Id) => void): Plan {
  f((s, unter) => stelleAnlegen(plan, neueStelle(s), unter ? { unter } : { wurzel: true }));
  return plan;
}

function ansicht(plan: Plan) {
  const a = plan.ansichten[plan.ansichtReihenfolge[0]!]!;
  if (a.typ === "skizze") throw new Error("unerwartet");
  return a;
}

export const VORLAGEN: Vorlage[] = [
  {
    id: "leer",
    titel: "Leer",
    beschreibung: "Leerer Plan mit einer Führungsorganisation.",
    gruppe: "Leer",
    erzeugen: (zeit) => neuerPlan({ name: "Neuer Plan", zeit }),
  },
  {
    id: "dv1101-gruppe",
    titel: "Einsatz einer Gruppe (DV 1-101)",
    beschreibung: "Einsatzleiter mit Leitstelle und Melder, darunter die Gruppe.",
    gruppe: "Führungsorganisation",
    erzeugen: (zeit) => dv1101(zeit, "Einsatz einer Gruppe", 2, kat("Einheiten/Gruppe"), eigen("melder")),
  },
  {
    id: "dv1101-zug",
    titel: "Einsatz eines Zuges (DV 1-101)",
    beschreibung: "Einsatzleiter mit Leitstelle und Zugtrupp, darunter der Zug.",
    gruppe: "Führungsorganisation",
    erzeugen: (zeit) => dv1101(zeit, "Einsatz eines Zuges", 3, kat("Einheiten/Zug"), kat("Einheiten/Führungstrupp")),
  },
  {
    id: "dv1101-verband",
    titel: "Einsatz eines Verbandes (DV 1-101)",
    beschreibung: "Einsatzleiter mit Leitstelle und Führungsstaffel, darunter die Züge.",
    gruppe: "Führungsorganisation",
    erzeugen: (zeit) => dv1101(zeit, "Einsatz eines Verbandes", 4, kat("Einheiten/Zug"), kat("Einheiten/Führungsstaffel")),
  },
  {
    id: "dv1101-abschnitte",
    titel: "Einsatz mit Einsatzabschnitten (DV 1-101)",
    beschreibung: "Einsatzleitung mit drei Einsatzabschnitten, der dritte geplant.",
    gruppe: "Führungsorganisation",
    erzeugen: (zeit) => {
      const plan = neuerPlan({ name: "Einsatz mit Einsatzabschnitten", zeit });
      let el = "", lts = "", fue = "";
      mit(plan, (an) => {
        el = an({ zeichen: eigen("raute-el"), beschriftung: "Einsatzleiter" , beschriftungPosition: "rechts" });
        lts = an({ zeichen: eigen("lts-weiss") }, el);
        fue = an({ zeichen: kat("Einheiten/Führungsgruppe"), beschriftung: "Führungsgruppe" }, el);
        for (let i = 1; i <= 3; i++) {
          an({ zeichen: eigen("raute-eal"), nummer: String(i), anbindung: { lage: "unten", linie: i === 3 ? "gestrichelt" : "durchgezogen" } }, el);
        }
      });
      // LtS und Führungsgruppe in die Mitte der Einsatzleitung, EAL eine Ebene tiefer
      const s = plan.stellen[el]!;
      s.kinder = [lts, ...s.kinder.filter((k) => k !== lts && k !== fue), fue];
      ansicht(plan).hervorhebungen.push({ id: neueId(), stellen: [el, lts, fue], stil: "flaeche", farbe: "#e3e3e3", linie: "gestrichelt", text: "Einsatzleitung" });
      return plan;
    },
  },
  {
    id: "thw-einsatzstruktur",
    titel: "THW-Einsatzstruktur mit Unterabschnitten",
    beschreibung: "TEL, vier Einsatzabschnitte mit Ortsnamen, ein Abschnitt mit sechs UEAL hervorgehoben, nummerierte Pfeile.",
    gruppe: "Beispiele",
    erzeugen: (zeit) => {
      const plan = neuerPlan({ name: "Planspiel Musterfluss", zeit });
      const ueal: Id[] = [];
      let ea3 = "";
      mit(plan, (an) => {
        const tel = an({ zeichen: kat("Führungsstellen/TEL") });
        ["Nordufer", "Mühlenbach", "Insel", "Südhafen"].forEach((ort, i) => {
          const id = an({ zeichen: i === 2 ? eigen("eal-thw") : kat("Führungsstellen/EAL"), nummer: String(i + 1), beschriftung: ort.toUpperCase() }, tel);
          if (i === 2) ea3 = id;
        });
        for (const ort of ["Insel", "Bauhof", "Schöpfwerk", "Deichweg", "Versorgung", "Sand & Sack"]) {
          ueal.push(an({ zeichen: eigen("ueal-thw"), beschriftung: ort.toUpperCase() }, ea3));
        }
      });
      const a = ansicht(plan);
      a.hervorhebungen.push({ id: neueId(), stellen: [ea3], stil: "flaeche", farbe: "#1e6bff", linie: "durchgezogen" });
      a.hervorhebungen.push({ id: neueId(), stellen: ueal, stil: "flaeche", farbe: "#38c8f5", linie: "durchgezogen" });
      a.kopfleiste = false;
      return plan;
    },
  },
  {
    id: "schadstoffunfall",
    titel: "Schadstoffunfall an der Küste (fiktiv)",
    beschreibung: "Havariekommando, Lenkungsgruppe, drei Verwaltungsstäbe mit ELO und Einsatzabschnitten, Gegenstab seitlich.",
    gruppe: "Beispiele",
    erzeugen: (zeit) => {
      const plan = neuerPlan({ name: "Schadstoffunfall Musterküste", zeit, organisation: "verwaltung" });
      mit(plan, (an) => {
        const hk = an({ zeichen: eigen("hk"), bezeichnung: "Havariekommando" });
        const lg = an({ zeichen: eigen("stab", "LG"), beschriftung: "Lenkungsgruppe", beschriftungPosition: "rechts", betriebDurch: "THW FK Musterstadt" }, hk);
        const staebe: Array<[string, string, string[]]> = [
          ["LK", "Musterkreis", ["Musterinsel", "Beispieloog", "Hafen Nord"]],
          ["LK", "Beispielkreis", ["Deichsiel", "Sandbank"]],
          ["Stadt", "Musterstadt", ["Groden", "Altersiel", "1. Einfahrt"]],
        ];
        staebe.forEach(([text, name, eas], i) => {
          const stab = an({ zeichen: eigen("stab", text), beschriftung: name, beschriftungPosition: "rechts", bezeichnung: `${text === "LK" ? "Landkreis" : "Stadt"} ${name}, Einsatzstab` }, lg);
          if (i === 0) {
            an({ zeichen: eigen("gegenstab", text), beschriftung: "Gegenstab", zusatzzeilen: ["wird gestellt durch LK"], anbindung: { lage: "seitlich-rechts", linie: "gestrichelt" } }, stab);
          }
          const elo = an({ zeichen: eigen("elo"), beschriftung: name, beschriftungPosition: "rechts" }, stab);
          for (const ea of eas) an({ zeichen: kat("Führungsstellen/EAL"), beschriftung: "Heros", zusatzzeilen: [`${ea} 10`] }, elo);
        });
      });
      return plan;
    },
  },
  {
    id: "logistik",
    titel: "Logistik in der Führungsorganisation",
    beschreibung: "EL mit zwei Einsatzabschnitten und Logistikstützpunkt, Versorgungsstellen untereinander.",
    gruppe: "Beispiele",
    erzeugen: (zeit) => {
      const plan = neuerPlan({ name: "Logistik in der Führungsorganisation", zeit });
      mit(plan, (an) => {
        const el = an({ zeichen: kat("Führungsstellen/EL") });
        const ea1 = an({ zeichen: kat("Führungsstellen/EAL"), nummer: "1" }, el);
        an({ zeichen: kat("Führungsstellen/EAL"), nummer: "2" }, el);
        const log = an({ zeichen: eigen("log-thw"), layout: { kinder: "vertikal" } }, el);
        const ueal1 = an({ zeichen: eigen("ueal-thw"), nummer: "1" }, ea1);
        an({ zeichen: eigen("ueal-thw"), nummer: "2" }, ea1);
        for (const [s, t] of [["THW_Einheiten/Technischer_Zug", "TZ-I"], ["THW_Einheiten/Bergungsgruppe", "B 1"], ["THW_Einheiten/FGr_Wasserschaden-Pumpen", "WP"]] as const) {
          an({ zeichen: kat(s), beschriftung: t }, ueal1);
        }
        for (const v of ["log-v", "log-m", "log-vg"]) an({ zeichen: eigen(v) }, log);
      });
      return plan;
    },
  },
];

function dv1101(zeit: string | undefined, name: string, staerkeEl: number, einheit: ZeichenRef, fuehrungshilfe: ZeichenRef): Plan {
  const plan = neuerPlan({ name, zeit });
  let el = "", lts = "", hilfe = "";
  mit(plan, (an) => {
    el = an({ zeichen: { quelle: "eigen", vorlage: "raute-el", staerke: staerkeEl } });
    lts = an({ zeichen: eigen("lts-weiss") }, el);
    an({ zeichen: einheit, stapel: 2 }, el);
    hilfe = an({ zeichen: fuehrungshilfe }, el);
  });
  ansicht(plan).hervorhebungen.push({ id: neueId(), stellen: [el, lts, hilfe], stil: "flaeche", farbe: "#e3e3e3", linie: "gestrichelt", text: "Einsatzleitung" });
  return plan;
}

export function vorlage(id: string): Vorlage | undefined {
  return VORLAGEN.find((v) => v.id === id);
}

// Für Tests: die Ansicht-Fabrik bleibt erreichbar
export { neueFuehrungsorgAnsicht };
