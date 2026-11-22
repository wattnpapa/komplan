import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const RAND = 8;

/**
 * Schwebendes Menü an einer Bildschirmposition. Bleibt im Fenster, schließt
 * bei Esc, Klick daneben, Scrollen und Fensterwechsel; Pfeiltasten wandern
 * durch die Einträge. Mit `fokus` (per Tastatur geöffnet) steht der Fokus
 * gleich auf dem ersten Eintrag, Esc gibt ihn an die Stelle zurück.
 */
export function Kontextmenue({
  x,
  y,
  fokus,
  label,
  onSchliessen,
  children,
}: {
  x: number;
  y: number;
  fokus?: boolean;
  label: string;
  onSchliessen: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [lage, setLage] = useState({ left: x, top: y });
  const vorher = useRef<HTMLElement | null>(null);
  if (vorher.current === null && typeof document !== "undefined") vorher.current = document.activeElement as HTMLElement | null;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setLage({
      left: Math.max(RAND, Math.min(x, innerWidth - r.width - RAND)),
      top: Math.max(RAND, Math.min(y, innerHeight - r.height - RAND)),
    });
    if (fokus) el.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [x, y, fokus]);

  useEffect(() => {
    const daneben = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onSchliessen();
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onSchliessen();
      vorher.current?.focus?.();
    };
    addEventListener("pointerdown", daneben, true);
    addEventListener("keydown", taste, true);
    addEventListener("blur", onSchliessen);
    addEventListener("resize", onSchliessen);
    addEventListener("scroll", daneben, true);
    return () => {
      removeEventListener("pointerdown", daneben, true);
      removeEventListener("keydown", taste, true);
      removeEventListener("blur", onSchliessen);
      removeEventListener("resize", onSchliessen);
      removeEventListener("scroll", daneben, true);
    };
  }, [onSchliessen]);

  const pfeil = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    e.stopPropagation();
    const eintraege = [...ref.current!.querySelectorAll<HTMLElement>("[role=menuitem]")];
    const i = eintraege.indexOf(document.activeElement as HTMLElement);
    const n = eintraege.length;
    const j = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
    eintraege[j]?.focus();
  };

  return (
    <div ref={ref} className="kontextmenue" role="menu" aria-label={label} style={lage} onKeyDown={pfeil} onContextMenu={(e) => e.preventDefault()}>
      {children}
    </div>
  );
}
