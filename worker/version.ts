// GET /version — drift detection endpoint.
//
//   - Returns the commit SHA and build timestamp the Worker was
//     deployed from. Used by the .github/workflows/drift-check.yml
//     poller and synthetic monitor #11 to detect when the deployed
//     Worker has fallen behind `main`.
//   - Explicitly NOT instrumented: this is an ops endpoint and
//     shouldn't pollute the analytics dataset.
//   - `Cache-Control: no-store` — drift detection needs fresh reads;
//     a cached /version response defeats the entire purpose.
//   - Does NOT set Vary — same response for every caller.
//   - Standard security headers still apply (added by the main fetch
//     handler in worker/index.ts via applySecurityHeaders).

import { BUILT_AT, COMMIT_SHA } from "./version.generated";

export interface VersionPayload {
  sha: string;
  builtAt: string;
  worker: "astro";
}

/** True when `pathname === "/version"` AND method is GET. */
export function isVersionRequest(url: URL, method: string): boolean {
  return url.pathname === "/version" && method === "GET";
}

/**
 * Build the JSON Response. Pulled out of the route handler so unit
 * tests can call it directly without spinning up a full fetch flow.
 */
export function buildVersionResponse(): Response {
  const payload: VersionPayload = {
    sha: COMMIT_SHA,
    builtAt: BUILT_AT,
    worker: "astro",
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
