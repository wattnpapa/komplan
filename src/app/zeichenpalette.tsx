import { useEffect, useMemo, useRef, useState } from "react";
import type { Grundform, Organisation, ZeichenRef } from "../modell/typen";
import { wertLesen, wertSchreiben } from "../speicher/db";
import { EIGENE_VORLAGEN, eigeneVorlage } from "../zeichen/eigen/vorlagen";
import { zeichenName } from "../zeichen/katalog";
import { kategorien, zeichenSuchen, type Suchtreffer } from "../zeichen/suche";
import { Dialog } from "./dialog";
import { ZeichenBild } from "./zeichen-bild";

const FAVORITEN = "zeichen.favoriten";
const ZULETZT = "zeichen.zuletzt";
const ref2key = (r: ZeichenRef) => JSON.stringify(r);

const GRUNDFORMEN: Array<{ form: Grundform; titel: string }> = [
  { form: "fuehrungsstelle", titel: "Führungsstelle (Fahne)" },
  { form: "stab", titel: "Stab (Haus)" },
  { form: "einheit", titel: "Einheit (Rechteck)" },
  { form: "fahrzeug", titel: "Fahrzeug" },
  { form: "kreis", titel: "Kreis" },
  { form: "raute", titel: "Raute" },
];

/**
 * Zeichenauswahl: Suche über Katalog und eigene Zeichen, Favoriten, zuletzt
 * benutzt, Blättern nach Kategorie und das freie Textzeichen.
 */
