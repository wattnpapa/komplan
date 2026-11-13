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

export interface Wahl<T extends string> {
  wert: T;
  text: string;
  /** „gefahr" färbt den Knopf als Löschen. */
  art?: "primaer" | "gefahr";
}

/**
 * Rückfrage mit mehreren Antworten und immer einem „Abbrechen". Esc, Klick
 * auf den Hintergrund und Enter (Fokus liegt auf „Abbrechen") ergeben
 * `undefined`: Wer nicht ausdrücklich wählt, verändert nichts.
 */
export function auswaehlen<T extends string>(frage: string, wahlen: Wahl<T>[], abbrechen = "Abbrechen", erklaerung?: string): Promise<T | undefined> {
  return new Promise((ok) => {
    const d = document.createElement("dialog");
    d.className = "dialog dialog-klein dialog-wahl";
    d.innerHTML = `<div class="dialog-inhalt"><p class="frage"></p></div><div class="aktionen dialog-fuss"></div>`;
    d.querySelector(".frage")!.textContent = frage;
    if (erklaerung) {
      const p = document.createElement("p");
      p.className = "hinweis";
      p.textContent = erklaerung;
      d.querySelector(".dialog-inhalt")!.appendChild(p);
    }
    const fuss = d.querySelector(".dialog-fuss")!;
    let ergebnis: T | undefined;
    for (const w of wahlen) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = w.text;
      if (w.art) b.className = w.art;
      b.dataset.wahl = w.wert;
      b.onclick = () => {
        ergebnis = w.wert;
        d.close();
      };
      fuss.appendChild(b);
    }
    const nein = document.createElement("button");
    nein.type = "button";
    nein.textContent = abbrechen;
    nein.dataset.abbrechen = "";
    nein.onclick = () => d.close();
    fuss.appendChild(nein);
    d.addEventListener("click", (e) => {
      const r = d.getBoundingClientRect();
      if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close();
    });
    d.onclose = () => {
      d.remove();
      ok(ergebnis);
    };
    document.body.appendChild(d);
    d.showModal();
    nein.focus();
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
