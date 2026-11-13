import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Kontextmenü an einer Bildschirmstelle. Bleibt offen, bis gewählt, Esc
 * gedrückt oder daneben getippt wird (nicht schon beim Verlassen mit der
 * Maus), und bleibt ganz im sichtbaren Bereich.
 */
export function Kontextmenue({ x, y, onSchliessen, children }: { x: number; y: number; onSchliessen: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lage, setLage] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rand = 8;
    setLage({
      left: Math.max(rand, Math.min(x, innerWidth - r.width - rand)),
      top: Math.max(rand, Math.min(y, innerHeight - r.height - rand)),
    });
    el.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [x, y]);

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSchliessen();
      }
    };
    const daneben = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onSchliessen();
    };
    addEventListener("keydown", taste, true);
    // erst nach dem auslösenden Ereignis lauschen, sonst schließt es sofort wieder
    const t = setTimeout(() => addEventListener("pointerdown", daneben, true));
    return () => {
      clearTimeout(t);
      removeEventListener("keydown", taste, true);
      removeEventListener("pointerdown", daneben, true);
    };
  }, [onSchliessen]);

  return (
    <div ref={ref} className="kontextmenue" role="menu" style={lage}>
      {children}
    </div>
  );
}
