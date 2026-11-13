import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Kontakte eingeben, Kommunikationsplan, PDF und Stände", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-13T10:00:00"));
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="logistik"]').click();
  await page.locator(".gliederung .gl-zeile").first().click();
  // Kontakt und Rufgruppe an der obersten Stelle
  await page.getByRole("button", { name: "+ Telefon" }).click();
  await page.getByLabel("Nummer").last().fill("0999 4711-0");
  await page.getByText(/^Funk: Rufgruppen und Kanäle/).click();
  await page.getByRole("button", { name: "+ Rufgruppe (Digitalfunk)" }).click();
  await page.getByLabel("Rufgruppe", { exact: true }).fill("TBZ_9901_UNI");
  // Kommunikationsplan-Ansicht anlegen
  await page.getByRole("button", { name: "+ Kommunikationsplan" }).click();
  await expect(page.getByRole("tab", { name: /Komplan/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".blatt text", { hasText: "0999 4711-0" })).toBeVisible();
  await expect(page.locator(".blatt text", { hasText: "TBZ_9901_UNI" })).toBeVisible();
  // In der Führungsorganisation steht der Kontakt nicht
  await page.getByRole("tab", { name: /FüOrg/ }).click();
  await expect(page.locator(".blatt text", { hasText: "0999 4711-0" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Komplan/ }).click();

  // PDF
  await page.getByRole("button", { name: "Export ▾" }).click();
  await page.getByRole("menuitem", { name: "PDF…" }).click();
  await page.getByLabel("A4").check();
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PDF herunterladen" }).click()]);
  const bytes = await readFile((await pdf.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.toString("latin1")).toContain("Roboto");

  // Stand einfrieren, ändern, vergleichen
  await page.getByRole("button", { name: /^Stand / }).click();
  await page.getByLabel(/Bemerkung/).fill("Lagewechsel");
  await page.getByRole("button", { name: "Neuen Stand anlegen" }).click();
  await expect(page.getByRole("button", { name: /^Stand .*V2/ })).toBeVisible();
  await expect(page.locator(".planliste").getByText(/Version 1/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".gliederung .gl-zeile").first().click();
  await page.getByLabel("Funkrufname", { exact: true }).fill("Heros Muster 1");
  await page.getByRole("button", { name: /^Stand / }).click();
  await page.getByRole("button", { name: "Ansehen und vergleichen" }).click();
  await expect(page.locator(".aenderungen")).toContainText("Heros Muster 1");
});

test("Kommunikationsplan Schadstoffunfall (Bildvergleich)", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-13T10:00:00"));
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="schadstoffunfall"]').click();
  await page.getByRole("tab", { name: /Komplan/ }).click();
  await expect(page.locator(".blatt svg").first()).toBeVisible();
  await page.getByRole("button", { name: /%$/ }).click();
  await page.waitForTimeout(300);
  await expect(page.locator(".blatt")).toHaveScreenshot("komplan-schadstoffunfall.png");
});
