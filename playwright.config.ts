import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// In der Cloud-Umgebung liegt Chromium vorinstalliert; in der CI holt
// `npx playwright install chromium` den passenden Browser.
const CHROMIUM = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4174",
    viewport: { width: 1440, height: 900 },
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    launchOptions: existsSync(CHROMIUM) ? { executablePath: CHROMIUM } : {},
    serviceWorkers: "block",
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  snapshotPathTemplate: "{testDir}/__bilder__/{arg}{ext}",
  webServer: {
    command: "npm run build && npx vite preview --port 4174 --strictPort",
    port: 4174,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
