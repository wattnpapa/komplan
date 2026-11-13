import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent } from "react";
import type { Id } from "../modell/typen";
import type { Szene } from "../szene/typen";
import { szeneZuSvg } from "../ausgabe/svg";
import { useLangDruck } from "./lang-druecken";

const PX_JE_MM = 96 / 25.4;

/**
 * Zeichenfläche: zeigt die Szene als SVG, mit Zoom (Strg+Mausrad, Knöpfe),
 * Verschieben (Ziehen auf freier Fläche, Mausrad) und Auswahl per Klick.
 * Ausgewählte Stellen bekommen einen Markierungsrahmen.
 */
export function Zeichenflaeche({
  szene,
  auswahl,
  onAuswahl,
  onKontext,
  zoom,
  setZoom,
}: {
  szene: Szene;
  auswahl: Id[];
  onAuswahl: (id: Id | undefined, erweitern: boolean) => void;
  onKontext?: (id: Id, x: number, y: number) => void;
  zoom: number;
  setZoom: (z: number) => void;
}) {
  const huelle = useRef<HTMLDivElement>(null);
  const [verschiebe, setVerschiebe] = useState<{ x: number; y: number; sl: number; st: number; bewegt: boolean }>();

  const svg = useMemo(() => szeneZuSvg(szene, { mitHerkunft: true, hintergrund: "#ffffff", breite: `${szene.breite * PX_JE_MM * zoom}px`, hoehe: `${szene.hoehe * PX_JE_MM * zoom}px` }), [szene, zoom]);

  // Markierungsrahmen: aus den Zeichen und Beschriftungen der gewählten Stellen
  const rahmen = useMemo(() => {
    const r: Array<{ id: Id; x: number; y: number; b: number; h: number }> = [];
    for (const id of auswahl) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const e of szene.elemente) {
        if (e.herkunft?.stelle !== id) continue;
        if (e.art === "zeichen") {
          x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y + e.groesse * 0.15);
          x1 = Math.max(x1, e.x + e.groesse); y1 = Math.max(y1, e.y + e.groesse * 0.9);
        } else if (e.art === "text" && (e.herkunft.rolle === "beschriftung" || e.herkunft.rolle === "knoten")) {
          const g = (e.groesse * 25.4) / 72;
          const breite = e.text.length * g * 0.55;
          const xa = e.anker === "middle" ? e.x - breite / 2 : e.anker === "end" ? e.x - breite : e.x;
          x0 = Math.min(x0, xa); y0 = Math.min(y0, e.y - g);
          x1 = Math.max(x1, xa + breite); y1 = Math.max(y1, e.y + g * 0.3);
        }
      }
      if (Number.isFinite(x0)) r.push({ id, x: x0 - 1.5, y: y0 - 1.5, b: x1 - x0 + 3, h: y1 - y0 + 3 });
    }
    return r;
  }, [szene, auswahl]);

  // Gewählte Stelle in den sichtbaren Bereich holen
  useEffect(() => {
    const h = huelle.current;
    const r = rahmen[0];
    if (!h || !r) return;
    const x = r.x * PX_JE_MM * zoom, y = r.y * PX_JE_MM * zoom, b = r.b * PX_JE_MM * zoom, hh = r.h * PX_JE_MM * zoom;
    if (x < h.scrollLeft || x + b > h.scrollLeft + h.clientWidth || y < h.scrollTop || y + hh > h.scrollTop + h.clientHeight) {
      h.scrollTo({ left: x - h.clientWidth / 2 + b / 2, top: y - h.clientHeight / 2 + hh / 2, behavior: "smooth" });
    }
    // nur bei Auswahlwechsel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auswahl.join(",")]);

  const stelleUnter = (ziel: EventTarget | null): Id | undefined => {
    const el = (ziel as Element | null)?.closest?.("[data-stelle]");
    return el?.getAttribute("data-stelle") ?? undefined;
  };

  const rad = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const h = huelle.current!;
    const r = h.getBoundingClientRect();
    const mx = e.clientX - r.left + h.scrollLeft, my = e.clientY - r.top + h.scrollTop;
    const neu = Math.max(0.2, Math.min(4, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    setZoom(neu);
    requestAnimationFrame(() => {
      h.scrollLeft = (mx * neu) / zoom - (e.clientX - r.left);
      h.scrollTop = (my * neu) / zoom - (e.clientY - r.top);
    });
  };

  const lang = useLangDruck((ziel, x, y) => {
    const id = stelleUnter(ziel);
    if (!id || !onKontext) return;
    setVerschiebe(undefined);
    onAuswahl(id, false);
    onKontext(id, x, y);
  });

  const unten = (e: RPointerEvent) => {
    lang.unten(e);
    if (e.button !== 0) return;
    const h = huelle.current!;
    setVerschiebe({ x: e.clientX, y: e.clientY, sl: h.scrollLeft, st: h.scrollTop, bewegt: false });
  };
  const bewegen = (e: RPointerEvent) => {
    lang.bewegen(e);
    if (!verschiebe) return;
    const dx = e.clientX - verschiebe.x, dy = e.clientY - verschiebe.y;
    if (!verschiebe.bewegt && Math.hypot(dx, dy) < 4) return;
    if (!verschiebe.bewegt) {
      setVerschiebe({ ...verschiebe, bewegt: true });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
    const h = huelle.current!;
    h.scrollLeft = verschiebe.sl - dx;
    h.scrollTop = verschiebe.st - dy;
  };
  const hoch = (e: RPointerEvent) => {
    lang.abbrechen();
    if (verschiebe && !verschiebe.bewegt) onAuswahl(stelleUnter(e.target), e.ctrlKey || e.metaKey || e.shiftKey);
    setVerschiebe(undefined);
  };

  return (
    <div
      ref={huelle}
      className={`zeichenflaeche ${verschiebe?.bewegt ? "verschiebt" : ""}`}
      onWheel={rad}
      onPointerDown={unten}
      onPointerMove={bewegen}
      onPointerUp={hoch}
      onPointerCancel={() => (lang.abbrechen(), setVerschiebe(undefined))}
      onContextMenu={(e) => {
        const id = stelleUnter(e.target);
        if (id && onKontext) {
          e.preventDefault();
          lang.abbrechen();
          onAuswahl(id, false);
          onKontext(id, e.clientX, e.clientY);
        }
      }}
      aria-label="Zeichenfläche"
    >
      <div className="blatt" style={{ width: szene.breite * PX_JE_MM * zoom, height: szene.hoehe * PX_JE_MM * zoom }}>
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <svg className="auswahl-ebene" width={szene.breite * PX_JE_MM * zoom} height={szene.hoehe * PX_JE_MM * zoom} viewBox={`0 0 ${szene.breite} ${szene.hoehe}`} aria-hidden="true">
          {rahmen.map((r) => (
            <rect key={r.id} x={r.x} y={r.y} width={r.b} height={r.h} className="auswahl-rahmen" />
          ))}
        </svg>
      </div>
    </div>
  );
}
