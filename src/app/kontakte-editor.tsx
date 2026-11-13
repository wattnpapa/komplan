import type { Draft } from "immer";
import { neueId } from "../modell/id";
import type { Funkangabe, Kontakt, KontaktArt, Nebenstelle, Plan, Richtung } from "../modell/typen";

type Aendern = (rezept: (p: Draft<Plan>) => void, buendel?: string) => void;

const ARTEN: Array<[KontaktArt, string]> = [
  ["telefon", "Telefon"], ["fax", "Fax"], ["mobil", "Mobil"], ["email", "E-Mail"], ["sat", "Satellit"], ["messenger", "Messenger"], ["sonstig", "Sonstiges"],
];

const RICHTUNGEN: Array<[Richtung, string]> = [
  ["unten", "↓ zu den Unterstellten"], ["oben", "↑ zur übergeordneten Stelle"], ["beide", "↕ beide"], ["keine", "– ohne"],
];

const PLATZHALTER: Record<KontaktArt, string> = {
  telefon: "0999 123-0", fax: "0999 123-99", mobil: "0999 555 1234", email: "stab@example.org", sat: "", messenger: "", sonstig: "",
};

/**
 * Liste von Kontaktangaben. `pfad` wählt im Entwurf die Liste aus
 * (Stelle oder Leiter), damit derselbe Editor für beide taugt.
 */
