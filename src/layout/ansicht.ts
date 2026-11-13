/** Eine Ansicht (gleich welcher Art) → Szene. */

import type { Ansicht, Plan } from "../modell/typen";
import type { Szene } from "../szene/typen";
import { fbfue76Szene } from "./fbfue76";
import { fuehrungsorgSzene } from "./fuehrungsorg";
import { fwdv800Szene } from "./fwdv800";
import { skizzeSzene } from "./skizze";

export function ansichtSzene(plan: Plan, ansicht: Ansicht): Szene {
  if (ansicht.typ === "skizze") return skizzeSzene(plan, ansicht);
  if (ansicht.typ === "kommunikationsplan" && ansicht.variante === "fb-fue-76") return fbfue76Szene(plan, ansicht);
  if (ansicht.typ === "kommunikationsplan" && ansicht.variante === "fwdv-800") return fwdv800Szene(plan, ansicht);
  return fuehrungsorgSzene(plan, ansicht, { titel: ansicht.kopfleiste && ansicht.typ === "fuehrungsorganisation" });
}
