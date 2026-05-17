// Shared skeleton for the Phase-1 section landings (Schooling, Colleges,
// PG, Jobs, Worldwide, Insights). Communicates that the section is real
// and on the roadmap, lists what will be inside, and gives a CTA back
// to the parts of the platform that ARE live (Exams, AI tutor).
//
// Intentionally NOT a "coming soon" hand-wave page. Each landing shows
// the actual outline of what we're building so the visitor can decide
// whether to bookmark or come back.

import Link from "next/link";
import { Header } from "@/components/Header";

interface Bullet {
  title: string;
  body: string;
}

interface Props {
  /** Page title — full English form for SEO + on-page H1. */
  title: string;
  /** Native-script / hindi suffix shown smaller under the H1 if provided. */
  subtitle?: string;
  /** 1–2 sentence intro shown directly under the H1. */
  intro: string;
  /** Bullet list of "what's coming in this section". 4–8 items reads best. */
  bullets: Bullet[];
  /** ETA copy ("Shipping by August 2026", "Phase 3 of the roadmap"). */
  eta?: string;
  /** Breadcrumb label for the current page (e.g., "Schooling"). */
  breadcrumb: string;
}

export function SectionComingSoon({ title, subtitle, intro, bullets, eta, breadcrumb }: Props) {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · {breadcrumb}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-lg text-ink-500">{subtitle}</p>}
        <p className="mt-4 max-w-3xl text-sm text-ink-700">{intro}</p>

        {eta && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-700">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-saffron-500" />
            </span>
            {eta}
          </div>
        )}

        <h2 className="mt-10 text-base font-semibold text-ink-900">
          What this section will cover
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {bullets.map((b) => (
            <li key={b.title} className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">{b.title}</p>
              <p className="mt-1 text-xs text-ink-600">{b.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            In the meantime
          </h3>
          <p className="mt-2">
            Our Entrance & Government Exams section is live now — 163 exams
            covered with adaptive mock tests, previous year papers and a
            built-in AI tutor that explains every wrong answer. All free.
          </p>
          <Link
            href="/exams"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Browse entrance exams →
          </Link>
        </div>

        <p className="mt-8 text-xs text-ink-500">
          Want this section sooner? Sign in and tell our AI tutor what you're
          preparing for — that signal directly drives our roadmap priority.
        </p>
      </section>
    </main>
  );
}
