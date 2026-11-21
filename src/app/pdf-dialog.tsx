import { useEffect, useState, type RefObject } from "react";
import { dateiname, herunterladen, pdfExport, type PdfWahl } from "../ausgabe/export";
import type { Ansicht, Plan } from "../modell/typen";
import { einpassMassstab, pdfNutzflaeche, ZEICHEN_BREITE_MAX, ZEICHEN_BREITE_MIN, ZEICHEN_BREITE_STANDARD, zeichenBreiteBegrenzen, zeichenBreiteInSzene, zeichenMassstab } from "../szene/massstab";
import type { Szene } from "../szene/typen";
import { Dialog, kurzmeldung } from "./dialog";

/** PDF-Ausgabe: Format, Ausrichtung, Einpassen oder Teilen mit Zeichenbreite, Einstufungsvermerk. */
export function PdfDialog({ dialogRef, plan, ansicht, szene }: { dialogRef: RefObject<HTMLDialogElement | null>; plan: Plan; ansicht: Ansicht; szene: Szene }) {
  const [wahl, setWahl] = useState<PdfWahl>({ ...ansicht.papier, zeichenBreite: ansicht.papier.zeichenBreite ?? ZEICHEN_BREITE_STANDARD, einstufungPosition: plan.kopf.einstufungPosition ?? "kopf-und-fuss" });
  const [arbeitet, setArbeitet] = useState(false);
  // Zeichenbreite nur für Organigramme: Skizzen sind ein festes Blatt, Formulare haben feste Seiten.
  const mitZeichen = ansicht.typ !== "skizze" && zeichenBreiteInSzene(szene) > 0 && !szene.seiten?.length;
  const zeichenBreite = mitZeichen ? zeichenBreiteBegrenzen(wahl.zeichenBreite) : undefined;
  const { nutzB, nutzH } = pdfNutzflaeche(wahl.format, wahl.ausrichtung, !!plan.kopf.einstufung);
  const massstab = wahl.grosseFlaeche === "einpassen" ? einpassMassstab(szene, nutzB, nutzH, zeichenBreite) : zeichenMassstab(szene, zeichenBreite);
  const istBreite = zeichenBreiteInSzene(szene) * massstab;
  useEffect(() => setWahl((w) => ({ ...w, ...ansicht.papier, zeichenBreite: ansicht.papier.zeichenBreite ?? ZEICHEN_BREITE_STANDARD })), [ansicht.id, ansicht.papier]); // eslint-disable-line react-hooks/exhaustive-deps

  const los = async () => {
    setArbeitet(true);
    try {
      const blob = await pdfExport(szene, plan, ansicht.name, { ...wahl, zeichenBreite });
      herunterladen(blob, dateiname(plan, "pdf", ansicht.name));
      dialogRef.current?.close();
    } catch (e) {
      kurzmeldung(`PDF fehlgeschlagen: ${(e as Error).message}`, "fehler");
    } finally {
      setArbeitet(false);
    }
  };

  return (
    <Dialog
      titel={`PDF: ${ansicht.name}`}
      dialogRef={dialogRef}
      aktionen={
        <>
          <button type="button" className="primaer" disabled={arbeitet} onClick={() => void los()}>
            {arbeitet ? "Erzeuge PDF …" : "PDF herunterladen"}
          </button>
          <button type="button" onClick={() => dialogRef.current?.close()}>Abbrechen</button>
        </>
      }
    >
      <div className="zeile">
        <fieldset className="wahl">
          <legend>Format</legend>
          {(["A4", "A3"] as const).map((f) => (
            <label className="inline" key={f}>
              <input type="radio" name="pdf-format" checked={wahl.format === f} onChange={() => setWahl({ ...wahl, format: f })} /> {f}
            </label>
          ))}
        </fieldset>
        <fieldset className="wahl">
          <legend>Ausrichtung</legend>
          {(["quer", "hoch"] as const).map((a) => (
            <label className="inline" key={a}>
              <input type="radio" name="pdf-ausrichtung" checked={wahl.ausrichtung === a} onChange={() => setWahl({ ...wahl, ausrichtung: a })} /> {a}
            </label>
          ))}
        </fieldset>
        <fieldset className="wahl">
          <legend>Großer Plan</legend>
          <label className="inline">
            <input type="radio" name="pdf-flaeche" checked={wahl.grosseFlaeche === "einpassen"} onChange={() => setWahl({ ...wahl, grosseFlaeche: "einpassen" })} /> auf eine Seite einpassen
          </label>
          <label className="inline">
            <input type="radio" name="pdf-flaeche" checked={wahl.grosseFlaeche === "teilen"} onChange={() => setWahl({ ...wahl, grosseFlaeche: "teilen" })} /> {mitZeichen ? "auf Seiten teilen" : "in Originalgröße auf Seiten teilen"}
          </label>
        </fieldset>
      </div>
      {mitZeichen && (
        <fieldset className="wahl">
          <legend>Breite der taktischen Zeichen</legend>
          <label className="inline">
            <input
              className="schmal-eingabe"
              type="number"
              inputMode="numeric"
              aria-label="Breite der taktischen Zeichen in mm"
              min={ZEICHEN_BREITE_MIN}
              max={ZEICHEN_BREITE_MAX}
              step={1}
              value={wahl.zeichenBreite ?? ""}
              onChange={(e) => setWahl({ ...wahl, zeichenBreite: e.target.value === "" ? undefined : Number(e.target.value) })}
            />{" "}
            mm
          </label>
          <p className="hinweis">
            {wahl.grosseFlaeche === "teilen"
              ? `Zeichen ${Math.round(istBreite)} mm breit, der Plan wird ${Math.round(szene.breite * massstab)} × ${Math.round(szene.hoehe * massstab)} mm groß und auf Seiten verteilt.`
              : Math.round(istBreite) < Math.round(zeichenBreite!)
                ? `Auf einer Seite ist nur Platz für ${Math.round(istBreite)} mm breite Zeichen. Für ${Math.round(zeichenBreite!)} mm: ${wahl.format === "A4" ? "A3 wählen oder " : ""}auf Seiten teilen.`
                : `Zeichen ${Math.round(istBreite)} mm breit, der Plan passt auf eine Seite.`}
          </p>
        </fieldset>
      )}
      {plan.kopf.einstufung ? (
        <fieldset className="wahl">
          <legend>Vermerk „{plan.kopf.einstufung}"</legend>
          <label className="inline">
            <input type="radio" name="pdf-vs" checked={wahl.einstufungPosition === "kopf"} onChange={() => setWahl({ ...wahl, einstufungPosition: "kopf" })} /> oben
          </label>
          <label className="inline">
            <input type="radio" name="pdf-vs" checked={wahl.einstufungPosition === "kopf-und-fuss"} onChange={() => setWahl({ ...wahl, einstufungPosition: "kopf-und-fuss" })} /> oben und unten
          </label>
        </fieldset>
      ) : (
        <p className="hinweis">Ohne Einstufung. Ein Verschlusssachenvermerk (z. B. „VS – Nur für den Dienstgebrauch") lässt sich im Kopf des Plans eintragen.</p>
      )}
      <p className="hinweis">
        Plan {Math.round(szene.breite)} × {Math.round(szene.hoehe)} mm. Seitenfuß mit Stand {plan.stand.dtg} und Version {plan.stand.version}. Linien, Text und Zeichen bleiben Vektor.
      </p>
    </Dialog>
  );
}
