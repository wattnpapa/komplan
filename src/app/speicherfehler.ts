/** Verständlicher Grund für einen Fehler der Ablage (IndexedDB), mit Ausweg. */
export function speicherFehlerText(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  const text = (e as Error)?.message ?? String(e);
  if (name === "QuotaExceededError" || /quota/i.test(text)) {
    return "Der Speicher dieses Browsers ist voll. Den Plan als Datei sichern und Platz schaffen, z. B. alte Pläne im Papierkorb endgültig löschen.";
  }
  if (name === "InvalidStateError" || name === "UnknownError" || /closing|closed|terminated/i.test(text)) {
    return "Die Ablage des Browsers ist nicht erreichbar, etwa weil die Browserdaten gelöscht wurden oder ein privates Fenster nichts speichern darf.";
  }
  return `Die Ablage des Browsers meldet: ${text || name || "unbekannter Fehler"}.`;
}