export function Zeichenpalette({
  dialogRef,
  aktuell,
  organisation,
  onWahl,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  aktuell?: ZeichenRef;
  organisation: Organisation;
  onWahl: (ref: ZeichenRef | undefined) => void;
}) {
  const [anfrage, setAnfrage] = useState("");
  const [favoriten, setFavoriten] = useState<ZeichenRef[]>([]);
  const [zuletzt, setZuletzt] = useState<ZeichenRef[]>([]);
  const [reiter, setReiter] = useState<"suche" | "frei">("suche");
  const [kategorie, setKategorie] = useState<string>("Eigene Zeichen");
  const suchfeld = useRef<HTMLInputElement>(null);

  // Freies Zeichen
  const [form, setForm] = useState<Grundform>("fuehrungsstelle");
  const [text, setText] = useState("");
  const [farbe, setFarbe] = useState("#ffff00");
  const [textfarbe, setTextfarbe] = useState("#000000");

  useEffect(() => {
    void wertLesen<ZeichenRef[]>(FAVORITEN, []).then(setFavoriten);
    void wertLesen<ZeichenRef[]>(ZULETZT, []).then(setZuletzt);
  }, []);

  // Eigenes Zeichen mit freiem Text: Text vorbelegen
  useEffect(() => {
    if (aktuell?.quelle === "frei") {
      setReiter("frei");
      setForm(aktuell.grundform);
      setText(aktuell.text);
      setFarbe(aktuell.farbe);
      setTextfarbe(aktuell.textfarbe ?? "#000000");
    }
  }, [aktuell]);

  const treffer = useMemo(() => (anfrage.trim() ? zeichenSuchen(anfrage, { organisation, grenze: 80 }) : []), [anfrage, organisation]);
  const alleKategorien = useMemo(() => kategorien(), []);

  const waehlen = (r: ZeichenRef | undefined) => {
    if (r) {
      const neu = [r, ...zuletzt.filter((z) => ref2key(z) !== ref2key(r))].slice(0, 16);
      setZuletzt(neu);
      void wertSchreiben(ZULETZT, neu);
    }
    onWahl(r);
    dialogRef.current?.close();
  };

  const favorit = (r: ZeichenRef) => {
    const k = ref2key(r);
    const neu = favoriten.some((f) => ref2key(f) === k) ? favoriten.filter((f) => ref2key(f) !== k) : [...favoriten, r];
    setFavoriten(neu);
    void wertSchreiben(FAVORITEN, neu);
  };
  const istFavorit = (r: ZeichenRef) => favoriten.some((f) => ref2key(f) === ref2key(r));

  const kachel = (r: ZeichenRef, titel: string, nebentext?: string) => (
    <li key={ref2key(r)} className={aktuell && ref2key(aktuell) === ref2key(r) ? "gewaehlt" : undefined}>
      <button type="button" className="zeichen-kachel" onClick={() => waehlen(r)} title={titel}>
        <ZeichenBild zeichen={r} groesse={56} titel={titel} />
        <span className="zeichen-kachel-name">{titel}</span>
        {nebentext && <span className="zeichen-kachel-neben">{nebentext}</span>}
      </button>
      <button type="button" className={`stern ${istFavorit(r) ? "an" : ""}`} aria-pressed={istFavorit(r)} aria-label={`${titel} als Favorit`} title="Favorit" onClick={() => favorit(r)}>
        ★
      </button>
    </li>
  );

  const titelVon = (r: ZeichenRef) => (r.quelle === "eigen" ? eigeneVorlage(r.vorlage)?.titel ?? r.vorlage : zeichenName(r));

  return (
    <Dialog titel="Zeichen wählen" dialogRef={dialogRef} klasse="dialog-breit palette">
      <div className="reiter-leiste" role="tablist">
        <button type="button" role="tab" aria-selected={reiter === "suche"} onClick={() => setReiter("suche")}>
          Zeichen suchen
        </button>
        <button type="button" role="tab" aria-selected={reiter === "frei"} onClick={() => setReiter("frei")}>
          Freies Textzeichen
        </button>
      </div>

      {reiter === "suche" ? (
        <>
          <label className="feld">
            Suche (z. B. „EAL", „UEAL", „Zugtrupp THW", „Log-V")
            <input ref={suchfeld} type="search" value={anfrage} onChange={(e) => setAnfrage(e.target.value)} autoFocus placeholder="Name, Abkürzung, Organisation …" />
          </label>
          {anfrage.trim() ? (
            <>
              <p className="nebentext" role="status">
                {treffer.length === 0 ? "Kein Treffer. Fehlt ein Zeichen, hilft das freie Textzeichen." : `${treffer.length} Treffer`}
              </p>
              <ul className="zeichen-raster">{treffer.map((t: Suchtreffer) => kachel(t.ref, t.titel, t.kategorie))}</ul>
            </>
          ) : (
            <>
              {favoriten.length > 0 && (
                <>
                  <h3>Favoriten</h3>
                  <ul className="zeichen-raster">{favoriten.map((r) => kachel(r, titelVon(r)))}</ul>
                </>
              )}
              {zuletzt.length > 0 && (
                <>
                  <h3>Zuletzt benutzt</h3>
                  <ul className="zeichen-raster">{zuletzt.map((r) => kachel(r, titelVon(r)))}</ul>
                </>
              )}
              <h3>Nach Kategorie</h3>
              <label className="feld schmal">
                Kategorie
                <select value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
                  {alleKategorien.map((k) => (
                    <option key={k.kategorie} value={k.kategorie}>
                      {k.kategorie} ({k.eintraege.length})
                    </option>
                  ))}
                </select>
              </label>
              <ul className="zeichen-raster">{(alleKategorien.find((k) => k.kategorie === kategorie)?.eintraege ?? []).map((t) => kachel(t.ref, t.titel))}</ul>
            </>
          )}
          <div className="aktionen">
            <button type="button" onClick={() => waehlen(undefined)}>
              Ohne Zeichen
            </button>
          </div>
        </>
      ) : (
        <div className="frei-zeichen">
          <div className="frei-vorschau">
            <ZeichenBild zeichen={{ quelle: "frei", grundform: form, text, farbe, textfarbe }} groesse={128} />
          </div>
          <div>
            <label className="feld">
              Grundform
              <select value={form} onChange={(e) => setForm(e.target.value as Grundform)}>
                {GRUNDFORMEN.map((g) => (
                  <option key={g.form} value={g.form}>
                    {g.titel}
                  </option>
                ))}
              </select>
            </label>
            <label className="feld">
              Text im Zeichen
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={24} placeholder="z. B. ELO, LK, Stadt" />
            </label>
            <div className="zeile">
              <label className="feld schmal">
                Füllfarbe
                <input type="color" value={farbe} onChange={(e) => setFarbe(e.target.value)} />
              </label>
              <label className="feld schmal">
                Schriftfarbe
                <input type="color" value={textfarbe} onChange={(e) => setTextfarbe(e.target.value)} />
              </label>
            </div>
            <p className="hinweis">Für Stellen, für die es (noch) kein Zeichen gibt. Gelb = Führungsstelle, Orange = Verwaltungsstab, Blau = THW, Rot = Feuerwehr.</p>
            <div className="aktionen">
              <button type="button" className="primaer" onClick={() => waehlen({ quelle: "frei", grundform: form, text, farbe, textfarbe })}>
                Dieses Zeichen verwenden
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="hinweis">
        Zeichen: Sammlung Taktische-Zeichen von Jonas Köritz. Eigene Zeichen ({EIGENE_VORLAGEN.length}) im gleichen Stil nachgebaut.
      </p>
    </Dialog>
  );
}
