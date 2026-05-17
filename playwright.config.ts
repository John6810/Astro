import { defineConfig, devices } from "@playwright/test";

// E2E configuration. The suite runs against PREVIEW_URL (the CF Workers
// Builds preview URL set per-PR by the platform), or jonathan-aerts.dev
// when running locally for prod smoke tests.
//
// Two browsers because the CSP 'strict-dynamic' experiment + CSP-error
// console listeners need to be validated in both Chromium and Firefox:
// CSP3 support differs in subtle ways and the spec asks for explicit
// cross-browser confirmation.
const PREVIEW_URL = process.env.PREVIEW_URL ?? "https://jonathan-aerts.dev";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: PREVIEW_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
