/// <reference types="@cloudflare/vitest-pool-workers/types" />

// Tell @cloudflare/vitest-pool-workers about our Worker's Env shape so
// `env` from `cloudflare:test` is typed.
import type { Env } from "../index";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}
