import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent } from "react";
import type { Draft } from "immer";
import { szeneZuSvg } from "../ausgabe/svg";
import { elementRahmen } from "../layout/skizze";
import { naechsterPort, verbinderWeg, type Punkt } from "../layout/route";
import { dyBegrenzen, elementAnlegen, FARBE_FUNK, FARBE_SCHWARZ, ZEICHENBEREICH_OBEN } from "../modell/skizze";
import type { Id, Plan, Rahmen, SkizzenAnsicht, SkizzenElement } from "../modell/typen";
import type { Szene } from "../szene/typen";

export const PX_JE_MM = 96 / 25.4;

/** Werkzeug zum Platzieren: liefert das Element ohne Lage. */
export type Platzierer = (x: number, y: number) => Parameters<typeof elementAnlegen>[1];

type Griff = "nw" | "n" | "no" | "o" | "so" | "s" | "sw" | "w";
type Modus =
  | { art: "ruhe" }
  | { art: "verschieben"; start: Punkt; lagen: Map<Id, { x: number; y: number; wegpunkte?: Array<{ x: number; y: number }> }>; buendel: string; bewegt: boolean }
  | { art: "groesse"; id: Id; griff: Griff; start: Punkt; r: Rahmen; buendel: string }
  | { art: "gummiband"; start: Punkt; jetzt: Punkt; erweitern: boolean }
  | { art: "verbinden"; von: Id; seite: "l" | "r" | "o" | "u"; versatz: number; jetzt: Punkt }
  | { art: "knick"; id: Id; buendel: string }
  | { art: "schwenken"; x: number; y: number; sl: number; st: number };

const GRIFFE: Griff[] = ["nw", "n", "no", "o", "so", "s", "sw", "w"];

function griffPunkt(r: Rahmen, g: Griff): Punkt {
  const x = g.includes("w") ? r.x : g.includes("o") ? r.x + r.b : r.x + r.b / 2;
  const y = g.startsWith("n") ? r.y : g.startsWith("s") ? r.y + r.h : r.y + r.h / 2;
  return [x, y];
}

/** Alle Elemente einer Gruppe mitnehmen. */
export function mitGruppe(a: SkizzenAnsicht, ids: Id[]): Id[] {
  const gruppen = new Set(ids.map((id) => a.elemente[id]?.gruppe).filter(Boolean) as Id[]);
  if (!gruppen.size) return ids;
  return [...new Set([...ids, ...Object.values(a.elemente).filter((e) => e.gruppe && gruppen.has(e.gruppe)).map((e) => e.id)])];
}

