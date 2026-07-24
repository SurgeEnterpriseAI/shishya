// /find-your-exam — "There are lakhs of government jobs. Which ones can
// YOU crack?" A personalized eligibility + fit matcher: a visitor's
// age / education / stream / state / strengths are matched against every
// exam's real eligibility so they see the exams they can actually apply
// for — ranked by fit and vacancy odds — instead of one undifferentiated
// list. Friction-free: no signup to see matches; answers live in the URL
// so results are server-rendered, shareable and SEO/AEO-visible.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";
import { FindExamQuiz } from "./FindExamQuiz";
import { SaveMatchesNudge } from "./SaveMatchesNudge";
import { computeExamTags } from "@/lib/exam-tags";
import {
  matchAll, type ExamElig, type MatchInput, type EducationLevel, type Stream, type Category, type Skill,
} from "@/lib/exam-matcher";

// The finder is about GOVERNMENT JOBS — not college-admission tests.
// A person wanting a govt job should never be matched to JEE / NEET /
// EAMCET / CUET / CLAT / CAT. Keep only exams whose canonical tags mark
// them as a government-job pathway (govt umbrella, banking, teaching/TET,
// police, civil services, defence); drop pure academic-entrance tags.
const JOB_TAGS = new Set(["govt", "banking", "teaching", "police", "civil_services", "defence"]);
function isGovtJobExam(code: string, category: string, state: string | null): boolean {
  const tags = computeExamTags({ code, category, state });
  return tags.some((t) => JOB_TAGS.has(t));
}

export const revalidate = 3600;

const YEAR = new Date().getFullYear();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const hasAnswers = Boolean(sp.age && sp.edu);
  const title = `Which Government Exam Should I Take? Free Eligibility & Fit Finder ${YEAR} | Shishya`;
  const description =
    `Answer 5 quick questions — age, education, state, strengths — and see exactly which Indian government exams you're eligible for, ranked by fit and vacancies. Free, no signup.`;
  return {
    title,
    description,
    alternates: { canonical: "https://shishya.in/find-your-exam" },
    // Personalised result views are noindex (infinite param combos); the
    // bare landing is the indexable, AEO-citeable page.
    robots: hasAnswers ? { index: false, follow: true } : undefined,
    keywords: [
      "which government exam should i take",
      "government job eligibility by age",
      "government exams after graduation",
      "government jobs for 12th pass",
      "which govt exam suits me",
      "government exam finder",
    ],
    openGraph: { title, description, url: "https://shishya.in/find-your-exam", siteName: "Shishya", type: "website" },
  };
}

interface Row extends ExamElig {}

