// Landing page — search-first, minimal, bilingual.
// Server Component; the picker (search + chips + filter) is a client island.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LangSwitcher } from "@/components/LangSwitcher";
import { ExamPicker, type ExamCard } from "@/components/ExamPicker";

// Top 20 Indian entrance / job exams by approximate annual candidate volume.
// `live: true` means we have validated questions for this exam in the DB; the
// rest land at /exams/[code] and show "content coming soon" — students still
// see the syllabus and can sign up for updates.
const TOP_20_EXAMS: ExamCard[] = [
  { code: "RRB_NTPC",     shortName: "RRB NTPC + Group D",  name: "Railway Recruitment Board",   category: "GOVT_JOBS",      candidatesPerYear: 12_500_000, live: false },
  { code: "SSC_GD",       shortName: "SSC GD Constable",    name: "SSC General Duty Constable",  category: "GOVT_JOBS",      candidatesPerYear: 5_000_000,  live: false },
  { code: "SSC_CGL",      shortName: "SSC CGL",             name: "SSC Combined Graduate Level", category: "GOVT_JOBS",      candidatesPerYear: 3_000_000,  live: true  },
  { code: "SSC_CHSL",     shortName: "SSC CHSL",            name: "SSC Combined Higher Secondary", category: "GOVT_JOBS",    candidatesPerYear: 3_000_000,  live: false },
  { code: "CTET",         shortName: "CTET",                name: "Central Teacher Eligibility Test", category: "TEACHING", candidatesPerYear: 3_000_000,  live: false },
  { code: "STATE_TET",    shortName: "State TETs",          name: "State Teacher Eligibility Tests",  category: "TEACHING", candidatesPerYear: 2_500_000,  live: false },
  { code: "NEET_UG",      shortName: "NEET UG",             name: "National Eligibility cum Entrance Test", category: "MEDICAL", candidatesPerYear: 2_400_000, live: false },
  { code: "IBPS_PO",      shortName: "IBPS PO + Clerk",     name: "Institute of Banking Personnel Selection", category: "BANKING", candidatesPerYear: 4_000_000, live: false },
  { code: "SBI_PO",       shortName: "SBI PO + Clerk",      name: "State Bank of India",          category: "BANKING",        candidatesPerYear: 3_000_000,  live: false },
  { code: "AGNIVEER",     shortName: "Agniveer (Army/IAF)", name: "Indian Armed Forces Agnipath", category: "DEFENCE",        candidatesPerYear: 3_000_000,  live: false },
  { code: "JEE_MAIN",     shortName: "JEE Main",            name: "Joint Entrance Examination",   category: "ENGINEERING",    candidatesPerYear: 1_400_000,  live: false },
  { code: "CUET_UG",      shortName: "CUET UG",             name: "Common University Entrance Test", category: "UNIVERSITY",  candidatesPerYear: 1_400_000,  live: false },
  { code: "UPSC_PRELIMS", shortName: "UPSC Prelims",        name: "UPSC Civil Services Examination", category: "CIVIL_SERVICES", candidatesPerYear: 1_100_000, live: false },
  { code: "UGC_NET",      shortName: "UGC NET",             name: "University Grants Commission NET", category: "TEACHING",  candidatesPerYear: 1_000_000,  live: false },
  { code: "STATE_PSC",    shortName: "State PSCs",          name: "State Public Service Commissions", category: "CIVIL_SERVICES", candidatesPerYear: 1_000_000, live: false },
  { code: "NDA",          shortName: "NDA",                 name: "National Defence Academy",     category: "DEFENCE",        candidatesPerYear: 500_000,    live: false },
  { code: "CAT",          shortName: "CAT",                 name: "Common Admission Test (IIMs)", category: "MBA",            candidatesPerYear: 350_000,    live: false },
  { code: "CDS",          shortName: "CDS",                 name: "Combined Defence Services",    category: "DEFENCE",        candidatesPerYear: 300_000,    live: false },
  { code: "GATE_CSE",     shortName: "GATE",                name: "Graduate Aptitude Test in Engineering", category: "ENGINEERING", candidatesPerYear: 100_000, live: false },
  { code: "CLAT",         shortName: "CLAT",                name: "Common Law Admission Test",    category: "LAW",            candidatesPerYear: 70_000,     live: false },
];

