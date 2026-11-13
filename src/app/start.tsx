import { useCallback, useEffect, useRef, useState } from "react";
import { jetzt, zeitpunktLesbar } from "../modell/dtg";
import { dateiLesen, DateiFehler } from "../modell/migration";
import { neueId } from "../modell/id";
import { planDuplizieren } from "../modell/plan";
import { VORLAGEN } from "../modell/vorlagen";
import { dauerhaftAnfragen, papierkorbAufraeumen, PAPIERKORB_TAGE, planEndgueltigLoeschen, planLaden, planListe, planSpeichern, standSpeichern, type PlanKurz } from "../speicher/db";
import { planOeffnen } from "./app";
import { bestaetigen, Dialog, kurzmeldung } from "./dialog";

export function Start() {
  const [liste, setListe] = useState<PlanKurz[] | undefined>();
  const [fehler, setFehler] = useState<string>();
  const neuDialog = useRef<HTMLDialogElement>(null);
  const datei = useRef<HTMLInputElement>(null);

  const laden = useCallback(async () => {
    try {
      await papierkorbAufraeumen();
      setListe(await planListe());
    } catch (e) {
      setFehler(`Die lokale Datenbank ist nicht erreichbar (${(e as Error).message}). Im privaten Modus mancher Browser kann komplan nichts speichern.`);
      setListe([]);
    }
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  const anlegen = async (vorlageId: string) => {
    const v = VORLAGEN.find((x) => x.id === vorlageId)!;
    const plan = v.erzeugen(jetzt());
    await planSpeichern(plan);
    void dauerhaftAnfragen();
    neuDialog.current?.close();
    planOeffnen(plan.id);
  };

  const einlesen = async (f: File) => {
    try {
      const { plan, staende } = dateiLesen(await f.text());
      // Gibt es den Plan schon, als Kopie einlesen statt überschreiben.
      if (await planLaden(plan.id)) {
        plan.id = neueId();
        plan.name = `${plan.name} (eingelesen)`;
        for (const s of staende) s.planId = plan.id;
      }
      await planSpeichern(plan);
      for (const s of staende) await standSpeichern({ ...s, planId: plan.id });
      kurzmeldung(`„${plan.name}" eingelesen.`);
      planOeffnen(plan.id);
    } catch (e) {
      kurzmeldung(e instanceof DateiFehler ? e.message : `Die Datei ließ sich nicht lesen: ${(e as Error).message}`, "fehler");
    }
  };

  const umbenennen = async (p: PlanKurz) => {
    const name = prompt("Neuer Name des Plans:", p.name)?.trim();
    if (!name) return;
    const plan = await planLaden(p.id);
    if (!plan) return;
    await planSpeichern({ ...plan, name, geaendert: jetzt() });
    await laden();
  };

  const duplizieren = async (p: PlanKurz) => {
    const plan = await planLaden(p.id);
    if (!plan) return;
    await planSpeichern(planDuplizieren(plan, `${plan.name} (Kopie)`));
    await laden();
  };

  const inPapierkorb = async (p: PlanKurz) => {
    if (!(await bestaetigen(`„${p.name}" in den Papierkorb legen? Er lässt sich ${PAPIERKORB_TAGE} Tage lang wiederherstellen.`, "In den Papierkorb"))) return;
    const plan = await planLaden(p.id);
    if (!plan) return;
    await planSpeichern({ ...plan, geloeschtAm: jetzt() });
    await laden();
  };

  const wiederherstellen = async (p: PlanKurz) => {
    const plan = await planLaden(p.id);
    if (!plan) return;
    const { geloeschtAm: _, ...rest } = plan;
    await planSpeichern(rest);
    await laden();
  };

  const endgueltig = async (p: PlanKurz) => {
    if (!(await bestaetigen(`„${p.name}" endgültig löschen? Das lässt sich nicht rückgängig machen.`, "Endgültig löschen"))) return;
    await planEndgueltigLoeschen(p.id);
    await laden();
  };

  const aktiv = liste?.filter((p) => !p.geloeschtAm) ?? [];
  const papierkorb = liste?.filter((p) => p.geloeschtAm) ?? [];

  return (
    <div className="start">
      <p className="einleitung">Führungsorganisation, Kommunikationsplan und Kommunikationsskizze auf einem gemeinsamen Datenmodell: einmal eingeben, mehrfach darstellen.</p>
      <p className="offline-badge">✓ Läuft komplett im Browser. Pläne verlassen dieses Gerät nur, wenn du sie exportierst.</p>
      {fehler && <p className="warnung">{fehler}</p>}

      <div className="aktionen">
        <button type="button" className="primaer" onClick={() => neuDialog.current?.showModal()}>
          Neuer Plan
        </button>
        <button type="button" onClick={() => datei.current?.click()}>
          Plan einlesen (JSON)…
        </button>
        <input
          ref={datei}
          type="file"
          accept=".json,application/json"
          className="nur-sr"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void einlesen(f);
          }}
        />
      </div>

      <section className="karte" aria-labelledby="plaene-titel">
        <h2 id="plaene-titel">Pläne auf diesem Gerät</h2>
        {liste === undefined ? (
          <p className="nebentext">Lade …</p>
        ) : aktiv.length === 0 ? (
          <p className="nebentext">Noch keine Pläne. „Neuer Plan" legt einen leeren Plan oder ein Beispiel an.</p>
        ) : (
          <ul className="planliste">
            {aktiv.map((p) => (
              <li key={p.id}>
                <a href={`#/plan/${p.id}`} className="planliste-name">
                  {p.name || "(ohne Namen)"}
                </a>
                <span className="nebentext">
                  Stand {p.stand} · {p.stellen} Stellen · geändert {zeitpunktLesbar(p.geaendert)}
                </span>
                <span className="planliste-aktionen">
                  <button type="button" onClick={() => void umbenennen(p)}>Umbenennen</button>
                  <button type="button" onClick={() => void duplizieren(p)}>Duplizieren</button>
                  <button type="button" onClick={() => void inPapierkorb(p)}>Löschen…</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {papierkorb.length > 0 && (
        <details className="karte">
          <summary>Papierkorb ({papierkorb.length})</summary>
          <p className="hinweis">Pläne im Papierkorb werden nach {PAPIERKORB_TAGE} Tagen endgültig gelöscht.</p>
          <ul className="planliste">
            {papierkorb.map((p) => (
              <li key={p.id}>
                <span className="planliste-name">{p.name}</span>
                <span className="nebentext">gelöscht {zeitpunktLesbar(p.geloeschtAm!)}</span>
                <span className="planliste-aktionen">
                  <button type="button" onClick={() => void wiederherstellen(p)}>Wiederherstellen</button>
                  <button type="button" onClick={() => void endgueltig(p)}>Endgültig löschen…</button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog titel="Neuer Plan" dialogRef={neuDialog} klasse="dialog-breit">
        {(["Leer", "Führungsorganisation", "Beispiele"] as const).map((g) => (
          <section key={g}>
            <h3>{g}</h3>
            <ul className="vorlagenliste">
              {VORLAGEN.filter((v) => v.gruppe === g).map((v) => (
                <li key={v.id}>
                  <button type="button" onClick={() => void anlegen(v.id)} data-vorlage={v.id}>
                    <strong>{v.titel}</strong>
                    <span className="nebentext">{v.beschreibung}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="hinweis">Alle Beispiele enthalten erfundene Namen und Nummern. Weitere Vorlagen (Fb Fü 76, Fb Fü 77, FwDV 800) folgen mit den Plan- und Skizzenansichten.</p>
      </Dialog>
    </div>
  );
}
