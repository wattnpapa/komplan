import { useRef } from "react";
import { KATALOG_QUELLE } from "../zeichen/katalog";
import { AENDERUNGEN } from "./aenderungen";
import { Dialog } from "./dialog";
import { WERKZEUGE } from "./werkzeuge";

const REPO = "https://github.com/wattnpapa/komplan";

export function Fusszeile() {
  const ueber = useRef<HTMLDialogElement>(null);
  const neu = useRef<HTMLDialogElement>(null);
  return (
    <footer className="seite">
      <div className="fuss-gruppen">
        <div className="fuss-gruppe">
          <span className="fuss-titel">Projekt</span>
          <a href={REPO}>Quellcode</a>
          <a href={`${REPO}/issues`}>Fehler melden</a>
          <button type="button" className="link" onClick={() => ueber.current?.showModal()}>
            Über komplan und Lizenzen
          </button>
        </div>
        <div className="fuss-gruppe">
          <span className="fuss-titel">Rechtliches</span>
          <a href="./impressum.html">Impressum</a>
          <a href="./datenschutz.html">Datenschutz</a>
        </div>
      </div>
      <p className="fuss-marke">
        Lizenz EUPL-1.2. Ohne Anmeldung, ohne Server, ohne Reichweitenmessung. Kein amtliches Angebot des THW oder einer anderen Behörde.{" "}
        <button type="button" className="link" onClick={() => neu.current?.showModal()} title="Was ist neu">
          Fassung {__APP_VERSION__} · {__FASSUNG__}
        </button>
      </p>
      <nav className="werkzeuge" aria-label="Weitere Werkzeuge">
        {WERKZEUGE.map((w, i) => (
          <span key={w.href}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <a href={w.href}>{w.label}</a>
          </span>
        ))}
      </nav>

      <Dialog titel="Über komplan.app" dialogRef={ueber}>
        <p>
          komplan.app zeichnet Führungsorganisation, Kommunikationsplan und Kommunikationsskizze auf einem gemeinsamen Datenmodell. Alles läuft im Browser; Pläne liegen nur in der lokalen Datenbank dieses
          Geräts.
        </p>
        <h3>Taktische Zeichen</h3>
        <p>
          Die Zeichen stammen aus der Sammlung{" "}
          <a href={KATALOG_QUELLE.url}>
            Taktische-Zeichen von {KATALOG_QUELLE.urheber}
          </a>{" "}
          (Release {KATALOG_QUELLE.version}). Lizenz laut Projekt: fertige Zeichen CC0 1.0, Quellcode{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Bearbeitet: {KATALOG_QUELLE.bearbeitet}. Die Schrift der Zeichen ist Roboto Slab (Apache License 2.0).
        </p>
        <p>Eigene Zeichen für Stäbe, ELO, LuK, Logistik und Rauten sind im gleichen Stil nachgebaut und stehen unter der Lizenz von komplan (EUPL-1.2).</p>
        <h3>Vorschriften</h3>
        <p>
          Begriffe nach FwDV 800 (Stand 2017), THW DV 1-100 und DV 1-101. Formulare Fb Fü 76 und Fb Fü 77 nach den Vorlagen des THW. Kein amtliches Angebot; maßgeblich sind die Vorschriften.
        </p>
      </Dialog>

      <Dialog titel="Was ist neu" dialogRef={neu}>
        {AENDERUNGEN.map((a) => (
          <section key={a.datum}>
            <h3>{new Date(a.datum).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}</h3>
            <ul>
              {a.punkte.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </Dialog>
    </footer>
  );
}
