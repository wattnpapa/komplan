import type { ReactNode, RefObject } from "react";

/** Modaler Dialog mit nativem <dialog>: Esc, Fokusfalle und Hintergrund vom Browser. */
export function Dialog({
  titel,
  dialogRef,
  children,
  aktionen,
  klasse,
  onSchliessen,
}: {
  titel: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  children: ReactNode;
  aktionen?: ReactNode;
  klasse?: string;
  onSchliessen?: () => void;
}) {
  return (
    <dialog ref={dialogRef} className={`dialog ${klasse ?? ""}`} aria-label={titel} onClose={onSchliessen}>
      <div className="dialog-kopf">
        <h2>{titel}</h2>
        <button type="button" className="schliessen" aria-label="Schließen" onClick={() => dialogRef.current?.close()}>
          ×
        </button>
      </div>
      <div className="dialog-inhalt">{children}</div>
      {aktionen && <div className="aktionen dialog-fuss">{aktionen}</div>}
    </dialog>
  );
}

/** Bestätigung als Promise (für Löschen u. Ä.). */
export function bestaetigen(frage: string, ja = "Ja", nein = "Abbrechen"): Promise<boolean> {
  return new Promise((ok) => {
    const d = document.createElement("dialog");
    d.className = "dialog dialog-klein";
    d.innerHTML = `<div class="dialog-inhalt"><p></p></div><div class="aktionen dialog-fuss"><button type="button" class="primaer" data-ja></button><button type="button" data-nein></button></div>`;
    d.querySelector("p")!.textContent = frage;
    const jaKnopf = d.querySelector<HTMLButtonElement>("[data-ja]")!;
    const neinKnopf = d.querySelector<HTMLButtonElement>("[data-nein]")!;
    jaKnopf.textContent = ja;
    neinKnopf.textContent = nein;
    let ergebnis = false;
    jaKnopf.onclick = () => {
      ergebnis = true;
      d.close();
    };
    neinKnopf.onclick = () => d.close();
    d.onclose = () => {
      d.remove();
      ok(ergebnis);
    };
    document.body.appendChild(d);
    d.showModal();
    neinKnopf.focus();
  });
}

/** Kurze Meldung unten am Rand, verschwindet von selbst. */
export function kurzmeldung(text: string, art: "gut" | "fehler" = "gut"): void {
  const el = document.createElement("div");
  el.className = `kurzmeldung kurzmeldung-${art}`;
  el.setAttribute("role", art === "fehler" ? "alert" : "status");
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), art === "fehler" ? 7000 : 3500);
}
