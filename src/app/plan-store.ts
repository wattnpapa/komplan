/**
 * Zustand eines geöffneten Plans. Änderungen laufen über `aendern(rezept)`,
 * umgesetzt mit Immer; die inversen Patches ergeben Undo/Redo.
 * Aufeinanderfolgende Eingaben ins selbe Feld werden zu einem Schritt
 * zusammengefasst (`buendel`), sonst wäre jeder Tastendruck ein Undo-Schritt.
 */

import { applyPatches, enablePatches, produceWithPatches, type Draft, type Patch } from "immer";
import { jetzt } from "../modell/dtg";
import type { Plan } from "../modell/typen";

enablePatches();

const HOECHSTENS = 200;
const BUENDEL_MS = 1200;

interface Schritt {
  vor: Patch[];
  zurueck: Patch[];
  buendel?: string;
  zeit: number;
}

export type Zuhoerer = () => void;

export class PlanStore {
  private plan: Plan;
  private rueck: Schritt[] = [];
  private vor: Schritt[] = [];
  private zuhoerer = new Set<Zuhoerer>();
  /** Zählt Änderungen; der Autosave vergleicht damit. */
  version = 0;

  constructor(plan: Plan, private uhr: () => number = () => Date.now()) {
    this.plan = plan;
  }

  get zustand(): Plan {
    return this.plan;
  }

  abonnieren = (f: Zuhoerer): (() => void) => {
    this.zuhoerer.add(f);
    return () => this.zuhoerer.delete(f);
  };

  holen = (): Plan => this.plan;

  private melden(): void {
    this.version++;
    for (const f of this.zuhoerer) f();
  }

  /**
   * Ändert den Plan. `buendel` fasst Schritte gleichen Schlüssels zusammen,
   * die schneller als BUENDEL_MS aufeinander folgen (Tippen in ein Feld).
   */
  aendern(rezept: (entwurf: Draft<Plan>) => void, buendel?: string): void {
    const [neu, patches, inverse] = produceWithPatches(this.plan, (e) => {
      rezept(e);
      e.geaendert = jetzt();
    });
    if (patches.length <= 1 && patches.every((p) => p.path[0] === "geaendert")) return;
    const zeit = this.uhr();
    const letzter = this.rueck.at(-1);
    if (buendel && letzter?.buendel === buendel && zeit - letzter.zeit < BUENDEL_MS) {
      letzter.vor = letzter.vor.concat(patches);
      letzter.zurueck = inverse.concat(letzter.zurueck);
      letzter.zeit = zeit;
    } else {
      this.rueck.push({ vor: patches, zurueck: inverse, buendel, zeit });
      if (this.rueck.length > HOECHSTENS) this.rueck.shift();
    }
    this.vor = [];
    this.plan = neu;
    this.melden();
  }

  /** Ersetzt den Plan ohne Undo-Schritt (Laden, Stand ansehen). */
  ersetzen(plan: Plan, verlaufLeeren = true): void {
    this.plan = plan;
    if (verlaufLeeren) {
      this.rueck = [];
      this.vor = [];
    }
    this.melden();
  }

  kannRueckgaengig(): boolean {
    return this.rueck.length > 0;
  }

  kannWiederholen(): boolean {
    return this.vor.length > 0;
  }

  rueckgaengig(): void {
    const s = this.rueck.pop();
    if (!s) return;
    this.plan = applyPatches(this.plan, s.zurueck);
    this.vor.push(s);
    this.melden();
  }

  wiederholen(): void {
    const s = this.vor.pop();
    if (!s) return;
    this.plan = applyPatches(this.plan, s.vor);
    this.rueck.push({ ...s, buendel: undefined });
    this.melden();
  }
}
