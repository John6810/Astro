import { defineConfig } from "vitest/config";
import { cloudflarePool, cloudflareTest } from "@cloudflare/vitest-pool-workers";

// Vitest configured to run inside the Cloudflare workerd runtime via
// @cloudflare/vitest-pool-workers. Tests get a `SELF` binding that
// invokes the Worker entry under test (worker/index.ts) end-to-end,
// with the same bindings declared in wrangler.jsonc (env.ASSETS).
//
// `dist/` must exist when these tests run, since env.ASSETS reads from
// it. The `pnpm test` script runs `astro build` first.
//
// v0.16 API: cloudflareTest is a Vite plugin (resolves the cloudflare:test
// virtual module + transforms test files), cloudflarePool is the vitest
// pool runner.
const cfOptions = {
  wrangler: { configPath: "./wrangler.jsonc" },
};

export default defineConfig({
  plugins: [cloudflareTest(cfOptions)],
  test: {
    include: ["worker/**/*.test.ts"],
    pool: cloudflarePool(cfOptions),
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      provider: "istanbul",
      include: ["worker/**/*.ts"],
      exclude: ["worker/**/*.test.ts", "worker/__tests__/**"],
      reporter: ["text", "json", "html"],
    },
  },
});
