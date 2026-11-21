import { readFile } from "node:fs/promises";
import { expect, test } from "./fixture.js";

// Das echte count.js (ISC) liegt als Kopie in __fixture__, damit der Test ohne Netz läuft.
const COUNT_JS = readFile(new URL("./__fixture__/count.js", import.meta.url), "utf8");

async function zaehlung(page: import("@playwright/test").Page): Promise<string[]> {
  const urls: string[] = [];
  const script = await COUNT_JS;
  await page.route("https://gc.zgo.at/count.js", (r) => r.fulfill({ contentType: "text/javascript", body: script }));
  await page.route(/^https:\/\/komplan\.goatcounter\.com\//, (r) => {
    urls.push(r.request().url());
    return r.fulfill({ status: 200, contentType: "image/gif", body: "" });
  });
  // count.js zählt auf localhost sonst nicht.
  await page.addInitScript(() => {
    (window as unknown as { goatcounter: object }).goatcounter = { allow_local: true };
  });
  return urls;
}

function pruefe(urls: string[], planId?: string): void {
  expect(urls.length).toBeGreaterThan(0);
  for (const u of urls) {
    const dekodiert = decodeURIComponent(u);
    expect(dekodiert).not.toContain("#");
    expect(dekodiert).not.toContain("p=#");
    expect(u).not.toMatch(/[?&]p=[^&]*(plan|%23)/i);
    expect(u).not.toMatch(/[?&]r=[^&]*(%23|#)/);
    expect(u).not.toMatch(/[?&]q=./);
    if (planId) expect(dekodiert).not.toContain(planId);
    expect(new URL(u).searchParams.get("p")).toBe("/");
  }
}

test("Zählung sendet nur den Pfad, nie ein Fragment", async ({ page }) => {
  const urls = await zaehlung(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="logistik"]').click();
  await expect(page.locator(".gliederung .gl-zeile").first()).toBeVisible();
  const planId = new URL(page.url()).hash.match(/^#\/plan\/([A-Za-z0-9]+)/)?.[1];
  expect(planId).toBeTruthy();
  await page.reload();
  await expect(page.locator(".gliederung .gl-zeile").first()).toBeVisible();
  await expect.poll(() => urls.length).toBeGreaterThan(1);
  pruefe(urls, planId);
});

test("Zählung bleibt beim Öffnen eines Teil-Links ohne Fragment", async ({ page }) => {
  const urls = await zaehlung(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator('[data-vorlage="logistik"]').click();
  await page.getByRole("button", { name: "Export ▾" }).click();
  await page.getByRole("menuitem", { name: "Als Link teilen…" }).click();
  await page.getByLabel("Verstanden, Link erzeugen").check();
  await page.getByRole("button", { name: "Link erzeugen" }).click();
  const link = await page.getByLabel(/^Link \(/).inputValue();
  expect(link).toContain("#p=");
  urls.length = 0;
  await page.goto("about:blank");
  await page.goto(link.replace(/^https?:\/\/[^/]+/, "http://localhost:4174"));
  await expect(page.getByRole("button", { name: "Plan übernehmen und öffnen" })).toBeVisible();
  await expect.poll(() => urls.length).toBeGreaterThan(0);
  pruefe(urls);
  const p = new URL(link).hash.slice(3);
  for (const u of urls) expect(u).not.toContain(p.slice(0, 20));
});

test("Widerspruch: mit skipgc wird nichts gesendet", async ({ page }) => {
  const urls = await zaehlung(page);
  await page.addInitScript(() => localStorage.setItem("skipgc", "t"));
  await page.goto("/datenschutz.html");
  await expect(page.locator("#nicht-zaehlen")).toBeChecked();
  await page.waitForLoadState("load");
  await page.waitForTimeout(500);
  expect(urls).toHaveLength(0);
});
