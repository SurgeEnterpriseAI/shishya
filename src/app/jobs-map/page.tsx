// /jobs-map — the complete map of government jobs in India.
//
// The newcomer's real first question is "where do I even aim?" — no
// aspirant site shows the whole landscape in one picture. This page
// does: India → Central (Group A/B/C, Banking, Defence) → State (PSC
// Group 1, Group 2/3 & staff boards, Police, Teaching), every tier
// carrying its indicative 7th-CPC pay band and the ACTUAL exams
// Shishya tracks with live vacancy counts, deep-linked to their hubs.
//
// Server-rendered, zero client JS (native <details> for long exam
// lists) — fully crawlable, cached 6h. Pay figures are indicative
// basic-pay bands, stated honestly as such.

import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { computeExamTags, type ExamTag } from "@/lib/exam-tags";

export const revalidate = 21600; // 6h

const JOB_TAGS = new Set<ExamTag>(["govt", "banking", "teaching", "police", "civil_services", "defence"]);

type NodeId = "c-a" | "c-b" | "c-c" | "c-bank" | "c-def" | "s-1" | "s-23" | "s-police" | "s-teach";

interface TierDef {
  id: NodeId;
  chip: string;
  title: string;
  what: string;
  pay: string;
  posts: string;
}

const CENTRAL: TierDef[] = [
  {
    id: "c-a",
    chip: "GROUP A",
    title: "All-India & Central Services (Officers)",
    what: "The top of the pyramid — gazetted officers who run districts, departments and embassies.",
    pay: "Pay Level 10–14+ · basic ₹56,100–₹2,18,200 + DA/HRA",
    posts: "IAS · IPS · IFS · IRS · Assistant Commandant",
  },
  {
    id: "c-b",
    chip: "GROUP B",
    title: "Inspectors & Section Officers",
    what: "The backbone of central departments — inspector and superintendent grade, mostly via SSC CGL.",
    pay: "Pay Level 6–9 · basic ₹35,400–₹53,100 + DA/HRA",
    posts: "Income Tax Inspector · Excise Inspector · ASO in ministries · Sub-Inspector (CBI)",
  },
  {
    id: "c-c",
    chip: "GROUP C",
    title: "Clerical, Field & Railway Staff",
    what: "The largest seat counts in central government — clerks, constables, technicians, railway staff.",
    pay: "Pay Level 1–5 · basic ₹18,000–₹29,200 + DA/HRA",
    posts: "LDC/DEO · GD Constable · Railway NTPC & Group D · MTS",
  },
  {
    id: "c-bank",
    chip: "BANKING",
    title: "Public-Sector Banks & RBI",
    what: "Officer and clerk cadres across 12 public-sector banks, RRBs and the RBI.",
    pay: "PO in-hand ≈ ₹52,000–58,000 · Clerk ≈ ₹30,000–35,000 (post-wage-revision)",
    posts: "Probationary Officer · Clerk · RBI Grade B Officer",
  },
  {
    id: "c-def",
    chip: "DEFENCE",
    title: "Armed Forces (Officer Entry)",
    what: "Commissioned officers of the Army, Navy and Air Force via NDA (after 12th) and CDS (after degree).",
    pay: "Level 10 · basic ₹56,100 + Military Service Pay ₹15,500",
    posts: "Lieutenant · Flying Officer · Sub-Lieutenant",
  },
];

const STATE: TierDef[] = [
  {
    id: "s-1",
    chip: "GROUP 1 / A",
    title: "State Civil Services (PSC Top Tier)",
    what: "Each state's own officer cadre via its PSC — the state-level equivalent of the IAS ladder.",
    pay: "≈ Pay Level 9–14 by state · basic ₹53,100+ typical entry",
    posts: "Deputy Collector · DSP · Commercial Tax Officer · Tehsildar",
  },
  {
    id: "s-23",
    chip: "GROUP 2 / 3",
    title: "State Officers & Staff-Selection Boards",
    what: "The high-volume middle — junior officers, assistants and clerks via PSC Group 2/3/4 and state SSC boards.",
    pay: "≈ basic ₹25,000–₹55,000 by state pay matrix",
    posts: "Junior Assistant · Revenue Inspector · Village Officer · LDC",
  },
  {
    id: "s-police",
    chip: "POLICE",
    title: "State Police & Central Armed Forces",
    what: "The biggest uniformed intake in India — constable and SI recruitment in every state, most years.",
    pay: "Constable basic ≈ ₹21,700 + allowances · SI ≈ ₹35,400",
    posts: "Police Constable · Sub-Inspector · Fireman · Jail Warder",
  },
  {
    id: "s-teach",
    chip: "TEACHING",
    title: "Government School Teachers",
    what: "TET is the eligibility gate (CTET for central schools, state TETs for state schools) — then recruitment drives.",
    pay: "PRT ≈ Level 5 ₹29,200 · TGT ≈ Level 6 ₹35,400 · PGT higher",
    posts: "Primary Teacher · TGT · PGT · DSC/Bharti posts",
  },
];

