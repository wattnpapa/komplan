import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function blattMm(page: Page) {
  // Warten, bis das Einpassen nach dem Öffnen durch ist
  await page.waitForTimeout(800);
  const bb = (await page.locator(".blatt").boundingBox())!;
  const vb = (await page.locator(".blatt > div > svg").getAttribute("viewBox"))!.split(" ").map(Number);
  return (x: number, y: number) => ({ x: bb.x + (x * bb.width) / vb[2]!, y: bb.y + (y * bb.height) / vb[3]! });
}

test("Skizze: platzieren, verschieben, verbinden, rückgängig, PDF", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-13T10:00:00"));
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="fbfue77-2"]').click();
  await expect(page.getByRole("tab", { name: /Skizze 2/ })).toHaveAttribute("aria-selected", "true");
  const mm = await blattMm(page);

  await page.getByLabel("Gerät einfügen").selectOption("4m");
  let p = mm(150, 100);
  await page.mouse.click(p.x, p.y);
  await expect(page.getByRole("heading", { name: "Gerät" })).toBeVisible();
  await expect(page.getByLabel("x (mm)")).toHaveValue("150");

  await page.getByLabel("Anschluss einfügen").selectOption("funk-analog");
  p = mm(200, 140);
  await page.mouse.click(p.x, p.y);
  await page.getByRole("textbox", { name: "Text" }).fill("501 G/U");
  await expect(page.locator(".blatt text", { hasText: "501 G/U" })).toBeVisible();

  // Gerät um 10 mm nach rechts ziehen (Raster 2,5 mm)
  p = mm(152, 102);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  const z = mm(162, 102);
  await page.mouse.move(z.x, z.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByLabel("x (mm)")).toHaveValue("160");

  // Verbinder vom rechten Port des Geräts zum Anschluss ziehen
  const port = page.locator(".skizzen-ebene .port").nth(1);
  const pb = (await port.boundingBox())!;
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  const ziel = mm(205, 142.5);
  await page.mouse.move(ziel.x, ziel.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Verbinder" })).toBeVisible();
  await expect(page.locator('.blatt polyline[stroke="#d0021b"]')).toHaveCount(1);

  // Rückgängig entfernt den Verbinder, Wiederholen bringt ihn zurück
  await page.locator(".skizzen-flaeche").focus();
  await page.keyboard.press("Control+z");
  await expect(page.locator('.blatt polyline[stroke="#d0021b"]')).toHaveCount(0);
  await page.keyboard.press("Control+y");
  await expect(page.locator('.blatt polyline[stroke="#d0021b"]')).toHaveCount(1);

  // taktisch: Gerät verschwindet, Funk-Anschluss bleibt
  await page.keyboard.press("Escape");
  await page.locator(".skizzen-flaeche").click({ position: { x: 5, y: 5 } });
  await page.getByLabel(/taktisch: für Führungskräfte/).check();
  await expect(page.locator(".blatt text", { hasText: "501 G/U" })).toBeVisible();
  await expect(page.locator(".blatt text", { hasText: /^4 m$/ })).toHaveCount(0);

  // PDF
  await page.getByRole("button", { name: "Export ▾" }).click();
  await page.getByRole("menuitem", { name: "PDF…" }).click();
  await page.getByRole("button", { name: "Als Entwurf ausgeben" }).click();
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PDF herunterladen" }).click()]);
  expect((await readFile((await pdf.path())!)).subarray(0, 5).toString()).toBe("%PDF-");
});

test("Skizze aus einer Stelle erzeugen und Daten bleiben verknüpft", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="schadstoffunfall"]').click();
  await page.locator(".gliederung .gl-zeile", { hasText: "ELO Musterkreis" }).click();
  await page.getByRole("button", { name: /Kommunikationsskizze ▾/ }).click();
  await page.getByRole("menuitem", { name: /Aus gewählter Stelle erzeugen/ }).click();
  await expect(page.getByRole("tab", { name: /Skizze Musterkreis/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".blatt text", { hasText: "0999 400-916" }).first()).toBeVisible();
  // Telefonnummer an der Stelle ändern → Skizze zeigt die neue
  await page.locator(".eintrag").first().getByLabel("Nummer").fill("0999 400-999");
  await expect(page.locator(".blatt text", { hasText: "0999 400-999" }).first()).toBeVisible();
  await expect(page.locator(".blatt text", { hasText: "0999 400-916" })).toHaveCount(0);
});
