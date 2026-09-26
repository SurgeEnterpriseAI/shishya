// /pulse — Shishya Pulse, the weekly data note (27 Sep 2026).
//
// Why: founder ask, 27 Sep 2026 — be recognised by the market slowly and
// honestly. A dated, weekly, reproducible note on what students practised
// gives reporters, teachers and AI assistants something to cite that is
// about students, not about Shishya's size. This page shows the latest
// COMPLETE IST week in full (Monday-Sunday; the current week never), plus
// the archive of permanent week pages (/pulse/{yyyy}-w{ww}). It is titled
// "what students on Shishya practised", never as a picture of all of India:
// the sample is Shishya's own students and a few state exams dominate it.
//
// Numbers: src/lib/pulse.ts (cached, gated) → src/lib/pulse-view.ts (copy,
// JSON-LD, markdown). ISR hourly; no cookie, header or session read, so the
// page stays static and edge-cached. Markdown twin: /pulse/context.md.

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { JsonLd, breadcrumbLd } from "@/components/JsonLd";
import { PulseReport } from "@/components/pulse/PulseReport";
import { loadPulseView } from "@/lib/pulse";
import { PULSE_FIRST_WEEK, istDayLabel, istIsoDay, latestPulseWeek, pulseArchiveWeeks, shiftPulseWeek } from "@/lib/pulse-rules";
import {
  PULSE_CONTEXT_URL,
  PULSE_DESCRIPTION,
  PULSE_INTRO,
  PULSE_NAME,
  PULSE_UNAVAILABLE,
  PULSE_URL,
  pulseHubLd,
  pulseHubTitle,
  pulsePublishedDay,
  pulseWeekHeading,
  pulseWeekPhrase,
} from "@/lib/pulse-view";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const title = pulseHubTitle(latestPulseWeek(new Date()));
  return {
    title,
    description: PULSE_DESCRIPTION,
    alternates: { canonical: PULSE_URL, types: { "text/markdown": PULSE_CONTEXT_URL } },
    openGraph: { title, description: PULSE_DESCRIPTION, url: PULSE_URL, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

const LINK = "text-saffron-700 underline underline-offset-2 hover:text-saffron-800";

export default async function PulseHubPage() {
  const now = new Date();
  const archive = pulseArchiveWeeks(now);
  const latest = archive[0] ?? null;
  const view = latest ? await loadPulseView(latest) : null;
  const prev = latest ? shiftPulseWeek(latest, -1) : null;
  const hasPrev = !!prev && prev.startIso >= PULSE_FIRST_WEEK.startIso;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd data={[...pulseHubLd(latest, archive), breadcrumbLd([[PULSE_NAME, "/pulse"]])]} />
      <Header />
      <div className="container-prose max-w-3xl py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">
            Home
          </Link>{" "}
          · {PULSE_NAME}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{latest ? pulseWeekHeading(latest) : PULSE_NAME}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">{PULSE_INTRO}</p>

        {latest ? (
          <nav aria-label="Pulse weeks" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href={`/pulse/${latest.slug}`} className={LINK}>
              Permanent page for this week
            </Link>
            {hasPrev ? (
              <Link href={`/pulse/${prev!.slug}`} className={LINK}>
                ← The week before
              </Link>
            ) : null}
            <a href="#archive" className={LINK}>
              Every week
            </a>
            <a href="/pulse/context.md" className={LINK}>
              Markdown
            </a>
          </nav>
        ) : null}

        {latest == null ? (
          <p className="mt-6 text-sm text-ink-700">
            The first Pulse covers {PULSE_FIRST_WEEK.label} and appears on {istDayLabel(pulsePublishedDay(PULSE_FIRST_WEEK))}.
          </p>
        ) : view ? (
          <PulseReport view={view} />
        ) : (
          <p className="mt-6 rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-600">{PULSE_UNAVAILABLE}</p>
        )}

        <section id="archive" aria-labelledby="archive-h" className="mt-10 scroll-mt-20">
          <h2 id="archive-h" className="text-lg font-semibold text-ink-900">
            Every week
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            One permanent page per complete week, from {PULSE_FIRST_WEEK.label}. A week appears on the Monday after it ends.
          </p>
          {archive.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {archive.map((w) => (
                <li key={w.slug}>
                  <Link href={`/pulse/${w.slug}`} className={LINK}>
                    {PULSE_NAME}, {pulseWeekPhrase(w)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-600">No complete week yet.</p>
          )}
        </section>

        <p className="mt-8 text-xs text-ink-500">
          Page built on {istDayLabel(view?.computedDay ?? istIsoDay(now))} (IST) · refreshed hourly ·{" "}
          <Link href="/shishya-in-numbers" className={LINK}>
            Shishya in numbers
          </Link>{" "}
          ·{" "}
          <Link href="/about" className={LINK}>
            About Shishya
          </Link>
        </p>
      </div>
    </main>
  );
}