export function KontakteEditor({ liste, pfad, aendern, schluessel }: { liste: Kontakt[]; pfad: (p: Draft<Plan>) => Draft<Kontakt>[]; aendern: Aendern; schluessel: string }) {
  const setze = (i: number, f: (k: Draft<Kontakt>) => void, feld: string) => aendern((p) => f(pfad(p)[i]!), `${schluessel}.${liste[i]!.id}.${feld}`);
  return (
    <div className="eintrag-liste">
      {liste.map((k, i) => (
        <fieldset className="eintrag" key={k.id}>
          <legend className="nur-sr">Kontakt {i + 1}</legend>
          <div className="zeile">
            <label className="feld schmal">
              Art
              <select value={k.art} onChange={(e) => setze(i, (x) => void (x.art = e.target.value as KontaktArt), "art")}>
                {ARTEN.map(([w, t]) => (
                  <option key={w} value={w}>{t}</option>
                ))}
              </select>
            </label>
            <label className="feld">
              {k.art === "email" ? "Adresse" : "Nummer"}
              <input value={k.wert} placeholder={`leer = Feld zum Ausfüllen (${PLATZHALTER[k.art] || "…"})`} onChange={(e) => setze(i, (x) => void (x.wert = e.target.value), "wert")} inputMode={k.art === "email" ? "email" : k.art === "sonstig" ? "text" : "tel"} />
            </label>
          </div>
          <details className="eintrag-mehr" open={!!(k.bezeichnung || k.gueltigAb || k.gueltigBis)}>
            <summary>Bezeichnung, Gültigkeit</summary>
            <label className="feld">
              Bezeichnung (statt „Tel." usw.)
              <input value={k.bezeichnung ?? ""} placeholder="z. B. Mail 1, HVB, Abfrage" onChange={(e) => setze(i, (x) => void (x.bezeichnung = e.target.value || undefined), "bez")} />
            </label>
            <div className="zeile">
              <label className="feld">
                gültig ab
                <input type="datetime-local" value={k.gueltigAb ?? ""} onChange={(e) => setze(i, (x) => void (x.gueltigAb = e.target.value.slice(0, 16) || undefined), "ab")} />
              </label>
              <label className="feld">
                gültig bis
                <input type="datetime-local" value={k.gueltigBis ?? ""} onChange={(e) => setze(i, (x) => void (x.gueltigBis = e.target.value.slice(0, 16) || undefined), "bis")} />
              </label>
            </div>
          </details>
          <div className="eintrag-aktionen">
            <button type="button" disabled={i === 0} onClick={() => aendern((p) => { const l = pfad(p); l.splice(i - 1, 0, l.splice(i, 1)[0]!); })} aria-label="Nach oben">↑</button>
            <button type="button" onClick={() => aendern((p) => void pfad(p).splice(i, 1))} aria-label={`Kontakt ${k.wert || i + 1} entfernen`}>Entfernen</button>
          </div>
        </fieldset>
      ))}
      <div className="aktionen">
        {(["telefon", "fax", "mobil", "email"] as const).map((art) => (
          <button key={art} type="button" onClick={() => aendern((p) => void pfad(p).push({ id: neueId(), art, wert: "" }))}>
            + {ARTEN.find(([w]) => w === art)![1]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FunkEditor({ liste, pfad, aendern, schluessel }: { liste: Funkangabe[]; pfad: (p: Draft<Plan>) => Draft<Funkangabe>[]; aendern: Aendern; schluessel: string }) {
  const setze = (i: number, f: (k: Draft<Funkangabe>) => void, feld: string) => aendern((p) => f(pfad(p)[i]!), `${schluessel}.${liste[i]!.id}.${feld}`);
  return (
    <div className="eintrag-liste">
      {liste.map((f, i) => (
        <fieldset className="eintrag" key={f.id}>
          <legend className="nur-sr">Funk {i + 1}</legend>
          {f.art === "digital" ? (
            <div className="zeile">
              <label className="feld schmal">
                Betrieb
                <select value={f.betrieb} onChange={(e) => setze(i, (x) => void (x.art === "digital" && (x.betrieb = e.target.value as "TMO" | "DMO")), "betrieb")}>
                  <option value="TMO">TMO</option>
                  <option value="DMO">DMO</option>
                </select>
              </label>
              <label className="feld">
                Rufgruppe
                <input className="daten" value={f.rufgruppe} placeholder="z. B. TBZ_9901_UNI" onChange={(e) => setze(i, (x) => void (x.art === "digital" && (x.rufgruppe = e.target.value)), "rg")} />
              </label>
            </div>
          ) : (
            <div className="zeile">
              <label className="feld schmal">
                Band
                <select value={f.band} onChange={(e) => setze(i, (x) => void (x.art === "analog" && (x.band = e.target.value as "4m" | "2m")), "band")}>
                  <option value="4m">4 m</option>
                  <option value="2m">2 m</option>
                </select>
              </label>
              <label className="feld schmal">
                Kanal
                <input className="daten" value={f.kanal} onChange={(e) => setze(i, (x) => void (x.art === "analog" && (x.kanal = e.target.value)), "kanal")} />
              </label>
              <label className="feld schmal">
                Betriebsart
                <input list="betriebsarten" value={f.betriebsart} onChange={(e) => setze(i, (x) => void (x.art === "analog" && (x.betriebsart = e.target.value)), "ba")} />
              </label>
            </div>
          )}
          <div className="zeile">
            <label className="feld">
              Richtung
              <select value={f.richtung} onChange={(e) => setze(i, (x) => void (x.richtung = e.target.value as Richtung), "richtung")}>
                {RICHTUNGEN.map(([w, t]) => (
                  <option key={w} value={w}>{t}</option>
                ))}
              </select>
            </label>
            <label className="feld">
              Bedingung
              <input value={f.bedingung ?? ""} onChange={(e) => setze(i, (x) => void (x.bedingung = e.target.value || undefined), "bed")} />
            </label>
          </div>
          <details className="eintrag-mehr" open={!!(f.bezeichnung || f.gueltigAb || f.gueltigBis)}>
            <summary>Bezeichnung, Gültigkeit</summary>
            <label className="feld">
              Bezeichnung
              <input value={f.bezeichnung ?? ""} placeholder={f.art === "digital" ? "Rufgruppe TMO" : "4 m Kanal"} onChange={(e) => setze(i, (x) => void (x.bezeichnung = e.target.value || undefined), "bez")} />
            </label>
            <div className="zeile">
              <label className="feld">
                gültig ab
                <input type="datetime-local" value={f.gueltigAb ?? ""} onChange={(e) => setze(i, (x) => void (x.gueltigAb = e.target.value.slice(0, 16) || undefined), "ab")} />
              </label>
              <label className="feld">
                gültig bis
                <input type="datetime-local" value={f.gueltigBis ?? ""} onChange={(e) => setze(i, (x) => void (x.gueltigBis = e.target.value.slice(0, 16) || undefined), "bis")} />
              </label>
            </div>
          </details>
          <div className="eintrag-aktionen">
            <button type="button" onClick={() => aendern((p) => void pfad(p).splice(i, 1))}>Entfernen</button>
          </div>
        </fieldset>
      ))}
      <div className="aktionen">
        <button type="button" onClick={() => aendern((p) => void pfad(p).push({ id: neueId(), art: "digital", betrieb: "TMO", rufgruppe: "", richtung: "unten" }))}>+ Rufgruppe (Digitalfunk)</button>
        <button type="button" onClick={() => aendern((p) => void pfad(p).push({ id: neueId(), art: "analog", band: "4m", kanal: "", betriebsart: "W/U", richtung: "unten" }))}>+ Kanal (Analogfunk)</button>
      </div>
      <datalist id="betriebsarten">
        <option value="W/U" />
        <option value="G/U" />
        <option value="RS" />
      </datalist>
    </div>
  );
}

export function NebenstellenEditor({ liste, pfad, aendern, schluessel }: { liste: Nebenstelle[]; pfad: (p: Draft<Plan>) => Draft<Nebenstelle>[]; aendern: Aendern; schluessel: string }) {
  const setze = (i: number, feld: keyof Nebenstelle, wert: string) => aendern((p) => void ((pfad(p)[i] as Record<string, string>)[feld] = wert), `${schluessel}.${liste[i]!.id}.${feld}`);
  return (
    <div className="eintrag-liste">
      {liste.length > 0 && (
        <table className="nst-tabelle">
          <thead>
            <tr>
              <th>Anschluss</th>
              <th>NSt-Nr.</th>
              <th>Teilnehmer</th>
              <th><span className="nur-sr">Aktion</span></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((n, i) => (
              <tr key={n.id}>
                <td><input aria-label="Anschlussart" list="anschlussarten" value={n.anschlussart} onChange={(e) => setze(i, "anschlussart", e.target.value)} /></td>
                <td><input aria-label="Nebenstellennummer" className="daten" value={n.nummer} onChange={(e) => setze(i, "nummer", e.target.value)} /></td>
                <td><input aria-label="Teilnehmer" value={n.teilnehmer} onChange={(e) => setze(i, "teilnehmer", e.target.value)} /></td>
                <td><button type="button" aria-label="Zeile entfernen" onClick={() => aendern((p) => void pfad(p).splice(i, 1))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="aktionen">
        <button type="button" onClick={() => aendern((p) => {
          const l = pfad(p);
          const letzte = l.at(-1);
          const nr = letzte && /^\d+$/.test(letzte.nummer) ? String(Number(letzte.nummer) + 1) : "";
          l.push({ id: neueId(), anschlussart: letzte?.anschlussart ?? "C Wähl", nummer: nr, teilnehmer: "" });
        })}>+ Nebenstelle</button>
      </div>
      <datalist id="anschlussarten">
        {["C Wähl", "C OB", "ISDN S0", "ISDN UK0", "Analog a/b", "DECT", "CAWITEL", "AWINAP", "VoIP"].map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
    </div>
  );
}
