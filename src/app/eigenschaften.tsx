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
import { FunkEditor, KontakteEditor, NebenstellenEditor } from "./kontakte-editor";
import type { KontaktLage } from "../modell/typen";
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
            {stelle.leiter && (
              <div className="zeile">
                <label className="feld">
                  Dienststellung Leiter
                  <input value={stelle.leiter.dienststellung ?? ""} onChange={(e) => aendern((p) => void (p.stellen[id]!.leiter!.dienststellung = e.target.value || undefined), `${id}.leiterDst`)} />
                </label>
                <label className="feld">
                  Funkrufname Leiter
                  <input value={stelle.leiter.funkrufname ?? ""} onChange={(e) => aendern((p) => void (p.stellen[id]!.leiter!.funkrufname = e.target.value || undefined), `${id}.leiterFrn`)} />
                </label>
              </div>
            )}
          </details>

          <details className="eig-gruppe" open>
            <summary>Erreichbarkeit ({stelle.kontakte.length})</summary>
            <KontakteEditor liste={stelle.kontakte} pfad={(p) => p.stellen[id]!.kontakte} aendern={aendern} schluessel={`${id}.k`} />
          </details>
          <details className="eig-gruppe" open={stelle.funk.length > 0}>
            <summary>Funk: Rufgruppen und Kanäle ({stelle.funk.length})</summary>
            <FunkEditor liste={stelle.funk} pfad={(p) => p.stellen[id]!.funk} aendern={aendern} schluessel={`${id}.f`} />
          </details>
          <details className="eig-gruppe" open={stelle.nebenstellen.length > 0}>
            <summary>Nebenstellen ({stelle.nebenstellen.length})</summary>
            <NebenstellenEditor liste={stelle.nebenstellen} pfad={(p) => p.stellen[id]!.nebenstellen} aendern={aendern} schluessel={`${id}.n`} />
          </details>
          {ansicht.typ === "kommunikationsplan" && (
            <label className="feld">
              Kontaktblock in „{ansicht.name}"
              <select
                value={ansichtKnoten?.kontaktLage ?? ""}
                onChange={(e) => aendern((p) => {
                  const a = p.ansichten[ansicht.id] as Draft<BaumAnsicht>;
                  a.knoten[id] = { ...a.knoten[id], kontaktLage: (e.target.value || undefined) as KontaktLage | "aus" | undefined };
                })}
              >
                <option value="">wie Ansicht ({ansicht.kontaktLage})</option>
                <option value="rechts">rechts</option>
                <option value="links">links</option>
                <option value="unten">unten</option>
                <option value="aus">ausblenden</option>
              </select>
            </label>
          )}
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
            {stelle.anbindung.lage === "unten" && (
              <label className="feld schmal">
                Tiefer setzen (mm)
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={stelle.layout?.versatz ?? ""}
                  placeholder="0"
                  onChange={(e) => aendern((p) => void (p.stellen[id]!.layout = { ...p.stellen[id]!.layout, versatz: e.target.value ? Number(e.target.value) : undefined }), `${id}.versatz`)}
                />
              </label>
            )}
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
export function PlanEigenschaften({ plan, ansicht, aendern, auswahl, nurPlan }: { plan: Plan; ansicht: BaumAnsicht; aendern: Aendern; auswahl: Id[]; nurPlan?: boolean }) {
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

      {!nurPlan && (<>
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
          {ansicht.typ === "kommunikationsplan" ? "Kopfleiste (Formularkopf)" : "Titelzeile mit Planname und Stand"}
        </label>
        {ansicht.typ === "kommunikationsplan" && <KomplanEinstellungen ansicht={ansicht} setzeAnsicht={setzeAnsicht} />}
        <div className="zeile">
          <label className="feld schmal">
            Papier
            <select value={`${ansicht.papier.format}-${ansicht.papier.ausrichtung}`} onChange={(e) => setzeAnsicht((a) => {
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
            Große Pläne
            <select value={ansicht.papier.grosseFlaeche} onChange={(e) => setzeAnsicht((a) => void (a.papier.grosseFlaeche = e.target.value as "einpassen" | "teilen"))}>
              <option value="einpassen">auf Seite einpassen</option>
              <option value="teilen">auf Seiten teilen</option>
            </select>
          </label>
        </div>
      </details>

      </>)}
      <details className="eig-gruppe">
        <summary>Fußnoten und freie Zeilen ({plan.fussnoten.length})</summary>
        {plan.fussnoten.map((f, i) => (
          <div className="hv-zeile" key={f.id}>
            <input className="schmal-eingabe" value={f.marke ?? ""} placeholder="1)" aria-label="Marke" onChange={(e) => aendern((p) => void (p.fussnoten[i]!.marke = e.target.value || undefined), `fn${f.id}m`)} />
            <input value={f.text} aria-label="Text der Fußnote" onChange={(e) => aendern((p) => void (p.fussnoten[i]!.text = e.target.value), `fn${f.id}`)} />
            <button type="button" aria-label="Fußnote entfernen" onClick={() => aendern((p) => void p.fussnoten.splice(i, 1))}>×</button>
          </div>
        ))}
        <div className="aktionen">
          <button type="button" onClick={() => aendern((p) => void p.fussnoten.push({ id: neueId(), marke: `${p.fussnoten.length + 1})`, text: "" }))}>+ Fußnote</button>
        </div>
      </details>

      <details className="eig-gruppe">
        <summary>Logo im Kopf</summary>
        <LogoWahl plan={plan} aendern={aendern} />
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

const FELDER: Array<[KomplanAnsicht["felder"][number], string]> = [
  ["bezeichnung", "Bezeichnung"], ["betriebDurch", "Betrieb durch"], ["leiter", "Leiter"], ["telefon", "Telefon"], ["fax", "Fax"],
  ["mobil", "Mobil"], ["email", "E-Mail"], ["funk", "Rufgruppen/Kanäle"], ["funkrufname", "Funkrufname"], ["nebenstellen", "Nebenstellen"],
];

function KomplanEinstellungen({ ansicht, setzeAnsicht }: { ansicht: KomplanAnsicht; setzeAnsicht: (f: (a: Draft<BaumAnsicht>) => void, b?: string) => void }) {
  const k = (f: (a: Draft<KomplanAnsicht>) => void) => setzeAnsicht((a) => f(a as Draft<KomplanAnsicht>));
  return (
    <>
      <label className="feld">
        Darstellung
        <select value={ansicht.variante} onChange={(e) => k((a) => void (a.variante = e.target.value as KomplanAnsicht["variante"]))}>
          <option value="organigramm">Organigramm mit Kontaktblöcken</option>
          <option value="fb-fue-76" disabled>Formular Fb Fü 76 (folgt)</option>
          <option value="fwdv-800" disabled>FwDV 800 Anlage 1 (folgt)</option>
        </select>
      </label>
      <label className="feld">
        Kontaktblock
        <select value={ansicht.kontaktLage} onChange={(e) => k((a) => void (a.kontaktLage = e.target.value as KontaktLage))}>
          <option value="rechts">rechts neben dem Zeichen</option>
          <option value="links">links neben dem Zeichen</option>
          <option value="unten">unter dem Zeichen</option>
        </select>
      </label>
      <fieldset className="wahl">
        <legend>Angaben im Block</legend>
        {FELDER.map(([f, t]) => (
          <label className="inline" key={f}>
            <input type="checkbox" checked={ansicht.felder.includes(f)} onChange={(e) => k((a) => void (a.felder = e.target.checked ? [...a.felder, f] : a.felder.filter((x) => x !== f)))} />
            {t}
          </label>
        ))}
      </fieldset>
      <label className="inline">
        <input type="checkbox" checked={ansicht.platzhalter} onChange={(e) => k((a) => void (a.platzhalter = e.target.checked))} />
        Leere Felder als gepunktete Linie (zum Ausfüllen auf Papier)
      </label>
    </>
  );
}

/** Logo laden: PNG/JPEG direkt, alles andere (auch SVG) wird zu PNG gerastert. */
function LogoWahl({ plan, aendern }: { plan: Plan; aendern: Aendern }) {
  const bild = plan.kopf.logo ? plan.bilder[plan.kopf.logo] : undefined;
  const laden = async (datei: File) => {
    const url = URL.createObjectURL(datei);
    try {
      const img = new Image();
      await new Promise<void>((ok, fehler) => { img.onload = () => ok(); img.onerror = () => fehler(new Error("Bild nicht lesbar")); img.src = url; });
      const max = 600;
      const f = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round((img.naturalWidth || max) * f));
      c.height = Math.max(1, Math.round((img.naturalHeight || max / 3) * f));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const daten = c.toDataURL("image/png");
      const id = neueId();
      aendern((p) => {
        if (p.kopf.logo) delete p.bilder[p.kopf.logo];
        p.bilder[id] = { id, mime: "image/png", daten, breite: c.width, hoehe: c.height };
        p.kopf.logo = id;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  return (
    <>
      {bild && <img src={bild.daten} alt="Logo" className="logo-vorschau" />}
      <p className="hinweis">Rechts im Kopf. Kein Logo im Programm; ein eigenes Bild bleibt im Plan gespeichert.</p>
      <div className="aktionen">
        <label className="datei-knopf knopf-label">
          Bild wählen…
          <input type="file" accept="image/*" className="nur-sr" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void laden(f); }} />
        </label>
        {bild && <button type="button" onClick={() => aendern((p) => { if (p.kopf.logo) delete p.bilder[p.kopf.logo]; delete p.kopf.logo; })}>Logo entfernen</button>}
      </div>
    </>
  );
}