export default async function FindYourExamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const rows = await prisma
    .$queryRaw<Row[]>`
      SELECT e.code, e."shortName", e.name, e.category::text AS category, e.state,
             x."minAge", x."maxAge", x."educationTags", x."educationNote",
             x."domicileState", x."vacanciesApprox", x."vacanciesNote", x."skillProfile",
             x."officialUrl", x."officialName"
      FROM "ExamEligibility" x JOIN "Exam" e ON e.id = x."examId"
      WHERE e.active = TRUE
    `.catch(() => [] as Row[]);

  // Government-job exams only — this finder answers "which govt JOB can
  // I get", so admission/entrance tests are filtered out.
  const jobRows = rows.filter((r) => isGovtJobExam(r.code, r.category, r.state));

  const totalVacancies = jobRows.reduce((a, r) => a + (r.vacanciesApprox ?? 0), 0);
  const totalLakh = (totalVacancies / 100_000).toFixed(1);

  const hasAnswers = Boolean(sp.age && sp.edu);
  let eligible: ReturnType<typeof matchAll>["eligible"] = [];
  let ineligibleSoon: ReturnType<typeof matchAll>["ineligible"] = [];
  let input: MatchInput | null = null;

  if (hasAnswers) {
    input = {
      age: parseInt(sp.age!, 10),
      education: (sp.edu as EducationLevel) ?? "GRADUATE",
      stream: (sp.stream as Stream) ?? "ANY",
      state: sp.state ?? null,
      category: (sp.cat as Category) ?? "GEN",
      strengths: (sp.str ?? "").split(",").filter(Boolean) as Skill[],
    };
    const m = matchAll(input, jobRows);
    eligible = m.eligible;
    // "Qualify soon" = blocked ONLY because they haven't finished the
    // required degree yet — motivational, not a dead end.
    ineligibleSoon = m.ineligible
      .filter((r) => r.blockers.length === 1 && /qualification|degree|graduat/i.test(r.blockers[0]))
      .slice(0, 4);
  }

  const eligibleVac = eligible.reduce((a, r) => a + (r.exam.vacanciesApprox ?? 0), 0);

  // "Save your matches" nudge — only for ANONYMOUS visitors with results
  // (peak intent). The answers live in the URL, so the login callback
  // brings them straight back to these exact results after Google
  // sign-in. auth() is only consulted on results views; the bare SEO
  // landing never reads cookies.
  let signedIn = false;
  let saveHref: string | null = null;
  if (hasAnswers && eligible.length > 0) {
    signedIn = await auth()
      .then((s) => Boolean(s?.user))
      .catch(() => false);
    if (!signedIn) {
      const q = new URLSearchParams();
      for (const k of ["age", "edu", "stream", "state", "cat", "str"] as const) {
        if (sp[k]) q.set(k, sp[k]!);
      }
      saveHref = `/login?callbackUrl=${encodeURIComponent(`/find-your-exam?${q.toString()}#results`)}`;
    }
  }

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Government Exam Eligibility & Fit Finder",
            description:
              "Find which Indian government exams you are eligible for based on age, education, state and strengths — ranked by fit and vacancies.",
            path: "/find-your-exam",
          }),
          breadcrumbLd([["Find your exam", "/find-your-exam"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
          {totalVacancies > 0
            ? `India, as on today, has ~${totalLakh} lakh government job vacancies. Which ones can YOU crack?`
            : "Which government exam is right for YOU?"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          Stop scrolling through hundreds of exams. Tell us your age, education, state and strengths —
          we&apos;ll show the exams you&apos;re actually eligible for, ranked by how well they fit you
          and how many vacancies they have. Free, no signup to see your matches.
        </p>

        <div id="quiz" className="mt-6">
          <FindExamQuiz initial={sp as Record<string, string>} />
        </div>

        {/* ── Results ── */}
        {hasAnswers && (
          <div id="results" className="mt-10 scroll-mt-20">
            {eligible.length === 0 ? (
              <div className="rounded-xl border border-ink-200 bg-white p-6 text-center">
                <p className="text-base font-bold text-ink-900">No direct matches yet</p>
                <p className="mt-1 text-sm text-ink-600">
                  Try widening your answers (e.g. category, or leave state blank for national exams).
                  Many exams open up once you finish your current qualification.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-5">
                  <p className="text-lg font-bold text-ink-900">
                    ✅ You can apply for {eligible.length} government exam{eligible.length === 1 ? "" : "s"}
                  </p>
                  {eligibleVac > 0 && (
                    <p className="mt-1 text-sm text-ink-700">
                      That&apos;s roughly{" "}
                      <span className="font-bold text-emerald-700">{eligibleVac.toLocaleString("en-IN")}</span>{" "}
                      vacancies a year you&apos;re eligible for. Higher-vacancy exams give you more real
                      chances — start with your top fits below.
                    </p>
                  )}
                  {saveHref && <SaveMatchesNudge loginHref={saveHref} matchCount={eligible.length} />}
                </div>

                <h2 className="mt-6 text-base font-bold text-ink-900">Your best-fit exams</h2>
                <ul className="mt-3 space-y-3">
                  {eligible.slice(0, 15).map((r, i) => (
                    <li key={r.exam.code} className="rounded-xl border border-ink-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-ink-400">#{i + 1}</span>
                            <Link href={`/exams/${r.exam.code}`} className="text-sm font-bold text-ink-900 hover:text-saffron-700 hover:underline">
                              {r.exam.shortName}
                            </Link>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{r.exam.name}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold tabular-nums text-emerald-600">{r.fitScore}<span className="text-xs text-ink-400">/100</span></p>
                          <p className="text-[10px] uppercase tracking-wide text-ink-400">fit</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.reasons.slice(0, 3).map((rs, j) => (
                          <span key={j} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                            {rs}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/exams/${r.exam.code}`} className="btn-primary !py-1.5 !px-3 text-xs">
                          Start preparing free →
                        </Link>
                        <Link href={`/exams/${r.exam.code}/guide`} className="text-xs font-medium text-saffron-700 hover:underline self-center">
                          How to crack it
                        </Link>
                        <Link href={`/exams/${r.exam.code}/cutoff`} className="text-xs font-medium text-saffron-700 hover:underline self-center">
                          Expected cutoff
                        </Link>
                        {r.exam.officialUrl && (
                          <a
                            href={r.exam.officialUrl}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="text-xs font-medium text-emerald-700 hover:underline self-center"
                          >
                            ✓ Verify official ↗
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {ineligibleSoon.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-base font-bold text-ink-900">You&apos;ll qualify for these soon</h2>
                    <p className="mt-1 text-xs text-ink-500">Open up once you finish your current qualification — worth aiming for.</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {ineligibleSoon.map((r) => (
                        <li key={r.exam.code}>
                          <Link href={`/exams/${r.exam.code}`} className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400">
                            {r.exam.shortName}
                            {r.exam.vacanciesApprox ? <span className="text-ink-400">· ~{r.exam.vacanciesApprox.toLocaleString("en-IN")}</span> : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
                  <p className="text-base font-bold text-ink-900">Pick your #1 and start today</p>
                  <p className="mt-1 text-sm text-ink-600">
                    Sign in free to lock your exam, get a daily plan, mock tests and an AI tutor in your
                    language. Everything free — no coaching fees.
                  </p>
                  {eligible[0] && (
                    <Link href={`/exams/${eligible[0].exam.code}`} className="btn-primary mt-3 inline-block !py-2 !px-4 text-sm">
                      Start {eligible[0].exam.shortName} prep →
                    </Link>
                  )}
                </div>
              </>
            )}
            <p className="mt-4 text-xs text-ink-400">
              Eligibility is indicative — always confirm age, education and vacancy details in the
              official notification before applying.
            </p>
          </div>
        )}

        {!hasAnswers && (
          <p className="mt-6 text-xs text-ink-500">
            We check real eligibility (age limits, qualification, state domicile) across every exam we
            cover, then rank by how well each fits your strengths and how many vacancies it has.
          </p>
        )}
      </section>
    </main>
  );
}
