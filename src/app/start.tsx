import { useCallback, useEffect, useRef, useState } from "react";
import { jetzt, zeitpunktLesbar } from "../modell/dtg";
import { dateienLesen, DateiFehler, sammlungSchreiben, zumEinlesen } from "../modell/migration";
import { planDuplizieren } from "../modell/plan";
import { VORLAGEN } from "../modell/vorlagen";
import { ablageStatus, alleMitStaenden, dauerhaftAnfragen, gesichertMerken, papierkorbAufraeumen, PAPIERKORB_TAGE, planEndgueltigLoeschen, planLaden, planListe, planSpeichern, sicherungenLesen, standSpeichern, type AblageStatus, type PlanKurz } from "../speicher/db";
import { herunterladen } from "../ausgabe/export";
import { speicherFehlerText } from "./speicherfehler";
import { standInhaltFesthalten } from "../modell/stand";
import { planOeffnen } from "./app";
import { bestaetigen, Dialog, kurzmeldung } from "./dialog";

export function Start() {
  const [liste, setListe] = useState<PlanKurz[] | undefined>();
  const [fehler, setFehler] = useState<string>();
  const [status, setStatus] = useState<AblageStatus>({});
  const [gesichert, setGesichert] = useState<Record<string, string>>({});
  const neuDialog = useRef<HTMLDialogElement>(null);
  const datei = useRef<HTMLInputElement>(null);

  const laden = useCallback(async () => {
    try {
      await papierkorbAufraeumen();
      setListe(await planListe());
      setGesichert(await sicherungenLesen());
      setStatus(await ablageStatus());
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
    standInhaltFesthalten(plan);
    try {
      await planSpeichern(plan);
    } catch (e) {
      kurzmeldung(`Der neue Plan ließ sich nicht anlegen. ${speicherFehlerText(e)}`, "fehler");
      return;
    }
    void dauerhaftAnfragen().then(() => void ablageStatus().then(setStatus));
    neuDialog.current?.close();
    planOeffnen(plan.id);
  };

  const einlesen = async (f: File) => {
    let eingelesen;
    try {
      eingelesen = dateienLesen(await f.text());
    } catch (e) {
      kurzmeldung(e instanceof DateiFehler ? e.message : `Die Datei ließ sich nicht lesen: ${(e as Error).message}`, "fehler");
      return;
    }
    try {
      const fertig: Array<{ id: string; name: string; staende: number; kopie: boolean }> = [];
      for (const e of eingelesen) {
        // Gibt es den Plan schon, als Kopie einlesen statt überschreiben; Stände bekommen immer neue IDs.
        const kopie = !!(await planLaden(e.plan.id));
        const { plan, staende } = zumEinlesen(e, kopie);
        if (plan.stand.inhalt === undefined) standInhaltFesthalten(plan);
        await planSpeichern(plan);
        for (const st of staende) await standSpeichern(st);
        fertig.push({ id: plan.id, name: plan.name, staende: staende.length, kopie });
      }
      void dauerhaftAnfragen();
      const mitStaenden = (n: number) => (n ? ` mit ${n} Stand${n > 1 ? "en" : ""}` : "");
      if (fertig.length === 1) {
        const x = fertig[0]!;
        kurzmeldung(x.kopie ? `Diesen Plan gibt es hier schon. Als Kopie „${x.name}"${mitStaenden(x.staende)} eingelesen, das Original bleibt unverändert.` : `„${x.name}"${mitStaenden(x.staende)} eingelesen.`);
        planOeffnen(x.id);
      } else {
        const kopien = fertig.filter((x) => x.kopie).length;
        kurzmeldung(`${fertig.length} Pläne eingelesen${kopien ? `, davon ${kopien} als Kopie, weil es sie hier schon gab` : ""}.`);
        await laden();
      }
    } catch (e) {
      kurzmeldung(`Einlesen abgebrochen. ${speicherFehlerText(e)}`, "fehler");
      await laden();
    }
  };

  const alleSichern = async () => {
    try {
      const alle = await alleMitStaenden();
      const zeit = jetzt();
      const name = `komplan-Sicherung-${zeit.replace(/[^0-9]/g, "").slice(0, 12)}.json`;
      herunterladen(new Blob([sammlungSchreiben(alle, zeit)], { type: "application/json" }), name);
      await gesichertMerken(alle.map((a) => a.plan.id), zeit);
      setGesichert(await sicherungenLesen());
      kurzmeldung(`${alle.length} Pläne in eine Datei gesichert. „Plan einlesen" liest sie auf jedem Gerät wieder ein.`);
    } catch (e) {
      kurzmeldung(`Sicherung fehlgeschlagen. ${speicherFehlerText(e)}`, "fehler");
    }
  };

  const dauerhaftBitten = async () => {
    const ok = await dauerhaftAnfragen();
    setStatus(await ablageStatus());
    kurzmeldung(ok ? "Der Browser behält die Pläne jetzt auch bei Platzmangel." : "Der Browser hat abgelehnt. Er entscheidet selbst (z. B. nach Nutzung oder als installierte App). Regelmäßig als Datei sichern.", ok ? "gut" : "fehler");
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
  const ungesichert = aktiv.filter((p) => !gesichert[p.id] || gesichert[p.id]! < p.geaendert);
  const mb = (b?: number) => (b === undefined ? "?" : b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} kB` : b < 1e9 ? `${(b / 1e6).toFixed(b < 1e8 ? 1 : 0)} MB` : `${(b / 1e9).toFixed(1)} GB`);
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
                  Stand {p.stand} · {p.stellen} Stellen · geändert {zeitpunktLesbar(p.geaendert)} ·{" "}
                  {gesichert[p.id] ? `als Datei gesichert ${zeitpunktLesbar(gesichert[p.id]!)}` : "noch nie als Datei gesichert"}
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

      <section className="karte ablage-karte" aria-labelledby="ablage-titel">
        <h2 id="ablage-titel">Ablage</h2>
        <p>
          Die Pläne liegen <strong>nur in diesem Browser auf diesem Gerät</strong>. Ein anderer Browser, ein privates Fenster oder ein anderes Gerät sieht sie nicht, und wer die Browserdaten löscht, löscht sie mit. Sichern geht nur als Datei.
        </p>
        <p className={status.dauerhaft === false ? "warnung" : "nebentext"}>
          {status.dauerhaft === true
            ? "Dauerhaft gespeichert: Der Browser verwirft die Pläne nicht von sich aus bei Platzmangel."
            : status.dauerhaft === false
              ? "Nicht dauerhaft gespeichert: Der Browser darf die Pläne bei Platzmangel löschen."
              : "Ob der Browser die Pläne dauerhaft behält, ist nicht bekannt."}
          {status.belegt !== undefined && ` Belegt ${mb(status.belegt)} von etwa ${mb(status.verfuegbar)}.`}
        </p>
        {aktiv.length > 0 && (
          <p className={ungesichert.length ? "warnung" : "nebentext"}>
            {ungesichert.length === aktiv.length
              ? "Kein Plan ist in seinem jetzigen Stand als Datei gesichert."
              : ungesichert.length
                ? `${ungesichert.length} von ${aktiv.length} Plänen sind seit der letzten Änderung nicht als Datei gesichert.`
                : "Alle Pläne sind in ihrem jetzigen Stand als Datei gesichert."}
          </p>
        )}
        <div className="aktionen">
          <button type="button" disabled={aktiv.length === 0} onClick={() => void alleSichern()}>Alle Pläne als Datei sichern</button>
          {status.dauerhaft === false && <button type="button" onClick={() => void dauerhaftBitten()}>Dauerhaft speichern anfragen</button>}
        </div>
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
        {(["Leer", "Kommunikationsplan", "Kommunikationsskizze", "Führungsorganisation", "Beispiele"] as const).map((g) => (
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
        <p className="hinweis">Alle Beispiele enthalten erfundene Telefonnummern und Adressen. Die Simbach-Beispiele folgen den Ausbildungsfolien „Betriebsunterlagen" des THW.</p>
      </Dialog>
    </div>
  );
}
