import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Plan anlegen, bearbeiten, exportieren und wieder einlesen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="leer"]').click();
  await expect(page.locator(".plan-name")).toHaveValue("Neuer Plan");

  await page.locator(".plan-name").fill("Übung Musterstadt");
  // Oberste Stelle mit Zeichen TEL
  await page.getByRole("button", { name: "+ Stelle" }).click();
  await page.locator(".zeichen-knopf").click();
  await page.getByLabel(/Suche/).fill("TEL");
  await page.locator(".zeichen-kachel", { hasText: "Technische Einsatzleitung" }).first().click();
  // Zwei Einsatzabschnitte darunter
  for (const ort of ["Nord", "Süd"]) {
    await page.locator(".gliederung .gl-zeile").first().click();
    await page.getByRole("button", { name: "+ Stelle" }).click();
    await page.locator(".zeichen-knopf").click();
    await page.getByLabel(/Suche/).fill("EAL");
    await page.locator(".zeichen-kachel", { hasText: "Einsatzabschnittsleitung" }).first().click();
    await page.getByLabel("Beschriftung", { exact: true }).fill(ort);
  }
  await expect(page.locator(".gliederung .gl-zeile")).toHaveCount(3);
  await expect(page.locator(".blatt text", { hasText: "Süd" })).toBeVisible();
  await expect(page.locator(".speicher-stand")).toHaveText(/gespeichert/);

  // Rückgängig und wiederholen
  await page.locator(".spalte-mitte").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+z");
  await expect(page.locator(".blatt text", { hasText: "Süd" })).toHaveCount(0);
  await page.keyboard.press("Control+y");
  await expect(page.locator(".blatt text", { hasText: "Süd" })).toBeVisible();

  // Nach Neuladen noch da
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator(".gliederung .gl-zeile")).toHaveCount(3);

  // SVG-Export
  await page.getByRole("button", { name: "Export ▾" }).click();
  const [svgDownload] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "SVG (Vektor)" }).click()]);
  const svg = await readFile((await svgDownload.path())!, "utf8");
  expect(svg).toContain("<svg");
  expect(svg).toContain(">Süd</text>");
  expect(svg).toContain("font/woff;base64");

  // PNG-Export
  await page.getByRole("button", { name: "Export ▾" }).click();
  const [png] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "PNG, weißer Hintergrund" }).click()]);
  expect((await readFile((await png.path())!)).subarray(1, 4).toString()).toBe("PNG");

  // JSON-Export und Wiedereinlesen
  await page.getByRole("button", { name: "Export ▾" }).click();
  const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: /JSON/ }).click()]);
  const jsonPfad = (await json.path())!;
  expect(JSON.parse(await readFile(jsonPfad, "utf8")).format).toBe("komplan");

  await page.getByRole("button", { name: "← Pläne" }).click();
  const [auswahl] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /Plan einlesen/ }).click()]);
  await auswahl.setFiles(jsonPfad);
  await expect(page.locator(".plan-name")).toHaveValue("Übung Musterstadt (eingelesen)");
  await expect(page.locator(".gliederung .gl-zeile")).toHaveCount(3);
});

test("Umhängen per Ziehen in der Gliederung", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="logistik"]').click();
  const zeilen = page.locator(".gliederung .gl-zeile");
  await expect(zeilen.first()).toBeVisible();
  const vorher = await zeilen.count();
  // „EAL 2" unter „EAL 1" ziehen
  const quelle = page.locator(".gliederung .gl-zeile", { has: page.getByText(/^EAL 2$/) });
  const ziel = page.locator(".gliederung .gl-zeile", { has: page.getByText(/^EAL 1$/) });
  await quelle.dragTo(ziel);
  await expect(zeilen).toHaveCount(vorher);
  const ea1 = page.locator('.gliederung li[aria-level="2"]', { has: page.locator(".gl-zeile", { has: page.getByText(/^EAL 1$/) }) }).first();
  await expect(ea1.locator('li[aria-level="3"]').getByText(/^EAL 2$/)).toHaveCount(1);
});
