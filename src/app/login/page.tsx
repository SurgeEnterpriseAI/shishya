// /login — minimal sign-in page (bilingual).
//
// Attribution capture (Referer + UTM → `shishya_attrib` cookie) lives in
// `src/middleware.ts`, NOT here. Server Components can't write cookies
// in Next 15 — putting it here just silently dropped every capture.
//
// 27 Sep 2026 (founder, content first): an account that is already signed in
// goes straight back to the page it came from (the callback), never into a
// questionnaire; a chat or school callback gets its own short card, and the
// smallprint says accounts are for ages 13 and above.
//
// 30 Sep 2026 (founder brief: sign-up must say it puts "the entire Shishya in
// their hand" because it is personalised — sign-up build 1):
//   • the words: the default heading and body say what an account does, in
//     the founder's idea and honest words — it keeps your exam, your weak
//     topics, your mocks and the questions you ask, and picks up from them
//     next time (login.h1 / login.body / login.bullets.*, en, hi, te). Gone:
//     "5 seconds" (measured median 17 s, /login view → account, 16-29 Sep),
//     "opens straight away" (most callbacks return to a page, not a running
//     mock — the card now says it brings you back here), "rank" (only some
//     papers have one) and the result-day email line;
//   • the order: the Google button comes first after the card; the "try 5
//     questions first" alternative sits under it (content first stays: it
//     is still on the page, no wall);
//   • in an in-app browser (Instagram, Facebook… where Google blocks
//     sign-in) one line above the button says how to get out
//     (src/components/InAppBrowserHint.tsx; elsewhere only above the
//     straight-to-Google gate buttons, src/components/GuestQuizGate.tsx);
//   • the button hands off to Google in one request and sends one
//     "login-google-click" beacon with the callback family and ?from=
//     (src/components/GoogleSignInButton.tsx).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { InAppBrowserHint } from "@/components/InAppBrowserHint";
import { getT } from "@/lib/i18n-server";
import { fillTemplate } from "@/lib/i18n";
import { getExamCatalog } from "@/lib/db/exam-cache";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { isSameOriginPath } from "@/lib/login-return";
import { loginIntent } from "@/lib/login-intent";
import { loginCallbackFamily } from "@/lib/signin-cta";

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
  searchParams: Promise<{ callbackUrl?: string; error?: string; from?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const cb = sp.callbackUrl ?? "/dashboard";
  // Signed in already: back to the page that sent them here (a same-origin
  // path only, and never /login itself, which would loop).
  if (session?.user) redirect(cb && isSameOriginPath(cb) && !/^\/login(?:[/?#]|$)/.test(cb) ? cb : "/dashboard");
  const { t, locale } = await getT();

  // Exam count for the default copy — the cached catalogue (same list
  // /exams renders, same "govt & entrance" definition as the homepage
  // band: active, school boards excluded). Never a typed number; if the
  // cache is unreachable the sentence simply drops the count.
  // 2 Oct 2026 (review): the list itself is kept — the sign-up button names
  // an exam only when the callback's code is IN this catalogue (see below).
  const catalog: Awaited<ReturnType<typeof getExamCatalog>> = await getExamCatalog().catch(() => []);
  const examCount = catalog.filter((e) => e.category !== "SCHOOL_BOARD").length;

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
  //
  // 27 Sep 2026 (review): the header's "Sign in" and the SignupNudge now send
  // the page they were clicked on as the callback, plus from=header, so the
  // card is decided by loginIntent() (src/lib/login-intent.ts): a header
  // click never gets the mock, coach or "Welcome back" card; an exam code is
  // a real code segment (not /exams/browse); the mock card needs a gated
  // path; /mentors is not /mentor.
  const li = loginIntent(cb, sp.from);
  const examCode = li.examCode;
  // Every sentence on this page is a dictionary key since 16 Sep 2026
  // (login.intent.*, login.bullets.*, login.escape.*): the page already
  // called getT(), yet a Hindi or Telugu student sent here from a gated
  // mock read an English wall. English is unchanged, word for word.
  const examLabel = examCode ? examCode.replace(/_/g, " ") : null;
  // 2 Oct 2026 (review, blocker): the button's explanation says "{exam} is set
  // up as your exam the moment you sign up". That is true only for a real,
  // ACTIVE exam (src/lib/signup-profile.ts enrols nothing else) — and the code
  // here comes from the URL alone: /login?callbackUrl=/exams/FOO (a typed
  // link, or the header button on the 404 page of a retired or not-yet-public
  // exam) used to promise "FOO is set up as your exam". So the name and the
  // code go to the button only when the cached catalogue (active, non-school
  // exams — the same rows sign-up enrols) has that code, with the exam's own
  // short name; an unknown code gets the general sentence. examLabel above
  // stays for the card's heading only (it promises nothing about the account).
  const signUpExam = examCode ? catalog.find((e) => e.code === examCode) ?? null : null;
  // 27 Sep 2026: a Class 8-12 school page or school chat, and Ask Shishya
  // (/chat), get their own card — sign-in there only keeps practice or
  // chats; reading, the chapter practice and the tutor need no account.
  const isSchool = li.kind === "school";
  const intent =
    li.kind === "school"
      ? { h1: t("login.intent.school.h1"), body: t("login.intent.school.body") }
      : li.kind === "mock"
        ? {
            h1: examLabel ? fillTemplate(t("login.intent.mock.h1Exam"), { exam: examLabel }) : t("login.intent.mock.h1"),
            body: t("login.intent.mock.body"),
          }
        : li.kind === "chat"
          ? { h1: t("login.intent.chat.h1"), body: t("login.intent.chat.body") }
          : li.kind === "coach"
            ? { h1: t("login.intent.coach.h1"), body: t("login.intent.coach.body") }
            : li.kind === "return"
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
        {/* A failed Google sign-in returns here with ?error=… (18 Sep 2026):
            say so in one plain line instead of showing the page as if nothing
            happened. */}
        {sp.error && (
          <p role="alert" className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("login.error")}
          </p>
        )}
        {/* 30 Sep 2026: only in an in-app browser (Google blocks sign-in there). */}
        <InAppBrowserHint />
        {/* 2 Oct 2026 (founder, standing: "Sign up with Google" — students
            may think sign-up needs a lot of details): the one shared button
            with Google's "G", reading "Sign up with Google" (en / hi / te;
            any other language keeps its "Continue with Google", as does the
            "Welcome back" card: a returning member is not signing up). Under
            it on a phone a one-line caption, and on hover or keyboard focus
            with a mouse the full explanation: it names the exam only when
            this sign-in returns to a page of a real, active exam (the account
            is then enrolled in it — signUpExam above), without the "tests
            saved" clause — this page does not know whether the exam has
            practice; a school return gets the school words.
            Review, same day: Google's DARK button (this page's main action
            stays the filled one above the outlined "try 5 questions first"),
            and the tooltip opens ABOVE the button — under it sits that link,
            which the tooltip used to cover. */}
        <GoogleSignInButton
          callbackUrl={cb}
          locale={locale}
          continueLabel={t("login.continue")}
          returning={li.kind === "return"}
          exam={signUpExam?.shortName ?? null}
          examCode={signUpExam ? examCode : null}
          surface="login"
          side="top"
          theme="dark"
          beacon={{ from: sp.from ?? null, family: loginCallbackFamily(sp.callbackUrl) }}
        />
        {/* The alternative comes AFTER the main action (30 Sep 2026): Google
            first, then "not ready? try 5 questions first". */}
        {examCode && li.tryFirst && (
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
            suggestion: optimize the /login entry experience.)
            27 Sep 2026: not on a school callback — these bullets are exam
            features (plan, mocks, PYQ papers). */}
        {!isSchool && (
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
        )}

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
