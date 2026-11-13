import { useEffect, useMemo, useState, type RefObject } from "react";
import { szeneZuSvg } from "../ausgabe/svg";
import { fuehrungsorgSzene } from "../layout/fuehrungsorg";
import { jetzt, zeitpunktLesbar } from "../modell/dtg";
import { planDuplizieren } from "../modell/plan";
import { planVergleichen, standEinfrieren, standWeiterzaehlen, type Aenderung } from "../modell/stand";
import type { Plan, StandSchnappschuss } from "../modell/typen";
import { planSpeichern, standSpeichern, staendeVon } from "../speicher/db";
import { zeichenVorladen } from "../zeichen/katalog";
import { planOeffnen } from "./app";
import { Dialog, kurzmeldung } from "./dialog";
import type { PlanStore } from "./plan-store";

/**
 * Stand-Verwaltung: neuen Stand anlegen (friert den bisherigen ein), frühere
 * Stände ansehen, mit dem aktuellen vergleichen oder als Kopie öffnen.
 */
export function StaendeDialog({ dialogRef, store, plan }: { dialogRef: RefObject<HTMLDialogElement | null>; store: PlanStore; plan: Plan }) {
  const [liste, setListe] = useState<StandSchnappschuss[]>([]);
  const [bemerkung, setBemerkung] = useState("");
  const [gewaehlt, setGewaehlt] = useState<StandSchnappschuss>();
  const [, setZeichen] = useState(0);

  const laden = () => void staendeVon(plan.id).then(setListe);
  useEffect(laden, [plan.id]);

  const anlegen = async () => {
    const zeit = jetzt();
    const schnappschuss = standEinfrieren(store.zustand, zeit);
    await standSpeichern(schnappschuss);
    store.aendern((p) => standWeiterzaehlen(p as Plan, zeit, bemerkung.trim() || undefined));
    setBemerkung("");
    laden();
    kurzmeldung(`Stand ${schnappschuss.stand.version} eingefroren, weiter mit Version ${schnappschuss.stand.version + 1}.`);
  };

  const ansehen = async (s: StandSchnappschuss) => {
    await zeichenVorladen(Object.values(s.plan.stellen).map((x) => x.zeichen));
    setGewaehlt(s);
    setZeichen((n) => n + 1);
  };

  const alsKopie = async (s: StandSchnappschuss) => {
    const kopie = planDuplizieren(s.plan, `${s.plan.name} (Stand ${s.stand.dtg})`);
    await planSpeichern(kopie);
    dialogRef.current?.close();
    planOeffnen(kopie.id);
  };

  const aenderungen: Aenderung[] = useMemo(() => (gewaehlt ? planVergleichen(gewaehlt.plan, plan) : []), [gewaehlt, plan]);
  const vorschau = useMemo(() => {
    if (!gewaehlt) return "";
    const a = gewaehlt.plan.ansichten[gewaehlt.plan.ansichtReihenfolge.find((id) => gewaehlt.plan.ansichten[id]?.typ !== "skizze")!];
    if (!a || a.typ === "skizze") return "";
    return szeneZuSvg(fuehrungsorgSzene(gewaehlt.plan, a, { titel: true }), { hintergrund: "#fff", breite: "100%" });
  }, [gewaehlt]);

  return (
    <Dialog titel="Stände" dialogRef={dialogRef} klasse="dialog-breit" onSchliessen={() => setGewaehlt(undefined)}>
      <p>
        Aktueller Stand: <strong className="daten">{plan.stand.dtg}</strong> ({zeitpunktLesbar(plan.stand.zeitpunkt)}), Version {plan.stand.version}
        {plan.stand.bemerkung ? `, ${plan.stand.bemerkung}` : ""}.
      </p>
      <div className="zeile">
        <label className="feld">
          Bemerkung zum neuen Stand (optional)
          <input value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} placeholder="z. B. Lagewechsel, EA 3 aufgelöst" />
        </label>
      </div>
      <div className="aktionen">
        <button type="button" className="primaer" onClick={() => void anlegen()}>Neuen Stand anlegen</button>
      </div>
      <p className="hinweis">Friert den Plan in seiner jetzigen Form als Version {plan.stand.version} ein. Danach geht es mit Version {plan.stand.version + 1} und dem aktuellen Zeitpunkt weiter.</p>

      <h3>Frühere Stände ({liste.length})</h3>
      {liste.length === 0 ? (
        <p className="nebentext">Noch keine eingefrorenen Stände.</p>
      ) : (
        <ul className="planliste">
          {liste.map((s) => (
            <li key={s.id} className={gewaehlt?.id === s.id ? "gewaehlt" : undefined}>
              <span className="planliste-name daten">Version {s.stand.version} · {s.stand.dtg}</span>
              <span className="nebentext">eingefroren {zeitpunktLesbar(s.angelegt)}{s.stand.bemerkung ? ` · ${s.stand.bemerkung}` : ""} · {Object.keys(s.plan.stellen).length} Stellen</span>
              <span className="planliste-aktionen">
                <button type="button" onClick={() => void ansehen(s)}>Ansehen und vergleichen</button>
                <button type="button" onClick={() => void alsKopie(s)}>Als Kopie öffnen</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {gewaehlt && (
        <section className="stand-ansicht" aria-label={`Stand ${gewaehlt.stand.dtg}`}>
          <h3>Version {gewaehlt.stand.version} ({gewaehlt.stand.dtg}) im Vergleich zum aktuellen Stand</h3>
          {aenderungen.length === 0 ? (
            <p className="nebentext">Keine Unterschiede in Stellen, Kontakten und Funk.</p>
          ) : (
            <ul className="aenderungen">
              {aenderungen.map((a, i) => (
                <li key={i} className={`aenderung-${a.art}`}>
                  <span className="aenderung-art">{a.art === "neu" ? "neu" : a.art === "entfernt" ? "entfernt" : "geändert"}</span> {a.text}
                </li>
              ))}
            </ul>
          )}
          <div className="stand-vorschau" dangerouslySetInnerHTML={{ __html: vorschau }} />
        </section>
      )}
    </Dialog>
  );
}
