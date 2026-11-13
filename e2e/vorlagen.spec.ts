import { expect, test } from "@playwright/test";

// Bildvergleich: jede Startvorlage einmal als Blatt. Datum fest, damit der Stand gleich bleibt.
const VORLAGEN = ["dv1101-gruppe", "dv1101-zug", "dv1101-verband", "dv1101-abschnitte", "thw-einsatzstruktur", "schadstoffunfall", "logistik"];

for (const v of VORLAGEN) {
  test(`Vorlage ${v}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-13T10:00:00"));
    await page.goto("/");
    await page.getByRole("button", { name: "Neuer Plan" }).click();
    await page.locator(`[data-vorlage="${v}"]`).click();
    await expect(page.locator(".blatt svg").first()).toBeVisible();
    await page.getByRole("button", { name: /%$/ }).click(); // einpassen
    await page.waitForTimeout(300);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".blatt")).toHaveScreenshot(`${v}.png`);
  });
}
