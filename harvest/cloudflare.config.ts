import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "kept-vote-kitesurf",
    entrypoint: "./src/index.ts",
    compatibilityDate: "2026-10-21",
    compatibilityFlags: ["nodejs_compat"],
    observability: { enabled: true },
    // 20 pages every 10 minutes: a first pass over ~2,700 sources takes about
    // a day; afterwards only due pages (weekly official, monthly others).
    triggers: [triggers.scheduled({ schedule: "*/10 * * * *" })],
    env: {
      // Browser Run; the Worker always asks for the Kitesurf engine.
      BROWSER: bindings.browser(),
      DB: bindings.d1({ name: "kept-vote-harvest", id: "e1281546-1dc0-4213-88b5-391c53e05972" }),
      // Token-signing key. Lives only in Secrets Store; never read back.
      SIGNING_KEY: bindings.secretsStoreSecret({
        storeId: "786afc6b3adb482ab24681b14eb1deff",
        secretName: "kept-vote-kitesurf-signing-key",
      }),
      USER_AGENT: { type: "text", value: "kept-vote-kitesurf/1.0 (+https://kept.vote/en#methodology)" },
    },
  }),
});
