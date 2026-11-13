import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import type { Draft } from "immer";
import { dateiname, herunterladen, jsonExport, pngExport, pptxExport, svgExport } from "../ausgabe/export";
import { elternVon } from "../modell/baum";
import { neueFuehrungsorgAnsicht, neueKomplanAnsicht, neueStelle, stelleAnlegen, stelleDuplizieren, stelleLoeschen, umhaengen, verschieben, type Ziel } from "../modell/plan";
import type { FuehrungsorgAnsicht, Id, KomplanAnsicht, Plan } from "../modell/typen";
import { planPruefen } from "../modell/validierung";
import { planAenderungenHoeren, planLadenMitRev, planSpeichern, planSpeichernWenn, staendeVon } from "../speicher/db";
import { planMigrieren } from "../modell/migration";
import { planDuplizieren } from "../modell/plan";
import { inhaltsSchluessel, seitStandGeaendert } from "../modell/stand";
import { dtgAusZeitpunkt, jetzt } from "../modell/dtg";
import { notsicherungLesen, notsicherungLoeschen, notsicherungSchreiben } from "./notsicherung";
import { zeichenVorladen } from "../zeichen/katalog";
import { planOeffnen } from "./app";
import { auswaehlen, bestaetigen, kurzmeldung } from "./dialog";
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
import { StaendeDialog, standAnlegen } from "./staende-dialog";
import { TeillinkDialog } from "./teillink";

type BaumAnsicht = FuehrungsorgAnsicht | KomplanAnsicht;
const SPEICHER_VERZUG = 800;
/** Spätestens so lange nach der ersten ungespeicherten Änderung wird gespeichert, auch beim Weitertippen. */
const SPEICHER_HOECHSTENS = 2500;

interface Geladen {
  store: PlanStore;
  rev: string | undefined;
  /** Der geladene Stand weicht von der Ablage ab (Notsicherung, Prüfwert nachgetragen). */
  ungespeichert: boolean;
  /** Die Notsicherung beruht auf einer älteren Fassung als der gespeicherten. */
  konflikt: boolean;
}

