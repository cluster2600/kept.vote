import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "kept-vote",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-21",
    compatibilityFlags: ["nodejs_compat"],
    // The bare domain is canonical; proxy.ts redirects www to it.
    domains: ["kept.vote", "www.kept.vote"],
    observability: { enabled: true },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      // Absolute origin for canonical and hreflang links (lib/i18n/metadata.ts).
      SITE_URL: { type: "text", value: "https://kept.vote" },
      // Site content: pre-rendered API responses loaded by build_d1.py.
      DB: bindings.d1({
        name: "kept-vote",
        id: "8fe5630a-bcda-47d5-a644-5af00d85c81c",
      }),
    },
  }),
});
