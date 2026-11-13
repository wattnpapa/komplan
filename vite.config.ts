import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** Fassung zum Anzeigen: Bauzeit in UTC und Commit (wie einsatzauftrag). */
function fassung(): string {
  let commit = "";
  try {
    commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    commit = "";
  }
  const zeit = `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
  return commit ? `${zeit} (${commit})` : zeit;
}

function kernPfad(baustein: string, modul: string): string {
  return fileURLToPath(new URL(`./vendor/${baustein}/src/${modul}.ts`, import.meta.url));
}

/**
 * Content-Security-Policy als <meta>, nur im Build (wie erfassungsbogen).
 * komplan lädt nichts von fremden Hosts: keine Reichweitenmessung, keine
 * CDN-Schriften. Inline-Skripte werden gehasht freigegeben.
 */
function contentSecurityPolicy(): Plugin {
  const INLINE_SKRIPT = /<script(?![^>]*\ssrc[\s=])[^>]*>([\s\S]*?)<\/script>/g;
  return {
    name: "komplan-csp",
    apply: "build",
    enforce: "post",
    generateBundle(_o, bundle) {
      const html = bundle["index.html"];
      if (!html || html.type !== "asset") return;
      const quelle = String(html.source);
      const hashes = [...new Set([...quelle.matchAll(INLINE_SKRIPT)].map((t) => `'sha256-${createHash("sha256").update(t[1]!, "utf8").digest("base64")}'`))];
      const policy = [
        "default-src 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        "form-action 'none'",
        `script-src 'self' ${hashes.join(" ")}`.trim(),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "worker-src 'self'",
      ].join("; ");
      html.source = quelle.replace("<head>", `<head>\n<meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    },
  };
}

export default defineConfig({
  base: "./",
  resolve: {
    alias: [
      { find: /^@bos\/vokabulare\/(.*)$/, replacement: kernPfad("bos-vokabulare", "$1") },
      { find: /^@bos\/eeb-format\/(.*)$/, replacement: kernPfad("eeb-format", "$1") },
    ],
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_BUILD_VERSION || version),
    __FASSUNG__: JSON.stringify(fassung()),
  },
  plugins: [
    react(),
    VitePWA({
      // Neue Fassung erst nach Klick aktivieren: es wird vielleicht gerade gezeichnet.
      registerType: "prompt",
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff,woff2,ttf,json,txt}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/impressum\.html$/, /datenschutz\.html$/],
      },
    }),
    contentSecurityPolicy(),
  ],
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        app: "index.html",
        impressum: "impressum.html",
        datenschutz: "datenschutz.html",
      },
    },
  },
});
