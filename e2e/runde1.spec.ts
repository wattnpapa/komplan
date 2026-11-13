import { expect, test, type Page } from "@playwright/test";

// Befunde K01–K05 aus docs/audits/runde-1/README.md

async function vorlage(page: Page, id: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Neuer Plan" }).click();
  await page.locator(`[data-vorlage="${id}"]`).click();
  await expect(page.locator(".plan-name")).toBeVisible();
  await expect(page.locator(".speicher-stand")).toHaveText(/✓ gespeichert/);
}

test("K01: Löschrückfrage bricht mit Esc und Enter ab, löscht nur auf ausdrückliche Wahl", async ({ page }) => {
  await vorlage(page, "schadstoffunfall");
  const zeilen = page.locator(".gliederung .gl-zeile");
  const vorher = await zeilen.count();
  const lk = page.locator(".gliederung .gl-zeile", { hasText: "LK Musterkreis" }).first();

  await lk.click();
  await page.keyboard.press("Delete");
  await expect(page.getByText(/Was soll gelöscht werden/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Was soll gelöscht werden/)).toHaveCount(0);
  await expect(zeilen).toHaveCount(vorher);

  await lk.click();
  await page.keyboard.press("Delete");
  await expect(page.locator("dialog [data-abbrechen]")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(zeilen).toHaveCount(vorher);

  await lk.click();
  await page.keyboard.press("Delete");
  await page.getByRole("button", { name: /^Nur diese Stelle/ }).click();
  await expect(zeilen).toHaveCount(vorher - 1);
});

test("K03: Neuladen direkt nach einer Eingabe verliert sie nicht", async ({ page }) => {
  await vorlage(page, "leer");
  await page.locator(".plan-name").fill("Sofort neu geladen");
  await page.reload();
  await expect(page.locator(".plan-name")).toHaveValue("Sofort neu geladen");
  await expect(page.locator(".speicher-stand")).toHaveText(/gespeichert/);
  await page.reload();
  await expect(page.locator(".plan-name")).toHaveValue("Sofort neu geladen");
});

/** Legt eine Notsicherung an, wie sie beim Verlassen der Seite entsteht (Plan aus der Ablage, Name geändert). */
async function notsicherungAnlegen(page: Page, name: string, revPassend: boolean) {
  await page.evaluate(
    async ([name, revPassend]) => {
      const id = location.hash.match(/^#\/plan\/([A-Za-z0-9]+)/)![1]!;
      const db: IDBDatabase = await new Promise((ok) => (indexedDB.open("komplan").onsuccess = (e) => ok((e.target as IDBOpenDBRequest).result)));
      const lesen = <T,>(store: string, key: string): Promise<T> =>
        new Promise((ok) => (db.transaction(store).objectStore(store).get(key).onsuccess = (e) => ok((e.target as IDBRequest<T>).result)));
      const plan = await lesen<{ name: string }>("plaene", id);
      const rev = await lesen<string>("werte", `rev:${id}`);
      localStorage.setItem(`komplan:notsicherung:${id}`, JSON.stringify({ plan: { ...plan, name }, basisRev: revPassend ? rev : "veraltet" }));
    },
    [name, revPassend] as const,
  );
}

test("K03: Notsicherung wird nach dem Neuladen übernommen, bei fremder Zwischenänderung als Konflikt", async ({ page }) => {
  await vorlage(page, "leer");
  await notsicherungAnlegen(page, "Aus der Notsicherung", true);
  await page.reload();
  await expect(page.locator(".plan-name")).toHaveValue("Aus der Notsicherung");
  await expect(page.getByText(/wiederhergestellt/)).toBeVisible();
  await expect(page.locator(".speicher-stand")).toHaveText(/✓ gespeichert/);
  await page.reload();
  await expect(page.locator(".plan-name")).toHaveValue("Aus der Notsicherung");

  await notsicherungAnlegen(page, "Veraltete Notsicherung", false);
  await page.reload();
  await expect(page.locator(".konflikt-band")).toBeVisible();
  await page.getByRole("button", { name: /Andere Fassung laden/ }).click();
  await expect(page.locator(".plan-name")).toHaveValue("Aus der Notsicherung");
});

test("K02: zwei Tabs überschreiben sich nicht still", async ({ page, context }) => {
  await vorlage(page, "leer");
  const b = await context.newPage();
  await b.goto(page.url());
  await expect(b.locator(".plan-name")).toHaveValue("Neuer Plan");

  // Änderung in A wird in B ohne eigene Änderungen nachgeladen
  await page.locator(".plan-name").fill("Aus Tab A");
  await expect(b.locator(".plan-name")).toHaveValue("Aus Tab A");

  // Beide ändern gleichzeitig: einer gewinnt, der andere zeigt den Konflikt
  await page.locator(".plan-name").fill("A zuletzt");
  await b.locator(".plan-name").fill("B zuletzt");
  await expect.poll(async () => (await page.locator(".konflikt-band").count()) + (await b.locator(".konflikt-band").count()), { timeout: 8000 }).toBe(1);
  const verlierer = (await page.locator(".konflikt-band").count()) ? page : b;
  const gewinner = verlierer === page ? b : page;
  const gewinnerName = await gewinner.locator(".plan-name").inputValue();
  await expect(gewinner.locator(".speicher-stand")).toHaveText(/✓ gespeichert/);

  // Verlierer sichert seine Fassung als Kopie und lädt die andere
  await verlierer.getByRole("button", { name: /als Kopie sichern/ }).click();
  await expect(verlierer.locator(".konflikt-band")).toHaveCount(0);
  await expect(verlierer.locator(".plan-name")).toHaveValue(gewinnerName);
  await verlierer.getByRole("button", { name: "← Pläne" }).click();
  await expect(verlierer.locator(".planliste").getByText(/Fassung aus anderem Fenster/)).toBeVisible();
});

test("K04/K05: geänderter Stand ist sichtbar, Ausgabe fragt nach neuem Stand, Druck trägt Stand und Version", async ({ page }) => {
  await vorlage(page, "fbfue76");
  const stand = page.locator(".stand-knopf");
  await expect(stand).not.toContainText("geändert");
  await expect(stand).toContainText("V1");

  // Ausgabe ohne Änderung hält Version 1 fest, ohne zu fragen
  await page.getByRole("button", { name: "Export ▾" }).click();
  await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "SVG (Vektor)" }).click()]);

  // Druckfuß ohne Änderung: Stand und Version, kein Entwurf
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".druck-fuss")).toBeVisible();
  await expect(page.locator(".druck-fuss")).toContainText(/Stand \d{6}[A-Z]{3}\d{2} · Version 1/);
  await expect(page.locator(".druck-fuss")).not.toContainText("ENTWURF");
  await page.emulateMedia({ media: "screen" });

  // Umbenennen ist keine inhaltliche Änderung, eine Beschriftung schon
  await page.locator(".plan-name").fill("Simbach umbenannt");
  await expect(stand).not.toContainText("geändert");
  await page.locator(".gliederung .gl-zeile").first().click();
  await page.getByLabel("Beschriftung", { exact: true }).fill("Geändert");
  await expect(stand).toContainText("geändert");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".druck-fuss")).toContainText("ENTWURF");
  await page.emulateMedia({ media: "screen" });

  // Export fragt; Abbrechen lädt nichts herunter
  await page.getByRole("button", { name: "Export ▾" }).click();
  await page.getByRole("menuitem", { name: "SVG (Vektor)" }).click();
  await expect(page.getByText(/seit Stand .* geändert/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Neuer Stand: Version 2, nicht mehr geändert, Datei trägt den neuen Stand
  await page.getByRole("button", { name: "Export ▾" }).click();
  await page.getByRole("menuitem", { name: "SVG (Vektor)" }).click();
  const [datei] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Neuen Stand anlegen und ausgeben" }).click()]);
  expect(datei.suggestedFilename()).not.toContain("Entwurf");
  await expect(stand).toContainText("V2");
  await expect(stand).not.toContainText("geändert");

  // Stände-Dialog: Version 2 ist mit genau diesem Inhalt eingefroren
  await stand.click();
  await expect(page.locator(".planliste li", { hasText: "Version 1" })).toBeVisible();
  await expect(page.locator(".planliste li", { hasText: "Version 2" })).toBeVisible();
  await page.locator(".planliste li", { hasText: "Version 2" }).getByRole("button", { name: /vergleichen/ }).click();
  await expect(page.getByText("Keine Unterschiede in Stellen, Kontakten und Funk.")).toBeVisible();
});