export default async function HomePage() {
  const { locale, t } = await getT();
  // Resilient session lookup: if env vars (DATABASE_URL / NEXTAUTH_*) are
  // missing or the DB is unreachable, the landing page must still render.
  // We just treat the user as logged-out in that case.
  let signedIn = false;
  try {
    const session = await auth();
    signedIn = Boolean(session?.user);
  } catch {
    signedIn = false;
  }

  const catLabels: Record<string, string> = {
    GOVT_JOBS:      t("land.cat.GOVT_JOBS"),
    BANKING:        t("land.cat.BANKING"),
    CIVIL_SERVICES: t("land.cat.CIVIL_SERVICES"),
    MEDICAL:        t("land.cat.MEDICAL"),
    ENGINEERING:    t("land.cat.ENGINEERING"),
    TEACHING:       t("land.cat.TEACHING"),
    UNIVERSITY:     t("land.cat.UNIVERSITY"),
    MBA:            t("land.cat.MBA"),
    LAW:            t("land.cat.LAW"),
    DEFENCE:        t("land.cat.DEFENCE"),
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <SiteHeader locale={locale} t={t} signedIn={signedIn} />

      {/* ── Hero: brand line + search + chips + grid ───────────────── */}
      <section className="container-prose pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-6xl">
            {t("land.title")}
            <span className="ml-2 bg-gradient-to-r from-saffron-600 to-saffron-400 bg-clip-text text-transparent">
              {t("land.title.accent")}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink-600 sm:text-lg">
            {t("land.subtitle")}
          </p>
        </div>

        <div className="mt-10">
          <ExamPicker
            exams={TOP_20_EXAMS}
            signedIn={signedIn}
            labels={{
              searchPlaceholder: t("land.search.placeholder"),
              searchLabel: t("land.search.label"),
              noResults: t("land.no.results"),
              catAll: t("land.cat.all"),
              catLabels,
              statusLive: t("land.status.live"),
              statusComing: t("land.status.coming"),
              candidatesPerYear: t("land.candidates"),
            }}
          />
        </div>

        {!signedIn && (
          <div className="mt-10 text-center">
            <Link href="/api/auth/signin/google?callbackUrl=%2Fdashboard" className="btn-primary">
              {t("land.cta.start")}
            </Link>
          </div>
        )}
      </section>

      {/* ── The Loop ─────────────────────────────────────────────── */}
      <section id="how" className="border-t border-ink-200/50 bg-white py-16 sm:py-20">
        <div className="container-prose">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("loop.title")}
            </h2>
            <p className="mt-3 text-base text-ink-600">{t("loop.subtitle")}</p>
          </div>

          <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <LoopStep icon="📝" title={t("loop.s1.title")} body={t("loop.s1.body")} />
            <LoopStep icon="📊" title={t("loop.s2.title")} body={t("loop.s2.body")} />
            <LoopStep icon="🤖" title={t("loop.s3.title")} body={t("loop.s3.body")} />
            <LoopStep icon="💬" title={t("loop.s4.title")} body={t("loop.s4.body")} />
          </ol>

          <p className="mt-10 text-center text-xs text-ink-500">
            <span className="font-medium text-ink-800">हर छात्र, एक ही मंच पर ·</span>{" "}
            Built by <a className="underline hover:text-ink-700" href="https://surgesoftware.co.in">Surge</a>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────
function SiteHeader({
  locale,
  t,
  signedIn,
}: {
  locale: any;
  t: (k: any) => string;
  signedIn: boolean;
}) {
  return (
    <header className="border-b border-ink-200/50 bg-white/70 backdrop-blur">
      <div className="container-prose flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
            शि
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
        </Link>
        <div className="flex items-center gap-3">
          <LangSwitcher current={locale} />
          {signedIn ? (
            <Link href="/dashboard" className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
              {t("nav.dashboard")} →
            </Link>
          ) : (
            <Link href="/api/auth/signin" className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
              {t("nav.signin.short")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function LoopStep({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <li className="rounded-lg border border-ink-200 bg-white p-5 shadow-sm">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{body}</p>
    </li>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white py-10">
      <div className="container-prose flex flex-col items-center justify-between gap-3 text-xs text-ink-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Shishya · Built by Surge Software Solutions</p>
        <div className="flex items-center gap-4">
          <a href="https://github.com/SurgeEnterpriseAI/shishya" className="hover:text-ink-800">GitHub</a>
          <a href="mailto:venumuvva@surgesoftware.co.in" className="hover:text-ink-800">Contact</a>
          <a href="https://surgesoftware.co.in" className="hover:text-ink-800">Surge</a>
        </div>
      </div>
    </footer>
  );
}
