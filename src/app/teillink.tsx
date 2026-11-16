import { useEffect, useState, type RefObject } from "react";
import { LINK_EMPFOHLEN, LINK_HOECHSTENS, linkMit, planDekodieren, planKodieren } from "../ausgabe/teillink";
import { neueId } from "../modell/id";
import { jetzt } from "../modell/dtg";
import type { Plan } from "../modell/typen";
import { dauerhaftAnfragen, planLaden, planSpeichern } from "../speicher/db";
import { standInhaltFesthalten } from "../modell/stand";
import { planOeffnen } from "./app";
import { Dialog, kurzmeldung } from "./dialog";

/** Teil-Link erzeugen: erst Hinweis auf die enthaltenen Daten, dann Link zum Kopieren. */
export function TeillinkDialog({ dialogRef, plan }: { dialogRef: RefObject<HTMLDialogElement | null>; plan: Plan }) {
  const [verstanden, setVerstanden] = useState(false);
  const [ohneBilder, setOhneBilder] = useState(false);
  const [link, setLink] = useState<string>();
  const [laenge, setLaenge] = useState(0);
  const hatBilder = Object.keys(plan.bilder).length > 0;

  const erzeugen = async () => {
    const daten = await planKodieren(plan, ohneBilder);
    setLaenge(daten.length);
    setLink(daten.length <= LINK_HOECHSTENS ? linkMit(daten, location.href) : undefined);
  };

  const kopieren = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      kurzmeldung("Link kopiert.");
    } catch {
      kurzmeldung("Kopieren nicht erlaubt; den markierten Link bitte von Hand kopieren.", "fehler");
    }
  };

  return (
    <Dialog titel="Plan als Link teilen" dialogRef={dialogRef} onSchliessen={() => (setLink(undefined), setVerstanden(false), setLaenge(0))}>
      <p className="warnung">
        Der Link enthält den ganzen Plan: Namen, Funkrufnamen, Telefonnummern, E-Mail-Adressen und Rufgruppen. Wer den Link hat, kann alles lesen. Nur dorthin
        schicken, wohin auch der Plan darf{plan.kopf.einstufung ? ` (Einstufung: ${plan.kopf.einstufung})` : ""}.
      </p>
      <p className="hinweis">Die Daten stehen hinter dem „#" im Link. Der Browser schickt diesen Teil an keinen Server; geöffnet wird der Plan als Kopie auf dem anderen Gerät.</p>
      <label className="inline">
        <input type="checkbox" checked={verstanden} onChange={(e) => setVerstanden(e.target.checked)} />
        Verstanden, Link erzeugen
      </label>
      {hatBilder && (
        <label className="inline">
          <input type="checkbox" checked={ohneBilder} onChange={(e) => (setOhneBilder(e.target.checked), setLink(undefined))} />
          Logo weglassen (macht den Link deutlich kürzer)
        </label>
      )}
      <div className="aktionen">
        <button type="button" className="primaer" disabled={!verstanden} onClick={() => void erzeugen()}>
          Link erzeugen
        </button>
      </div>
      {laenge > LINK_HOECHSTENS && (
        <p className="warnung" role="alert">
          Der Plan ist für einen Link zu groß ({Math.round(laenge / 1000)} 000 Zeichen). Bitte „Export → JSON" nutzen und die Datei weitergeben.
        </p>
      )}
      {link && (
        <>
          <label className="feld">
            Link ({link.length.toLocaleString("de-DE")} Zeichen)
            <input readOnly value={link} onFocus={(e) => e.target.select()} autoFocus className="daten" />
          </label>
          {link.length > LINK_EMPFOHLEN && <p className="hinweis">Lange Links werden von manchen Messengern und Mailprogrammen abgeschnitten. Im Zweifel die JSON-Datei schicken.</p>}
          <div className="aktionen">
            <button type="button" onClick={() => void kopieren()}>In die Zwischenablage</button>
          </div>
        </>
      )}
    </Dialog>
  );
}

/** Beim Öffnen eines Links mit „#p=…": Plan anzeigen und auf Wunsch übernehmen. */
export function LinkImport({ daten }: { daten: string }) {
  const [plan, setPlan] = useState<Plan>();
  const [fehler, setFehler] = useState<string>();
  useEffect(() => {
    planDekodieren(daten).then(setPlan, (e: Error) => setFehler(e.message));
  }, [daten]);

  const uebernehmen = async () => {
    if (!plan) return;
    const kopie: Plan = { ...plan, geaendert: jetzt(), stand: { ...plan.stand } };
    if (kopie.stand.inhalt === undefined) standInhaltFesthalten(kopie);
    if (await planLaden(kopie.id)) {
      kopie.id = neueId();
      kopie.name = `${kopie.name} (aus Link)`;
    }
    await planSpeichern(kopie);
    void dauerhaftAnfragen();
    history.replaceState(null, "", location.pathname + location.search);
    planOeffnen(kopie.id);
  };

  return (
    <section className="karte" aria-labelledby="link-titel">
      <h2 id="link-titel">Plan aus einem Link</h2>
      {fehler ? (
        <p className="warnung" role="alert">{fehler}</p>
      ) : !plan ? (
        <p className="nebentext">Lese den Link …</p>
      ) : (
        <>
          <p>
            <strong>{plan.name}</strong>, Stand {plan.stand.dtg}, {Object.keys(plan.stellen).length} Stellen, {plan.ansichtReihenfolge.length} Ansichten.
          </p>
          <p className="hinweis">Übernehmen legt den Plan als Kopie auf diesem Gerät ab. Er enthält Kontaktdaten; auf fremden Geräten danach wieder löschen.</p>
          <div className="aktionen">
            <button type="button" className="primaer" onClick={() => void uebernehmen()}>Plan übernehmen und öffnen</button>
            <button type="button" onClick={() => (location.hash = "#/")}>Verwerfen</button>
          </div>
        </>
      )}
    </section>
  );
}
