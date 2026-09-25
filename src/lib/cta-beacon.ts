// CTA_CLICKED beacon for client islands (25 Sep 2026, mock gate).
//
// The same shape StartMockButton, AnonExamNudge and ShareExamButton each send
// from a local copy: { kind: "CTA_CLICKED", path: location.pathname,
// props: { cta, ...extra } } via navigator.sendBeacon, which survives the
// navigation a sign-in click starts. /api/analytics adds the anon id, utm and
// bot classification; props over 1 KB are dropped there, so callers pass ids
// and small numbers only. Best-effort: never throws.

export function ctaBeacon(cta: string, extra?: Record<string, unknown>): void {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [
          JSON.stringify({
            kind: "CTA_CLICKED",
            path: typeof location !== "undefined" ? location.pathname : "/",
            props: { cta, ...extra },
          }),
        ],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}
