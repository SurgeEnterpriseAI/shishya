// /schooling/streams — Class 10 → Class 11 stream selection guide.
//
// The single most consequential decision a 15-16 year old Indian student
// makes. Science (PCM, PCB, PCMB), Commerce, Humanities — each opens and
// closes specific career doors. This page is the honest decision surface.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Stream Selection After Class 10 — Science vs Commerce vs Humanities | Shishya",
  description:
    "Picking your Class 11 stream is the most consequential decision in your school years. Science (PCM/PCB/PCMB), Commerce, Humanities — what each opens up, what each closes, and how to pick honestly. No 'science is best' marketing.",
  alternates: { canonical: "https://shishya.in/schooling/streams" },
  keywords: [
    "stream selection class 10",
    "science vs commerce vs humanities",
    "PCM vs PCB vs PCMB",
    "after Class 10 stream",
    "Class 11 stream India",
    "best stream after 10th",
    "humanities career india",
    "commerce career india",
  ],
  openGraph: {
    title: "Stream Selection After Class 10 — Shishya",
    description: "Science vs Commerce vs Humanities — what each opens up, what each closes.",
    url: "https://shishya.in/schooling/streams",
    siteName: "Shishya",
    locale: "en_IN",
    type: "article",
  },
};

export const revalidate = 86_400;

interface Stream {
  slug: string;
  emoji: string;
  name: string;
  subjects: string;
  blurb: string;
  opens: string[];   // careers it opens
  closes: string[];  // careers it makes hard
  exams: Array<{ label: string; href: string }>;
  whoShouldPick: string;
  whoShouldnt: string;
  myths: Array<{ myth: string; reality: string }>;
}

