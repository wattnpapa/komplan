import { useEffect, useState } from "react";
import type { Draft } from "immer";
import { elementRahmen } from "../layout/skizze";
import { dyBegrenzen, elementeKopieren, elementeLoeschen, FARBE_DRAHT, FARBE_FUNK, FARBE_SCHWARZ } from "../modell/skizze";
import { neueId } from "../modell/id";
import type { Id, Plan, SkAnschluss, SkGeraet, SkizzenAnsicht, SkizzenElement } from "../modell/typen";
import type { Platzierer } from "./skizzen-flaeche";
import { stelleTitel } from "./gliederung";

type Aendern = (rezept: (p: Draft<Plan>) => void, buendel?: string) => void;

const ANSCHLUSS: Array<[SkAnschluss["medium"], string]> = [
  ["funk-analog", "Funk (analog)"], ["funk-digital", "Funk (digital)"], ["telefon", "Telefon"], ["fax", "Fax"], ["mobil", "Mobilfunk"], ["email", "E-Mail"], ["pc", "PC"], ["mobilfunkadapter", "Mobilfunkadapter"], ["sonstig", "Leer"],
];
const GERAETE: Array<[SkGeraet["geraet"], string]> = [["4m", "4 m"], ["2m", "2 m"], ["mobfu", "Mob Fu"], ["handy", "Handy"], ["fax", "Fax"], ["pc", "PC"], ["tel", "Tel"]];

/** Zwischenablage innerhalb der App (Elemente samt Verbindern zwischen ihnen). */
let ablage: SkizzenElement[] = [];

