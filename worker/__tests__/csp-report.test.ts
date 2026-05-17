// Unit tests for the /csp-report endpoint focused on the analytics
// integration. The 204/400/429 status-code behavior is already
// covered by worker/__tests__/security-headers.test.ts via SELF.fetch;
// here we call handleCspReport() directly with a mock dataset + ctx
// so we can assert on writeDataPoint arguments.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __getCspReportThrottleState,
  __resetCspReportThrottle,
  handleCspReport,
} from "../csp-report";

interface MockDataset {
  writeDataPoint: ReturnType<typeof vi.fn>;
}

function makeDataset(): MockDataset {
  return { writeDataPoint: vi.fn() };
}

// Minimal ExecutionContext mock — we want waitUntil(p) to *await* the
// promise so the writeDataPoint side effect runs synchronously enough
// for the assertion to see it. The real CF runtime defers the
// promise to after the response; for tests we resolve immediately.
function makeCtx(): ExecutionContext {
  // The real ExecutionContext has `props` in current @cloudflare/workers-types
  // but our handler only reads waitUntil + passThroughOnException, so a
  // partial cast is safe here.
  return {
    waitUntil(promise: Promise<unknown>) {
      // Swallow rejections so a thrown writeDataPoint doesn't surface
      // as an unhandled rejection in the test runner.
      promise.catch(() => {});
    },
    passThroughOnException() {},
  } as unknown as ExecutionContext;
}

function postReport(body: string, contentType = "application/csp-report"): Request {
  return new Request("https://example.com/csp-report", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

beforeEach(() => {
  __resetCspReportThrottle();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleCspReport — analytics integration", () => {
  it("writes a csp_violation datapoint for a well-formed legacy report", async () => {
    const ds = makeDataset();
    const body = JSON.stringify({
      "csp-report": {
        "document-uri": "https://example.com/",
        "violated-directive": "script-src",
        "blocked-uri": "https://evil.example.com/badscript.js",
      },
    });

    const res = await handleCspReport(
      postReport(body),
      { ANALYTICS: ds as unknown as AnalyticsEngineDataset },
      makeCtx()
    );

    expect(res.status).toBe(204);
    expect(ds.writeDataPoint).toHaveBeenCalledTimes(1);
    expect(ds.writeDataPoint).toHaveBeenCalledWith({
      blobs: ["csp_violation", "script-src", "evil.example.com"],
      doubles: [1],
      indexes: ["csp_violation"],
    });
  });

  it("writes a csp_violation datapoint for a modern Reporting API body", async () => {
    const ds = makeDataset();
    const body = JSON.stringify([
      {
        type: "csp-violation",
        body: {
          violatedDirective: "img-src",
          blockedURL: "https://cdn.example.org/tracking.gif",
        },
      },
    ]);

    const res = await handleCspReport(
      postReport(body, "application/reports+json"),
      { ANALYTICS: ds as unknown as AnalyticsEngineDataset },
      makeCtx()
    );

    expect(res.status).toBe(204);
    expect(ds.writeDataPoint).toHaveBeenCalledWith({
      blobs: ["csp_violation", "img-src", "cdn.example.org"],
      doubles: [1],
      indexes: ["csp_violation"],
    });
  });

  it.each([
    {
      label: "data: URI is bucketed by scheme",
      blocked: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
      expected: "data:",
    },
    {
      label: "blob: URI is bucketed by scheme",
      blocked: "blob:https://example.com/0e7c3-c0ffee",
      expected: "blob:",
    },
    {
      label: "'inline' keyword is preserved",
      blocked: "inline",
      expected: "inline",
    },
    {
      label: "'eval' keyword is preserved",
      blocked: "eval",
      expected: "eval",
    },
    {
      label: "bare hostname is preserved",
      blocked: "https://evil.example/x.js",
      expected: "evil.example",
    },
    {
      label: "garbage URI falls back to 'unparseable'",
      blocked: "this is not a uri at all",
      expected: "unparseable",
    },
  ])("blocked-uri bucketing — $label", async ({ blocked, expected }) => {
    const ds = makeDataset();
    const body = JSON.stringify({
      "csp-report": {
        "violated-directive": "script-src",
        "blocked-uri": blocked,
      },
    });
    await handleCspReport(
      postReport(body),
      { ANALYTICS: ds as unknown as AnalyticsEngineDataset },
      makeCtx()
    );
    expect(ds.writeDataPoint).toHaveBeenCalledWith({
      blobs: ["csp_violation", "script-src", expected],
      doubles: [1],
      indexes: ["csp_violation"],
    });
  });

  it("uses 'unknown' directive when neither legacy nor modern field is present", async () => {
    const ds = makeDataset();
    const body = JSON.stringify({ "csp-report": { "blocked-uri": "https://x.test/" } });
    await handleCspReport(
      postReport(body),
      { ANALYTICS: ds as unknown as AnalyticsEngineDataset },
      makeCtx()
    );
    expect(ds.writeDataPoint).toHaveBeenCalledWith({
      blobs: ["csp_violation", "unknown", "x.test"],
      doubles: [1],
      indexes: ["csp_violation"],
    });
  });

  it("still returns 204 when ANALYTICS binding is absent (test-pool / misconfigured deploy)", async () => {
    // The contract is that the *request* never breaks because of
    // analytics — see the recordCspViolation no-op guard in analytics.ts.
    const body = JSON.stringify({ "csp-report": { "violated-directive": "script-src" } });
    const res = await handleCspReport(postReport(body), { ANALYTICS: undefined }, makeCtx());
    expect(res.status).toBe(204);
  });

  it("throttle kicks in BEFORE analytics — 101st report drops both signals", async () => {
    const ds = makeDataset();
    const env = { ANALYTICS: ds as unknown as AnalyticsEngineDataset };

    // Fill the per-minute bucket.
    for (let i = 0; i < 100; i++) {
      const res = await handleCspReport(
        postReport(JSON.stringify({ "csp-report": { "violated-directive": "script-src" } })),
        env,
        makeCtx()
      );
      expect(res.status).toBe(204);
    }
    expect(ds.writeDataPoint).toHaveBeenCalledTimes(100);

    // Throttled — no further analytics writes, just a 429.
    const blocked = await handleCspReport(
      postReport(JSON.stringify({ "csp-report": { "violated-directive": "script-src" } })),
      env,
      makeCtx()
    );
    expect(blocked.status).toBe(429);
    expect(ds.writeDataPoint).toHaveBeenCalledTimes(100); // unchanged

    // Sanity check the throttle bookkeeping is what we expect.
    const state = __getCspReportThrottleState();
    expect(state.count).toBeGreaterThan(100);
  });

  it("does NOT call writeDataPoint when the content-type is rejected (400 path)", async () => {
    const ds = makeDataset();
    const res = await handleCspReport(
      postReport("{}", "text/plain"),
      { ANALYTICS: ds as unknown as AnalyticsEngineDataset },
      makeCtx()
    );
    expect(res.status).toBe(400);
    expect(ds.writeDataPoint).not.toHaveBeenCalled();
  });

  it("does NOT call writeDataPoint when the body is malformed JSON (400 path)", async () => {
    const ds = makeDataset();
    const res = await handleCspReport(
      postReport("{not-json"),
      { ANALYTICS: ds as unknown as AnalyticsEngineDataset },
      makeCtx()
    );
    expect(res.status).toBe(400);
    expect(ds.writeDataPoint).not.toHaveBeenCalled();
  });
});
