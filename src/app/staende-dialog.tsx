import { useEffect, useMemo, useState, type RefObject } from "react";
import { szeneZuSvg } from "../ausgabe/svg";
import { ansichtSzene } from "../layout/ansicht";
import { jetzt, zeitpunktLesbar } from "../modell/dtg";
import { planDuplizieren } from "../modell/plan";
import { naechsterStand, planVergleichen, seitStandGeaendert, standEinfrieren, standWeiterzaehlen, type Aenderung } from "../modell/stand";
import type { Plan, StandSchnappschuss } from "../modell/typen";
import { planSpeichern, standSpeichern, staendeVon } from "../speicher/db";
import { zeichenVorladen } from "../zeichen/katalog";
import { planOeffnen } from "./app";
import { Dialog, kurzmeldung } from "./dialog";
import type { PlanStore } from "./plan-store";

/**
 * Legt einen neuen Stand an: setzt den laufenden Plan auf die nächste freie
 * Version mit dem aktuellen Zeitpunkt und friert genau diesen Inhalt ein. Ist
 * der laufende Stand unverändert und noch nicht eingefroren, wird er selbst
 * eingefroren (ohne neue Nummer). Gibt den eingefrorenen Stand zurück.
 */
export async function standAnlegen(store: PlanStore, bemerkung?: string): Promise<StandSchnappschuss> {
  const zeit = jetzt();
  const eingefroren = (await staendeVon(store.zustand.id)).map((s) => s.stand.version);
  const schritt = naechsterStand(store.zustand, eingefroren);
  if (schritt.weiterzaehlen) store.aendern((p) => standWeiterzaehlen(p as Plan, zeit, bemerkung, schritt.version));
  else if (bemerkung) store.aendern((p) => void (p.stand.bemerkung = bemerkung));
  const schnappschuss = standEinfrieren(store.zustand, zeit);
  await standSpeichern(schnappschuss);
  return schnappschuss;
}

/**
 * Stand-Verwaltung: neuen Stand anlegen, frühere Stände ansehen, mit dem
 * aktuellen vergleichen oder als Kopie öffnen.
 */
export function StaendeDialog({ dialogRef, store, plan }: { dialogRef: RefObject<HTMLDialogElement | null>; store: PlanStore; plan: Plan }) {
  const [liste, setListe] = useState<StandSchnappschuss[]>([]);
  const [bemerkung, setBemerkung] = useState("");
  const [gewaehlt, setGewaehlt] = useState<StandSchnappschuss>();
  const [, setZeichen] = useState(0);
  const [arbeitet, setArbeitet] = useState(false);

  const laden = () => void staendeVon(plan.id).then(setListe);
  useEffect(laden, [plan.id, plan.stand]); // eslint-disable-line react-hooks/exhaustive-deps

  const anlegen = async () => {
    if (arbeitet) return;
    setArbeitet(true);
    try {
      const s = await standAnlegen(store, bemerkung.trim() || undefined);
      setBemerkung("");
      laden();
      kurzmeldung(`Stand ${s.stand.dtg}, Version ${s.stand.version} festgehalten.`);
    } catch (e) {
      kurzmeldung(`Stand ließ sich nicht anlegen: ${(e as Error).message}`, "fehler");
    } finally {
      setArbeitet(false);
    }
  };
  const geaendert = seitStandGeaendert(plan);
  const neueVersion = naechsterStand(plan, liste.map((s) => s.stand.version));

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
    const a = gewaehlt.plan.ansichten[gewaehlt.plan.ansichtReihenfolge[0]!];
    if (!a) return "";
    return szeneZuSvg(ansichtSzene(gewaehlt.plan, a), { hintergrund: "#fff", breite: "100%" });
  }, [gewaehlt]);

  return (
    <Dialog titel="Stände" dialogRef={dialogRef} klasse="dialog-breit" onSchliessen={() => setGewaehlt(undefined)}>
      <p>
        Aktueller Stand: <strong className="daten">{plan.stand.dtg}</strong> ({zeitpunktLesbar(plan.stand.zeitpunkt)}), Version {plan.stand.version}
        {plan.stand.bemerkung ? `, ${plan.stand.bemerkung}` : ""}.{" "}
        {geaendert ? <strong className="warnung">Seit diesem Stand geändert: Ausdrucke tragen sonst Stand und Version, die den Inhalt nicht belegen.</strong> : "Seitdem unverändert."}
      </p>
      <div className="zeile">
        <label className="feld">
          Bemerkung zum neuen Stand (optional)
          <input value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} placeholder="z. B. Lagewechsel, EA 3 aufgelöst" />
        </label>
      </div>
      <div className="aktionen">
        <button type="button" className="primaer" disabled={arbeitet} onClick={() => void anlegen()}>
          {neueVersion.weiterzaehlen ? `Neuen Stand anlegen (Version ${neueVersion.version})` : `Stand Version ${plan.stand.version} festhalten`}
        </button>
      </div>
      <p className="hinweis">
        {neueVersion.weiterzaehlen
          ? `Setzt den Plan auf Version ${neueVersion.version} mit dem aktuellen Zeitpunkt als Stand-DTG und hält genau diesen Inhalt fest. Ausdrucke von jetzt an tragen Version ${neueVersion.version}.`
          : `Hält den Plan in seiner jetzigen Form als Version ${plan.stand.version} fest, ohne neue Nummer.`}
      </p>

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