export function SkizzenWerkzeuge({
  plan,
  ansicht,
  aendern,
  auswahl,
  setAuswahl,
  platzierer,
  setPlatzierer,
  verbinderFarbe,
  setVerbinderFarbe,
}: {
  plan: Plan;
  ansicht: SkizzenAnsicht;
  aendern: Aendern;
  auswahl: Id[];
  setAuswahl: (ids: Id[]) => void;
  platzierer?: Platzierer;
  setPlatzierer: React.Dispatch<React.SetStateAction<Platzierer | undefined>>;
  verbinderFarbe: string;
  setVerbinderFarbe: (f: string) => void;
}) {
  const [stelleWahl, setStelleWahl] = useState<Id>(ansicht.fokus ?? Object.keys(plan.stellen)[0] ?? "");
  const [aktiv, setAktiv] = useState<string>();
  const skizze = (p: Draft<Plan>) => p.ansichten[ansicht.id] as Draft<SkizzenAnsicht>;

  useEffect(() => {
    if (!platzierer) setAktiv(undefined);
  }, [platzierer]);

  const werkzeug = (name: string, p: Platzierer) => {
    setAktiv(name);
    setPlatzierer(() => p);
  };

  const rahmenVon = (id: Id) => {
    const e = ansicht.elemente[id];
    return e && e.art !== "verbinder" ? elementRahmen(e, plan, ansicht.detail) : undefined;
  };
  const ohneVerbinder = auswahl.filter((id) => ansicht.elemente[id] && ansicht.elemente[id]!.art !== "verbinder");

  const ausrichten = (art: "links" | "mitte" | "rechts" | "oben" | "mitteV" | "unten") => {
    const r = ohneVerbinder.map((id) => [id, rahmenVon(id)!] as const);
    if (r.length < 2) return;
    const minX = Math.min(...r.map(([, x]) => x.x)), maxX = Math.max(...r.map(([, x]) => x.x + x.b));
    const minY = Math.min(...r.map(([, x]) => x.y)), maxY = Math.max(...r.map(([, x]) => x.y + x.h));
    aendern((p) => {
      const a = skizze(p);
      for (const [id, x] of r) {
        const e = a.elemente[id]!;
        if (art === "links") e.x = minX;
        if (art === "rechts") e.x = maxX - x.b;
        if (art === "mitte") e.x = (minX + maxX) / 2 - x.b / 2;
        if (art === "oben") e.y = minY;
        if (art === "unten") e.y = maxY - x.h;
        if (art === "mitteV") e.y = (minY + maxY) / 2 - x.h / 2;
      }
    });
  };

  const verteilen = (richtung: "x" | "y") => {
    const r = ohneVerbinder.map((id) => [id, rahmenVon(id)!] as const).sort((a, b) => (richtung === "x" ? a[1].x - b[1].x : a[1].y - b[1].y));
    if (r.length < 3) return;
    const erst = r[0]![1], letzt = r.at(-1)![1];
    const summe = r.reduce((n, [, x]) => n + (richtung === "x" ? x.b : x.h), 0);
    const platz = richtung === "x" ? letzt.x + letzt.b - erst.x - summe : letzt.y + letzt.h - erst.y - summe;
    const luecke = platz / (r.length - 1);
    aendern((p) => {
      const a = skizze(p);
      let pos = richtung === "x" ? erst.x : erst.y;
      for (const [id, x] of r) {
        const e = a.elemente[id]!;
        if (richtung === "x") e.x = pos;
        else e.y = pos;
        pos += (richtung === "x" ? x.b : x.h) + luecke;
      }
    });
  };

  const ebene = (wohin: "vorn" | "hinten") =>
    aendern((p) => {
      const a = skizze(p);
      const gew = a.reihenfolge.filter((id) => auswahl.includes(id));
      const rest = a.reihenfolge.filter((id) => !auswahl.includes(id));
      a.reihenfolge = wohin === "vorn" ? [...rest, ...gew] : [...gew, ...rest];
    });

  const gruppieren = (an: boolean) =>
    aendern((p) => {
      const a = skizze(p);
      const g = neueId();
      for (const id of auswahl) {
        const e = a.elemente[id];
        if (!e) continue;
        if (an) e.gruppe = g;
        else delete e.gruppe;
      }
    });

  const kopieren = () => {
    ablage = auswahl.map((id) => ansicht.elemente[id]).filter((e): e is SkizzenElement => !!e).map((e) => structuredClone(e));
  };
  const einfuegen = () => {
    if (!ablage.length) return;
    let neu: Id[] = [];
    aendern((p) => void (neu = elementeKopieren(skizze(p) as SkizzenAnsicht, ablage, 5, 5)));
    ablage = ablage.map((e) => ({ ...e, x: e.x + 5, y: e.y + 5 }));
    setAuswahl(neu);
  };
  const loeschen = () => {
    if (!auswahl.length) return;
    aendern((p) => elementeLoeschen(skizze(p) as SkizzenAnsicht, auswahl));
    setAuswahl([]);
  };
  const stupsen = (dx: number, dyWunsch: number) =>
    aendern((p) => {
      const a = skizze(p);
      const dy = dyBegrenzen(auswahl.map((id) => a.elemente[id]).filter((e) => !!e), dyWunsch);
      for (const id of auswahl) {
        const e = a.elemente[id];
        if (!e) continue;
        e.x += dx;
        e.y += dy;
        if (e.art === "verbinder") e.wegpunkte = e.wegpunkte.map((w) => ({ x: w.x + dx, y: w.y + dy }));
      }
    }, `stups-${auswahl.join()}`);

  // Tastenkürzel der Skizze
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, dialog, [contenteditable], .gliederung")) return;
      const strg = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (strg && k === "a") (e.preventDefault(), setAuswahl(Object.keys(ansicht.elemente)));
      else if (strg && k === "c") (e.preventDefault(), kopieren());
      else if (strg && k === "x") (e.preventDefault(), kopieren(), loeschen());
      else if (strg && k === "v") (e.preventDefault(), einfuegen());
      else if (strg && k === "d") (e.preventDefault(), kopieren(), einfuegen());
      else if (strg && k === "g") (e.preventDefault(), gruppieren(!e.shiftKey));
      else if (strg && e.key === "]") (e.preventDefault(), ebene("vorn"));
      else if (strg && e.key === "[") (e.preventDefault(), ebene("hinten"));
      else if (e.key === "Delete" || e.key === "Backspace") (e.preventDefault(), loeschen());
      else if (e.key === "Escape") setAuswahl([]);
      else if (e.key.startsWith("Arrow") && auswahl.length) {
        e.preventDefault();
        const s = e.shiftKey ? 0.5 : ansicht.raster || 2.5;
        stupsen(e.key === "ArrowLeft" ? -s : e.key === "ArrowRight" ? s : 0, e.key === "ArrowUp" ? -s : e.key === "ArrowDown" ? s : 0);
      }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });

  const stellen = Object.values(plan.stellen).filter((s) => s.typ === "stelle");

  return (
    <div className="skizzen-werkzeuge" role="toolbar" aria-label="Skizzen-Werkzeuge">
      <span className="wz-gruppe">
        <label className="wz-label">
          Stelle
          <select value={stelleWahl} onChange={(e) => setStelleWahl(e.target.value)} aria-label="Stelle für Kasten oder Zeichen">
            {stellen.map((s) => (
              <option key={s.id} value={s.id}>{stelleTitel(s)}</option>
            ))}
          </select>
        </label>
        <button type="button" aria-pressed={aktiv === "stelle"} disabled={!stelleWahl} onClick={() => werkzeug("stelle", () => ({ art: "stelle", stelle: stelleWahl, x: 0, y: 0, b: 62, h: 16 }))} title="Kasten mit Zeichen, Funkrufname, Tel., Fax und Funk">Kasten</button>
        <button type="button" aria-pressed={aktiv === "zeichen"} disabled={!stelleWahl} onClick={() => werkzeug("zeichen", () => ({ art: "zeichen", stelle: stelleWahl, x: 0, y: 0, b: 18, h: 18 }))} title="Taktisches Zeichen mit Rufname darunter">Zeichen</button>
      </span>
      <span className="wz-gruppe">
        <select value="" aria-label="Anschluss einfügen" onChange={(e) => {
          const m = e.target.value as SkAnschluss["medium"];
          if (m) werkzeug(`a-${m}`, () => ({ art: "anschluss", medium: m, spitze: "beide", x: 0, y: 0, b: m === "mobilfunkadapter" ? 30 : 64, h: m === "mobilfunkadapter" ? 7 : 5.2, ...(m === "mobilfunkadapter" ? { form: "kasten" as const } : {}), ...(m.startsWith("funk") ? {} : { technisch: true }) }));
        }}>
          <option value="">Anschluss …</option>
          {ANSCHLUSS.map(([w, t]) => <option key={w} value={w}>{t}</option>)}
        </select>
        <select value="" aria-label="Gerät einfügen" onChange={(e) => {
          const g = e.target.value as SkGeraet["geraet"];
          if (g) werkzeug(`g-${g}`, () => ({ art: "geraet", geraet: g, x: 0, y: 0, b: 8, h: 7.5, technisch: true }));
        }}>
          <option value="">Gerät …</option>
          {GERAETE.map(([w, t]) => <option key={w} value={w}>{t}</option>)}
        </select>
        <button type="button" aria-pressed={aktiv === "nst"} disabled={!stelleWahl} onClick={() => werkzeug("nst", () => ({ art: "nst-tabelle", stelle: stelleWahl, x: 0, y: 0, b: 100, h: 40, spalten: ["anschlussart", "nummer", "teilnehmer"], leerzeilen: 4, gruppen: [{ anschlussart: "C Wähl", zeilen: 2 }], technisch: true }))}>NSt-Tabelle</button>
        <button type="button" aria-pressed={aktiv === "platzhalter"} onClick={() => werkzeug("platzhalter", () => ({ art: "platzhalter", x: 0, y: 0, b: 20, h: 13 }))} title="Gestrichelter Kasten für eine noch nicht belegte Stelle">Platzhalter</button>
        <button type="button" aria-pressed={aktiv === "text"} onClick={() => werkzeug("text", () => ({ art: "text", text: "Text", groesse: 9, x: 0, y: 0, b: 30, h: 5 }))}>Text</button>
        <button type="button" aria-pressed={aktiv === "rahmen"} onClick={() => werkzeug("rahmen", () => ({ art: "rahmen", linie: "gestrichelt", text: "Einheiten auf Marsch", x: 0, y: 0, b: 80, h: 30 }))}>Rahmen</button>
        <button type="button" aria-pressed={aktiv === "knoten"} onClick={() => werkzeug("knoten", () => ({ art: "knotenpunkt", x: 0, y: 0, b: 1.6, h: 1.6 }))} title="Abzweigpunkt; breit gezogen eine Sammelschiene">Abzweig</button>
      </span>
      <span className="wz-gruppe" role="group" aria-label="Farbe neuer Verbinder">
        <span className="wz-label">Verbinder</span>
        {([["", "auto"], [FARBE_FUNK, "rot"], [FARBE_DRAHT, "blau"], [FARBE_SCHWARZ, "schwarz"]] as const).map(([f, t]) => (
          <button key={t} type="button" aria-pressed={verbinderFarbe === f} className="farb-knopf" onClick={() => setVerbinderFarbe(f)} title={t === "auto" ? "Funk rot, sonst schwarz" : t}>
            {f ? <span className="farb-punkt" style={{ background: f }} /> : null}
            {t}
          </button>
        ))}
      </span>
      {(
        <span className="wz-gruppe" role="group" aria-label="Auswahl">
          <button type="button" onClick={() => ausrichten("links")} disabled={ohneVerbinder.length < 2} title="Links ausrichten">⇤</button>
          <button type="button" onClick={() => ausrichten("mitte")} disabled={ohneVerbinder.length < 2} title="Waagerecht mittig">↔</button>
          <button type="button" onClick={() => ausrichten("rechts")} disabled={ohneVerbinder.length < 2} title="Rechts ausrichten">⇥</button>
          <button type="button" onClick={() => ausrichten("oben")} disabled={ohneVerbinder.length < 2} title="Oben ausrichten">⤒</button>
          <button type="button" onClick={() => ausrichten("mitteV")} disabled={ohneVerbinder.length < 2} title="Senkrecht mittig">↕</button>
          <button type="button" onClick={() => ausrichten("unten")} disabled={ohneVerbinder.length < 2} title="Unten ausrichten">⤓</button>
          <button type="button" onClick={() => verteilen("x")} disabled={ohneVerbinder.length < 3} title="Waagerecht verteilen">⋯</button>
          <button type="button" onClick={() => verteilen("y")} disabled={ohneVerbinder.length < 3} title="Senkrecht verteilen">⋮</button>
          <button type="button" onClick={() => gruppieren(true)} disabled={auswahl.length < 2} title="Gruppieren (Strg+G)">Gruppe</button>
          <button type="button" onClick={() => gruppieren(false)} disabled={!auswahl.length} title="Gruppe lösen (Strg+Umschalt+G)">lösen</button>
          <button type="button" onClick={() => ebene("vorn")} disabled={!auswahl.length} title="Nach vorn (Strg+])">vorn</button>
          <button type="button" onClick={() => ebene("hinten")} disabled={!auswahl.length} title="Nach hinten (Strg+[)">hinten</button>
          <button type="button" onClick={loeschen} disabled={!auswahl.length} title="Löschen (Entf)">Löschen</button>
        </span>
      )}
      {platzierer && <span className="wz-hinweis" role="status">Auf die Fläche klicken zum Einfügen (Umschalt: mehrere, Esc: abbrechen)</span>}
    </div>
  );
}
