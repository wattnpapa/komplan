import { useMemo, useRef } from "react";
import type { Draft } from "immer";
import { THW_ORTSVERBAENDE } from "@bos/vokabulare/thw-ov";
import { dtgAusZeitpunkt, jetzt, zeitpunktAusDtg, zeitpunktLesbar } from "../modell/dtg";
import { neueId } from "../modell/id";
import type { FuehrungsorgAnsicht, Id, KomplanAnsicht, Linienart, Organisation, Plan, Stelle, ZeichenRef } from "../modell/typen";
import { eigeneVorlage } from "../zeichen/eigen/vorlagen";
import { zeichenName } from "../zeichen/katalog";
import { HILFE, Hilfe } from "./hilfe";
import { stelleTitel } from "./gliederung";
import { ZeichenBild } from "./zeichen-bild";
import { Zeichenpalette } from "./zeichenpalette";

type Aendern = (rezept: (p: Draft<Plan>) => void, buendel?: string) => void;
type BaumAnsicht = FuehrungsorgAnsicht | KomplanAnsicht;

const LINIEN: Array<{ wert: Linienart; titel: string }> = [
  { wert: "durchgezogen", titel: "durchgezogen (Unterstellung)" },
  { wert: "gestrichelt", titel: "gestrichelt (Zusammenarbeit)" },
  { wert: "gepunktet", titel: "gepunktet (geplant/optional)" },
];

const BETRIEB_VORSCHLAEGE = THW_ORTSVERBAENDE.map((ov) => `THW OV ${ov.name}`);

