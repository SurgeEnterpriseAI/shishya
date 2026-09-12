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
//   not enrolled → /dashboard (its exam picker is the right next step)
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

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { findTodaysDailyFive, pickDailyFive } from "@/lib/study-day-five";
import { TODAY_PAGE_TITLE } from "@/lib/study-day-copy";
import { AutoStartDailyFive } from "./AutoStartDailyFive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: TODAY_PAGE_TITLE,
  robots: { index: false, follow: false },
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

type SearchParams = Record<string, string | string[] | undefined>;

/** Only the utm_* keys, bounded, re-encoded — never an arbitrary passthrough. */
function utmQuery(sp: SearchParams): string {
  const q = new URLSearchParams();
  for (const k of UTM_KEYS) {
    const raw = sp[k];
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v) q.set(k, v.slice(0, 64));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const qs = utmQuery(sp);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/today${qs}`)}`);
  }
  const userId = session.user.id;

  // Resume before create: a second tap on "Today" must never stack a
  // second set on the same day.
  const existing = await findTodaysDailyFive(userId).catch(() => null);
  if (existing) redirect(`/mocks/${existing}${qs}`);

  const pick = await pickDailyFive(userId).catch(() => null);
  if (!pick) redirect("/dashboard");

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
        />
      </section>
    </main>
  );
}
