import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { neuerPlan, neueStelle, stelleAnlegen } from "../modell/plan";
import { Gliederung } from "./gliederung";

function plan() {
  const p = neuerPlan();
  const tel = stelleAnlegen(p, neueStelle({ zeichen: { quelle: "katalog", schluessel: "Führungsstellen/TEL" } }));
  const ea = stelleAnlegen(p, neueStelle({ zeichen: { quelle: "katalog", schluessel: "Führungsstellen/EAL" }, nummer: "1", beschriftung: "Nord" }), { unter: tel });
  return { p, tel, ea };
}

describe("Gliederung", () => {
  it("zeigt den Baum mit Kurznamen und meldet Auswahl", () => {
    const { p, ea } = plan();
    const onAuswahl = vi.fn();
    render(<Gliederung plan={p} auswahl={[]} zugeklappt={new Set()} onAuswahl={onAuswahl} onZuklappen={() => {}} onUmhaengen={() => {}} onTaste={() => {}} />);
    expect(screen.getByText("TEL")).toBeTruthy();
    fireEvent.click(screen.getByText("EAL 1 Nord"));
    expect(onAuswahl).toHaveBeenCalledWith(ea, false);
  });

  it("blendet zugeklappte Teilbäume aus", () => {
    const { p, tel } = plan();
    render(<Gliederung plan={p} auswahl={[]} zugeklappt={new Set([tel])} onAuswahl={() => {}} onZuklappen={() => {}} onUmhaengen={() => {}} onTaste={() => {}} />);
    expect(screen.queryByText("EAL 1 Nord")).toBeNull();
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("öffnet das Kontextmenü per Rechtsklick und per Umschalt+F10", () => {
    const { p, ea } = plan();
    const onAuswahl = vi.fn();
    const onKontext = vi.fn();
    render(<Gliederung plan={p} auswahl={[]} zugeklappt={new Set()} onAuswahl={onAuswahl} onZuklappen={() => {}} onUmhaengen={() => {}} onTaste={() => {}} onKontext={onKontext} />);
    const zeile = screen.getByText("EAL 1 Nord").closest<HTMLElement>("[data-stelle]")!;
    const ereignis = fireEvent.contextMenu(zeile, { clientX: 40, clientY: 50 });
    expect(ereignis).toBe(false); // Browsermenü unterdrückt
    expect(onAuswahl).toHaveBeenCalledWith(ea, false);
    expect(onKontext).toHaveBeenLastCalledWith(ea, 40, 50, false);
    onKontext.mockClear();
    fireEvent.keyDown(zeile, { key: "F10", shiftKey: true });
    expect(onKontext).toHaveBeenCalledTimes(1);
    expect(onKontext.mock.calls[0]![3]).toBe(true);
  });
});
