import { expect, test } from "@playwright/test";

test("Kontextmenü in der Gliederung: Rechtsklick, Tastatur, Esc, Löschen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="leer"]').click();
  await page.getByRole("button", { name: "+ Stelle" }).click();
  const zeilen = page.locator(".gliederung .gl-zeile");
  await expect(zeilen).toHaveCount(1);

  // Rechtsklick → unterstellte Stelle anlegen
  await zeilen.first().click({ button: "right" });
  const menue = page.getByRole("menu");
  await expect(menue).toBeVisible();
  await menue.getByRole("menuitem", { name: "Unterstellte Stelle anlegen" }).click();
  await expect(menue).toHaveCount(0);
  await expect(zeilen).toHaveCount(2);

  // Klick daneben schließt
  await zeilen.nth(1).click({ button: "right" });
  await expect(menue).toBeVisible();
  await page.locator(".spalte-mitte").click({ position: { x: 5, y: 5 } });
  await expect(menue).toHaveCount(0);

  // Umschalt+F10 öffnet mit Fokus im Menü, Esc gibt ihn an die Zeile zurück
  await zeilen.nth(1).click();
  await page.keyboard.press("Shift+F10");
  await expect(menue).toBeVisible();
  await expect(menue.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menue).toHaveCount(0);
  await expect(zeilen.nth(1)).toBeFocused();

  // Menü bleibt im Fenster, auch ganz unten rechts geöffnet
  const vp = page.viewportSize()!;
  await page.evaluate(([x, y]) => {
    const z = document.querySelector(".gliederung .gl-zeile")!;
    z.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 2 }));
    z.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
  }, [vp.width - 2, vp.height - 2]);
  const box = (await menue.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
  await page.keyboard.press("Escape");

  // Löschen über das Menü, Strg+Z holt die Stelle zurück
  await zeilen.nth(1).click({ button: "right" });
  await menue.getByRole("menuitem", { name: "Löschen…" }).click();
  await expect(zeilen).toHaveCount(1);
  await page.locator(".spalte-mitte").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+z");
  await expect(zeilen).toHaveCount(2);
});
