import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import type { Draft } from "immer";
import { dateiname, herunterladen, jsonExport, pngExport, pptxExport, svgExport } from "../ausgabe/export";
import { elternVon } from "../modell/baum";
import { neueFuehrungsorgAnsicht, neueKomplanAnsicht, neueStelle, stelleAnlegen, stelleDuplizieren, stelleLoeschen, umhaengen, verschieben, type Ziel } from "../modell/plan";
import type { FuehrungsorgAnsicht, Id, KomplanAnsicht, Plan } from "../modell/typen";
import { planPruefen } from "../modell/validierung";
import { planLaden, planSpeichern, staendeVon } from "../speicher/db";
import { zeichenVorladen } from "../zeichen/katalog";
import { planOeffnen } from "./app";
import { bestaetigen, kurzmeldung } from "./dialog";
import { PlanEigenschaften, StelleEigenschaften } from "./eigenschaften";
import { Gliederung, stelleTitel } from "./gliederung";
import { PlanStore } from "./plan-store";
import { Zeichenflaeche } from "./zeichenflaeche";
import { PdfDialog } from "./pdf-dialog";
import { SkizzenFlaeche, type Platzierer } from "./skizzen-flaeche";
import { SkizzenWerkzeuge } from "./skizzen-werkzeuge";
import { SkizzenAnsichtEigenschaften, SkizzenElementEigenschaften } from "./skizzen-eigenschaften";
import { ansichtSzene } from "../layout/ansicht";
import { SKIZZEN_VORLAGEN, skizzeAusStelle, skizzeAusVorlage, type SkizzenVorlage } from "../modell/skizze";
import type { SkizzenAnsicht } from "../modell/typen";
import { StaendeDialog } from "./staende-dialog";
import { TeillinkDialog } from "./teillink";

type BaumAnsicht = FuehrungsorgAnsicht | KomplanAnsicht;
const SPEICHER_VERZUG = 800;

export function Editor({ planId }: { planId: Id }) {
  const [store, setStore] = useState<PlanStore>();
  const [fehler, setFehler] = useState<string>();

  useEffect(() => {
    let aktiv = true;
    planLaden(planId)
      .then((p) => {
        if (!aktiv) return;
        if (!p) setFehler("Diesen Plan gibt es auf diesem Gerät nicht (mehr).");
        else setStore(new PlanStore(p));
      })
      .catch((e: Error) => aktiv && setFehler(`Der Plan ließ sich nicht laden: ${e.message}`));
    return () => {
      aktiv = false;
    };
  }, [planId]);

  if (fehler) {
    return (
      <div className="karte">
        <p className="warnung">{fehler}</p>
        <a href="#/">Zur Planliste</a>
      </div>
    );
  }
  if (!store) return <p className="nebentext">Lade Plan …</p>;
  return <EditorGeladen store={store} />;
}

