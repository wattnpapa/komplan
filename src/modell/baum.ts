/** Lesende Hilfen auf dem Unterstellungsbaum (Stelle.kinder + Plan.wurzeln). */

import type { Id, Plan } from "./typen";

/** Eltern je Stelle; Wurzeln und lose Stellen haben null. */
export function elternKarte(plan: Pick<Plan, "stellen">): Map<Id, Id | null> {
  const karte = new Map<Id, Id | null>();
  for (const id of Object.keys(plan.stellen)) karte.set(id, null);
  for (const stelle of Object.values(plan.stellen)) {
    for (const kind of stelle.kinder) karte.set(kind, stelle.id);
  }
  return karte;
}

export function elternVon(plan: Pick<Plan, "stellen">, id: Id): Id | null {
  for (const stelle of Object.values(plan.stellen)) if (stelle.kinder.includes(id)) return stelle.id;
  return null;
}

/** Alle Nachfahren in Tiefensuche, ohne die Stelle selbst. */
export function nachfahren(plan: Pick<Plan, "stellen">, id: Id): Id[] {
  const ergebnis: Id[] = [];
  const besucht = new Set<Id>([id]);
  const stapel = [...(plan.stellen[id]?.kinder ?? [])].reverse();
  while (stapel.length) {
    const naechste = stapel.pop()!;
    if (besucht.has(naechste)) continue; // Zyklus in kaputten Daten
    besucht.add(naechste);
    ergebnis.push(naechste);
    const kinder = plan.stellen[naechste]?.kinder ?? [];
    for (let i = kinder.length - 1; i >= 0; i--) stapel.push(kinder[i]!);
  }
  return ergebnis;
}

/** Ist `vorfahr` gleich `id` oder ein Vorfahr davon? */
export function istVorfahrOderSelbst(plan: Pick<Plan, "stellen">, vorfahr: Id, id: Id): boolean {
  if (vorfahr === id) return true;
  return nachfahren(plan, vorfahr).includes(id);
}

/** Stellen, die weder Wurzel noch Kind sind. */
export function loseStellenIds(plan: Pick<Plan, "stellen" | "wurzeln">): Id[] {
  const imBaum = new Set<Id>(plan.wurzeln);
  for (const s of Object.values(plan.stellen)) for (const k of s.kinder) imBaum.add(k);
  return Object.keys(plan.stellen).filter((id) => !imBaum.has(id));
}

/** Tiefe ab Wurzel (Wurzel = 0). */
export function tiefe(plan: Pick<Plan, "stellen">, id: Id): number {
  const eltern = elternKarte(plan);
  let t = 0;
  let aktuell = eltern.get(id) ?? null;
  while (aktuell && t < 1000) {
    t++;
    aktuell = eltern.get(aktuell) ?? null;
  }
  return t;
}
