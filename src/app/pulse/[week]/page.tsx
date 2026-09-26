// /pulse/{yyyy}-w{ww} — one week of Shishya Pulse, a permanent computed page
// (27 Sep 2026). See src/app/pulse/page.tsx for why Pulse exists.
//
// Only published weeks render: a complete IST ISO week (Monday-Sunday) from
// 2026-w38 on. A malformed slug, a week before the first one, the current
// week or a future week is a 404 (resolvePulseWeek, src/lib/pulse-rules.ts).
// Rendered on first request and kept for an hour (ISR, through the empty
// generateStaticParams below); no build-time DB read; no cookie, header or
// session read. The static /pulse/context.md route wins over this dynamic
// segment.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { JsonLd, breadcrumbLd } from "@/components/JsonLd";
import { PulseReport } from "@/components/pulse/PulseReport";
import { loadPulseView } from "@/lib/pulse";
import { istIsoDay, resolvePulseWeek, shiftPulseWeek } from "@/lib/pulse-rules";
import {
  PULSE_INTRO,
  PULSE_NAME,
  PULSE_UNAVAILABLE,
  pulseWeekDescription,
  pulseWeekHeading,
  pulseWeekLd,
  pulseWeekTitle,
  pulseWeekUrl,
} from "@/lib/pulse-view";

export const revalidate = 3600;

// 27 Sep 2026 (fixer review): a dynamic segment with no generateStaticParams
// is rendered on every request in Next 15 — `revalidate` above never takes
// effect and the response goes out Cache-Control: private, no-store (the
// same finding as src/app/exams/[code]/guide/page.tsx, 16 Sep 2026). An
// empty list renders each week on its first visit and serves it from the
// ISR cache; nothing is rendered at build time, so the build reads no DB.
// A 404 for a week not yet published is cached too, for at most the hour —
// nothing links a week before its Monday. force-static is the safety net:
// a request-scoped call anywhere in the tree reads empty values instead of
// turning the route dynamic ("Page changed from static to dynamic", 500).
export const dynamic = "force-static";

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ week: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { week } = await params;
  const w = resolvePulseWeek(week, new Date());
  if (!w) return { title: "Shishya Pulse — week not found", robots: { index: false, follow: true } };
  const title = pulseWeekTitle(w);
  const description = pulseWeekDescription(w);
  const url = pulseWeekUrl(w);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "article" },
  };
}

const LINK = "text-saffron-700 underline underline-offset-2 hover:text-saffron-800";

export default async function PulseWeekPage({ params }: Props) {
  const { week } = await params;
  const now = new Date();
  const w = resolvePulseWeek(week, now);
  if (!w) notFound();

  const view = await loadPulseView(w);
  const prev = resolvePulseWeek(shiftPulseWeek(w, -1).slug, now);
  const next = resolvePulseWeek(shiftPulseWeek(w, 1).slug, now);
  const computedDay = view?.computedDay ?? istIsoDay(now);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          pulseWeekLd(w, computedDay),
          breadcrumbLd([
            [PULSE_NAME, "/pulse"],
            [`Week ${w.week} of ${w.year}`, `/pulse/${w.slug}`],
          ]),
        ]}
      />
      <Header />
      <article className="container-prose max-w-3xl py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">
            Home
          </Link>{" "}
          ·{" "}
          <Link href="/pulse" className="hover:text-ink-800">
            {PULSE_NAME}
          </Link>{" "}
          · Week {w.week} of {w.year}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{pulseWeekHeading(w)}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">{PULSE_INTRO}</p>

        <nav aria-label="Pulse weeks" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {prev ? (
            <Link href={`/pulse/${prev.slug}`} className={LINK} rel="prev">
              ← Week {prev.week} ({prev.label})
            </Link>
          ) : null}
          {next ? (
            <Link href={`/pulse/${next.slug}`} className={LINK} rel="next">
              Week {next.week} ({next.label}) →
            </Link>
          ) : null}
          <Link href="/pulse#archive" className={LINK}>
            Every week
          </Link>
        </nav>

        {view ? <PulseReport view={view} /> : <p className="mt-6 rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-600">{PULSE_UNAVAILABLE}</p>}
      </article>
    </main>
  );
}
