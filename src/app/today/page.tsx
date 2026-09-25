// /today — the one daily loop, one tap from anywhere (11 Sep 2026 audit).
//
// The habit surface (streak + Daily 5) lived only on /dashboard as the 8th
// block; from the Daily-5 email it took two extra taps and on phones a
// signed-in student had no link to it at all. This route is the deep link:
//
//   signed-out  → /login?callbackUrl=/today (utm kept inside the callback)
//   today's set exists → /mocks/{id} (resumes in-progress, results if done)
//   otherwise   → build today's 5 through POST /api/mocks (the SAME server
//                 logic the dashboard card uses — validated pool, rule-based
//                 TOPIC on the weakest topic, DIAGNOSTIC baseline when no
//                 weakest topic exists yet) and go to /mocks/{id}
//   not enrolled → /dashboard (its exam picker is the right next step),
//                 utm kept (25 Sep 2026, see below)
//
// The create step is one client POST (AutoStartDailyFive) because
// /api/mocks' pool + generator code is not exported as a server function
// and nothing in the repo self-fetches its own API. Extracting
// createMockForUser() would make this a pure server redirect — noted in
// the build report as an out-of-partition follow-up.
//
// utm_* on the inbound link is forwarded onto /mocks/{id} so the email
// channel stays visible in the analytics channel split (the client tracker
// reads utm_* off the page URL; a server redirect would otherwise drop it).
// 25 Sep 2026: the not-enrolled fallback to /dashboard dropped them, so an
// email click from a student with no exam to build a set for landed
// untagged. All three hops now share src/lib/login-return.ts: utm_source /
// utm_medium / utm_campaign only (the three the tracker records;
// utm_content was never stored), each [A-Za-z0-9_.-] and at most 64, a bad
// value dropped.
//
// Language (13 Sep 2026): copy comes from getT() — the same locale the
// mock player's labels use on the next screen — so a hi/te student sees
// one language from /today straight into the mock.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { findTodaysDailyFive, pickDailyFive } from "@/lib/study-day-five";
import { loginRedirectPath, returnUtmQuery, withReturnUtm } from "@/lib/login-return";
import { todayLabels } from "@/lib/study-day-copy";
import { AutoStartDailyFive } from "./AutoStartDailyFive";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("today.title"),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TodayPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  // Only the utm tags, checked and re-encoded — never an arbitrary passthrough.
  const qs = returnUtmQuery(sp);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(loginRedirectPath("/today", sp));
  }
  const userId = session.user.id;

  // Resume before create: a second tap on "Today" must never stack a
  // second set on the same day.
  const existing = await findTodaysDailyFive(userId).catch(() => null);
  if (existing) redirect(`/mocks/${existing}${qs}`);

  const pick = await pickDailyFive(userId).catch(() => null);
  if (!pick) redirect(withReturnUtm("/dashboard", sp));

  // Only now that we render: the redirects above never pay for the locale.
  const { t } = await getT();

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <AutoStartDailyFive
          examCode={pick.examCode}
          examShort={pick.examShort}
          topicName={pick.topicName}
          request={pick.request}
          qs={qs}
          labels={todayLabels(t)}
        />
      </section>
    </main>
  );
}
