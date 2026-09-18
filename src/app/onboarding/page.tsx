// /onboarding — 30-second 4-question profile wizard.
//
// Asked the first time a signed-in user lands on / or /dashboard. The
// wizard captures:
//
//   1. Stage (Class 9-10 / Class 11-12 / UG / PG / Working / Other)
//   2. State (Indian state code)
//   3. Language (12 Sep 2026 — the medium, pre-suggested from the state,
//      confirmed in one tap; written to User.preferredLang)
//   4. Prep target (multi-select exam codes; pre-suggested based on stage)
//
// Submission writes to User.onbStage / onbState / onbPrepCodes /
// onbCompletedAt (+ preferredLang), then goes to the coach intake (an exam
// was picked) or /dashboard (skipped, or no exam picked — 16 Sep 2026: that
// used to land a signed-in student on the anonymous homepage).
//
// From a results page (18 Sep 2026): the setup card links here with
// ?from=results&attempt=<id>, and finishing or skipping goes BACK to that
// result. The path is built from a checked attempt id
// (src/lib/results-next-step.ts), never read from the URL as a path.
//
// Server component shell — client form below.

import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { localeToLanguage } from "@/lib/preferred-lang";
import { OnboardingWizard } from "./OnboardingWizard";
import { findPersona } from "@/data/personas";
import { resultsReturnPath } from "@/lib/results-next-step";

export const metadata: Metadata = {
  title: "Welcome to Shishya — 30-second setup",
  robots: { index: false, follow: false },
};

interface ExamRow { code: string; shortName: string; name: string; category: string }
interface UserRow { onbCompletedAt: Date | null; preferredLang: string | null }

