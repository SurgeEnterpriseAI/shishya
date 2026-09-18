// Cache pilot (16 Sep 2026): /exams/[code]/guide and /exams/[code]/tricks.
//
// Every /exams/{code}/* page was served "Cache-Control: private, no-store"
// (X-Vercel-Cache MISS) — each crawler hit was a full render against Neon —
// for two reasons: the page called getT() (cookies(), headers(), auth() and
// a User lookup in src/lib/i18n-server.ts), and a dynamic route with no
// generateStaticParams is rendered per request, so `revalidate` never took
// effect (the topic-notes /hi page has no getT() and is uncached too).
//
// The pilot takes the language from the URL instead:
//   /exams/X/guide        English   — src/app/exams/[code]/guide/page.tsx
//   /hi/exams/X/guide     Hindi     — src/app/(cache-pilot)/[lang]/exams/[code]/guide/page.tsx
//   /te/exams/X/guide     Telugu    — same route, lang = "te"
// The [lang] route is a thin wrapper around the English page component; the
// middleware lets these twin URLs through instead of rewriting them with the
// x-shishya-lang header, and both routes carry generateStaticParams + a
// revalidate (one hour exported, 10 minutes effective — third rule below),
// so the HTML is rendered once per URL per window and served from the ISR
// cache to every visitor — crawler, English reader or a student carrying a
// language cookie — byte for byte.
//
// Three rules every pilot page keeps BECAUSE its render is cached:
//   - nothing request-scoped in the render tree (cookies(), headers(),
//     auth(), getT(), searchParams) — root layout, Header and every other
//     server component included. On an ISR route such a call is a production
//     500 ("Page changed from static to dynamic at runtime"), not a quiet
//     fallback; the route files also export dynamic = "force-static" so a
//     call that slips in reads empty values instead. Signed-in chrome stays
//     in client islands (HeaderAuthControls, FeedbackWidget, SignupNudge).
//   - a failed content read throws (no .catch(() => []) in front of
//     notFound()). A thrown error is never cached and the last good copy
//     keeps serving; a notFound() is a valid render, so the 404 would be
//     stored for the whole URL until the next revalidation.
//   - links to sibling pages, and claims about what the exam has on Shishya
//     (a mock, a syllabus, a daily plan), follow src/lib/exam-page-gates.ts.
//     That read is cached for 10 minutes and Next takes the shortest
//     revalidate it sees during a render, so a pilot page's effective ISR
//     window is 10 minutes (the exported one hour is only the ceiling):
//     HIT inside 10 minutes, STALE + a background render after it.
//
// What a stored copy means for a NEW guide/tricks row: the cache is
// stale-while-revalidate and nothing calls revalidatePath for these routes.
// A URL that was fetched while its row was missing has a stored 404; once the
// window has passed, the FIRST request after the row is written is still
// answered with that stored 404 (it only starts the background render) and
// the request after it gets the 200 — however many hours apart the two are.
// So when a guide or tricks row is created for an exam (today missing:
// MP_RAEO and KA_KSRP guide + tricks, TS_POLICE_SI tricks), GET its three
// URLs (/exams/X/…, /hi/…, /te/…), wait a few seconds and GET them again
// until they answer 200 — before the sitemap or IndexNow sends a crawler
// there.
//
// A language cookie or a saved preferredLang no longer changes these pages:
// the English URL is English for everyone. Before the pilot a Hindi- or
// Telugu-cookie reader of a STATE exam's English guide/tricks URL got one
// translated line (the "More {state} government exams" link); the rest of
// both pages is English in every language. No redirect to /hi or /te was
// added, because neither family is a localised twin (next paragraph).
//
// Twin metadata is untouched: guide and tricks are not twin surfaces in
// src/lib/twin-localisation.ts (their body is English AI markdown), so the
// /hi and /te URLs keep canonicalising to the English URL, stay out of
// hreflang and the sitemap, and keep serving — exactly as before.
//
// Pure helpers only (unit-tested in tests/unit/cache-pilot-routes.test.ts):
// the middleware and the two page families share the same path rule.

import { isUrlLocale, type PageLocale } from "@/lib/seo-locale";

export const CACHE_PILOT_FAMILIES = ["guide", "tricks"] as const;
export type CachePilotFamily = (typeof CACHE_PILOT_FAMILIES)[number];

// Un-prefixed path of a pilot page. A trailing slash is tolerated so Next's
// own trailing-slash redirect keeps the /hi or /te prefix.
const PILOT_PATH_RE = /^\/exams\/[^/]+\/(guide|tricks)\/?$/;

/** Which pilot family an un-prefixed path belongs to, or null. */
export function cachePilotFamily(path: string): CachePilotFamily | null {
  const m = PILOT_PATH_RE.exec(path);
  return m ? (m[1] as CachePilotFamily) : null;
}

/** For the middleware: is this /hi or /te URL a pilot twin? Such a request
 *  is served by the [lang] route as-is — no rewrite, no language header. */
export function isCachePilotTwin(rawPath: string): boolean {
  const m = /^\/(hi|te)(\/.*)$/.exec(rawPath);
  return !!m && cachePilotFamily(m[2]) !== null;
}

/** The language a pilot page renders, from its optional [lang] param:
 *  "en" when the param is absent (the English route), the locale for a
 *  /hi or /te twin, and null for anything else (the route answers 404). */
export function pilotPageLocale(lang: string | undefined): PageLocale | null {
  if (lang === undefined) return "en";
  return isUrlLocale(lang) ? lang : null;
}
