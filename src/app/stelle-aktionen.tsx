import { useMemo } from "react";
import type { Draft } from "immer";
import { elternVon, istVorfahrOderSelbst } from "../modell/baum";
import { umhaengen, verschieben, zielEineEbeneHoeher, type Ziel } from "../modell/plan";
import type { Id, Plan, Stelle } from "../modell/typen";
import { stelleTitel } from "./gliederung";

const WURZEL = "__wurzel";
const LOSE = "__lose";

/**
 * Sichtbare Aktionen für die gewählte Stelle und Umhängen ohne Ziehen, damit
 * alles auch mit Finger, Stift oder nur Tastatur geht (kein Rechtsklick nötig).
 */
export function StelleAktionen({
  plan,
  stelle,
  aendern,
  onUnterstellte,
  onDuplizieren,
  onSkizze,
  onLoeschen,
}: {
  plan: Plan;
  stelle: Stelle;
  aendern: (rezept: (p: Draft<Plan>) => void, buendel?: string) => void;
  onUnterstellte: () => void;
  onDuplizieren: () => void;
  onSkizze: () => void;
  onLoeschen: () => void;
}) {
  const id = stelle.id;
  const eltern = elternVon(plan, id);
  const liste = eltern ? plan.stellen[eltern]!.kinder : plan.wurzeln.includes(id) ? plan.wurzeln : plan.loseStellen;
  const platz = liste.indexOf(id);
  const wert = eltern ?? (plan.wurzeln.includes(id) ? WURZEL : LOSE);

  // Mögliche übergeordnete Stellen in Baumreihenfolge, ohne die Stelle selbst und ihre Unterstellten
  const moeglich = useMemo(() => {
    const aus: Array<{ id: Id; text: string }> = [];
    const gehe = (x: Id, tiefe: number) => {
      const s = plan.stellen[x];
      if (!s || istVorfahrOderSelbst(plan, id, x)) return;
      if (s.typ === "stelle") aus.push({ id: x, text: `${"  ".repeat(tiefe)}${stelleTitel(s)}` });
      s.kinder.forEach((k) => gehe(k, tiefe + 1));
    };
    plan.wurzeln.forEach((w) => gehe(w, 0));
    plan.loseStellen.forEach((w) => gehe(w, 0));
    return aus;
  }, [plan, id]);

  const umhaengenNach = (v: string) => {
    const ziel: Ziel = v === WURZEL ? { wurzel: true } : v === LOSE ? { lose: true } : { unter: v };
    aendern((p) => void umhaengen(p as Plan, id, ziel));
  };
  const hoeher = zielEineEbeneHoeher(plan, id);

  return (
    <section className="stelle-aktionen" aria-label="Aktionen für diese Stelle">
      <div className="aktionen-zeile">
        {stelle.typ === "stelle" && (
          <button type="button" onClick={onUnterstellte} title="Neue Stelle unter dieser (Einfg)">+ Unterstellte</button>
        )}
        <button type="button" onClick={onDuplizieren} title="Stelle mit Kontakten daneben kopieren (Strg+D)">Duplizieren</button>
        {stelle.typ === "stelle" && (
          <button type="button" onClick={onSkizze} title="Kommunikationsskizze mit dieser Stelle in der Mitte">Skizze erzeugen</button>
        )}
        <button type="button" className="gefahr" onClick={onLoeschen} title="Stelle löschen (Entf)">Löschen…</button>
      </div>
      <label className="feld">
        Untersteht
        <select value={wert} onChange={(e) => umhaengenNach(e.target.value)}>
          <option value={WURZEL}>– keiner Stelle (oberste Stelle) –</option>
          <option value={LOSE}>– lose Stelle, nur in Skizzen –</option>
          {moeglich.map((m) => (
            <option key={m.id} value={m.id}>{m.text}</option>
          ))}
        </select>
      </label>
      <div className="aktionen-zeile">
        <button type="button" disabled={platz <= 0} onClick={() => aendern((p) => verschieben(p as Plan, id, -1))} title="Vor die vorige Stelle derselben Ebene (Alt+↑)">↑ Nach vorn</button>
        <button type="button" disabled={platz < 0 || platz >= liste.length - 1} onClick={() => aendern((p) => verschieben(p as Plan, id, 1))} title="Hinter die nächste Stelle derselben Ebene (Alt+↓)">↓ Nach hinten</button>
        <button type="button" disabled={!hoeher} onClick={() => hoeher && aendern((p) => void umhaengen(p as Plan, id, hoeher))} title="Neben die bisherige übergeordnete Stelle">← Eine Ebene höher</button>
      </div>
    </section>
  );
}