function EditorGeladen({ store }: { store: PlanStore }) {
  const plan = useSyncExternalStore(store.abonnieren, store.holen);
  const [auswahl, setAuswahl] = useState<Id[]>([]);
  const [zugeklappt, setZugeklappt] = useState<Set<Id>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [zeichenBereit, setZeichenBereit] = useState(0);
  const [speicherStand, setSpeicherStand] = useState<"gespeichert" | "ungespeichert" | "fehler">("gespeichert");
  const [exportOffen, setExportOffen] = useState(false);
  const [kontext, setKontext] = useState<{ id: Id; x: number; y: number }>();
  const gespeicherteVersion = useRef(store.version);

  const [ansichtId, setAnsichtId] = useState<Id>();
  const pdfDialog = useRef<HTMLDialogElement>(null);
  const staendeDialog = useRef<HTMLDialogElement>(null);
  const linkDialog = useRef<HTMLDialogElement>(null);
  const alleAnsichten = plan.ansichtReihenfolge.filter((a) => plan.ansichten[a]);
  const baumAnsichten = alleAnsichten.filter((a) => plan.ansichten[a]!.typ !== "skizze");
  const aktiveAnsicht = useMemo(() => plan.ansichten[ansichtId && alleAnsichten.includes(ansichtId) ? ansichtId : alleAnsichten[0]!]!, [plan, ansichtId]); // eslint-disable-line react-hooks/exhaustive-deps
  const skizze = aktiveAnsicht.typ === "skizze" ? aktiveAnsicht : undefined;
  /** Baum-Ansicht für Stellen-Eigenschaften (in der Skizze: die erste Baum-Ansicht). */
  const ansicht = useMemo(() => (aktiveAnsicht.typ !== "skizze" ? aktiveAnsicht : (plan.ansichten[baumAnsichten[0]!] as BaumAnsicht)), [plan, aktiveAnsicht]); // eslint-disable-line react-hooks/exhaustive-deps
  const [skAuswahl, setSkAuswahl] = useState<Id[]>([]);
  const [platzierer, setPlatzierer] = useState<Platzierer>();
  const [verbinderFarbe, setVerbinderFarbe] = useState("");
  const [skizzenMenue, setSkizzenMenue] = useState(false);

  const skizzeAnlegen = (vorlage: SkizzenVorlage | "aus-stelle") => {
    setSkizzenMenue(false);
    let neuId = "";
    aendern((p) => {
      const pl = p as Plan;
      const a = vorlage === "aus-stelle" ? skizzeAusStelle(pl, auswahl[0]!) : skizzeAusVorlage(pl, vorlage, auswahl[0]);
      pl.ansichten[a.id] = a;
      pl.ansichtReihenfolge.push(a.id);
      neuId = a.id;
    });
    setSkAuswahl([]);
    setAnsichtId(neuId);
  };

  const ansichtAnlegen = (typ: "fuehrungsorganisation" | "kommunikationsplan") => {
    const vorlage = { knoten: structuredClone(ansicht.knoten), hervorhebungen: structuredClone(ansicht.hervorhebungen), abstandStandard: { ...ansicht.abstandStandard } };
    const neu = typ === "kommunikationsplan" ? neueKomplanAnsicht(vorlage) : neueFuehrungsorgAnsicht(vorlage);
    const gleiche = baumAnsichten.filter((a) => plan.ansichten[a]!.typ === typ).length;
    if (gleiche) neu.name = `${neu.name} ${gleiche + 1}`;
    aendern((p) => {
      p.ansichten[neu.id] = neu;
      p.ansichtReihenfolge.push(neu.id);
    });
    setAnsichtId(neu.id);
  };
  const ansichtUmbenennen = (id: Id) => {
    const name = prompt("Name der Ansicht:", plan.ansichten[id]!.name)?.trim();
    if (name) aendern((p) => void (p.ansichten[id]!.name = name));
  };
  const ansichtLoeschen = async (id: Id) => {
    if (alleAnsichten.length < 2 || (plan.ansichten[id]!.typ !== "skizze" && baumAnsichten.length < 2)) return;
    if (!(await bestaetigen(`Ansicht „${plan.ansichten[id]!.name}" löschen? Die Stellen und ihre Kontaktdaten bleiben erhalten.`, "Ansicht löschen"))) return;
    aendern((p) => {
      delete p.ansichten[id];
      p.ansichtReihenfolge = p.ansichtReihenfolge.filter((a) => a !== id);
    });
    setAnsichtId(undefined);
  };

  const aendern = useCallback((rezept: (p: Draft<Plan>) => void, buendel?: string) => store.aendern(rezept, buendel), [store]);

  // Zeichen der Stellen nachladen, dann neu zeichnen
  const alleZeichen = (p: Plan) => [
    ...Object.values(p.stellen).map((s) => s.zeichen),
    ...Object.values(p.ansichten).flatMap((a) => (a.typ === "skizze" ? Object.values(a.elemente).map((e) => (e.art === "zeichen" ? e.zeichen : undefined)) : [])),
  ];
  const zeichenSchluessel = useMemo(() => alleZeichen(plan).map((z) => (z?.quelle === "katalog" ? z.schluessel : "")).join("|"), [plan]);
  useEffect(() => {
    let aktiv = true;
    void zeichenVorladen(alleZeichen(store.zustand)).then(() => aktiv && setZeichenBereit((n) => n + 1));
    return () => {
      aktiv = false;
    };
  }, [zeichenSchluessel, store]);

  const szene = useMemo(
    () => ansichtSzene(plan, aktiveAnsicht),
    [plan, aktiveAnsicht, zeichenBereit], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Elemente, die es nicht mehr gibt (Undo, Löschen), aus der Skizzen-Auswahl nehmen
  useEffect(() => {
    if (!skizze) return;
    setSkAuswahl((a) => {
      const neu = a.filter((id) => skizze.elemente[id]);
      return neu.length === a.length ? a : neu;
    });
  }, [skizze]);
  const alleHinweise = useMemo(() => planPruefen(plan), [plan]);
  const hinweise = alleHinweise.filter((h) => h.stufe !== "info");
  const [hinweiseOffen, setHinweiseOffen] = useState(false);

  // Autosave
  useEffect(() => {
    if (store.version === gespeicherteVersion.current) return;
    setSpeicherStand("ungespeichert");
    const v = store.version;
    const t = setTimeout(() => {
      planSpeichern(store.zustand)
        .then(() => {
          gespeicherteVersion.current = v;
          setSpeicherStand(store.version === v ? "gespeichert" : "ungespeichert");
        })
        .catch(() => setSpeicherStand("fehler"));
    }, SPEICHER_VERZUG);
    return () => clearTimeout(t);
  }, [plan, store]);
  useEffect(() => {
    const sofort = () => {
      if (store.version !== gespeicherteVersion.current) void planSpeichern(store.zustand);
    };
    addEventListener("pagehide", sofort);
    document.addEventListener("visibilitychange", sofort);
    return () => {
      sofort();
      removeEventListener("pagehide", sofort);
      document.removeEventListener("visibilitychange", sofort);
    };
  }, [store]);

  // Auswahl bereinigen, wenn Stellen verschwinden (Undo, Löschen)
  useEffect(() => {
    setAuswahl((a) => {
      const neu = a.filter((id) => plan.stellen[id]);
      return neu.length === a.length ? a : neu;
    });
  }, [plan]);

  const waehle = useCallback((id: Id | undefined, erweitern = false) => {
    setKontext(undefined);
    if (!id) return setAuswahl([]);
    setAuswahl((a) => (erweitern ? (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]) : [id]));
    // in der Gliederung aufklappen, damit die Stelle sichtbar ist
    setZugeklappt((z) => {
      let p = elternVon(store.zustand, id);
      if (!p || ![...z].length) return z;
      const neu = new Set(z);
      while (p) {
        neu.delete(p);
        p = elternVon(store.zustand, p);
      }
      return neu;
    });
  }, [store]);

  const neueStelleUnter = (ziel: Ziel) => {
    const s = neueStelle({ zeichen: { quelle: "katalog", schluessel: "Führungsstellen/Führungsstelle" } });
    aendern((p) => void stelleAnlegen(p as Plan, s, ziel));
    setAuswahl([s.id]);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`.gliederung [data-stelle="${s.id}"]`)?.focus());
  };

  const loeschen = async (id: Id) => {
    const s = store.zustand.stellen[id];
    if (!s) return;
    let mitTeilbaum = false;
    if (s.kinder.length) {
      const antwort = await bestaetigen(`„${stelleTitel(s)}" hat ${s.kinder.length} unterstellte Stellen. Mit allen unterstellten Stellen löschen? „Nur diese" rückt die Unterstellten eine Ebene nach oben.`, "Mit Unterstellten löschen", "Nur diese");
      mitTeilbaum = antwort;
    }
    aendern((p) => void stelleLoeschen(p as Plan, id, mitTeilbaum));
    kurzmeldung("Gelöscht. Strg+Z macht es rückgängig.");
  };

  const kuerzel = (e: KeyboardEvent | globalThis.KeyboardEvent, id?: Id) => {
    const strg = e.ctrlKey || e.metaKey;
    const ziel = e.target as HTMLElement;
    const inFeld = ziel.closest("input, textarea, select, [contenteditable]");
    if (strg && !inFeld && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) store.wiederholen();
      else store.rueckgaengig();
      return true;
    }
    if (strg && !inFeld && e.key.toLowerCase() === "y") {
      e.preventDefault();
      store.wiederholen();
      return true;
    }
    if (inFeld || skizze) return false;
    const aktuell = id ?? auswahl[0];
    if (!aktuell) return false;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      void loeschen(aktuell);
      return true;
    }
    if (strg && e.key.toLowerCase() === "d") {
      e.preventDefault();
      aendern((p) => {
        const neu = stelleDuplizieren(p as Plan, aktuell);
        if (neu) setTimeout(() => setAuswahl([neu]));
      });
      return true;
    }
    if (e.key === "Insert" || (e.key === "Enter" && e.shiftKey)) {
      e.preventDefault();
      neueStelleUnter({ unter: aktuell });
      return true;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const eltern = elternVon(store.zustand, aktuell);
      const liste = eltern ? store.zustand.stellen[eltern]!.kinder : store.zustand.wurzeln;
      const index = liste.indexOf(aktuell) + 1;
      neueStelleUnter(eltern ? { unter: eltern, index } : { wurzel: true, index });
      return true;
    }
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      aendern((p) => verschieben(p as Plan, aktuell, e.key === "ArrowUp" ? -1 : 1));
      return true;
    }
    return false;
  };

  // Tastatur in der Gliederung: Pfeile bewegen die Auswahl
  const gliederungTaste = (e: KeyboardEvent, id: Id) => {
    if (kuerzel(e, id)) return;
    const sichtbar = [...document.querySelectorAll<HTMLElement>(".gliederung [data-stelle]")];
    const i = sichtbar.findIndex((el) => el.dataset.stelle === id);
    const fokus = (j: number) => {
      const el = sichtbar[j];
      if (!el) return;
      setAuswahl([el.dataset.stelle!]);
      el.focus();
    };
    if (e.key === "ArrowDown") (e.preventDefault(), fokus(i + 1));
    else if (e.key === "ArrowUp") (e.preventDefault(), fokus(i - 1));
    else if (e.key === "ArrowLeft" && plan.stellen[id]?.kinder.length && !zugeklappt.has(id)) (e.preventDefault(), setZugeklappt(new Set(zugeklappt).add(id)));
    else if (e.key === "ArrowRight" && zugeklappt.has(id)) {
      e.preventDefault();
      const z = new Set(zugeklappt);
      z.delete(id);
      setZugeklappt(z);
    }
  };

  useEffect(() => {
    const f = (e: globalThis.KeyboardEvent) => {
      if ((e.target as HTMLElement).closest(".gliederung, dialog")) return;
      kuerzel(e);
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });

  const exportieren = async (art: "svg" | "png" | "png-transparent" | "json" | "pptx") => {
    setExportOffen(false);
    try {
      if (art === "pptx") herunterladen(await pptxExport(szene, `${plan.name} – ${aktiveAnsicht.name}`), dateiname(plan, "pptx", aktiveAnsicht.name));
      else if (art === "svg") herunterladen(new Blob([await svgExport(szene, "#ffffff")], { type: "image/svg+xml" }), dateiname(plan, "svg", aktiveAnsicht.name));
      else if (art === "png" || art === "png-transparent") herunterladen(await pngExport(szene, 3, art === "png" ? "#ffffff" : undefined), dateiname(plan, "png", aktiveAnsicht.name));
      else herunterladen(jsonExport(plan, await staendeVon(plan.id)), dateiname(plan, "json"));
      return;
    } catch (e) {
      kurzmeldung(`Export fehlgeschlagen: ${(e as Error).message}`, "fehler");
    }
  };

  const gewaehlt = auswahl.length === 1 ? plan.stellen[auswahl[0]!] : undefined;
  // Beim Öffnen einmal einpassen, wenn der Plan größer als die Fläche ist
  const eingepasst = useRef(false);
  useEffect(() => {
    if (eingepasst.current || !zeichenBereit) return;
    eingepasst.current = true;
    const flaeche = document.querySelector(".zeichenflaeche");
    if (flaeche && szene.breite * (96 / 25.4) > flaeche.clientWidth) einpassen();
  });
  const einpassen = () => {
    const flaeche = document.querySelector(".zeichenflaeche");
    if (!flaeche) return;
    const px = 96 / 25.4;
    setZoom(Math.max(0.2, Math.min(2, Math.min((flaeche.clientWidth - 24) / (szene.breite * px), (flaeche.clientHeight - 24) / (szene.hoehe * px)))));
  };

  return (
    <div className="editor">
      <div className="werkzeugleiste" role="toolbar" aria-label="Werkzeuge">
        <button type="button" onClick={() => planOeffnen(undefined)} title="Zur Planliste">
          ← Pläne
        </button>
        <input className="plan-name" aria-label="Name des Plans" value={plan.name} onChange={(e) => aendern((p) => void (p.name = e.target.value), "name")} />
        <span className={`speicher-stand ${speicherStand}`} role="status">
          {speicherStand === "gespeichert" ? "✓ gespeichert" : speicherStand === "fehler" ? "Speichern fehlgeschlagen" : "speichert …"}
        </span>
        <span className="trenner" />
        <button type="button" onClick={() => store.rueckgaengig()} disabled={!store.kannRueckgaengig()} title="Rückgängig (Strg+Z)">
          ↶
        </button>
        <button type="button" onClick={() => store.wiederholen()} disabled={!store.kannWiederholen()} title="Wiederholen (Strg+Y)">
          ↷
        </button>
        <span className="trenner" />
        <button type="button" className="primaer" onClick={() => neueStelleUnter(auswahl[0] ? { unter: auswahl[0] } : { wurzel: true })} title="Neue Stelle unter der gewählten (Einfg)">
          + Stelle
        </button>
        <button
          type="button"
          onClick={() => {
            const s = neueStelle({ typ: "auslassung", auslassung: "⋮" });
            aendern((p) => void stelleAnlegen(p as Plan, s, auswahl[0] ? { unter: auswahl[0] } : { wurzel: true }));
            setAuswahl([s.id]);
          }}
          title="Auslassung (⋮) einfügen"
        >
          + ⋮
        </button>
        <span className="trenner" />
        <button type="button" onClick={() => setZoom((z) => Math.max(0.2, z / 1.25))} aria-label="Verkleinern">−</button>
        <button type="button" onClick={einpassen} title="Auf Fläche einpassen">{Math.round(zoom * 100)} %</button>
        <button type="button" onClick={() => setZoom((z) => Math.min(4, z * 1.25))} aria-label="Vergrößern">+</button>
        <span className="trenner" />
        <div className="menue">
          <button type="button" aria-expanded={exportOffen} onClick={() => setExportOffen(!exportOffen)}>
            Export ▾
          </button>
          {exportOffen && (
            <div className="menue-liste" role="menu">
              <button role="menuitem" type="button" onClick={() => (setExportOffen(false), pdfDialog.current?.showModal())}>PDF…</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("pptx")}>PowerPoint (bearbeitbar)</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("svg")}>SVG (Vektor)</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("png")}>PNG, weißer Hintergrund</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("png-transparent")}>PNG, transparent</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("json")}>JSON (zum Weiterbearbeiten)</button>
              <button role="menuitem" type="button" onClick={() => (setExportOffen(false), linkDialog.current?.showModal())}>Als Link teilen…</button>
              <button role="menuitem" type="button" onClick={() => (setExportOffen(false), setTimeout(() => print(), 50))}>Drucken</button>
            </div>
          )}
        </div>
        <button type="button" onClick={() => staendeDialog.current?.showModal()} title="Stand anlegen, frühere Stände ansehen und vergleichen">
          Stand <span className="daten">{plan.stand.dtg}</span> · V{plan.stand.version}
        </button>
        <span className="menue">
          <button
            type="button"
            className={`hinweis-knopf ${hinweise.some((h) => h.stufe === "fehler") ? "fehler" : hinweise.length ? "warn" : ""}`}
            aria-expanded={hinweiseOffen}
            onClick={() => setHinweiseOffen(!hinweiseOffen)}
            title="Prüfung des Plans: fehlende Erreichbarkeit, doppelte Rufgruppen, abgelaufene Kontakte, lose Skizzenelemente"
          >
            {hinweise.length ? `${hinweise.length} Hinweis${hinweise.length > 1 ? "e" : ""}` : "✓ Prüfung"}
          </button>
          {hinweiseOffen && (
            <div className="menue-liste hinweis-liste" role="dialog" aria-label="Hinweise zum Plan">
              {alleHinweise.length === 0 ? (
                <p className="nebentext">Keine Hinweise.</p>
              ) : (
                <ul>
                  {[...alleHinweise].sort((a, b) => ["fehler", "warnung", "info"].indexOf(a.stufe) - ["fehler", "warnung", "info"].indexOf(b.stufe)).map((h, i) => (
                    <li key={i} className={`hinweis-${h.stufe}`}>
                      <span className="hinweis-stufe">{h.stufe === "fehler" ? "Fehler" : h.stufe === "warnung" ? "Achtung" : "Info"}</span>
                      {h.stelle && plan.stellen[h.stelle] ? (
                        <button type="button" className="link" onClick={() => (setHinweiseOffen(false), setSkAuswahl([]), waehle(h.stelle!))}>{h.text}</button>
                      ) : (
                        <span>{h.text}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="hinweis">Hinweise blockieren nichts. Gültigkeiten werden gegen den Stand {plan.stand.dtg} geprüft.</p>
            </div>
          )}
        </span>
      </div>

      <div className="ansichten-leiste" role="tablist" aria-label="Ansichten">
        {alleAnsichten.map((id) => {
          const a = plan.ansichten[id]!;
          const aktiv = id === aktiveAnsicht.id;
          return (
            <span key={id} className={`ansicht-reiter ${aktiv ? "aktiv" : ""}`}>
              <button type="button" role="tab" aria-selected={aktiv} onClick={() => (setAnsichtId(id), setSkAuswahl([]), setPlatzierer(undefined))} onDoubleClick={() => ansichtUmbenennen(id)} title="Doppelklick: umbenennen">
                <span className="ansicht-art">{a.typ === "kommunikationsplan" ? "Komplan" : a.typ === "skizze" ? "Skizze" : "FüOrg"}</span> {a.name}
              </button>
              {aktiv && alleAnsichten.length > 1 && (a.typ === "skizze" || baumAnsichten.length > 1) && (
                <button type="button" className="ansicht-weg" aria-label={`Ansicht ${a.name} löschen`} onClick={() => void ansichtLoeschen(id)}>×</button>
              )}
            </span>
          );
        })}
        <button type="button" className="ansicht-neu" onClick={() => ansichtAnlegen("kommunikationsplan")}>+ Kommunikationsplan</button>
        <button type="button" className="ansicht-neu" onClick={() => ansichtAnlegen("fuehrungsorganisation")}>+ Führungsorganisation</button>
        <span className="menue">
          <button type="button" className="ansicht-neu" aria-expanded={skizzenMenue} onClick={() => setSkizzenMenue(!skizzenMenue)}>+ Kommunikationsskizze ▾</button>
          {skizzenMenue && (
            <div className="menue-liste" role="menu">
              <button role="menuitem" type="button" disabled={auswahl.length !== 1} onClick={() => skizzeAnlegen("aus-stelle")} title="Gewählte Stelle mittig, übergeordnete links, unterstellte rechts">
                Aus gewählter Stelle erzeugen{auswahl.length === 1 && plan.stellen[auswahl[0]!] ? ` (${stelleTitel(plan.stellen[auswahl[0]!]!)})` : " (erst eine Stelle wählen)"}
              </button>
              {SKIZZEN_VORLAGEN.map((v) => (
                <button key={v.id} role="menuitem" type="button" onClick={() => skizzeAnlegen(v.id)} title={v.beschreibung}>{v.titel}</button>
              ))}
            </div>
          )}
        </span>
      </div>

      <div className="editor-spalten">
        <aside className="spalte-links">
          <Gliederung
            plan={plan}
            auswahl={auswahl}
            zugeklappt={zugeklappt}
            onAuswahl={(id, erweitern) => waehle(id, erweitern)}
            onZuklappen={(id) => {
              const z = new Set(zugeklappt);
              if (z.has(id)) z.delete(id);
              else z.add(id);
              setZugeklappt(z);
            }}
            onUmhaengen={(id, ziel) => aendern((p) => void umhaengen(p as Plan, id, ziel))}
            onTaste={gliederungTaste}
          />
          <p className="hinweis tasten-hilfe">
            Einfg: unterstellte Stelle · Enter: Stelle daneben · Entf: löschen · Strg+D: duplizieren · Alt+↑/↓: verschieben · Ziehen: umhängen
          </p>
        </aside>
        <section className="spalte-mitte">
          {skizze ? (
            <div className="skizzen-bereich">
              <SkizzenWerkzeuge plan={plan} ansicht={skizze} aendern={aendern} auswahl={skAuswahl} setAuswahl={setSkAuswahl} platzierer={platzierer} setPlatzierer={setPlatzierer} verbinderFarbe={verbinderFarbe} setVerbinderFarbe={setVerbinderFarbe} />
              <SkizzenFlaeche plan={plan} ansicht={skizze} szene={szene} aendern={aendern} auswahl={skAuswahl} setAuswahl={(ids) => (setSkAuswahl(ids), ids.length && setAuswahl([]))} zoom={zoom} setZoom={setZoom} platzierer={platzierer} setPlatzierer={setPlatzierer} verbinderFarbe={verbinderFarbe} />
            </div>
          ) : (
            <Zeichenflaeche szene={szene} auswahl={auswahl} onAuswahl={waehle} onKontext={(id, x, y) => setKontext({ id, x, y })} zoom={zoom} setZoom={setZoom} />
          )}
          {kontext && (
            <div className="kontextmenue" role="menu" style={{ left: kontext.x, top: kontext.y }} onMouseLeave={() => setKontext(undefined)}>
              <button role="menuitem" type="button" onClick={() => (setKontext(undefined), neueStelleUnter({ unter: kontext.id }))}>Unterstellte Stelle anlegen</button>
              <button role="menuitem" type="button" onClick={() => (setKontext(undefined), aendern((p) => void stelleDuplizieren(p as Plan, kontext.id)))}>Duplizieren</button>
              <button role="menuitem" type="button" onClick={() => {
                setKontext(undefined);
                setAuswahl([kontext.id]);
                let neuId = "";
                aendern((p) => {
                  const a = skizzeAusStelle(p as Plan, kontext.id);
                  (p as Plan).ansichten[a.id] = a;
                  p.ansichtReihenfolge.push(a.id);
                  neuId = a.id;
                });
                setAnsichtId(neuId);
              }}>Kommunikationsskizze erzeugen</button>
              <button role="menuitem" type="button" onClick={() => (setKontext(undefined), void loeschen(kontext.id))}>Löschen…</button>
            </div>
          )}
        </section>
        <aside className="spalte-rechts">
          {skizze && skAuswahl.length === 1 && skizze.elemente[skAuswahl[0]!] ? (
            <SkizzenElementEigenschaften
              key={skAuswahl[0]}
              plan={plan}
              ansicht={skizze}
              element={skizze.elemente[skAuswahl[0]!]!}
              aendern={aendern}
              onStelle={(id) => (setSkAuswahl([]), setAuswahl([id]))}
            />
          ) : skizze && skAuswahl.length > 1 ? (
            <div className="eigenschaften">
              <h2 className="eig-titel">{skAuswahl.length} Elemente gewählt</h2>
              <p className="hinweis">Ausrichten, Verteilen, Gruppieren und Ebenen in der Werkzeugleiste über der Fläche.</p>
            </div>
          ) : gewaehlt ? (
            <StelleEigenschaften key={gewaehlt.id} plan={plan} stelle={gewaehlt} ansicht={ansicht} aendern={aendern} />
          ) : skizze ? (
            <>
              <SkizzenAnsichtEigenschaften ansicht={skizze} aendern={aendern} />
              <PlanEigenschaften plan={plan} ansicht={ansicht} aendern={aendern} auswahl={auswahl} nurPlan />
            </>
          ) : (
            <PlanEigenschaften plan={plan} ansicht={ansicht} aendern={aendern} auswahl={auswahl} />
          )}
        </aside>
      </div>
      <PdfDialog dialogRef={pdfDialog} plan={plan} ansicht={skizze ?? ansicht} szene={szene} />
      <StaendeDialog dialogRef={staendeDialog} store={store} plan={plan} />
      <TeillinkDialog dialogRef={linkDialog} plan={plan} />
    </div>
  );
}