const STREAMS: Stream[] = [
  {
    slug: "pcm",
    emoji: "⚙️",
    name: "Science (PCM)",
    subjects: "Physics · Chemistry · Mathematics + English + 5th optional",
    blurb:
      "The engineering + technology gateway. Single most flexible stream — keeps engineering, commerce, defence, civil services, and even MBBS (if you also take Biology) open.",
    opens: [
      "Engineering (any branch) via JEE / state CETs",
      "Architecture via NATA",
      "BSc Math/Physics/Chemistry → MSc → research / teaching",
      "Defence (NDA, Air Force, Navy)",
      "Commerce + Humanities careers (almost everything stays open)",
      "Aviation (commercial pilot training)",
      "Merchant Navy",
    ],
    closes: [
      "MBBS / Dentistry / Veterinary (need Biology — switch to PCMB)",
      "BSc Biology / Microbiology (need PCB or PCMB)",
    ],
    exams: [
      { label: "JEE Main", href: "/exams/JEE_MAIN" },
      { label: "JEE Advanced", href: "/exams/JEE_ADVANCED" },
      { label: "BITSAT", href: "/exams" },
      { label: "CUET UG", href: "/exams/CUET_UG" },
      { label: "NDA", href: "/exams/NDA" },
    ],
    whoShouldPick:
      "You enjoy math + physics problem-solving. You're considering engineering, defence, research, architecture, or want maximum optionality. Top mark in Class 10 math (>85%) is a good signal.",
    whoShouldnt:
      "You score consistently below 60% in math + dislike it. Math becomes harder, not easier, in Class 11-12. Don't pick PCM just because it 'sounds prestigious' — engineering oversupply at non-top tiers means low ROI.",
    myths: [
      { myth: "PCM is the 'safest' choice", reality: "Only safe if you genuinely engage with math + science. Otherwise the 2 years of Class 11-12 become miserable + boards underperformance affects every UG admission." },
      { myth: "PCM with PCB option (PCMB) is best for keeping doors open", reality: "True ONLY if you can handle 5 difficult subjects simultaneously. Most students who take PCMB underperform in 2-3 subjects vs students focused on PCM or PCB." },
      { myth: "Engineering is the highest-paying career", reality: "Top-tier engineering is. Tier-3 college BTech pays ₹3-4 LPA on graduation — well below CA, design, civil services at same tenure." },
    ],
  },
  {
    slug: "pcb",
    emoji: "🧬",
    name: "Science (PCB)",
    subjects: "Physics · Chemistry · Biology + English + 5th optional",
    blurb:
      "The medical + life sciences gateway. Optimised for MBBS, BDS, BVSc, Pharmacy, BSc Bio, Biotech. Drops Math, which cuts engineering + commerce-heavy paths.",
    opens: [
      "MBBS / Dentistry / Veterinary via NEET UG",
      "Pharmacy (BPharm)",
      "BSc Biology / Biotech / Microbiology / Zoology",
      "Allied Health: Physiotherapy, Nursing, Nutrition",
      "AYUSH (BAMS, BHMS, BUMS) via NEET",
      "Forestry, Environmental Sciences",
      "Research career in life sciences",
    ],
    closes: [
      "Engineering (need Math — would have to switch to PCMB or repeat Class 11 with PCM)",
      "Architecture (needs Math)",
      "BCom + CA + traditional finance (no Math is a real handicap)",
      "Defence technical entry (most need Math)",
    ],
    exams: [
      { label: "NEET UG", href: "/exams/NEET_UG" },
      { label: "AIIMS / JIPMER (legacy)", href: "/exams/NEET_UG" },
      { label: "CUET UG (Biology stream)", href: "/exams/CUET_UG" },
    ],
    whoShouldPick:
      "You're committed to medicine, dentistry, veterinary, or life-sciences research. You enjoy memorisation + recall (NEET rewards this) more than complex math problem-solving. Strong Class 10 biology grades are a positive signal.",
    whoShouldnt:
      "You're picking PCB only because parents want a doctor. NEET has ~24L applicants for ~1.1L MBBS seats. Without genuine commitment, the prep grind is brutal. Also don't pick PCB if you're considering engineering as a backup — Math is the missing piece.",
    myths: [
      { myth: "PCB is easier than PCM", reality: "Different difficulty, not easier. NEET Biology is volume-heavy (memorise + recall ~1300+ pages of NCERT). PCM is complexity-heavy. Both demand 2 years of dedicated work." },
      { myth: "MBBS is guaranteed if I take PCB + score well", reality: "12L MBBS-aspirants vs 1.1L MBBS seats = ~1 in 11 chance. Govt MBBS at strong colleges = 1 in 22. Private MBBS is ₹70L-1.2 Cr fees over 5.5 yrs." },
      { myth: "Without MBBS, PCB has no future", reality: "BPharm, Allied Health, Biotech, BSc Bio + MSc research, Veterinary, AYUSH, Nutrition + Sports Medicine — multiple viable careers. Pay range is wide; outcomes depend on specialisation." },
    ],
  },
  {
    slug: "pcmb",
    emoji: "🔬",
    name: "Science (PCMB)",
    subjects: "Physics · Chemistry · Math · Biology + English (5 subjects)",
    blurb:
      "Keeps everything open — engineering AND medicine. 5 hard subjects simultaneously; only sustainable for genuinely strong students.",
    opens: [
      "Everything PCM opens AND everything PCB opens",
      "Maximum optionality if undecided between engineering + medicine",
      "Some integrated programs (e.g., MBBS + BTech in biomedical engineering)",
    ],
    closes: [
      "Effectively nothing (in terms of science/eng/med paths)",
      "But you spread thin — pre-prep for JEE + NEET simultaneously is genuinely hard",
    ],
    exams: [
      { label: "Either JEE Main or NEET UG (or both — rare)", href: "/exams" },
      { label: "All PCM + PCB exams remain open", href: "/exams" },
    ],
    whoShouldPick:
      "Class 10 percentage ≥90%, genuinely strong in math + bio + chem. You'd take JEE OR NEET depending on Class 12 performance + interest evolution. Top performers at central schools (KVS, Sainik) often pick PCMB.",
    whoShouldnt:
      "You're at average grades + parents want you to 'keep all options open'. PCMB is brutal — 5 subjects to perform in for boards AND prep for the entrance + cover the syllabus. Most students underperform.",
    myths: [
      { myth: "Smart move — keeps all doors open", reality: "Only if you can handle 5 demanding subjects simultaneously. Most PCMB students drop one focus by Class 12 and effectively become PCM-with-Bio or PCB-with-Math. The optionality is theoretical." },
      { myth: "PCMB + prep for both JEE + NEET", reality: "Genuinely hard. Both have 2-year syllabi requiring focused prep. Top schools sometimes offer PCMB streams with focused tracks; common ones don't." },
    ],
  },
  {
    slug: "commerce",
    emoji: "📊",
    name: "Commerce (with or without Math)",
    subjects:
      "Accountancy · Business Studies · Economics + English + Math (optional but recommended) + 5th optional",
    blurb:
      "The business + finance + management gateway. Strongest path to CA, CS, BBA-MBA, banking, finance, economics. With Math: keeps quantitative finance + economics-research open.",
    opens: [
      "CA (Chartered Accountancy) via ICAI",
      "CS (Company Secretary) via ICSI",
      "CMA (Cost Accountant) via ICMAI",
      "BCom / BBA → MBA / PG",
      "Economics (BA/BSc Econ) — Math version mandatory for top programmes",
      "BBA + finance careers",
      "Banking via IBPS / SBI exams",
      "Actuary (with Math)",
      "Investment Banking + Equity Research (top MBA → IB)",
    ],
    closes: [
      "Engineering + Architecture (no Physics/Chem)",
      "MBBS / BDS / BVSc (no Biology)",
      "Defence technical entry",
    ],
    exams: [
      { label: "CUET UG (Commerce stream)", href: "/exams/CUET_UG" },
      { label: "CA Foundation (after Class 12)", href: "/exams" },
      { label: "CLAT (for BBA-LLB)", href: "/exams/CLAT" },
      { label: "IPMAT (IIM Indore/Rohtak integrated MBA)", href: "/exams" },
      { label: "BITSAT (with Math)", href: "/exams" },
    ],
    whoShouldPick:
      "You're interested in business, finance, accounting, economics. Strong Class 10 social science + math grades. You're systems-oriented + numerate. Math version (Commerce with Math) is strongly recommended — it opens BCom Hons at top DU colleges, Eco at Eco hons, and is mandatory for CA + IPMAT.",
    whoShouldnt:
      "You picked it as a default because you're 'not science material'. Commerce demands genuine engagement with double-entry accounting, IT-Act/GST tax law, business cases — not just rote memorisation.",
    myths: [
      { myth: "Commerce is the 'easier' alternative to PCM", reality: "Different domain, not easier. CA clearance rate is 8-15% at first attempt; Class 12 commerce boards have detailed accountancy + tax syllabi." },
      { myth: "Commerce without Math is fine", reality: "It's possible BUT cuts off CA's quantitative subjects, IPMAT, top BCom Hons + Eco programs, actuary. Take Commerce WITH Math unless you're truly math-averse." },
      { myth: "CA is the only good commerce career", reality: "CA is one of several. CS, CMA, MBA via IIMs, banking via IBPS, investment banking via MBA, economics research via PhD — all viable from commerce." },
    ],
  },
  {
    slug: "humanities",
    emoji: "📚",
    name: "Humanities / Arts",
    subjects:
      "History · Political Science · Geography · Economics · Sociology · Psychology · Languages (pick 5 from various combinations)",
    blurb:
      "The civil services + law + liberal arts gateway. Misunderstood as 'backup' but actually the strongest path to UPSC, law, journalism, design, public policy, social work, psychology.",
    opens: [
      "Civil Services (UPSC, state PSCs)",
      "Law (CLAT → NLU → litigation/corporate)",
      "Journalism + Media + Mass Communication",
      "Liberal Arts UG (BA at DU, Ashoka, FLAME, Krea)",
      "Design (NID, NIFT, IIT-IDC) — entrance is portfolio-based",
      "Psychology + Counselling careers",
      "Social work + NGO careers",
      "Languages (translation, foreign-service entry)",
      "Public Policy careers",
      "MBA + management (yes, BA grads enter top MBAs)",
    ],
    closes: [
      "Engineering + Architecture",
      "MBBS / BDS / BVSc",
      "Most pure-science research careers",
      "CA at the cleanest path (BA route to CA is possible but harder)",
    ],
    exams: [
      { label: "CUET UG (Humanities stream)", href: "/exams/CUET_UG" },
      { label: "CLAT (Law)", href: "/exams/CLAT" },
      { label: "UPSC CSE (after graduation)", href: "/exams/UPSC_PRELIMS" },
      { label: "NID Design entrance", href: "/exams" },
      { label: "NIFT entrance", href: "/exams" },
    ],
    whoShouldPick:
      "You're interested in history, society, politics, language, design, psychology. You're considering civil services, law, journalism, design. Strong Class 10 social science + English grades are positive signals. Humanities is increasingly the 'serious' choice for UPSC aspirants — NCERT humanities aligns directly with UPSC GS.",
    whoShouldnt:
      "You picked it because 'I scored low so I can't take Science/Commerce'. Humanities at a top school is academically rigorous — Class 12 boards include difficult Geography, History, Political Science. Pick it because you genuinely engage with these subjects, not as a default.",
    myths: [
      { myth: "Humanities is the 'last resort' stream", reality: "Humanities students dominate top IIM / FMS / IIT-Madras Liberal Arts intakes. UPSC top-rankers heavily come from humanities backgrounds. It's a real path, not a backup." },
      { myth: "Humanities has no career options", reality: "UPSC, Law, Journalism, Design, Psychology, Foreign Service, Policy careers, Academia — all originate from humanities. Pay range is wide; top tier (SC judge, senior IAS officer, top journalist, design partner) is substantial." },
      { myth: "BA = unemployment", reality: "Top BA programmes (DU Hons, Ashoka, FLAME, JNU, Presidency Kolkata, St Stephen's, Hindu, LSR) feed strong career outcomes. The 'BA unemployment' narrative applies to mediocre BA from tier-3 colleges — same as tier-3 BTech." },
    ],
  },
];

