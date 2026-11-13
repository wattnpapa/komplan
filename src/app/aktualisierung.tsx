import { useEffect, useState } from "react";

/**
 * Service Worker registrieren und eine neue Fassung anbieten, statt sie
 * ungefragt zu laden: vielleicht wird gerade gezeichnet.
 */
export function AktualisierungsHinweis() {
  const [neu, setNeu] = useState<(() => void) | undefined>();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
    let abbrechen = false;
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        const aktualisieren = registerSW({
          onNeedRefresh: () => !abbrechen && setNeu(() => () => void aktualisieren(true)),
          onOfflineReady: () => !abbrechen && setOffline(true),
        });
      })
      .catch(() => undefined);
    return () => {
      abbrechen = true;
    };
  }, []);

  if (neu) {
    return (
      <div className="band" role="status">
        Eine neue Fassung von komplan.app ist geladen.{" "}
        <button type="button" className="primaer" onClick={neu}>
          Jetzt neu laden
        </button>
      </div>
    );
  }
  if (offline) {
    return (
      <div className="band band-gut" role="status">
        komplan.app ist jetzt auf diesem Gerät gespeichert und startet auch ohne Netz.{" "}
        <button type="button" className="link" onClick={() => setOffline(false)}>
          Ausblenden
        </button>
      </div>
    );
  }
  return null;
}
