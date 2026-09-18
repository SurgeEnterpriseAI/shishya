// /login — minimal sign-in page (bilingual).
//
// Attribution capture (Referer + UTM → `shishya_attrib` cookie) lives in
// `src/middleware.ts`, NOT here. Server Components can't write cookies
// in Next 15 — putting it here just silently dropped every capture.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { getT } from "@/lib/i18n-server";
import { fillTemplate } from "@/lib/i18n";
import { getExamCatalog } from "@/lib/db/exam-cache";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";

// Belt-and-braces alongside the robots.txt disallow: a Disallow-ed URL
// can still be indexed (link-only, no description) and would then be a
// terrible SERP entry point. noindex/follow keeps it out for good while
// letting crawlers walk the escape-hatch links below.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const sp = await searchParams;
  const cb = sp.callbackUrl ?? "/dashboard";
  const { t } = await getT();

  // Exam count for the default copy — the cached catalogue (same list
  // /exams renders, same "govt & entrance" definition as the homepage
  // band: active, school boards excluded). Never a typed number; if the
  // cache is unreachable the sentence simply drops the count.
  const examCount = await getExamCatalog()
    .then((list) => list.filter((e) => e.category !== "SCHOOL_BOARD").length)
    .catch(() => 0);

  // Context-aware wall (23 Aug 2026): /login is the most-viewed page on
  // the site (~140 anon views/day) — people arrive here from a gated
  // action (start a mock, open the coach, a deep link from an email or
  // ChatGPT) and see a generic sign-in. Tell them exactly what's one tap
  // away, and — for exam contexts — let them taste 5 questions WITHOUT
  // signing in first. Value before the wall.
  //
  // "Welcome back" (11 Sep 2026 audit): the header's Sign-in button
  // lands strangers on bare /login with the default callback
  // (/dashboard), and this used to greet them as returning students
  // (135 landers / 14 d, 53% bounce). Nothing the app sets in the
  // browser proves a previous SIGNED-IN visit (`shishya_anon` and
  // `shishya_attrib` are issued to anonymous visitors, `shishya-lang`
  // is a preference), so the only honest signal is the callback: the
  // report, the mentor desk and the live test are pages a stranger has
  // no reason to be sent to. /dashboard is NOT in that list any more.
  const examMatch = cb.match(/\/exams\/([A-Z0-9_]+)/i);
  const examCode = examMatch ? examMatch[1] : null;
  const isMock = /\/mocks\//.test(cb) || /\/pyq\//.test(cb) || (!!examCode && /\/(quiz|topics)\b/.test(cb));
  const isCoach = /\/coach/.test(cb);
  const isReturn = /\/(me\/report|live-test|mentor)/.test(cb);
  // Every sentence on this page is a dictionary key since 16 Sep 2026
  // (login.intent.*, login.bullets.*, login.escape.*): the page already
  // called getT(), yet a Hindi or Telugu student sent here from a gated
  // mock read an English wall. English is unchanged, word for word.
  const examLabel = examCode ? examCode.replace(/_/g, " ") : null;
  const intent = isMock || examCode
    ? {
        h1: examLabel ? fillTemplate(t("login.intent.mock.h1Exam"), { exam: examLabel }) : t("login.intent.mock.h1"),
        body: t("login.intent.mock.body"),
      }
    : isCoach
      ? { h1: t("login.intent.coach.h1"), body: t("login.intent.coach.body") }
      : isReturn
        ? { h1: t("login.intent.return.h1"), body: t("login.intent.return.body") }
        : null;
  // Default (bare /login): the concrete offer, localised via i18n. The
  // sentence carries an "{n} exams" clause filled from the catalogue
  // count; when the count is unavailable login.body.noCount is the same
  // sentence without that clause (the old regex strip only understood the
  // English wording, so a hi / te reader would have seen a bare "{n}").
  // A locale whose login.body has no {n} (the older one-liner the regional
  // languages still carry) is printed as it is.
  const bodyTemplate: string = t("login.body");
  const defaultBody = !bodyTemplate.includes("{n}")
    ? bodyTemplate
    : examCount > 0
      ? fillTemplate(bodyTemplate, { n: examCount })
      : t("login.body.noCount");

  return (
    <main className="min-h-screen bg-saffron-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-ink-200 bg-white p-8 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 font-sans text-lg font-bold text-white">
            शि
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-ink-900">{intent?.h1 ?? t("login.h1")}</h1>
        <p className="mt-2 text-sm text-ink-600">{intent?.body ?? defaultBody}</p>
        <GoogleSignInButton callbackUrl={cb} label={t("login.continue")} />
        {examCode && (
          <Link
            href={`/exams/${examCode}/quiz`}
            className="mt-3 block rounded-lg border border-saffron-300 bg-saffron-50 px-3 py-2 text-center text-sm font-semibold text-saffron-800 hover:bg-saffron-100"
          >
            {fillTemplate(t("login.tryFirst"), { exam: examCode.replace(/_/g, " ") })}
          </Link>
        )}

        {/* Value prop for cold visitors who land straight on /login (it's a
            top entry page in the funnel data, and a bare sign-in wall was
            bouncing them). Spell out what signing in unlocks — all free —
            so the entry converts instead of bouncing. (Gemini growth
            suggestion: optimize the /login entry experience.) */}
        <div className="mt-6 rounded-lg bg-saffron-50 p-4 text-left ring-1 ring-saffron-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            {fillTemplate(t("login.freeLine"), { n: INDIAN_LANGUAGE_COUNT })}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
            {(["login.bullets.1", "login.bullets.2", "login.bullets.3", "login.bullets.4"] as const).map((key) => (
              <li key={key} className="flex gap-2"><span aria-hidden className="text-saffron-500">✓</span> {t(key)}</li>
            ))}
          </ul>
        </div>

        {/* Escape hatch. Funnel data (13 Aug 2026): /login was the single
            biggest one-page exit for first-time visitors — 53 of 148
            bounces in 7 days. A cold arrival previously had exactly two
            moves: sign in, or leave. These give them the platform itself
            without an account, so a stranger can find out what Shishya
            is before being asked to trust it. */}
        <div className="mt-6 border-t border-ink-100 pt-4">
          <p className="text-sm font-medium text-ink-800">{t("login.firstTime")}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/" className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50">
              {t("login.escape.browse")}
            </Link>
            <Link href="/ask" className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50">
              {t("login.escape.ask")}
            </Link>
            <Link href="/find-your-exam" className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50">
              {t("login.escape.find")}
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs text-ink-500">{t("login.smallprint")}</p>
      </div>
    </main>
  );
}