export default function StreamsPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/schooling" className="hover:text-ink-800">Schooling</Link> · Stream Selection
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          Picking your Class 11 stream
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          The single most consequential decision in your school years. Science
          (PCM, PCB, PCMB), Commerce, or Humanities — each opens specific
          career doors and closes others. There's no 'best' stream; only the
          right stream for who you are + what you want to do.
        </p>

        {/* TL;DR */}
        <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">TL;DR — the only honest framing</p>
          <p className="mt-2 text-xs">
            <strong>Pick the stream where the subjects genuinely interest you</strong> —
            not the "highest-status" one. 2 years of Class 11-12 is hard enough
            with subjects you like. With subjects you hate, you'll underperform
            in boards AND the entrance exam AND develop a 17-year-old's burnout.
            The career value of any stream depends on going deep + reaching the
            top tier within it. Mediocre engineer earns less than top journalist.
          </p>
        </div>

        {/* Streams comparison */}
        {STREAMS.map((s) => (
          <section key={s.slug} id={s.slug} className="mt-12">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl">{s.emoji}</span>
              <h2 className="text-2xl font-bold text-ink-900">{s.name}</h2>
            </div>
            <p className="mt-1 text-xs text-ink-500">{s.subjects}</p>
            <p className="mt-3 text-sm text-ink-700">{s.blurb}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                  What it opens up
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-700">
                  {s.opens.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                  What it closes
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-700">
                  {s.closes.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-ink-200 bg-white p-4 text-xs text-ink-700">
                <p className="font-semibold text-ink-800">Pick this if</p>
                <p className="mt-1">{s.whoShouldPick}</p>
              </div>
              <div className="rounded-lg border border-ink-200 bg-white p-4 text-xs text-ink-700">
                <p className="font-semibold text-ink-800">Don't pick this if</p>
                <p className="mt-1">{s.whoShouldnt}</p>
              </div>
            </div>

            {/* Exams */}
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Relevant entrance exams
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {s.exams.map((e, i) => (
                <li key={i}>
                  <Link
                    href={e.href}
                    className="rounded-md border border-saffron-300 bg-saffron-50/40 px-3 py-1 text-xs text-saffron-800 hover:bg-saffron-100"
                  >
                    {e.label} →
                  </Link>
                </li>
              ))}
            </ul>

            {/* Myths */}
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Common myths
              </p>
              <ul className="mt-2 space-y-3">
                {s.myths.map((m, i) => (
                  <li key={i} className="text-xs text-ink-700">
                    <p className="font-semibold text-ink-900">Myth: {m.myth}</p>
                    <p className="mt-0.5"><strong>Reality:</strong> {m.reality}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        {/* Decision framework */}
        <div className="mt-16 rounded-lg border border-saffron-300 bg-saffron-50/50 p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">
            How to actually decide (5-step checklist)
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs">
            <li>
              <strong>List Class 11-12 subjects you'd actually enjoy.</strong>{" "}
              Not "I should enjoy them." Genuinely look at NCERT Class 11 books
              for each — they're free online. Read 2-3 chapters of each.
            </li>
            <li>
              <strong>Look at your Class 9-10 strongest subjects.</strong>{" "}
              These are signals of where you naturally engage. They're not
              destiny — but they're real data about your strengths.
            </li>
            <li>
              <strong>Pick 3-5 careers you're seriously considering.</strong>{" "}
              Use our <Link href="/careers" className="text-saffron-700 underline">careers section</Link> to
              read about each. Note which streams feed each career.
            </li>
            <li>
              <strong>Find overlap.</strong> The stream that intersects "subjects
              you enjoy" + "careers you're considering" is your honest answer.
            </li>
            <li>
              <strong>Resist parental pressure for the wrong reasons.</strong>{" "}
              Parents pushing you toward Science when you love history isn't
              love — it's their unprocessed anxiety. Show them the careers
              page. Show them salaries of senior journalists, designers,
              policy professionals. The conversation gets easier with data.
            </li>
          </ol>
        </div>

        {/* Next steps */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/careers"
            className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
          >
            <p className="text-sm font-semibold text-ink-900">Explore careers →</p>
            <p className="mt-1 text-xs text-ink-600">
              42 career paths with salary, qualifications, growth. Read what
              real work in each looks like before picking a stream.
            </p>
          </Link>
          <Link
            href="/schooling"
            className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
          >
            <p className="text-sm font-semibold text-ink-900">Back to schooling →</p>
            <p className="mt-1 text-xs text-ink-600">
              Per-board, per-class syllabus + chapter pages. NCERT-aligned,
              free.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