export function Editor({ planId }: { planId: Id }) {
  const [geladen, setGeladen] = useState<Geladen>();
  const [fehler, setFehler] = useState<string>();

  useEffect(() => {
    let aktiv = true;
    planLadenMitRev(planId)
      .then((r) => {
        if (!aktiv) return;
        if (!r) {
          notsicherungLoeschen(planId);
          return setFehler("Diesen Plan gibt es auf diesem Gerät nicht (mehr).");
        }
        let plan = r.plan;
        let ungespeichert = false;
        let konflikt = false;
        // Notsicherung vom letzten Verlassen der Seite übernehmen
        const not = notsicherungLesen(planId);
        if (not) {
          let gesichert: Plan | undefined;
          try {
            gesichert = planMigrieren(not.plan);
          } catch {
            gesichert = undefined;
          }
          if (!gesichert || JSON.stringify(gesichert) === JSON.stringify(plan)) notsicherungLoeschen(planId);
          else {
            plan = gesichert;
            ungespeichert = true;
            konflikt = not.basisRev !== r.rev;
            if (!konflikt) kurzmeldung("Die letzten Eingaben vor dem Neuladen wurden wiederhergestellt.");
          }
        }
        // Ältere Pläne: Inhalt beim ersten Öffnen als Inhalt des laufenden Stands festhalten
        if (plan.stand.inhalt === undefined) {
          plan = { ...plan, stand: { ...plan.stand, inhalt: inhaltsSchluessel(plan) } };
          ungespeichert = true;
        }
        setGeladen({ store: new PlanStore(plan), rev: r.rev, ungespeichert, konflikt });
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
  if (!geladen) return <p className="nebentext">Lade Plan …</p>;
  return <EditorGeladen {...geladen} />;
}

function EditorGeladen({ store, rev: startRev, ungespeichert, konflikt: startKonflikt }: Geladen) {
  const plan = useSyncExternalStore(store.abonnieren, store.holen);
  const [auswahl, setAuswahl] = useState<Id[]>([]);
  const [zugeklappt, setZugeklappt] = useState<Set<Id>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [zeichenBereit, setZeichenBereit] = useState(0);
  const [speicherStand, setSpeicherStand] = useState<"gespeichert" | "ungespeichert" | "fehler" | "konflikt">(startKonflikt ? "konflikt" : ungespeichert ? "ungespeichert" : "gespeichert");
  const [exportOffen, setExportOffen] = useState(false);
  const [kontext, setKontext] = useState<{ id: Id; x: number; y: number }>();
  const gespeicherteVersion = useRef(ungespeichert ? -1 : store.version);
  /** Revision der Ablage, von der dieser Tab ausgeht. */
  const rev = useRef(startRev);
  const [konflikt, setKonflikt] = useState(startKonflikt);
  const konfliktRef = useRef(startKonflikt);
  const kette = useRef<Promise<void>>(Promise.resolve());
  const ersteUngespeichert = useRef<number | undefined>(undefined);
  const [druckZeit, setDruckZeit] = useState(jetzt());

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

  const konfliktSetzen = useCallback((k: boolean) => {
    konfliktRef.current = k;
    setKonflikt(k);
    if (k) setSpeicherStand("konflikt");
  }, []);

  /**
   * Speichert nacheinander (nie zwei Schreibvorgänge gleichzeitig) und nur,
   * wenn kein anderer Tab den Plan inzwischen geändert hat.
   */
  const speichern = useCallback((): Promise<void> => {
    kette.current = kette.current.then(async () => {
      const v = store.version;
      if (v === gespeicherteVersion.current || konfliktRef.current) return;
      try {
        const r = await planSpeichernWenn(store.zustand, rev.current);
        if (!r.ok) return konfliktSetzen(true);
        rev.current = r.rev;
        gespeicherteVersion.current = v;
        notsicherungLoeschen(store.zustand.id);
        if (store.version === v) {
          ersteUngespeichert.current = undefined;
          setSpeicherStand("gespeichert");
        } else setSpeicherStand("ungespeichert");
      } catch {
        setSpeicherStand("fehler");
      }
    });
    return kette.current;
  }, [store, konfliktSetzen]);

  // Autosave: kurz nach der letzten Änderung, beim Weitertippen spätestens nach SPEICHER_HOECHSTENS
  useEffect(() => {
    if (store.version === gespeicherteVersion.current || konfliktRef.current) return;
    setSpeicherStand("ungespeichert");
    ersteUngespeichert.current ??= Date.now();
    const rest = SPEICHER_HOECHSTENS - (Date.now() - ersteUngespeichert.current);
    const t = setTimeout(() => void speichern(), Math.max(0, Math.min(SPEICHER_VERZUG, rest)));
    return () => clearTimeout(t);
  }, [plan, store, speichern]);

  // Beim Verlassen: synchron sichern (übersteht F5), dann asynchron speichern
  useEffect(() => {
    const sofort = () => {
      if (store.version === gespeicherteVersion.current) return;
      notsicherungSchreiben(store.zustand, rev.current);
      void speichern();
    };
    const verborgen = () => document.visibilityState === "hidden" && sofort();
    addEventListener("pagehide", sofort);
    addEventListener("beforeunload", sofort);
    document.addEventListener("visibilitychange", verborgen);
    return () => {
      sofort();
      removeEventListener("pagehide", sofort);
      removeEventListener("beforeunload", sofort);
      document.removeEventListener("visibilitychange", verborgen);
    };
  }, [store, speichern]);

  const andereFassungLaden = useCallback(async (meldung?: string) => {
    const r = await planLadenMitRev(store.zustand.id);
    if (!r) {
      kurzmeldung("Der Plan wurde in einem anderen Fenster gelöscht. Die Fassung hier bleibt offen, bis du sie schließt.", "fehler");
      return;
    }
    store.ersetzen(r.plan);
    rev.current = r.rev;
    gespeicherteVersion.current = store.version;
    ersteUngespeichert.current = undefined;
    notsicherungLoeschen(r.plan.id);
    konfliktSetzen(false);
    setSpeicherStand("gespeichert");
    if (meldung) kurzmeldung(meldung);
  }, [store, konfliktSetzen]);

  // Andere Tabs: ohne eigene ungespeicherte Änderungen still nachladen, sonst Konflikt anzeigen
  useEffect(
    () =>
      planAenderungenHoeren((m) => {
        if (m.planId !== store.zustand.id || m.rev === rev.current) return;
        if (store.version === gespeicherteVersion.current && !konfliktRef.current) void andereFassungLaden("Der Plan wurde in einem anderen Fenster geändert und neu geladen.");
        else konfliktSetzen(true);
      }),
    [store, andereFassungLaden, konfliktSetzen],
  );

  const konfliktUeberschreiben = async () => {
    const r = await planLadenMitRev(store.zustand.id);
    rev.current = r?.rev;
    konfliktSetzen(false);
    gespeicherteVersion.current = -1;
    await speichern();
    kurzmeldung("Fassung aus diesem Fenster gespeichert.");
  };
  const konfliktAlsKopie = async () => {
    const kopie = planDuplizieren(store.zustand, `${store.zustand.name} (Fassung aus anderem Fenster)`);
    await planSpeichern(kopie);
    await andereFassungLaden(`Deine Fassung liegt als Kopie „${kopie.name}" in der Planliste.`);
  };

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
      const zaehlen = (x: Id): number => (store.zustand.stellen[x]?.kinder ?? []).reduce((n, k) => n + 1 + zaehlen(k), 0);
      const alle = zaehlen(id);
      const direkt = s.kinder.length;
      const antwort = await auswaehlen(
        `„${stelleTitel(s)}" hat ${alle === direkt ? `${alle} unterstellte Stelle${alle > 1 ? "n" : ""}` : `${alle} unterstellte Stellen (${direkt} direkt)`}. Was soll gelöscht werden?`,
        [
          { wert: "alle", text: `Mit allen ${alle} Unterstellten löschen`, art: "gefahr" },
          { wert: "nur", text: "Nur diese Stelle (Unterstellte rücken hoch)" },
        ],
        "Abbrechen",
        "Esc oder Enter bricht ab. Rückgängig mit Strg+Z.",
      );
      if (!antwort) return;
      mitTeilbaum = antwort === "alle";
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

  const entwurf = useMemo(() => seitStandGeaendert(plan), [plan]);

  /**
   * Vor Ausgaben aufs Papier oder als Bild: Ist der Plan seit seinem Stand
   * geändert, belegen Stand und Version den Inhalt nicht. Dann neuen Stand
   * anbieten. Gibt `false` zurück, wenn abgebrochen wurde.
   */
  const ausgabeVorbereiten = async (): Promise<boolean> => {
    if (!seitStandGeaendert(store.zustand)) {
      // Was unter dieser Version ausgegeben wird, als Stand festhalten (einmal je Version)
      try {
        const v = store.zustand.stand.version;
        if (!(await staendeVon(store.zustand.id)).some((s) => s.stand.version === v)) await standAnlegen(store);
      } catch {
        // Ausgabe nicht am Festhalten scheitern lassen
      }
      return true;
    }
    const p = store.zustand;
    const wahl = await auswaehlen(
      `Der Plan wurde seit Stand ${p.stand.dtg} (Version ${p.stand.version}) geändert.`,
      [
        { wert: "stand", text: "Neuen Stand anlegen und ausgeben", art: "primaer" },
        { wert: "entwurf", text: "Als Entwurf ausgeben" },
      ],
      "Abbrechen",
      "Ohne neuen Stand trügen zwei Ausdrucke mit verschiedenem Inhalt denselben Stand und dieselbe Version. Als Entwurf steht das auf jedem Blatt mit Zeitpunkt der Ausgabe.",
    );
    if (!wahl) return false;
    if (wahl === "stand") {
      try {
        const s = await standAnlegen(store);
        kurzmeldung(`Neuer Stand ${s.stand.dtg}, Version ${s.stand.version}.`);
      } catch (e) {
        kurzmeldung(`Stand ließ sich nicht anlegen: ${(e as Error).message}`, "fehler");
        return false;
      }
    }
    return true;
  };

  const drucken = async () => {
    setExportOffen(false);
    if (!(await ausgabeVorbereiten())) return;
    setDruckZeit(jetzt());
    setTimeout(() => print(), 50);
  };
  useEffect(() => {
    const vorDruck = () => setDruckZeit(jetzt());
    addEventListener("beforeprint", vorDruck);
    return () => removeEventListener("beforeprint", vorDruck);
  }, []);

  const exportieren = async (art: "svg" | "png" | "png-transparent" | "json" | "pptx") => {
    setExportOffen(false);
    if (art !== "json" && !(await ausgabeVorbereiten())) return;
    try {
      // Nach „Neuen Stand anlegen" gilt der neue Plan, nicht der aus diesem Render
      const p = store.zustand;
      const a = p.ansichten[aktiveAnsicht.id] ?? aktiveAnsicht;
      const sz = p === plan ? szene : ansichtSzene(p, a);
      const zusatz = `${a.name}${seitStandGeaendert(p) ? " Entwurf" : ""}`;
      if (art === "pptx") herunterladen(await pptxExport(sz, `${p.name} – ${a.name}`), dateiname(p, "pptx", zusatz));
      else if (art === "svg") herunterladen(new Blob([await svgExport(sz, "#ffffff")], { type: "image/svg+xml" }), dateiname(p, "svg", zusatz));
      else if (art === "png" || art === "png-transparent") herunterladen(await pngExport(sz, 3, art === "png" ? "#ffffff" : undefined), dateiname(p, "png", zusatz));
      else herunterladen(jsonExport(p, await staendeVon(p.id)), dateiname(p, "json"));
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
      {konflikt && (
        <div className="konflikt-band" role="alert">
          <p>
            <strong>Dieser Plan wurde in einem anderen Fenster oder Tab geändert.</strong> Die Änderungen hier sind noch nicht gespeichert und würden die andere Fassung überschreiben. Was soll gelten?
          </p>
          <div className="aktionen">
            <button type="button" className="primaer" onClick={() => void konfliktAlsKopie()}>Meine Fassung als Kopie sichern, andere laden</button>
            <button type="button" onClick={() => void andereFassungLaden("Andere Fassung geladen. Die Änderungen aus diesem Fenster sind verworfen.")}>Andere Fassung laden (meine verwerfen)</button>
            <button type="button" className="gefahr" onClick={() => void konfliktUeberschreiben()}>Meine Fassung speichern (andere überschreiben)</button>
          </div>
        </div>
      )}
      <div className="werkzeugleiste" role="toolbar" aria-label="Werkzeuge">
        <button type="button" onClick={() => planOeffnen(undefined)} title="Zur Planliste">
          ← Pläne
        </button>
        <input className="plan-name" aria-label="Name des Plans" value={plan.name} onChange={(e) => aendern((p) => void (p.name = e.target.value), "name")} />
        <span className={`speicher-stand ${speicherStand}`} role="status">
          {speicherStand === "gespeichert" ? "✓ gespeichert" : speicherStand === "fehler" ? "Speichern fehlgeschlagen" : speicherStand === "konflikt" ? "nicht gespeichert: Konflikt" : "speichert …"}
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
              <button role="menuitem" type="button" onClick={() => void (async () => (setExportOffen(false), (await ausgabeVorbereiten()) && pdfDialog.current?.showModal()))()}>PDF…</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("pptx")}>PowerPoint (bearbeitbar)</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("svg")}>SVG (Vektor)</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("png")}>PNG, weißer Hintergrund</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("png-transparent")}>PNG, transparent</button>
              <button role="menuitem" type="button" onClick={() => void exportieren("json")}>JSON (zum Weiterbearbeiten)</button>
              <button role="menuitem" type="button" onClick={() => (setExportOffen(false), linkDialog.current?.showModal())}>Als Link teilen…</button>
              <button role="menuitem" type="button" onClick={() => void drucken()}>Drucken</button>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`stand-knopf ${entwurf ? "geaendert" : ""}`}
          onClick={() => staendeDialog.current?.showModal()}
          title={entwurf ? "Seit diesem Stand geändert. Neuen Stand anlegen, damit Stand und Version auf dem Papier den Inhalt belegen." : "Stand anlegen, frühere Stände ansehen und vergleichen"}
        >
          Stand <span className="daten">{plan.stand.dtg}</span> · V{plan.stand.version}
          {entwurf && " · geändert"}
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
          {plan.kopf.einstufung && <div className="druck-kopf" aria-hidden="true">{plan.kopf.einstufung}</div>}
          <div className="druck-fuss" aria-hidden="true">
            <span>
              {plan.name} – {aktiveAnsicht.name} · Stand {plan.stand.dtg} · Version {plan.stand.version}
              {entwurf && <span className="druck-entwurf"> · ENTWURF: nach diesem Stand geändert, gedruckt {dtgAusZeitpunkt(druckZeit)}</span>}
              {plan.kopf.einstufung && ` · ${plan.kopf.einstufung}`}
            </span>
            <span>komplan.app</span>
          </div>
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