interface MapExam {
  code: string;
  short: string;
  state: string | null;
  vac: number;
}

async function loadMapDataRaw(): Promise<{
  buckets: Record<NodeId, MapExam[]>;
  grandTotal: number;
  examCount: number;
  payNews: { title: string; summary: string; date: Date; source: string | null }[];
}> {
  const rows = await prisma.$queryRaw<
    { code: string; short: string; category: string; state: string | null; v: number | null }[]
  >`
    SELECT e.code, e."shortName" AS short, e.category::text AS category, e.state,
           x."vacanciesApprox" AS v
    FROM "Exam" e LEFT JOIN "ExamEligibility" x ON x."examId" = e.id
    WHERE e.active = TRUE
  `;

  const buckets: Record<NodeId, MapExam[]> = {
    "c-a": [], "c-b": [], "c-c": [], "c-bank": [], "c-def": [],
    "s-1": [], "s-23": [], "s-police": [], "s-teach": [],
  };
  let grandTotal = 0;
  let examCount = 0;

  for (const r of rows) {
    const tags = computeExamTags({ code: r.code, category: r.category, state: r.state });
    if (!tags.some((t) => JOB_TAGS.has(t))) continue;
    const id = bucketOf(r.code, r.state, tags);
    if (!id) continue;
    buckets[id].push({ code: r.code, short: r.short, state: r.state, vac: r.v ?? 0 });
    grandTotal += r.v ?? 0;
    examCount += 1;
  }
  for (const id of Object.keys(buckets) as NodeId[]) {
    buckets[id].sort((a, b) => b.vac - a.vac);
  }

  const payNews = await prisma.$queryRaw<
    { title: string; summary: string; date: Date; source: string | null }[]
  >`
    SELECT title, summary, date, source FROM "CurrentAffair"
    WHERE category = 'Pay & Jobs'
    ORDER BY date DESC, "generatedAt" DESC
    LIMIT 5
  `.catch(() => []);

  return { buckets, grandTotal, examCount, payNews };
}

function bucketOf(code: string, state: string | null, tags: ExamTag[]): NodeId | null {
  if (tags.includes("banking")) return "c-bank";
  if (tags.includes("defence") || /^(CDS|NDA|AFCAT|AGNIVEER)/.test(code)) return "c-def";
  if (/^SSC_CGL|^SSC_CPO/.test(code)) return "c-b";
  if (/^SSC_|^RRB_/.test(code)) return "c-c";
  if (tags.includes("teaching")) return "s-teach";
  // Code fallback: the police tag's pattern misses some codes
  // (e.g. UP_POLICE_CONSTABLE — 32k+ vacancies, must not land in
  // the staff-boards bucket).
  if (tags.includes("police") || /POLICE|TNUSRB/.test(code)) return "s-police";
  if (!state) return "c-a"; // UPSC & national civil-services streams
  if (
    /GROUP_?1|_CCE|_KAS\b|_PCS\b|_HPAS|_HCS\b|RAJYASEVA|_SSE\b|_OAS\b|_RAS\b|_GPSC|_APPSC_AR/.test(code) ||
    /^(ML|MN|MZ|NL|SK|TR|GA|PY|LA|DN|LD|AR)_/.test(code)
  ) {
    return "s-1";
  }
  return "s-23";
}

const loadMapData = unstable_cache(loadMapDataRaw, ["jobs-map-v1"], { revalidate: 21600 });

const fmt = (n: number) => n.toLocaleString("en-IN");

