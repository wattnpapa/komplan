import { useEffect, useId, useState } from "react";
import type { ZeichenRef } from "../modell/typen";
import { istGeladen, ordnerLaden, svgIdsPraefixen, zeichenName, zeichenSvg } from "../zeichen/katalog";

/** Ein Zeichen als Inline-SVG (nutzt die Roboto-Slab-Schrift der Seite). Lädt den Ordner bei Bedarf nach. */
export function ZeichenBild({ zeichen, groesse = 40, titel }: { zeichen?: ZeichenRef; groesse?: number; titel?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [, setGeladen] = useState(0);
  useEffect(() => {
    if (zeichen?.quelle === "katalog" && !istGeladen(zeichen.schluessel)) {
      let aktiv = true;
      void ordnerLaden(zeichen.schluessel.split("/")[0]!).then(() => aktiv && setGeladen((n) => n + 1));
      return () => {
        aktiv = false;
      };
    }
    return undefined;
  }, [zeichen]);
  const svg = svgIdsPraefixen(zeichenSvg(zeichen), `zb${id}`).replace(/width="256" height="256"/, `width="${groesse}" height="${groesse}"`);
  return (
    <span
      className="zeichen-bild"
      role="img"
      aria-label={titel ?? zeichenName(zeichen) ?? "Zeichen"}
      style={{ width: groesse, height: groesse }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
