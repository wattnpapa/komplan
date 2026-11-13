import { useEffect, useState } from "react";
import { anzeigemodusLesen, anzeigemodusSetzen, MODI, type Anzeigemodus } from "./anzeige";
import { Editor } from "./editor";
import { Fusszeile } from "./fusszeile";
import { Start } from "./start";
import { AktualisierungsHinweis } from "./aktualisierung";
import { datenAusFragment } from "../ausgabe/teillink";
import { LinkImport } from "./teillink";

/** Route aus dem Fragment: „#/plan/<id>" öffnet einen Plan, sonst die Planliste. */
function routeLesen(): { plan?: string; link?: string } {
  const link = datenAusFragment(location.hash);
  if (link) return { link };
  const m = location.hash.match(/^#\/plan\/([A-Za-z0-9]+)/);
  return m ? { plan: m[1] } : {};
}

export function planOeffnen(id: string | undefined): void {
  location.hash = id ? `#/plan/${id}` : "#/";
}

export function App() {
  const [route, setRoute] = useState(routeLesen);
  const [modus, setModus] = useState<Anzeigemodus>(anzeigemodusLesen);

  useEffect(() => {
    const f = () => setRoute(routeLesen());
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);

  useEffect(() => anzeigemodusSetzen(modus), [modus]);

  // Offline-Anzeige: alles geht weiter, nur Hinweis
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && navigator.onLine === false);
  useEffect(() => {
    const an = () => setOffline(false), aus = () => setOffline(true);
    addEventListener("online", an);
    addEventListener("offline", aus);
    return () => (removeEventListener("online", an), removeEventListener("offline", aus));
  }, []);

  const imEditor = !!route.plan;

  return (
    <div className={imEditor ? "rahmen rahmen-editor" : "rahmen"}>
      <button type="button" className="sprungmarke" onClick={() => document.getElementById("inhalt")?.focus()}>
        Zum Inhalt springen
      </button>
      <header className="seiten-kopf">
        <div className="kopf-inhalt">
          <div className="titelzeile">
            <h1>
              <a href="#/" className="kopf-marke">komplan.app</a>
            </h1>
            {offline && <span className="offline-marke" role="status" title="Kein Netz. komplan arbeitet weiter, Pläne werden auf diesem Gerät gespeichert.">offline</span>}
            <div className="anzeige-schalter" role="group" aria-label="Anzeige">
              {MODI.map((m) => (
                <button key={m.modus} type="button" aria-pressed={modus === m.modus} title={m.erklaerung} onClick={() => setModus(m.modus)}>
                  {m.titel}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <AktualisierungsHinweis />
      <main id="inhalt" tabIndex={-1} className={imEditor ? "editor-haupt" : undefined}>
        {route.link ? <LinkImport daten={route.link} /> : route.plan ? <Editor key={route.plan} planId={route.plan} /> : <Start />}
      </main>
      {!imEditor && <Fusszeile />}
    </div>
  );
}