export const metadata: Metadata = {
  title: "Government Jobs in India — the Complete Map: Group A, B, C, Banking, Police, Teaching | Shishya",
  description:
    "One picture of every government job path in India: UPSC Group A, SSC Group B & C, Railways, Banking, Defence, State PSC Group 1/2/3, Police and Teaching — with indicative salaries and live vacancy counts for every exam. Free.",
  alternates: { canonical: "https://shishya.in/jobs-map" },
  openGraph: {
    title: "The Complete Map of Government Jobs in India",
    description:
      "UPSC → SSC → Railways → Banking → State PSC → Police → Teaching: every path, every pay band, live vacancies. One map.",
    url: "https://shishya.in/jobs-map",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "The Complete Map of Government Jobs in India",
    url: "https://shishya.in/jobs-map",
    description:
      "Visual hierarchy of every Indian government job path — Central (Group A, B, C, Banking, Defence) and State (PSC, staff boards, Police, Teaching) — with indicative pay bands and live vacancy counts.",
    isAccessibleForFree: true,
    provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shishya", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Government Jobs Map", item: "https://shishya.in/jobs-map" },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the difference between Group A, Group B and Group C government jobs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Group A are gazetted officer posts (IAS, IPS, IRS — Pay Level 10+, basic ₹56,100 and above) recruited mainly via UPSC. Group B are supervisor/inspector grade posts (Pay Level 6–9, basic ₹35,400–₹53,100), largely via SSC CGL and state PSCs. Group C are clerical and field staff (Pay Level 1–5, basic ₹18,000–₹29,200) via SSC CHSL/GD/MTS, Railways and state staff-selection boards — the largest number of vacancies. See the full map with live vacancy counts at https://shishya.in/jobs-map.",
        },
      },
      {
        "@type": "Question",
        name: "Which government job has the highest salary in India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "By pay band, All-India Services (IAS/IPS/IFS via UPSC) top the ladder — basic pay ₹56,100 at entry rising to ₹2,50,000 at Cabinet Secretary level, plus DA, HRA and residence/vehicle benefits. RBI Grade B (₹1L+ monthly gross at entry) and Defence officers (Level 10 + ₹15,500 Military Service Pay) are the highest-paying paths outside it. Figures are indicative — always verify in the official notification.",
        },
      },
      {
        "@type": "Question",
        name: "Which government job is easiest to get for a beginner?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Seat-count wise, Group C and state staff-board posts are the most accessible: SSC GD (25,000+ vacancies), Railway Group D (32,000+), state police constable drives (5,000–20,000 per state) and state Group 3/4 posts. They need 10th/12th qualification and consistent practice rather than years of preparation. Check which ones you're eligible for at https://shishya.in/find-your-exam.",
        },
      },
    ],
  },
];

