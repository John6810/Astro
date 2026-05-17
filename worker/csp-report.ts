// CSP violation report endpoint.
//
//   - Mounted at POST /csp-report by the main fetch handler. Must be
//     handled BEFORE locale routing — this path is not a page, must not
//     trigger Accept-Language redirects, must not set Vary, must not
//     serve from dist/.
//   - Accepts the historical `application/csp-report` content type (CSP2
//     `report-uri`) and the modern `application/reports+json` (CSP3
//     `report-to` / Reporting API). Anything else → 400.
//   - Logs each report via `console.log("[CSP-VIOLATION]", …)` so it
//     surfaces in Workers Logs / `wrangler tail` without any external
//     reporting service. Bodies are forwarded verbatim — we do NOT
//     inject IP, UA, or any other identifier the browser doesn't
//     already include.
//   - Throttled to 100 reports/minute/Worker-isolate so a misconfigured
//     CSP can't flood the log stream. Past the cap we respond 429 and
//     drop the report.

const CSP_REPORT_MAX_PER_MIN = 100;

// Module-level throttle state. Reset on isolate restart; CF Workers may
// run many isolates in parallel so the cap is per-isolate, not global,
// but that is fine for log-flood mitigation.
let cspReportCount = 0;
let cspReportWindowStart = Date.now();

/**
 * Returns true and consumes a slot when the request is within the
 * throttle budget. Returns false and rejects the request when the
 * window cap is exceeded.
 */
function cspReportThrottleAdmit(): boolean {
  const now = Date.now();
  if (now - cspReportWindowStart > 60_000) {
    cspReportCount = 0;
    cspReportWindowStart = now;
  }
  cspReportCount += 1;
  return cspReportCount <= CSP_REPORT_MAX_PER_MIN;
}

/** True when `pathname === "/csp-report"` AND method is POST. */
export function isCspReportRequest(request: Request, url: URL): boolean {
  return url.pathname === "/csp-report" && request.method === "POST";
}

/**
 * Handle a CSP violation report submission.
 *
 * Returns:
 *   - 204 No Content on a well-formed report
 *   - 400 Bad Request on missing/unsupported content-type or invalid JSON
 *   - 429 Too Many Requests when the throttle cap is exceeded
 *
 * Exported for unit testing in isolation from the main fetch handler.
 */
export async function handleCspReport(request: Request): Promise<Response> {
  if (!cspReportThrottleAdmit()) {
    return new Response(null, { status: 429 });
  }

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  const isCspReport = contentType.startsWith("application/csp-report");
  const isReportsJson = contentType.startsWith("application/reports+json");
  if (!isCspReport && !isReportsJson) {
    return new Response(null, { status: 400 });
  }

  let report: unknown;
  try {
    const text = await request.text();
    if (!text) return new Response(null, { status: 400 });
    report = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  // Forward the raw report to the log stream. No PII added.
  console.log("[CSP-VIOLATION]", JSON.stringify(report));
  return new Response(null, { status: 204 });
}

// Test-only helpers — not part of the public API, but the unit test
// pool needs to reset the in-memory counter between cases.
export function __resetCspReportThrottle(): void {
  cspReportCount = 0;
  cspReportWindowStart = Date.now();
}

export function __getCspReportThrottleState(): { count: number; windowStart: number } {
  return { count: cspReportCount, windowStart: cspReportWindowStart };
}
