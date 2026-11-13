/**
 * Hinweisliste: nicht blockierende Prüfungen des Plans. Jede Regel liefert
 * Hinweise mit Bezug auf eine Stelle, damit die Oberfläche dorthin springen kann.
 */

import type { Id, Plan } from "./typen";

export interface Hinweis {
  regel: "zyklus" | "doppelt-eingehaengt" | "verwaist" | "ohne-erreichbarkeit" | "rufgruppe-doppelt" | "abgelaufen" | "noch-nicht-gueltig";
  stufe: "fehler" | "warnung" | "info";
  text: string;
  stelle?: Id;
}

export function planPruefen(plan: Plan): Hinweis[] {
  const hinweise: Hinweis[] = [];
  const name = (id: Id) => {
    const s = plan.stellen[id];
    return s ? s.beschriftung || s.bezeichnung || kurzName(s.zeichen) || "(ohne Namen)" : id;
  };

  // Baumregeln
  const vorkommen = new Map<Id, number>();
  const zaehle = (id: Id) => vorkommen.set(id, (vorkommen.get(id) ?? 0) + 1);
  plan.wurzeln.forEach(zaehle);
  for (const s of Object.values(plan.stellen)) {
    for (const k of s.kinder) {
      zaehle(k);
      if (!plan.stellen[k]) hinweise.push({ regel: "verwaist", stufe: "fehler", text: `${name(s.id)}: unterstellte Stelle fehlt (${k}).`, stelle: s.id });
    }
  }
  for (const [id, n] of vorkommen) {
    if (n > 1) hinweise.push({ regel: "doppelt-eingehaengt", stufe: "fehler", text: `${name(id)} ist mehrfach eingehängt.`, stelle: id });
  }
  for (const id of plan.wurzeln) {
    if (!plan.stellen[id]) hinweise.push({ regel: "verwaist", stufe: "fehler", text: `Wurzel fehlt (${id}).` });
  }
  // Zyklus: von jeder Stelle aufwärts laufen
  const eltern = new Map<Id, Id>();
  for (const s of Object.values(plan.stellen)) for (const k of s.kinder) eltern.set(k, s.id);
  for (const id of Object.keys(plan.stellen)) {
    const gesehen = new Set<Id>();
    let a: Id | undefined = id;
    while (a && !gesehen.has(a)) {
      gesehen.add(a);
      a = eltern.get(a);
    }
    if (a === id) {
      hinweise.push({ regel: "zyklus", stufe: "fehler", text: `${name(id)} ist sich selbst unterstellt (Kreis).`, stelle: id });
    }
  }

  const stand = plan.stand.zeitpunkt;
  for (const s of Object.values(plan.stellen)) {
    if (s.typ !== "stelle") continue;
    const erreichbar = s.funkrufname || s.kontakte.some((k) => k.wert) || s.funk.length > 0 || s.leiter?.funkrufname || s.leiter?.kontakte.some((k) => k.wert);
    if (!erreichbar) hinweise.push({ regel: "ohne-erreichbarkeit", stufe: "info", text: `${name(s.id)}: kein Funkrufname und keine Erreichbarkeit.`, stelle: s.id });

    const eintraege = [...s.kontakte, ...s.funk, ...(s.leiter?.kontakte ?? [])];
    for (const e of eintraege) {
      const bezeichnung = "wert" in e ? e.wert : e.art === "digital" ? e.rufgruppe : `Kanal ${e.kanal}`;
      if (e.gueltigBis && e.gueltigBis < stand) {
        hinweise.push({ regel: "abgelaufen", stufe: "warnung", text: `${name(s.id)}: „${bezeichnung}" galt nur bis ${e.gueltigBis.replace("T", " ")}.`, stelle: s.id });
      }
      if (e.gueltigAb && e.gueltigAb > stand) {
        hinweise.push({ regel: "noch-nicht-gueltig", stufe: "info", text: `${name(s.id)}: „${bezeichnung}" gilt erst ab ${e.gueltigAb.replace("T", " ")}.`, stelle: s.id });
      }
    }

    // Rufgruppen der Kinder, die nach oben zeigen, und eigene nach unten: doppelte auf einer Ebene
    const gruppen = new Map<string, Id[]>();
    for (const k of s.kinder) {
      for (const f of plan.stellen[k]?.funk ?? []) {
        if (f.art !== "digital" || f.richtung !== "unten" || !f.rufgruppe) continue;
        const schl = `${f.betrieb}:${f.rufgruppe.toUpperCase()}`;
        gruppen.set(schl, [...(gruppen.get(schl) ?? []), k]);
      }
    }
    for (const [schl, ids] of gruppen) {
      if (ids.length > 1) {
        hinweise.push({ regel: "rufgruppe-doppelt", stufe: "warnung", text: `Rufgruppe ${schl.split(":")[1]} wird unter ${name(s.id)} von ${ids.map(name).join(", ")} zugleich geführt.`, stelle: ids[0] });
      }
    }
  }
  return hinweise;
}

function kurzName(z: Plan["stellen"][string]["zeichen"]): string | undefined {
  if (!z) return undefined;
  if (z.quelle === "katalog") return z.schluessel.split("/").pop()?.replaceAll("_", " ");
  return z.text;
}
