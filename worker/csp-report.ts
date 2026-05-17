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
//   - Writes a low-cardinality `csp_violation` datapoint to the
//     Analytics Engine dataset for SQL queryable trends (per-directive,
//     per-blocked-domain). The console log and the analytics datapoint
//     are independent signals — the log carries the raw body for
//     forensics, the datapoint carries only the bucketed dimensions for
//     long-term trend analysis. See docs/analytics-queries.md.
//   - Throttled to 100 reports/minute/Worker-isolate so a misconfigured
//     CSP can't flood the log stream or the analytics dataset. Past the
//     cap we respond 429 and drop the report (no log, no datapoint).

import { extractDomain, recordCspViolation } from "./analytics";

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
 * Best-effort extraction of `(directive, blockedUri)` from both legacy
 * `application/csp-report` and modern `application/reports+json`
 * body shapes.
 *
 * Legacy body:
 *   { "csp-report": { "violated-directive": "...", "blocked-uri": "..." } }
 *
 * Modern body (array of reports):
 *   [
 *     { "type": "csp-violation",
 *       "body": { "violatedDirective": "...", "blockedURL": "..." } }
 *   ]
 *
 * Returns `{ directive: "unknown", blockedUri: undefined }` on a shape
 * we don't recognise so the caller can still emit a low-signal datapoint
 * rather than dropping the event entirely (regression evidence > silence).
 */
function extractReportFields(report: unknown): {
  directive: string;
  blockedUri: string | undefined;
} {
  if (!report || typeof report !== "object") {
    return { directive: "unknown", blockedUri: undefined };
  }
  const r = report as Record<string, unknown>;

  // Legacy CSP2: `{ "csp-report": { … } }`
  const legacy = r["csp-report"];
  if (legacy && typeof legacy === "object") {
    const inner = legacy as Record<string, unknown>;
    return {
      directive: stringOr(inner["violated-directive"] ?? inner.violatedDirective, "unknown"),
      blockedUri: optString(inner["blocked-uri"] ?? inner.blockedUri ?? inner.blockedURL),
    };
  }

  // Modern Reporting API: either a single object or an array of objects.
  // The Worker receives each report individually in the dispatched
  // request body, so we accept both shapes defensively.
  const candidate = Array.isArray(r) ? (r[0] as Record<string, unknown> | undefined) : r;
  if (candidate && typeof candidate === "object") {
    const body = (candidate.body ?? candidate) as Record<string, unknown>;
    return {
      directive: stringOr(body["violated-directive"] ?? body.violatedDirective, "unknown"),
      blockedUri: optString(body["blocked-uri"] ?? body.blockedUri ?? body.blockedURL),
    };
  }

  return { directive: "unknown", blockedUri: undefined };
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function optString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Handle a CSP violation report submission.
 *
 * Returns:
 *   - 204 No Content on a well-formed report
 *   - 400 Bad Request on missing/unsupported content-type or invalid JSON
 *   - 429 Too Many Requests when the throttle cap is exceeded
 *
 * The Analytics Engine binding is optional — when absent (test pool /
 * misconfigured deploy) the handler still returns 204 with just the
 * console log. The contract is that the *request* never breaks
 * because of analytics.
 *
 * Exported for unit testing in isolation from the main fetch handler.
 */
export async function handleCspReport(
  request: Request,
  env: { ANALYTICS?: AnalyticsEngineDataset },
  ctx: ExecutionContext
): Promise<Response> {
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

  // Bucket the report into low-cardinality dimensions and write a
  // datapoint. Fire-and-forget; the response goes out immediately.
  const { directive, blockedUri } = extractReportFields(report);
  const blockedDomain = extractDomain(blockedUri);
  ctx.waitUntil(Promise.resolve(recordCspViolation(env.ANALYTICS, directive, blockedDomain)));

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
