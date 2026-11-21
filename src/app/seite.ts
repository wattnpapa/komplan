// Statische Textseiten (Impressum, Datenschutz): gleiche Gestaltung wie die App.
import "@fontsource-variable/archivo";
import "./stil-basis.css";
import "./stil.css";

// Widerspruch gegen die Reichweitenmessung: GoatCounter zählt nicht, solange
// localStorage „skipgc" auf „t" steht (wertet count.js selbst aus).
const nichtZaehlen = document.getElementById("nicht-zaehlen");
if (nichtZaehlen instanceof HTMLInputElement) {
  const box = nichtZaehlen;
  try {
    box.checked = localStorage.getItem("skipgc") === "t";
  } catch {
    /* Privatmodus: Kästchen bleibt aus */
  }
  box.addEventListener("change", () => {
    try {
      if (box.checked) localStorage.setItem("skipgc", "t");
      else localStorage.removeItem("skipgc");
    } catch {
      box.checked = false;
    }
  });
}