export default async function OnboardingPage({
  searchParams,
}: { searchParams: Promise<{ rerun?: string; p?: string; next?: string; from?: string; attempt?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/onboarding");

  const sp = await searchParams;
  const rerun = sp.rerun === "1";
  // ?p=<persona-slug> arrives when the user clicked a persona tile on
  // the homepage or a /for/[persona] CTA. Lets us pre-fill the wizard
  // and offer a 1-click confirm path.
  const persona = sp.p ? findPersona(sp.p) : undefined;
  // Finishing without an exam, skipping, or re-opening a completed wizard
  // all go to /dashboard (16 Sep 2026). The default used to be "/" unless
  // ?next=dashboard — and nothing links with that flag, so both skips in
  // the 14 days to 16 Sep landed on the anonymous homepage. The dashboard's
  // "pick your exam" hero is the next step for a signed-in student.
  // (?next= is still accepted in the URL and ignored.)
  // A student sent here by the results page's setup card goes back to that
  // result instead (null for anything that is not a plain attempt id).
  const returnTo = resultsReturnPath(sp.from, sp.attempt);
  const redirectAfter = returnTo ?? "/dashboard";

  // If already completed AND this isn't an explicit rerun, send them
  // home (or to the requested next page). Re-running is opt-in via
  // /me/settings.
  //
  // Both Prisma queries below are wrapped in try/catch with sensible
  // fallbacks. Without this, a transient Vercel(iad1) ↔ Neon(Singapore)
  // hiccup throws inside the page render → error.tsx fires → fresh
  // signups see "Something didn't load right" instead of the wizard.
  // The user query failing means we DON'T know if they've completed
  // before, so we err on the side of showing the wizard again
  // (mildly annoying for repeat users, but never blocks a signup).
  let onbCompletedAt: Date | null = null;
  let preferredLang: string | null = null;
  try {
    const userRows = await prisma.$queryRaw<UserRow[]>`
      SELECT "onbCompletedAt", "preferredLang"::text AS "preferredLang"
      FROM "User" WHERE "id" = ${session.user.id} LIMIT 1
    `;
    onbCompletedAt = userRows[0]?.onbCompletedAt ?? null;
    preferredLang = userRows[0]?.preferredLang ?? null;
  } catch (err) {
    console.error("[onboarding] user lookup failed, defaulting to not-completed:", err);
  }
  if (onbCompletedAt && !rerun) {
    redirect(redirectAfter);
  }

  // Load the catalogue of active exams so step 3 can search across them.
  // Falls back to a small popular-exams list if the DB hiccups; better
  // to show 6 exams than crash the whole signup funnel.
  let exams: ExamRow[] = [];
  try {
    exams = await prisma.$queryRaw<ExamRow[]>`
      SELECT "code", "shortName", "name", "category"::text AS category
      FROM "Exam"
      WHERE "active" = TRUE AND "category"::text != 'SCHOOL_BOARD'
      ORDER BY "candidatesPerYear" DESC NULLS LAST, "code" ASC
      LIMIT 100
    `;
  } catch (err) {
    console.error("[onboarding] exam list failed, using fallback:", err);
    exams = [
      { code: "SSC_CGL",      shortName: "SSC CGL",      name: "SSC Combined Graduate Level",       category: "GOVT_JOBS" },
      { code: "NEET_UG",      shortName: "NEET UG",      name: "NEET Undergraduate",                category: "MEDICAL" },
      { code: "JEE_MAIN",     shortName: "JEE Main",     name: "Joint Entrance Examination — Main", category: "ENGINEERING" },
      { code: "JEE_ADVANCED", shortName: "JEE Advanced", name: "JEE Advanced",                      category: "ENGINEERING" },
      { code: "UPSC_PRELIMS", shortName: "UPSC Prelims", name: "UPSC Civil Services Preliminary",   category: "CIVIL_SERVICES" },
      { code: "IBPS_PO",      shortName: "IBPS PO",      name: "IBPS Probationary Officer",         category: "BANKING" },
      { code: "SBI_PO",       shortName: "SBI PO",       name: "SBI Probationary Officer",          category: "BANKING" },
      { code: "RRB_NTPC",     shortName: "RRB NTPC",     name: "Railway Recruitment Board NTPC",    category: "GOVT_JOBS" },
      { code: "CAT",          shortName: "CAT",          name: "Common Admission Test",             category: "MBA" },
      { code: "GATE_CSE",     shortName: "GATE CSE",     name: "GATE — Computer Science",           category: "ENGINEERING" },
      { code: "CTET",         shortName: "CTET",         name: "Central Teacher Eligibility Test",  category: "TEACHING" },
      { code: "CLAT",         shortName: "CLAT",         name: "Common Law Admission Test",         category: "LAW" },
      { code: "NDA",          shortName: "NDA",          name: "National Defence Academy",          category: "GOVT_JOBS" },
    ];
  }

  const prefill = persona
    ? {
        slug: persona.slug,
        label: persona.label,
        pageTitle: persona.pageTitle,
        stage: persona.stage,
        prepCodes: persona.examCodes,
      }
    : null;

  // Language step (12 Sep 2026). Pre-select from a real signal only: a
  // stored non-EN preferredLang, else a non-English cookie (the /hi twin
  // a searcher landed on). The default EN is "unset" (see
  // src/lib/preferred-lang.ts), so with no signal the wizard suggests
  // from the state instead. Step copy renders in the current UI locale.
  const { t } = await getT();
  const cookieLang = (await cookies()).get("shishya-lang")?.value ?? null;
  const initialLang =
    preferredLang && preferredLang !== "EN"
      ? preferredLang
      : cookieLang && cookieLang !== "en"
        ? localeToLanguage(cookieLang)
        : null;
  const langCopy = {
    title: t("onb.lang.title"),
    body: t("onb.lang.body"),
    suggested: t("onb.lang.suggested"),
    note: t("onb.lang.note"),
    // "Step {n} of 4" under the progress bar (16 Sep 2026).
    step: t("onb.step"),
    // Sub-lines of the stage, state and exam steps (18 Sep 2026): the results
    // page's setup card now sends students here, and the old English lines
    // promised state scholarships and a personalised dashboard no code builds.
    stageSub: t("onb.step1.sub"),
    stateSub: t("onb.step2.sub"),
    examsSub: t("onb.step4.sub"),
  };
  // The intro sentence carries the settings link in its middle; the key
  // marks the spot with {settings} so each language can place it naturally.
  const [introBefore, introAfter = ""] = (t("onb.intro") as string).split("{settings}");

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">{t("onb.crumb.home")}</Link> · {t("onb.crumb.welcome")}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          {t("onb.h1")}
        </h1>
        {prefill ? (
          <p className="mt-2 max-w-2xl text-sm text-ink-700">
            Looks like you came in as a{" "}
            <strong>{prefill.label.replace(/^I'm\s+/, "")}</strong>. We&apos;ve
            pre-pinned the exams that matter for you — review and confirm
            below (takes 5 seconds), or customise anything you want.
          </p>
        ) : (
          <p className="mt-2 max-w-2xl text-sm text-ink-700">
            {introBefore}
            <Link href="/me/settings" className="text-saffron-700 underline">
              {t("onb.intro.settings")}
            </Link>
            {introAfter}
          </p>
        )}

        <OnboardingWizard
          exams={exams}
          prefill={prefill}
          redirectAfter={redirectAfter}
          returnTo={returnTo}
          initialLang={initialLang}
          langCopy={langCopy}
        />
      </section>
    </main>
  );
}
