import { test as basis, expect } from "@playwright/test";

/**
 * Gemeinsame Fixture: Die Tests hängen nie vom Netz ab. Requests an
 * GoatCounter werden abgebrochen; `e2e/zaehlung.spec.ts` überschreibt das
 * gezielt, um die gesendeten Adressen zu prüfen.
 */
export const test = basis.extend({
  context: async ({ context }, nutzen) => {
    await context.route(/^https:\/\/(gc\.zgo\.at|[^/]*\.goatcounter\.com)\//, (r) => r.abort());
    await nutzen(context);
  },
});
export { expect };
