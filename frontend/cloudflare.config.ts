import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "kept-vote",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-21",
    compatibilityFlags: ["nodejs_compat"],
    observability: { enabled: true },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      // Site content: pre-rendered API responses loaded by build_d1.py.
      DB: bindings.d1({
        name: "kept-vote",
        id: "8fe5630a-bcda-47d5-a644-5af00d85c81c",
      }),
    },
  }),
});
