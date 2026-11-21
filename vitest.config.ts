import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Kern-Bausteine aus vendor/ werden aus der Quelle gelesen, wie im Bundle.
function kernPfad(baustein: string, modul: string): string {
  return fileURLToPath(new URL(`./vendor/${baustein}/src/${modul}.ts`, import.meta.url));
}
const kernAliasse = [
  { find: /^@bos\/eeb-format\/(.*)$/, replacement: kernPfad("eeb-format", "$1") },
  { find: /^@bos\/eeb-format$/, replacement: kernPfad("eeb-format", "index") },
  { find: /^@bos\/vokabulare\/(.*)$/, replacement: kernPfad("bos-vokabulare", "$1") },
  { find: /^@bos\/vokabulare$/, replacement: kernPfad("bos-vokabulare", "index") },
  { find: /^@bos\/taktische-zeichen\/(.*)$/, replacement: kernPfad("bos-taktische-zeichen", "$1") },
  { find: /^@bos\/taktische-zeichen$/, replacement: kernPfad("bos-taktische-zeichen", "index") },
];

// Zwei Suiten wie in erfassungsbogen: „logik" (node) und „oberflaeche" (jsdom).
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: kernAliasse },
        test: { name: "logik", environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
      },
      {
        // svg2pdf.js nennt als "main" ein UMD-Bündel, obwohl das Paket "type": "module" ist;
        // unter node fände es jsPDF nicht. Wie im Bundle die ES-Fassung nehmen.
        resolve: { alias: [...kernAliasse, { find: /^svg2pdf\.js$/, replacement: "svg2pdf.js/dist/svg2pdf.es.js" }] },
        define: { __APP_VERSION__: JSON.stringify("test") },
        test: {
          name: "oberflaeche",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["src/test/oberflaeche.ts"],
        },
      },
    ],
    coverage: { provider: "v8", include: ["src/**/*.ts", "src/**/*.tsx"], exclude: ["src/**/*.test.*", "src/test/**", "src/app/main.tsx"] },
  },
});