export function SkizzenFlaeche({
  plan,
  ansicht,
  szene,
  aendern,
  auswahl,
  setAuswahl,
  zoom,
  setZoom,
  platzierer,
  setPlatzierer,
  verbinderFarbe,
}: {
  plan: Plan;
  ansicht: SkizzenAnsicht;
  szene: Szene;
  aendern: (rezept: (p: Draft<Plan>) => void, buendel?: string) => void;
  auswahl: Id[];
  setAuswahl: (ids: Id[]) => void;
  zoom: number;
  setZoom: (z: number) => void;
  platzierer?: Platzierer;
  setPlatzierer: React.Dispatch<React.SetStateAction<Platzierer | undefined>>;
  verbinderFarbe: string;
}) {
  const huelle = useRef<HTMLDivElement>(null);
  const [modus, setModus] = useState<Modus>({ art: "ruhe" });
  const [ueber, setUeber] = useState<Id>();
  const skala = PX_JE_MM * zoom;
  const raster = ansicht.raster || 2.5;
  const fang = (v: number) => Math.round(v / raster) * raster;

  const svg = useMemo(() => szeneZuSvg(szene, { mitHerkunft: true, hintergrund: "#ffffff", breite: `${szene.breite * skala}px`, hoehe: `${szene.hoehe * skala}px` }), [szene, skala]);

  const rahmen = useMemo(() => {
    const m = new Map<Id, Rahmen>();
    for (const e of Object.values(ansicht.elemente)) if (e.art !== "verbinder") m.set(e.id, elementRahmen(e, plan, ansicht.detail));
    return m;
  }, [ansicht, plan]);
  const wege = useMemo(() => {
    const m = new Map<Id, Punkt[]>();
    for (const e of Object.values(ansicht.elemente)) {
      if (e.art !== "verbinder") continue;
      const w = verbinderWeg(e, (id) => rahmen.get(id));
      if (w) m.set(e.id, w);
    }
    return m;
  }, [ansicht, rahmen]);

  const mm = (e: { clientX: number; clientY: number }): Punkt => {
    const r = huelle.current!.querySelector(".blatt")!.getBoundingClientRect();
    return [(e.clientX - r.left) / skala, (e.clientY - r.top) / skala];
  };

  const elementUnter = (ziel: EventTarget | null): Id | undefined => {
    const el = (ziel as Element | null)?.closest?.("[data-element]");
    return el?.getAttribute("data-element") ?? undefined;
  };

  const skizze = (p: Draft<Plan>) => p.ansichten[ansicht.id] as Draft<SkizzenAnsicht>;

  const unten = (e: RPointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      const h = huelle.current!;
      setModus({ art: "schwenken", x: e.clientX, y: e.clientY, sl: h.scrollLeft, st: h.scrollTop });
      return;
    }
    if (e.button !== 0) return;
    const ziel = e.target as Element;
    const p = mm(e);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const griff = ziel.getAttribute?.("data-griff") as Griff | null;
    const portVon = ziel.getAttribute?.("data-port");
    const knick = ziel.getAttribute?.("data-knick");
    if (griff && auswahl.length === 1) {
      const r = rahmen.get(auswahl[0]!);
      if (r) setModus({ art: "groesse", id: auswahl[0]!, griff, start: p, r, buendel: `gr-${Date.now()}` });
      return;
    }
    if (portVon) {
      const [id, seite, versatz] = portVon.split(":");
      setModus({ art: "verbinden", von: id!, seite: seite as "l", versatz: Number(versatz), jetzt: p });
      return;
    }
    if (knick) {
      setModus({ art: "knick", id: knick, buendel: `kn-${Date.now()}` });
      return;
    }
    if (platzierer) {
      const neu = { ...platzierer(fang(p[0]), fang(p[1])), x: fang(p[0]), y: Math.max(fang(p[1]), ZEICHENBEREICH_OBEN) };
      let id = "";
      aendern((pl) => void (id = elementAnlegen(skizze(pl) as SkizzenAnsicht, neu)));
      setAuswahl([id]);
      if (!e.shiftKey) setPlatzierer(undefined);
      return;
    }
    const id = elementUnter(e.target);
    if (id) {
      const erweitern = e.shiftKey || e.ctrlKey || e.metaKey;
      let neueAuswahl = auswahl.includes(id) ? (erweitern ? auswahl.filter((x) => x !== id) : auswahl) : erweitern ? [...auswahl, id] : [id];
      neueAuswahl = mitGruppe(ansicht, neueAuswahl);
      setAuswahl(neueAuswahl);
      const lagen = new Map<Id, { x: number; y: number; wegpunkte?: Array<{ x: number; y: number }> }>();
      for (const sid of neueAuswahl) {
        const el = ansicht.elemente[sid];
        if (el) lagen.set(sid, { x: el.x, y: el.y, ...(el.art === "verbinder" ? { wegpunkte: el.wegpunkte } : {}) });
      }
      setModus({ art: "verschieben", start: p, lagen, buendel: `zz-${Date.now()}`, bewegt: false });
      return;
    }
    setModus({ art: "gummiband", start: p, jetzt: p, erweitern: e.shiftKey });
  };

  const bewegen = (e: RPointerEvent) => {
    const p = mm(e);
    switch (modus.art) {
      case "ruhe":
        setUeber(elementUnter(e.target));
        return;
      case "schwenken": {
        const h = huelle.current!;
        h.scrollLeft = modus.sl - (e.clientX - modus.x);
        h.scrollTop = modus.st - (e.clientY - modus.y);
        return;
      }
      case "verschieben": {
        let dx = p[0] - modus.start[0], dy = p[1] - modus.start[1];
        if (!modus.bewegt && Math.hypot(dx, dy) * skala < 3) return;
        const erste = modus.lagen.values().next().value;
        if (erste && !e.altKey) {
          dx = fang(erste.x + dx) - erste.x;
          dy = fang(erste.y + dy) - erste.y;
        }
        dy = dyBegrenzen([...modus.lagen].map(([id, l]) => ({ art: ansicht.elemente[id]?.art ?? "verbinder", y: l.y })), dy);
        aendern((pl) => {
          const a = skizze(pl);
          for (const [id, l] of modus.lagen) {
            const el = a.elemente[id];
            if (!el) continue;
            el.x = l.x + dx;
            el.y = l.y + dy;
            if (el.art === "verbinder" && l.wegpunkte) el.wegpunkte = l.wegpunkte.map((w) => ({ x: w.x + dx, y: w.y + dy }));
          }
        }, modus.buendel);
        if (!modus.bewegt) setModus({ ...modus, bewegt: true });
        return;
      }
      case "groesse": {
        const dx = p[0] - modus.start[0], dy = p[1] - modus.start[1];
        const r = { ...modus.r };
        const g = modus.griff;
        if (g.includes("w")) { r.x = fang(modus.r.x + dx); r.b = modus.r.x + modus.r.b - r.x; }
        if (g.includes("o")) r.b = fang(modus.r.x + modus.r.b + dx) - modus.r.x;
        if (g.startsWith("n")) { r.y = Math.max(fang(modus.r.y + dy), Math.min(modus.r.y, ZEICHENBEREICH_OBEN)); r.h = modus.r.y + modus.r.h - r.y; }
        if (g.startsWith("s")) r.h = fang(modus.r.y + modus.r.h + dy) - modus.r.y;
        if (r.b < 2 || r.h < 2) return;
        aendern((pl) => {
          const el = skizze(pl).elemente[modus.id];
          if (el) Object.assign(el, r);
        }, modus.buendel);
        return;
      }
      case "gummiband":
        setModus({ ...modus, jetzt: p });
        return;
      case "verbinden":
        setModus({ ...modus, jetzt: p });
        setUeber(elementUnter(e.target));
        return;
      case "knick":
        aendern((pl) => {
          const el = skizze(pl).elemente[modus.id];
          if (el?.art === "verbinder") el.wegpunkte = [{ x: fang(p[0]), y: fang(p[1]) }];
        }, modus.buendel);
        return;
    }
  };

  const hoch = (e: RPointerEvent) => {
    const p = mm(e);
    if (modus.art === "gummiband") {
      const x0 = Math.min(modus.start[0], p[0]), x1 = Math.max(modus.start[0], p[0]);
      const y0 = Math.min(modus.start[1], p[1]), y1 = Math.max(modus.start[1], p[1]);
      if ((x1 - x0) * skala < 3 && (y1 - y0) * skala < 3) setAuswahl(modus.erweitern ? auswahl : []);
      else {
        const drin = [...rahmen.entries()].filter(([, r]) => r.x >= x0 && r.y >= y0 && r.x + r.b <= x1 && r.y + r.h <= y1).map(([id]) => id);
        setAuswahl(mitGruppe(ansicht, modus.erweitern ? [...new Set([...auswahl, ...drin])] : drin));
      }
    } else if (modus.art === "verbinden") {
      const ziel = elementUnter(document.elementFromPoint(e.clientX, e.clientY));
      const r = ziel && ziel !== modus.von ? rahmen.get(ziel) : undefined;
      if (ziel && r && ansicht.elemente[ziel]?.art !== "verbinder") {
        const nach = naechsterPort(r, p[0], p[1]);
        const istFunk = [modus.von, ziel].some((id) => {
          const el = ansicht.elemente[id];
          return el?.art === "anschluss" ? String(el.medium).startsWith("funk") : el?.art === "geraet" ? el.geraet === "4m" || el.geraet === "2m" : false;
        });
        let id = "";
        aendern((pl) => {
          id = elementAnlegen(skizze(pl) as SkizzenAnsicht, {
            art: "verbinder",
            x: 0, y: 0, b: 0, h: 0,
            von: { element: modus.von, seite: modus.seite, versatz: modus.versatz },
            nach: { element: ziel, seite: nach.seite, versatz: nach.versatz },
            wegpunkte: [],
            farbe: verbinderFarbe || (istFunk ? FARBE_FUNK : FARBE_SCHWARZ),
            linie: "durchgezogen",
            ...(istFunk ? { medium: "funk-analog" as const } : {}),
          });
        });
        setAuswahl([id]);
      }
    }
    setModus({ art: "ruhe" });
  };

  const rad = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(Math.max(0.25, Math.min(4, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))));
  };

  // Stelle aus der Gliederung auf die Fläche ziehen
  const ablegen = (e: React.DragEvent) => {
    const stelleId = e.dataTransfer.getData("text/plain");
    if (!stelleId || !plan.stellen[stelleId]) return;
    e.preventDefault();
    const [x, y] = mm(e);
    let id = "";
    aendern((pl) => void (id = elementAnlegen(skizze(pl) as SkizzenAnsicht, { art: "stelle", stelle: stelleId, x: fang(x), y: Math.max(fang(y), ZEICHENBEREICH_OBEN), b: 62, h: 16 })));
    setAuswahl([id]);
  };

  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && (setPlatzierer(undefined), setModus({ art: "ruhe" }));
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [setPlatzierer]);

  const gewaehlteRahmen = auswahl.map((id) => [id, rahmen.get(id)] as const).filter((x): x is readonly [Id, Rahmen] => !!x[1]);
  const einzeln = auswahl.length === 1 ? ansicht.elemente[auswahl[0]!] : undefined;
  const portsFuer = [...new Set([...(ueber && ansicht.elemente[ueber]?.art !== "verbinder" ? [ueber] : []), ...(einzeln && einzeln.art !== "verbinder" ? [einzeln.id] : [])])];
  const sw = 1 / skala; // 1 Bildschirmpixel in mm

  return (
    <div
      ref={huelle}
      className={`zeichenflaeche skizzen-flaeche ${platzierer ? "platziert" : ""} ${modus.art === "schwenken" ? "verschiebt" : ""}`}
      onWheel={rad}
      onPointerDown={unten}
      onPointerMove={bewegen}
      onPointerUp={hoch}
      onPointerCancel={() => setModus({ art: "ruhe" })}
      onDragOver={(e) => e.preventDefault()}
      onDrop={ablegen}
      aria-label="Skizzenfläche"
      tabIndex={0}
    >
      <div className="blatt" style={{ width: szene.breite * skala, height: szene.hoehe * skala }}>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <svg className="auswahl-ebene skizzen-ebene" width={szene.breite * skala} height={szene.hoehe * skala} viewBox={`0 0 ${szene.breite} ${szene.hoehe}`}>
          {/* Trefferflächen der Verbinder (dünne Linien sind schwer zu treffen) */}
          {[...wege.entries()].map(([id, w]) => (
            <polyline key={`t${id}`} data-element={id} points={w.map((q) => q.join(",")).join(" ")} className="treffer" strokeWidth={6 * sw} />
          ))}
          {gewaehlteRahmen.map(([id, r]) => (
            <rect key={id} x={r.x - 1} y={r.y - 1} width={r.b + 2} height={r.h + 2} className="auswahl-rahmen" strokeWidth={1.2 * sw} />
          ))}
          {auswahl.map((id) => {
            const w = wege.get(id);
            return w ? <polyline key={`v${id}`} points={w.map((q) => q.join(",")).join(" ")} className="auswahl-verbinder" strokeWidth={3 * sw} /> : null;
          })}
          {einzeln && einzeln.art !== "verbinder" && rahmen.get(einzeln.id) &&
            GRIFFE.map((g) => {
              const [x, y] = griffPunkt(rahmen.get(einzeln.id)!, g);
              return <rect key={g} data-griff={g} x={x - 3 * sw} y={y - 3 * sw} width={6 * sw} height={6 * sw} className={`griff griff-${g}`} strokeWidth={sw} />;
            })}
          {einzeln?.art === "verbinder" && wege.get(einzeln.id) && (() => {
            const w = wege.get(einzeln.id)!;
            const i = Math.floor((w.length - 1) / 2);
            const a = w[i]!, b = w[i + 1] ?? a;
            return <circle data-knick={einzeln.id} cx={(a[0] + b[0]) / 2} cy={(a[1] + b[1]) / 2} r={4 * sw} className="knick" strokeWidth={sw} />;
          })()}
          {modus.art === "ruhe" || modus.art === "verbinden"
            ? portsFuer.map((id) => {
                const r = rahmen.get(id);
                if (!r) return null;
                const ports: Array<[string, number, number]> = [
                  ["l:0.5", r.x, r.y + r.h / 2], ["r:0.5", r.x + r.b, r.y + r.h / 2], ["o:0.5", r.x + r.b / 2, r.y], ["u:0.5", r.x + r.b / 2, r.y + r.h],
                ];
                return ports.map(([k, x, y]) => <circle key={`${id}${k}`} data-port={`${id}:${k.replace(":", ":")}`} cx={x} cy={y} r={3.5 * sw} className="port" strokeWidth={sw} />);
              })
            : null}
          {modus.art === "gummiband" && (
            <rect x={Math.min(modus.start[0], modus.jetzt[0])} y={Math.min(modus.start[1], modus.jetzt[1])} width={Math.abs(modus.jetzt[0] - modus.start[0])} height={Math.abs(modus.jetzt[1] - modus.start[1])} className="gummiband" strokeWidth={sw} />
          )}
          {modus.art === "verbinden" && (() => {
            const r = rahmen.get(modus.von);
            if (!r) return null;
            const start: Punkt = modus.seite === "l" ? [r.x, r.y + r.h / 2] : modus.seite === "r" ? [r.x + r.b, r.y + r.h / 2] : modus.seite === "o" ? [r.x + r.b / 2, r.y] : [r.x + r.b / 2, r.y + r.h];
            return <line x1={start[0]} y1={start[1]} x2={modus.jetzt[0]} y2={modus.jetzt[1]} className="verbinden-vorschau" strokeWidth={1.5 * sw} />;
          })()}
        </svg>
      </div>
    </div>
  );
}
