import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Teil-Link: erst Hinweis, dann Link; Öffnen übernimmt den Plan", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="schadstoffunfall"]').click();
  await page.getByRole("button", { name: "Export ▾" }).click();
  await page.getByRole("menuitem", { name: "Als Link teilen…" }).click();
  await expect(page.getByText(/Der Link enthält den ganzen Plan/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Link erzeugen" })).toBeDisabled();
  await page.getByLabel("Verstanden, Link erzeugen").check();
  await page.getByRole("button", { name: "Link erzeugen" }).click();
  const link = await page.getByLabel(/^Link \(/).inputValue();
  expect(link).toMatch(/#p=[A-Za-z0-9_-]+$/);

  // Anderes „Gerät": neuer Kontext ohne Daten
  const fremd = await context.browser()!.newContext({ serviceWorkers: "block" });
  const seite = await fremd.newPage();
  await seite.goto(link.replace(/^https?:\/\/[^/]+/, "http://localhost:4174"));
  await expect(seite.getByText("Schadstoffunfall Musterküste")).toBeVisible();
  await seite.getByRole("button", { name: "Plan übernehmen und öffnen" }).click();
  await expect(seite.locator(".plan-name")).toHaveValue("Schadstoffunfall Musterküste");
  await expect(seite.getByRole("tab", { name: /Komplan/ })).toBeVisible();
  await fremd.close();
});

test("Formularansichten und PowerPoint-Export", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="fbfue76"]').click();
  await expect(page.locator(".blatt text", { hasText: "Fb Fü 76" })).toBeVisible();
  await expect(page.locator(".blatt text", { hasText: "Heros Simbach 10" }).first()).toBeVisible();
  // Darstellung auf FwDV 800 umschalten: gleiche Daten, anderes Formular
  await page.getByLabel("Darstellung").selectOption("fwdv-800");
  await expect(page.locator(".blatt text", { hasText: "Kommunikationsunterlagen" })).toBeVisible();
  await expect(page.locator(".blatt text", { hasText: "Heros Simbach 21/10" })).toBeVisible();
  // Klick auf eine Stelle im Formular wählt sie zum Bearbeiten
  await page.locator(".blatt text", { hasText: "Heros Simbach 21/10" }).click();
  await expect(page.getByRole("heading", { name: /UEAL 1/ })).toBeVisible();

  await page.getByRole("button", { name: "Export ▾" }).click();
  const [pptx] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "PowerPoint (bearbeitbar)" }).click().then(() => page.getByRole("button", { name: "Als Entwurf ausgeben" }).click())]);
  const bytes = await readFile((await pptx.path())!);
  expect(bytes.subarray(0, 2).toString()).toBe("PK");
  expect(pptx.suggestedFilename()).toMatch(/\.pptx$/);
});

test("Hinweisliste springt zur Stelle", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="logistik"]').click();
  await page.getByRole("button", { name: /Prüfung|Hinweis/ }).click();
  const eintrag = page.locator(".hinweis-liste li button", { hasText: "kein Funkrufname" }).first();
  await eintrag.click();
  await expect(page.locator(".gliederung .gl-zeile.gewaehlt")).toHaveCount(1);
});

test.describe("offline", () => {
  test.use({ serviceWorkers: "allow" });
  test("startet nach dem ersten Aufruf ohne Netz", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Neuer Plan" }).click();
    await page.locator('[data-vorlage="dv1101-zug"]').click();
    await expect(page.locator(".gliederung .gl-zeile").first()).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".gliederung .gl-zeile").first()).toBeVisible();
    await expect(page.locator(".offline-marke")).toBeVisible();
  });
});
