import { useRef, type PointerEvent } from "react";

/** Wie lange ein Finger liegen muss, bis das Kontextmenü kommt. */
const DAUER_MS = 550;
/** Bewegt sich der Finger weiter, ist es Scrollen oder Ziehen, kein langes Drücken. */
const TOLERANZ_PX = 10;

/**
 * Langes Drücken mit Finger oder Stift (nicht Maus) als Ersatz für den
 * Rechtsklick. iPadOS löst dafür kein `contextmenu` aus. Gibt Handler zum
 * Weiterreichen an Pointer-Ereignisse zurück.
 */
export function useLangDruck(ausloesen: (ziel: EventTarget, x: number, y: number) => void) {
  const lauf = useRef<{ timer: number; x: number; y: number }>(undefined);
  const abbrechen = () => {
    if (lauf.current) clearTimeout(lauf.current.timer);
    lauf.current = undefined;
  };
  return {
    unten(e: PointerEvent) {
      abbrechen();
      if (e.pointerType === "mouse") return;
      const ziel = e.target, x = e.clientX, y = e.clientY;
      lauf.current = {
        x,
        y,
        timer: window.setTimeout(() => {
          lauf.current = undefined;
          ausloesen(ziel, x, y);
        }, DAUER_MS),
      };
    },
    bewegen(e: PointerEvent) {
      if (lauf.current && Math.hypot(e.clientX - lauf.current.x, e.clientY - lauf.current.y) > TOLERANZ_PX) abbrechen();
    },
    abbrechen,
  };
}