/** Eigenschaften einer Stelle. */
export function StelleEigenschaften({ plan, stelle, ansicht, aendern }: { plan: Plan; stelle: Stelle; ansicht: BaumAnsicht; aendern: Aendern }) {
  const palette = useRef<HTMLDialogElement>(null);
  const id = stelle.id;
  const setze = <K extends keyof Stelle>(feld: K, wert: Stelle[K]) =>
    aendern((p) => {
      (p.stellen[id] as Stelle)[feld] = wert;
    }, `${id}.${String(feld)}`);
  const eltern = useMemo(() => Object.values(plan.stellen).find((s) => s.kinder.includes(id)), [plan, id]);
  const ansichtKnoten = ansicht.knoten[id];

  const zeichenText = stelle.zeichen?.quelle === "eigen" ? stelle.zeichen.text ?? eigeneVorlage(stelle.zeichen.vorlage)?.vorgabe.text ?? "" : undefined;

  return (
    <div className="eigenschaften">
      <h2 className="eig-titel">{stelleTitel(stelle)}</h2>
      {stelle.typ === "stelle" ? (
        <>
          <div className="eig-zeichen">
            <button type="button" className="zeichen-knopf" onClick={() => palette.current?.showModal()} title="Zeichen wählen">
              <ZeichenBild zeichen={stelle.zeichen} groesse={64} />
              <span>
                {zeichenName(stelle.zeichen) || "Kein Zeichen"}
                <br />
                <span className="nebentext">Zeichen wählen…</span>
              </span>
            </button>
            <Hilfe zeichen={stelle.zeichen} />
          </div>
          {zeichenText !== undefined && (
            <label className="feld">
              Text im Zeichen
              <input value={zeichenText} maxLength={24} onChange={(e) => aendern((p) => {
                const z = p.stellen[id]!.zeichen;
                if (z?.quelle === "eigen") z.text = e.target.value;
              }, `${id}.zeichentext`)} />
            </label>
          )}
          {stelle.zeichen?.quelle === "frei" && (
            <label className="feld">
              Text im Zeichen
              <input value={stelle.zeichen.text} maxLength={24} onChange={(e) => aendern((p) => {
                const z = p.stellen[id]!.zeichen;
                if (z?.quelle === "frei") z.text = e.target.value;
              }, `${id}.zeichentext`)} />
            </label>
          )}
          <div className="zeile">
            <label className="feld">
              Beschriftung
              <input value={stelle.beschriftung} onChange={(e) => setze("beschriftung", e.target.value)} placeholder="z. B. Ortsname" />
            </label>
            <label className="feld schmal">
              Nummer
              <input value={stelle.nummer ?? ""} onChange={(e) => setze("nummer", e.target.value || undefined)} placeholder="1" />
            </label>
          </div>
          <label className="feld">
            Lage der Beschriftung
            <select value={stelle.beschriftungPosition ?? "unten"} onChange={(e) => setze("beschriftungPosition", e.target.value as Stelle["beschriftungPosition"])}>
              <option value="unten">unter dem Zeichen</option>
              <option value="rechts">rechts neben dem Zeichen</option>
              <option value="links">links neben dem Zeichen</option>
            </select>
          </label>
          <label className="feld">
            Zusatzzeilen (eine je Zeile)
            <textarea rows={2} value={stelle.zusatzzeilen.join("\n")} onChange={(e) => setze("zusatzzeilen", e.target.value.split("\n"))} />
          </label>
          <label className="feld schmal">
            Gestapelt (Anzahl)
            <input type="number" min={1} max={6} value={stelle.stapel ?? 1} onChange={(e) => setze("stapel", Math.max(1, Math.min(6, Number(e.target.value) || 1)))} />
          </label>

          <details className="eig-gruppe" open>
            <summary>Stammdaten</summary>
            <label className="feld">
              Bezeichnung
              <input value={stelle.bezeichnung} onChange={(e) => setze("bezeichnung", e.target.value)} placeholder="z. B. Einsatzabschnittsleitung Nord" />
            </label>
            <label className="feld">
              Funkrufname
              <input value={stelle.funkrufname ?? ""} onChange={(e) => setze("funkrufname", e.target.value || undefined)} placeholder="z. B. Heros Musterstadt 10" />
            </label>
            <label className="feld">
              Betrieb durch
              <input list="betrieb-vorschlaege" value={stelle.betriebDurch ?? ""} onChange={(e) => setze("betriebDurch", e.target.value || undefined)} placeholder="z. B. THW FK Musterstadt" />
            </label>
            <label className="feld">
              Leiter
              <input value={stelle.leiter?.name ?? ""} onChange={(e) => aendern((p) => {
                const s = p.stellen[id]!;
                if (!e.target.value && !s.leiter?.funkrufname && !s.leiter?.kontakte.length) delete s.leiter;
                else s.leiter = { ...(s.leiter ?? { kontakte: [] }), name: e.target.value };
              }, `${id}.leiter`)} />
            </label>
            <p className="hinweis">Kontaktangaben (Telefon, Fax, E-Mail, Rufgruppen) folgen mit dem Kommunikationsplan.</p>
          </details>
        </>
      ) : (
        <label className="feld">
          Auslassungszeichen
          <select value={stelle.auslassung ?? "⋮"} onChange={(e) => setze("auslassung", e.target.value as Stelle["auslassung"])}>
            <option value="⋮">⋮ (senkrecht)</option>
            <option value="…">… (waagerecht)</option>
          </select>
        </label>
      )}

      <details className="eig-gruppe" open>
        <summary>Anbindung und Layout</summary>
        {eltern ? (
          <>
            <label className="feld">
              Lage zur übergeordneten Stelle ({stelleTitel(eltern)})
              <select value={stelle.anbindung.lage} onChange={(e) => aendern((p) => void (p.stellen[id]!.anbindung.lage = e.target.value as Stelle["anbindung"]["lage"]))}>
                <option value="unten">unterstellt (darunter)</option>
                <option value="seitlich-rechts">seitlich rechts angehängt</option>
                <option value="seitlich-links">seitlich links angehängt</option>
              </select>
            </label>
            <label className="feld">
              Linie
              <select value={stelle.anbindung.linie} onChange={(e) => aendern((p) => void (p.stellen[id]!.anbindung.linie = e.target.value as Linienart))}>
                {LINIEN.map((l) => (
                  <option key={l.wert} value={l.wert}>
                    {l.titel}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <p className="hinweis">Oberste Stelle.</p>
        )}
        {stelle.kinder.length > 0 && (
          <>
            <label className="feld">
              Unterstellte anordnen
              <select value={stelle.layout?.kinder ?? "horizontal"} onChange={(e) => aendern((p) => void (p.stellen[id]!.layout = { ...p.stellen[id]!.layout, kinder: e.target.value as "horizontal" | "vertikal" }))}>
                <option value="horizontal">nebeneinander (Sammelschiene)</option>
                <option value="vertikal">untereinander (Kamm)</option>
              </select>
            </label>
            <label className="feld schmal">
              Abstand (mm)
              <input
                type="number"
                min={2}
                max={60}
                value={stelle.layout?.abstand ?? ""}
                placeholder={String(ansicht.abstandStandard.senkrecht)}
                onChange={(e) => aendern((p) => void (p.stellen[id]!.layout = { ...p.stellen[id]!.layout, abstand: e.target.value ? Number(e.target.value) : undefined }), `${id}.abstand`)}
              />
            </label>
            <label className="inline">
              <input
                type="checkbox"
                checked={!!ansichtKnoten?.eingeklappt}
                onChange={(e) => aendern((p) => {
                  const a = p.ansichten[ansicht.id] as Draft<BaumAnsicht>;
                  a.knoten[id] = { ...a.knoten[id], eingeklappt: e.target.checked || undefined };
                })}
              />
              Im Plan eingeklappt zeigen
            </label>
          </>
        )}
      </details>
      <datalist id="betrieb-vorschlaege">
        {BETRIEB_VORSCHLAEGE.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <Zeichenpalette dialogRef={palette} aktuell={stelle.zeichen} organisation={plan.organisation} onWahl={(r: ZeichenRef | undefined) => aendern((p) => void (p.stellen[id]!.zeichen = r))} />
    </div>
  );
}

const ORGANISATIONEN: Array<[Organisation, string]> = [
  ["thw", "THW"], ["feuerwehr", "Feuerwehr"], ["polizei", "Polizei"], ["rettungsdienst", "Rettungsdienst"],
  ["hilfsorganisation", "Hilfsorganisation"], ["wasserrettung", "Wasserrettung"], ["bundeswehr", "Bundeswehr"], ["verwaltung", "Verwaltung/Stab"], ["sonstige", "Sonstige"],
];

/** Eigenschaften des Plans und der Ansicht (keine Stelle gewählt). */
export function PlanEigenschaften({ plan, ansicht, aendern, auswahl }: { plan: Plan; ansicht: BaumAnsicht; aendern: Aendern; auswahl: Id[] }) {
  const dtgFeld = useRef<HTMLInputElement>(null);
  const setzeAnsicht = (f: (a: Draft<BaumAnsicht>) => void, b?: string) => aendern((p) => f(p.ansichten[ansicht.id] as Draft<BaumAnsicht>), b);

  return (
    <div className="eigenschaften">
      <h2 className="eig-titel">Plan</h2>
      <label className="feld">
        Name
        <input value={plan.name} onChange={(e) => aendern((p) => void (p.name = e.target.value), "name")} />
      </label>
      <div className="zeile">
        <label className="feld">
          Stand (DTG)
          <input
            ref={dtgFeld}
            key={plan.stand.dtg}
            defaultValue={plan.stand.dtg}
            className="daten"
            aria-describedby="dtg-hilfe"
            onBlur={(e) => {
              const z = zeitpunktAusDtg(e.target.value);
              if (z) aendern((p) => void (p.stand = { ...p.stand, zeitpunkt: z, dtg: dtgAusZeitpunkt(z) }));
              else e.target.value = plan.stand.dtg;
            }}
          />
        </label>
        <label className="feld">
          oder Datum/Uhrzeit
          <input
            type="datetime-local"
            value={plan.stand.zeitpunkt}
            onChange={(e) => e.target.value && aendern((p) => void (p.stand = { ...p.stand, zeitpunkt: e.target.value.slice(0, 16), dtg: dtgAusZeitpunkt(e.target.value) }))}
          />
        </label>
      </div>
      <div className="aktionen">
        <button type="button" onClick={() => aendern((p) => {
          const z = jetzt();
          p.stand = { ...p.stand, zeitpunkt: z, dtg: dtgAusZeitpunkt(z) };
        })}>
          Stand: jetzt
        </button>
      </div>
      <p className="hinweis" id="dtg-hilfe">
        DTG wie „172027NOV26" = Tag, Stunde, Minute, Monat, Jahr. Entspricht {zeitpunktLesbar(plan.stand.zeitpunkt)}. Version {plan.stand.version}.
      </p>
      <label className="feld">
        Organisation (Vorgabe für Zeichen)
        <select value={plan.organisation} onChange={(e) => aendern((p) => void (p.organisation = e.target.value as Organisation))}>
          {ORGANISATIONEN.map(([w, t]) => (
            <option key={w} value={w}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <details className="eig-gruppe">
        <summary>Kopf (herausgebende Stelle, für, F.d.R.)</summary>
        {([
          ["fuehrungsstelle", "Führungsstelle (herausgebend)"],
          ["verfasserFunktion", "Funktion des Verfassers"],
          ["fuer", "für (Einsatz/Verwendung)"],
          ["fdr", "F.d.R. (Name, Dienststellung)"],
          ["einstufung", "Einstufung (z. B. VS – Nur für den Dienstgebrauch)"],
        ] as const).map(([feld, titel]) => (
          <label className="feld" key={feld}>
            {titel}
            <input value={plan.kopf[feld] ?? ""} onChange={(e) => aendern((p) => void ((p.kopf as Record<string, string | undefined>)[feld] = e.target.value || undefined), `kopf.${feld}`)} />
          </label>
        ))}
      </details>

      <details className="eig-gruppe" open>
        <summary>Ansicht „{ansicht.name}"</summary>
        <div className="zeile">
          <label className="feld schmal">
            Abstand waagerecht (mm)
            <input type="number" min={2} max={60} value={ansicht.abstandStandard.waagerecht} onChange={(e) => setzeAnsicht((a) => void (a.abstandStandard.waagerecht = Number(e.target.value) || 8), "abstandX")} />
          </label>
          <label className="feld schmal">
            Abstand senkrecht (mm)
            <input type="number" min={2} max={60} value={ansicht.abstandStandard.senkrecht} onChange={(e) => setzeAnsicht((a) => void (a.abstandStandard.senkrecht = Number(e.target.value) || 12), "abstandY")} />
          </label>
        </div>
        <label className="inline">
          <input type="checkbox" checked={ansicht.kopfleiste} onChange={(e) => setzeAnsicht((a) => void (a.kopfleiste = e.target.checked))} />
          Titelzeile mit Planname und Stand
        </label>
      </details>

      <details className="eig-gruppe" open>
        <summary>Hervorhebungen ({ansicht.hervorhebungen.length})</summary>
        <p className="hinweis">Stellen mit Strg/Umschalt anklicken, dann hier als Fläche oder Rahmen hervorheben.</p>
        <div className="aktionen">
          <button
            type="button"
            disabled={auswahl.length === 0}
            onClick={() => setzeAnsicht((a) => void a.hervorhebungen.push({ id: neueId(), stellen: [...auswahl], stil: "flaeche", farbe: "#38c8f5", linie: "durchgezogen" }))}
          >
            Auswahl hervorheben ({auswahl.length})
          </button>
        </div>
        {ansicht.hervorhebungen.map((h, i) => (
          <div className="hv-zeile" key={h.id}>
            <input type="color" value={h.farbe} aria-label="Farbe" onChange={(e) => setzeAnsicht((a) => void (a.hervorhebungen[i]!.farbe = e.target.value), `hv${h.id}`)} />
            <select value={h.stil} aria-label="Stil" onChange={(e) => setzeAnsicht((a) => void (a.hervorhebungen[i]!.stil = e.target.value as "flaeche" | "rahmen"))}>
              <option value="flaeche">Fläche</option>
              <option value="rahmen">Rahmen</option>
            </select>
            <select value={h.linie} aria-label="Linie" onChange={(e) => setzeAnsicht((a) => void (a.hervorhebungen[i]!.linie = e.target.value as Linienart))}>
              {LINIEN.map((l) => (
                <option key={l.wert} value={l.wert}>
                  {l.wert}
                </option>
              ))}
            </select>
            <input value={h.text ?? ""} placeholder="Text" aria-label="Text" onChange={(e) => setzeAnsicht((a) => void (a.hervorhebungen[i]!.text = e.target.value || undefined), `hvt${h.id}`)} />
            <span className="nebentext">{h.stellen.length} Stellen</span>
            <button type="button" aria-label="Hervorhebung entfernen" onClick={() => setzeAnsicht((a) => void a.hervorhebungen.splice(i, 1))}>
              ×
            </button>
          </div>
        ))}
      </details>
      <p className="hinweis">{HILFE.fuehrungsorganisation}</p>
    </div>
  );
}
