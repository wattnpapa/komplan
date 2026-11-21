import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Kontextmenue } from "./kontextmenue";

function menue(onSchliessen = vi.fn(), fokus = false) {
  render(
    <div>
      <button type="button">daneben</button>
      <Kontextmenue x={10} y={10} fokus={fokus} label="Stelle" onSchliessen={onSchliessen}>
        <button role="menuitem" type="button">Eins</button>
        <button role="menuitem" type="button">Zwei</button>
      </Kontextmenue>
    </div>,
  );
  return onSchliessen;
}

describe("Kontextmenue", () => {
  it("schließt bei Esc und bei Klick daneben, nicht bei Klick hinein", () => {
    const zu = menue();
    fireEvent.pointerDown(screen.getByText("Eins"));
    expect(zu).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText("daneben"));
    expect(zu).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(zu).toHaveBeenCalledTimes(2);
  });

  it("setzt per Tastatur den Fokus auf den ersten Eintrag und wandert mit Pfeilen", () => {
    menue(vi.fn(), true);
    expect(document.activeElement).toBe(screen.getByText("Eins"));
    fireEvent.keyDown(screen.getByText("Eins"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByText("Zwei"));
    fireEvent.keyDown(screen.getByText("Zwei"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByText("Eins"));
  });
});
