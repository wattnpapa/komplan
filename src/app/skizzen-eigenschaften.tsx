import type { Draft } from "immer";
import { FARBE_DRAHT, FARBE_FUNK, FARBE_SCHWARZ } from "../modell/skizze";
import type { Id, Linienart, Medium, Plan, SkAnschluss, SkGeraet, SkizzenAnsicht, SkizzenElement, SkNstTabelle } from "../modell/typen";
import { funkText } from "../layout/kontaktblock";
import { HILFE } from "./hilfe";
import { stelleTitel } from "./gliederung";

type Aendern = (rezept: (p: Draft<Plan>) => void, buendel?: string) => void;

const ART_TITEL: Record<SkizzenElement["art"], string> = {
  stelle: "Stellen-Kasten", anschluss: "Anschluss", geraet: "Gerät", "nst-tabelle": "NSt-Tabelle", platzhalter: "Platzhalter",
  zeichen: "Zeichen", text: "Text", rahmen: "Rahmen", knotenpunkt: "Abzweig/Sammelschiene", verbinder: "Verbinder",
};
const LINIEN: Linienart[] = ["durchgezogen", "gestrichelt", "gepunktet"];

export function SkizzenElementEigenschaften({ plan, ansicht, element, aendern, onStelle }: { plan: Plan; ansicht: SkizzenAnsicht; element: SkizzenElement; aendern: Aendern; onStelle: (id: Id) => void }) {
  const id = element.id;
  const setze = (f: (e: Draft<SkizzenElement>) => void, b = "") => aendern((p) => {
    const e = (p.ansichten[ansicht.id] as Draft<SkizzenAnsicht>).elemente[id];
    if (e) f(e);
  }, b ? `${id}.${b}` : undefined);
  const zahl = (feld: "x" | "y" | "b" | "h", titel: string) => (
    <label className="feld schmal">
      {titel}
      <input type="number" step={0.5} value={Math.round(element[feld] * 10) / 10} onChange={(e) => setze((x) => void (x[feld] = Number(e.target.value) || 0), feld)} />
    </label>
  );
  const stellen = Object.values(plan.stellen).filter((s) => s.typ === "stelle");

  return (
    <div className="eigenschaften">
      <h2 className="eig-titel">{ART_TITEL[element.art]}</h2>
      {element.art !== "verbinder" && (
        <div className="zeile">
          {zahl("x", "x (mm)")}
          {zahl("y", "y (mm)")}
          {zahl("b", "Breite")}
          {zahl("h", "Höhe")}
        </div>
      )}

      {(element.art === "stelle" || element.art === "zeichen" || element.art === "nst-tabelle") && (
        <label className="feld">
          Stelle (Daten kommen aus dem Plan)
          <select value={element.stelle ?? ""} onChange={(e) => setze((x) => void ("stelle" in x && (x.stelle = e.target.value)))}>
            {element.art === "zeichen" && <option value="">– frei –</option>}
            {stellen.map((s) => <option key={s.id} value={s.id}>{stelleTitel(s)}</option>)}
          </select>
        </label>
      )}
      {(element.art === "stelle" || element.art === "zeichen") && element.stelle && (
        <div className="aktionen">
          <button type="button" onClick={() => onStelle(element.stelle!)}>Kontaktdaten dieser Stelle bearbeiten</button>
        </div>
      )}
      {element.art === "stelle" && (
        <>
          <label className="feld">
            Inhalt des Kastens
            <select value={element.inhalt ?? "voll"} onChange={(e) => setze((x) => void (x.art === "stelle" && (x.inhalt = e.target.value as "voll" | "rahmen")))}>
              <option value="voll">Tel., Fax und Funk aus dem Plan</option>
              <option value="rahmen">nur Rahmen (Geräte usw. als eigene Elemente)</option>
            </select>
          </label>
          <label className="feld schmal">
            Mindestens Funk-Fahnen
            <input type="number" min={0} max={6} value={element.leereFunk ?? 0} onChange={(e) => setze((x) => void (x.art === "stelle" && (x.leereFunk = Number(e.target.value) || undefined)))} />
          </label>
        </>
      )}
      {element.art === "zeichen" && (
        <label className="feld">
          Text unter dem Zeichen (leer = Funkrufname der Stelle)
          <textarea rows={2} value={element.text ?? ""} onChange={(e) => setze((x) => void (x.art === "zeichen" && (x.text = e.target.value || undefined)), "text")} />
        </label>
      )}

      {element.art === "anschluss" && <AnschlussFelder plan={plan} element={element} setze={setze} />}

      {element.art === "geraet" && (
        <>
          <label className="feld">
            Gerät
            <select value={element.geraet} onChange={(e) => setze((x) => void (x.art === "geraet" && (x.geraet = e.target.value as SkGeraet["geraet"])))}>
              {[["4m", "4 m"], ["2m", "2 m"], ["mobfu", "Mob Fu"], ["handy", "Handy"], ["fax", "Fax"], ["pc", "PC"], ["tel", "Tel"], ["sonstig", "leer"]].map(([w, t]) => <option key={w} value={w}>{t}</option>)}
            </select>
          </label>
          <label className="feld">
            Beschriftung (statt Standard)
            <input value={element.text ?? ""} onChange={(e) => setze((x) => void (x.art === "geraet" && (x.text = e.target.value || undefined)), "text")} />
          </label>
        </>
      )}

      {element.art === "nst-tabelle" && <NstFelder element={element} setze={setze} />}

      {(element.art === "platzhalter" || element.art === "rahmen") && (
        <label className="feld">
          Text
          <input value={element.text ?? ""} onChange={(e) => setze((x) => void ((x.art === "platzhalter" || x.art === "rahmen") && (x.text = e.target.value || undefined)), "text")} />
        </label>
      )}
      {element.art === "rahmen" && (
        <label className="feld">
          Linie
          <select value={element.linie} onChange={(e) => setze((x) => void (x.art === "rahmen" && (x.linie = e.target.value as Linienart)))}>
            {LINIEN.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      )}
      {element.art === "text" && (
        <>
          <label className="feld">
            Text
            <textarea rows={3} value={element.text} onChange={(e) => setze((x) => void (x.art === "text" && (x.text = e.target.value)), "text")} />
          </label>
          <div className="zeile">
            <label className="feld schmal">
              Größe (pt)
              <input type="number" min={5} max={30} value={element.groesse} onChange={(e) => setze((x) => void (x.art === "text" && (x.groesse = Number(e.target.value) || 9)), "gr")} />
            </label>
            <label className="feld schmal">
              Farbe
              <input type="color" value={element.farbe ?? "#000000"} onChange={(e) => setze((x) => void (x.art === "text" && (x.farbe = e.target.value)), "farbe")} />
            </label>
            <label className="inline">
              <input type="checkbox" checked={!!element.fett} onChange={(e) => setze((x) => void (x.art === "text" && (x.fett = e.target.checked)))} />
              fett
            </label>
          </div>
        </>
      )}

      {element.art === "verbinder" && (
        <>
          <fieldset className="wahl">
            <legend>Farbe</legend>
            <div className="zeile">
              {([[FARBE_FUNK, "rot (Funk)"], [FARBE_DRAHT, "blau (Draht)"], [FARBE_SCHWARZ, "schwarz"]] as const).map(([f, t]) => (
                <label className="inline" key={f}>
                  <input type="radio" name="verbinder-farbe" checked={element.farbe === f} onChange={() => setze((x) => void (x.art === "verbinder" && (x.farbe = f)))} />
                  <span className="farb-punkt" style={{ background: f }} /> {t}
                </label>
              ))}
              <input type="color" aria-label="Eigene Farbe" value={element.farbe} onChange={(e) => setze((x) => void (x.art === "verbinder" && (x.farbe = e.target.value)), "farbe")} />
            </div>
          </fieldset>
          <label className="feld">
            Linie (auch im Schwarzweißdruck unterscheidbar)
            <select value={element.linie} onChange={(e) => setze((x) => void (x.art === "verbinder" && (x.linie = e.target.value as Linienart)))}>
              {LINIEN.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="feld">
            Medium
            <select value={element.medium ?? ""} onChange={(e) => setze((x) => void (x.art === "verbinder" && (x.medium = (e.target.value || undefined) as Medium | undefined)))}>
              <option value="">–</option>
              {(["funk-analog", "funk-digital", "telefon", "fax", "mobil", "email", "daten", "draht", "melder", "sonstig"] as Medium[]).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <div className="aktionen">
            <button type="button" disabled={!element.wegpunkte.length} onClick={() => setze((x) => void (x.art === "verbinder" && (x.wegpunkte = [])))}>Knick zurücksetzen</button>
          </div>
          <p className="hinweis">Den runden Griff in der Mitte ziehen, um den Knick zu verschieben. Die Enden bleiben an den Elementen hängen.</p>
        </>
      )}

      {element.art !== "verbinder" && (
        <label className="inline">
          <input type="checkbox" checked={!!element.technisch} onChange={(e) => setze((x) => void (x.technisch = e.target.checked || undefined))} />
          nur in der technischen Skizze zeigen
        </label>
      )}
    </div>
  );
}

function AnschlussFelder({ plan, element, setze }: { plan: Plan; element: SkAnschluss; setze: (f: (e: Draft<SkizzenElement>) => void, b?: string) => void }) {
  // Alle Kontakte und Funkangaben aller Stellen als Bezug
  const bezuege = Object.values(plan.stellen).flatMap((s) => [
    ...s.kontakte.filter((k) => k.wert).map((k) => ({ wert: `${s.id}|${k.id}`, text: `${stelleTitel(s)}: ${k.bezeichnung || k.art} ${k.wert}` })),
    ...s.funk.map((f) => ({ wert: `${s.id}|${f.id}`, text: `${stelleTitel(s)}: ${funkText(f).bezeichnung} ${funkText(f).wert}` })),
  ]);
  const aktuell = element.bezug ? `${element.bezug.stelle}|${element.bezug.eintrag}` : "";
  const a = (f: (x: Draft<SkAnschluss>) => void, b?: string) => setze((x) => void (x.art === "anschluss" && f(x)), b);
  return (
    <>
      <label className="feld">
        Art
        <select value={element.medium} onChange={(e) => a((x) => void (x.medium = e.target.value as SkAnschluss["medium"]))}>
          {[["funk-analog", "Funk (analog)"], ["funk-digital", "Funk (digital)"], ["telefon", "Telefon"], ["fax", "Fax"], ["mobil", "Mobilfunk"], ["email", "E-Mail"], ["pc", "PC"], ["mobilfunkadapter", "Mobilfunkadapter"], ["daten", "Daten"], ["sonstig", "Leer/sonstig"]].map(([w, t]) => (
            <option key={w} value={w}>{t}</option>
          ))}
        </select>
      </label>
      <label className="feld">
        Verknüpft mit (Wert kommt aus dem Plan)
        <select value={aktuell} onChange={(e) => a((x) => {
          if (!e.target.value) delete x.bezug;
          else {
            const [stelle, eintrag] = e.target.value.split("|");
            x.bezug = { stelle: stelle!, eintrag: eintrag! };
          }
        })}>
          <option value="">– freier Text –</option>
          {bezuege.map((b) => <option key={b.wert} value={b.wert}>{b.text}</option>)}
        </select>
      </label>
      {!element.bezug && (
        <label className="feld">
          Text
          <input value={element.text ?? ""} placeholder="z. B. 0999 1234 oder 501 G/U" onChange={(e) => a((x) => void (x.text = e.target.value || undefined), "text")} />
        </label>
      )}
      <div className="zeile">
        <label className="feld">
          Form
          <select value={element.form === "kasten" ? "kasten" : element.spitze} onChange={(e) => a((x) => {
            if (e.target.value === "kasten") x.form = "kasten";
            else {
              x.form = "fahne";
              x.spitze = e.target.value as SkAnschluss["spitze"];
            }
          })}>
            <option value="beide">Fahne, beidseitig spitz</option>
            <option value="links">Fahne, Spitze links</option>
            <option value="rechts">Fahne, Spitze rechts</option>
            <option value="kasten">Kasten</option>
          </select>
        </label>
      </div>
    </>
  );
}

function NstFelder({ element, setze }: { element: SkNstTabelle; setze: (f: (e: Draft<SkizzenElement>) => void, b?: string) => void }) {
  const n = (f: (x: Draft<SkNstTabelle>) => void, b?: string) => setze((x) => void (x.art === "nst-tabelle" && f(x)), b);
  const spalten: Array<[SkNstTabelle["spalten"][number], string]> = [["anschlussart", "Anschlussart"], ["technik", "Technik"], ["nummer", "NSt-Nr."], ["teilnehmer", "Teilnehmer"]];
  return (
    <>
      <fieldset className="wahl">
        <legend>Spalten</legend>
        {spalten.map(([s, t]) => (
          <label className="inline" key={s}>
            <input type="checkbox" checked={element.spalten.includes(s)} onChange={(e) => n((x) => void (x.spalten = spalten.map(([w]) => w).filter((w) => (w === s ? e.target.checked : x.spalten.includes(w)))))} />
            {t}
          </label>
        ))}
      </fieldset>
      <label className="feld">
        Vorgegebene Anschlussarten (je Zeile „Name: Zeilen")
        <textarea
          rows={4}
          defaultValue={(element.gruppen ?? []).map((g) => `${g.anschlussart}: ${g.zeilen}`).join("\n")}
          onBlur={(e) => n((x) => void (x.gruppen = e.target.value.split("\n").map((z) => z.trim()).filter(Boolean).map((z) => {
            const m = z.match(/^(.*?)(?::\s*(\d+))?$/)!;
            return { anschlussart: m[1]!.trim(), zeilen: Math.max(1, Number(m[2] ?? 1)) };
          })))}
        />
      </label>
      <label className="feld schmal">
        Leerzeilen
        <input type="number" min={0} max={30} value={element.leerzeilen} onChange={(e) => n((x) => void (x.leerzeilen = Math.max(0, Number(e.target.value) || 0)))} />
      </label>
      <p className="hinweis">Einträge kommen aus den Nebenstellen der Stelle (Eigenschaften der Stelle, Abschnitt Nebenstellen).</p>
    </>
  );
}

export function SkizzenAnsichtEigenschaften({ ansicht, aendern }: { ansicht: SkizzenAnsicht; aendern: Aendern }) {
  const s = (f: (a: Draft<SkizzenAnsicht>) => void, b?: string) => aendern((p) => f(p.ansichten[ansicht.id] as Draft<SkizzenAnsicht>), b);
  return (
    <div className="eigenschaften">
      <h2 className="eig-titel">Kommunikationsskizze</h2>
      <label className="feld">
        Name der Ansicht
        <input value={ansicht.name} onChange={(e) => s((a) => void (a.name = e.target.value), "name")} />
      </label>
      <label className="feld">
        Titel im Kopf
        <input list="skizzen-titel" value={ansicht.titel} onChange={(e) => s((a) => void (a.titel = e.target.value), "titel")} />
        <datalist id="skizzen-titel">
          <option value="Kommunikationsskizze" />
          <option value="Technisch-/Taktische Kommunikationsskizze" />
          <option value="Taktische Kommunikationsskizze" />
          <option value="Technische Kommunikationsskizze" />
        </datalist>
      </label>
      <fieldset className="wahl">
        <legend>Detailstufe</legend>
        <label className="inline">
          <input type="radio" name="detail" checked={ansicht.detail === "technisch"} onChange={() => s((a) => void (a.detail = "technisch"))} />
          technisch/betrieblich: alle Einzelheiten (Geräte, NSt, Draht)
        </label>
        <label className="inline">
          <input type="radio" name="detail" checked={ansicht.detail === "taktisch"} onChange={() => s((a) => void (a.detail = "taktisch"))} />
          taktisch: für Führungskräfte, nur Stellen und Funk
        </label>
      </fieldset>
      <div className="zeile">
        <label className="feld schmal">
          Papier
          <select value={`${ansicht.papier.format}-${ansicht.papier.ausrichtung}`} onChange={(e) => s((a) => {
            const [format, ausrichtung] = e.target.value.split("-") as ["A4" | "A3", "quer" | "hoch"];
            a.papier = { ...a.papier, format, ausrichtung };
          })}>
            <option value="A4-quer">A4 quer</option>
            <option value="A4-hoch">A4 hoch</option>
            <option value="A3-quer">A3 quer</option>
            <option value="A3-hoch">A3 hoch</option>
          </select>
        </label>
        <label className="feld schmal">
          Raster (mm)
          <input type="number" min={0.5} max={10} step={0.5} value={ansicht.raster} onChange={(e) => s((a) => void (a.raster = Number(e.target.value) || 2.5), "raster")} />
        </label>
      </div>
      <p className="hinweis">Kopf (Führungsstelle, für, F.d.R., Einstufung) und Logo gelten für alle Ansichten des Plans und stehen weiter unten.</p>
      <p className="hinweis">
        Bedienung: Werkzeug wählen und auf die Fläche klicken; Stellen aus der Gliederung auf die Fläche ziehen. An den runden Punkten eines Elements einen Verbinder zum nächsten Element ziehen. Gummiband zum Auswählen, Alt+Ziehen
        oder mittlere Maustaste zum Verschieben der Ansicht. Pfeiltasten verschieben um ein Raster (Umschalt: 0,5 mm), Strg+C/V/D kopieren, Strg+G gruppieren.
      </p>
      <p className="hinweis">{HILFE.kommunikationsskizze}</p>
    </div>
  );
}