function TierCard({ tier, exams, accent }: { tier: TierDef; exams: MapExam[]; accent: "saffron" | "emerald" }) {
  const total = exams.reduce((a, e) => a + e.vac, 0);
  const shown = exams.slice(0, 8);
  const rest = exams.slice(8);
  const border = accent === "saffron" ? "border-saffron-300" : "border-emerald-300";
  const chipBg = accent === "saffron" ? "bg-saffron-100 text-saffron-800" : "bg-emerald-100 text-emerald-800";
  return (
    <div className={`relative rounded-xl border-2 ${border} bg-white p-4 shadow-sm sm:p-5`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide ${chipBg}`}>{tier.chip}</span>
        <h3 className="text-base font-bold text-ink-900">{tier.title}</h3>
        {total > 0 && (
          <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-ink-500">
            ~{fmt(total)} vacancies/yr
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{tier.what}</p>
      <p className="mt-1.5 text-xs font-medium text-ink-700">💰 {tier.pay}</p>
      <p className="mt-1 text-xs text-ink-500">e.g. {tier.posts}</p>
      {exams.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shown.map((e) => (
            <Link
              key={e.code}
              href={`/exams/${e.code}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50/50 px-2.5 py-1 text-xs font-medium text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50"
            >
              {e.short}
              {e.vac > 0 && <span className="tabular-nums font-semibold text-saffron-700">{fmt(e.vac)}</span>}
            </Link>
          ))}
          {rest.length > 0 && (
            <details className="w-full">
              <summary className="cursor-pointer list-none text-xs font-semibold text-indigo-700 hover:text-indigo-800">
                + {rest.length} more exams →
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rest.map((e) => (
                  <Link
                    key={e.code}
                    href={`/exams/${e.code}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50/50 px-2.5 py-1 text-xs font-medium text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50"
                  >
                    {e.short}
                    {e.vac > 0 && <span className="tabular-nums font-semibold text-saffron-700">{fmt(e.vac)}</span>}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default async function JobsMapPage() {
  const { buckets, grandTotal, examCount, payNews } = await loadMapData();

  return (
    <main className="min-h-screen bg-paper-50">
      {JSON_LD.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}
      <Header />

      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          🗺️ The map · free, updated live
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
          Every government job in India — one map.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          Central to state, Group A to Group C — where each path leads, what it pays, and{" "}
          <strong>~{fmt(grandTotal)} live vacancies</strong> across {examCount} exams Shishya tracks.
          Tap any exam to see its hub. Salary figures are indicative basic-pay bands — always verify
          in the official notification.
        </p>

        {/* Root node */}
        <div className="mt-8 flex justify-center">
          <div className="rounded-2xl border-2 border-ink-300 bg-white px-6 py-3 text-center shadow-sm">
            <p className="text-lg font-bold text-ink-900">🇮🇳 Government Jobs in India</p>
            <p className="text-xs text-ink-500">two ladders — Central and your State</p>
          </div>
        </div>
        {/* Connector */}
        <div className="mx-auto h-6 w-px bg-ink-300" aria-hidden />
        <div className="mx-auto hidden h-px w-1/2 bg-ink-300 lg:block" aria-hidden />

        <div className="mt-6 grid gap-8 lg:mt-4 lg:grid-cols-2 lg:gap-10">
          {/* Central branch */}
          <div>
            <div className="mb-4 rounded-xl bg-saffron-500 px-4 py-2.5 text-center shadow-sm">
              <h2 className="text-base font-bold text-white">🏛️ Central Government</h2>
              <p className="text-[11px] text-saffron-100">
                One exam, posts across India — UPSC · SSC · Railways · Banks · Forces
              </p>
            </div>
            <div className="space-y-4 border-l-2 border-saffron-200 pl-4 sm:pl-5">
              {CENTRAL.map((t) => (
                <TierCard key={t.id} tier={t} exams={buckets[t.id]} accent="saffron" />
              ))}
            </div>
          </div>

          {/* State branch */}
          <div>
            <div className="mb-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-center shadow-sm">
              <h2 className="text-base font-bold text-white">🏞️ State Government</h2>
              <p className="text-[11px] text-emerald-100">
                Your state&apos;s own exams — PSC · staff boards · Police · Teaching
              </p>
            </div>
            <div className="space-y-4 border-l-2 border-emerald-200 pl-4 sm:pl-5">
              {STATE.map((t) => (
                <TierCard key={t.id} tier={t} exams={buckets[t.id]} accent="emerald" />
              ))}
            </div>
          </div>
        </div>

        {/* How to read the map */}
        <div className="mt-10 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="text-base font-bold text-ink-900">How to read this map</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-700">
            <li>
              ⬆️ <strong>Higher group = higher pay, fewer seats, longer preparation.</strong> Group A
              is a 1-2 year commitment; Group C can be cracked with months of consistent practice.
            </li>
            <li>
              📊 <strong>The seats live in Group C, Police and staff boards</strong> — Railway Group D,
              SSC GD and state police drives alone run to tens of thousands of vacancies a year.
            </li>
            <li>
              🎯 <strong>You don&apos;t have to choose blind:</strong> your age, education and state
              already decide most of it — the finder below shows exactly which of these boxes you
              can enter today.
            </li>
          </ul>
        </div>

        {/* Pay & job news — appears once the daily lens starts producing */}
        {payNews.length > 0 && (
          <div className="mt-6 rounded-xl border border-ink-200 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">💰 Latest pay &amp; job news</h2>
            <ul className="mt-3 space-y-3">
              {payNews.map((n, i) => (
                <li key={i} className="border-l-2 border-saffron-300 pl-3">
                  <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{n.summary}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/current-affairs"
              className="mt-3 inline-block text-xs font-semibold text-indigo-700 hover:text-indigo-800"
            >
              All daily current affairs →
            </Link>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
          <h2 className="text-lg font-bold text-ink-900">Where should YOU aim on this map?</h2>
          <p className="mx-auto mt-1 max-w-xl text-sm text-ink-600">
            Answer a few quick questions — age, education, state — and see every box above you can
            enter today, ranked by fit and vacancies. Free, no signup.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/find-your-exam"
              className="rounded-xl bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
            >
              🎯 Find my exams →
            </Link>
            <Link
              href="/ask"
              className="rounded-xl border border-ink-300 bg-white px-5 py-2.5 text-sm font-bold text-ink-800 transition-colors hover:bg-ink-50"
            >
              ✨ Ask Shishya anything
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
