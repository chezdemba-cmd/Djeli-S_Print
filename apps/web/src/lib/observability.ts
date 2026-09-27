import "server-only";

/**
 * No APM/error-tracking vendor is wired up (deliberately — same reasoning as
 * malware-scan.ts: picking a paid third party isn't a call to make silently).
 * This logs structured JSON to console.error, which Vercel already captures
 * and surfaces in its function logs dashboard — a real baseline, not a no-op,
 * just not a dedicated APM. To add one later (Sentry, Datadog...), call it
 * from here instead of only console.error.
 */
export function captureError(context: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(JSON.stringify({
    level: "error",
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    extra,
    at: new Date().toISOString(),
  }));
}
