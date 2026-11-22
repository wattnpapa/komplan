import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { istVorfahrOderSelbst } from "../modell/baum";
import type { Ziel } from "../modell/plan";
import type { Id, Plan, Stelle } from "../modell/typen";
import { zeichenKurz } from "../zeichen/katalog";
import { ZeichenBild } from "./zeichen-bild";

export function stelleTitel(s: Stelle): string {
  if (s.typ === "auslassung") return `Auslassung ${s.auslassung ?? "⋮"}`;
  const teile = [zeichenKurz(s.zeichen), s.nummer, s.beschriftung, ...s.zusatzzeilen.slice(0, 1)].filter((t) => t && t.trim());
  return teile.join(" ") || s.bezeichnung || "(ohne Namen)";
}

type Lage = "davor" | "hinein" | "danach";

/**
 * Gliederungsansicht: Baum der Stellen mit Einklappen, Auswahl, Tastatur
 * und Ziehen zum Umhängen (oberes Viertel = davor, Mitte = unterstellen,
 * unteres Viertel = danach).
 */
export function Gliederung({
  plan,
  auswahl,
  zugeklappt,
  onAuswahl,
  onZuklappen,
  onUmhaengen,
  onTaste,
  onKontext,
}: {
  plan: Plan;
  auswahl: Id[];
  zugeklappt: Set<Id>;
  onAuswahl: (id: Id, erweitern: boolean) => void;
  onZuklappen: (id: Id) => void;
  onUmhaengen: (id: Id, ziel: Ziel) => void;
  onTaste: (e: KeyboardEvent, id: Id) => void;
  /** Kontextmenü für eine Stelle; `tastatur`, wenn per Taste statt Maus geöffnet. */
  onKontext?: (id: Id, x: number, y: number, tastatur: boolean) => void;
}) {
  const [ziehe, setZiehe] = useState<Id>();
  const kontextPerTaste = useRef(0);
  const [ueber, setUeber] = useState<{ id: Id | "wurzel" | "lose"; lage: Lage }>();

  const lageAus = (e: DragEvent<HTMLElement>): Lage => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    return y < 0.25 ? "davor" : y > 0.75 ? "danach" : "hinein";
  };

  const zielFuer = (id: Id, lage: Lage): Ziel | undefined => {
    if (lage === "hinein") return { unter: id };
    const eltern = Object.values(plan.stellen).find((s) => s.kinder.includes(id));
    const liste = eltern ? eltern.kinder : plan.wurzeln.includes(id) ? plan.wurzeln : plan.loseStellen;
    const i = liste.indexOf(id) + (lage === "danach" ? 1 : 0);
    if (eltern) return { unter: eltern.id, index: i };
    return plan.wurzeln.includes(id) ? { wurzel: true, index: i } : { lose: true, index: i };
  };

  const zeile = (id: Id, tiefe: number): React.ReactNode => {
    const s = plan.stellen[id];
    if (!s) return null;
    const hatKinder = s.kinder.length > 0;
    const zu = zugeklappt.has(id);
    const gewaehlt = auswahl.includes(id);
    const markierung = ueber?.id === id ? `ziel-${ueber.lage}` : "";
    return (
      <li key={id} role="treeitem" aria-expanded={hatKinder ? !zu : undefined} aria-selected={gewaehlt} aria-level={tiefe + 1}>
        <div
          className={`gl-zeile ${gewaehlt ? "gewaehlt" : ""} ${markierung}`}
          style={{ paddingLeft: `${tiefe * 1.1 + 0.25}rem` }}
          draggable
          tabIndex={gewaehlt && auswahl[0] === id ? 0 : -1}
          data-stelle={id}
          onClick={(e) => onAuswahl(id, e.ctrlKey || e.metaKey || e.shiftKey)}
          onPointerDown={() => void (kontextPerTaste.current = 0)}
          onKeyDown={(e) => {
            if (onKontext && (e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey))) {
              e.preventDefault();
              kontextPerTaste.current = Date.now();
              const r = e.currentTarget.getBoundingClientRect();
              onKontext(id, r.left + 24, r.bottom, true);
              return;
            }
            onTaste(e, id);
          }}
          onContextMenu={(e) => {
            if (!onKontext) return;
            e.preventDefault();
            // Die Kontextmenü-Taste löst nach keydown oft noch contextmenu aus; das Menü ist dann schon offen.
            if (Date.now() - kontextPerTaste.current < 1000) return void (kontextPerTaste.current = 0);
            if (!gewaehlt || auswahl.length > 1) onAuswahl(id, false);
            e.currentTarget.focus();
            onKontext(id, e.clientX, e.clientY, false);
          }}
          onDragStart={(e) => {
            setZiehe(id);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", id);
          }}
          onDragEnd={() => {
            setZiehe(undefined);
            setUeber(undefined);
          }}
          onDragOver={(e) => {
            if (!ziehe) return;
            const lage = lageAus(e);
            if (lage === "hinein" && istVorfahrOderSelbst(plan, ziehe, id)) return;
            if (lage !== "hinein" && istVorfahrOderSelbst(plan, ziehe, id) && ziehe !== id) return;
            e.preventDefault();
            setUeber({ id, lage });
          }}
          onDragLeave={() => setUeber((u) => (u?.id === id ? undefined : u))}
          onDrop={(e) => {
            e.preventDefault();
            const lage = lageAus(e);
            const ziel = zielFuer(id, lage);
            if (ziehe && ziel && ziehe !== id) onUmhaengen(ziehe, ziel);
            setZiehe(undefined);
            setUeber(undefined);
          }}
        >
          {hatKinder ? (
            <button
              type="button"
              className="gl-klapp"
              aria-label={zu ? "Aufklappen" : "Zuklappen"}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onZuklappen(id);
              }}
            >
              {zu ? "▸" : "▾"}
            </button>
          ) : (
            <span className="gl-klapp" aria-hidden="true" />
          )}
          {s.typ === "auslassung" ? <span className="gl-auslassung">{s.auslassung ?? "⋮"}</span> : <ZeichenBild zeichen={s.zeichen} groesse={26} />}
          <span className="gl-text">{stelleTitel(s)}</span>
          {s.anbindung.lage !== "unten" && <span className="gl-marke" title="seitlich angehängt">↔</span>}
          {zu && <span className="gl-marke">+{s.kinder.length}</span>}
        </div>
        {hatKinder && !zu && (
          <ul role="group">{s.kinder.map((k) => zeile(k, tiefe + 1))}</ul>
        )}
      </li>
    );
  };

  const ablage = (art: "wurzel" | "lose", text: string) => (
    <div
      className={`gl-ablage ${ueber?.id === art ? "ziel-hinein" : ""}`}
      onDragOver={(e) => {
        if (!ziehe) return;
        e.preventDefault();
        setUeber({ id: art, lage: "hinein" });
      }}
      onDragLeave={() => setUeber(undefined)}
      onDrop={(e) => {
        e.preventDefault();
        if (ziehe) onUmhaengen(ziehe, art === "wurzel" ? { wurzel: true } : { lose: true });
        setZiehe(undefined);
        setUeber(undefined);
      }}
    >
      {text}
    </div>
  );

  return (
    <nav className="gliederung" aria-label="Gliederung">
      {plan.wurzeln.length === 0 && plan.loseStellen.length === 0 ? (
        <p className="nebentext gl-leer">Noch keine Stellen. „+ Stelle" legt die oberste Führungsstelle an.</p>
      ) : (
        <ul role="tree" aria-multiselectable="true">
          {plan.wurzeln.map((w) => zeile(w, 0))}
        </ul>
      )}
      {ziehe && ablage("wurzel", "Hierher ziehen: als oberste Stelle")}
      {plan.loseStellen.length > 0 && (
        <>
          <h3 className="gl-titel">Lose Stellen</h3>
          <p className="hinweis">Nicht unterstellt; erscheinen nur in Skizzen.</p>
          <ul role="tree">{plan.loseStellen.map((w) => zeile(w, 0))}</ul>
        </>
      )}
      {ziehe && ablage("lose", "Hierher ziehen: lose Stelle (nicht unterstellt)")}
    </nav>
  );
}
