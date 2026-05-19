// /jobs/resume — Resume + interview prep guide.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Fresher Resume + Interview Prep — Templates, Questions, Negotiation | Shishya",
  description:
    "ATS-friendly fresher resume templates by career, interview question banks per role (tech, finance, govt, design), salary negotiation basics. No paid coaching — actionable guidance only.",
  alternates: { canonical: "https://shishya.in/jobs/resume" },
  keywords: [
    "fresher resume template india",
    "ATS friendly resume",
    "interview questions software engineer",
    "interview questions UPSC",
    "salary negotiation fresher india",
    "CV format fresher",
  ],
};

export const revalidate = 86_400;

export default function ResumePrep() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/jobs" className="hover:text-ink-800">Jobs & Careers</Link> · Resume + Interview
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Resume + Interview Prep
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          A resume is a 30-second pitch. An interview is a 30-minute proof.
          What actually works for fresher hiring in India in 2026.
        </p>

        {/* Resume guide */}
        <h2 className="mt-10 text-xl font-bold text-ink-900">The fresher resume</h2>

        <div className="mt-4 rounded-lg border border-ink-200 bg-white p-5">
          <h3 className="text-base font-semibold text-ink-900">The 1-page rule</h3>
          <p className="mt-2 text-sm text-ink-700">
            For fresher applications, your resume must fit one A4 page. Two
            pages signal "padded" — not "experienced". Cut ruthlessly.
          </p>
        </div>

        <div className="mt-3 rounded-lg border border-ink-200 bg-white p-5">
          <h3 className="text-base font-semibold text-ink-900">Section order that works</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-700">
            <li><strong>Contact</strong> — name, phone, email, LinkedIn, GitHub (CS), Portfolio (design)</li>
            <li><strong>Summary (optional)</strong> — 2 lines maximum, only if it's actually distinctive</li>
            <li><strong>Education</strong> — college, degree, dates, CGPA. Class 12 + 10 percentages.</li>
            <li><strong>Experience / Internships</strong> — most-recent first. Quantified bullets.</li>
            <li><strong>Projects</strong> — link to GitHub / Behance / Medium. 3-5 best ones.</li>
            <li><strong>Skills</strong> — honest only. Don't list "Python" if you can't FizzBuzz.</li>
            <li><strong>Awards + Co-curricular</strong> — only if substantive (olympiad medal, hackathon win)</li>
          </ol>
        </div>

        <div className="mt-3 rounded-lg border border-ink-200 bg-white p-5">
          <h3 className="text-base font-semibold text-ink-900">ATS-friendly formatting</h3>
          <p className="mt-2 text-sm text-ink-700">
            ATS = Applicant Tracking System (Workday, Lever, Greenhouse, Naukri-RMS).
            ATS parsers read text top-to-bottom. To get past:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
            <li>Use a simple single-column layout (no 2-column "design" templates from Canva)</li>
            <li>Use standard section headers (Education, Experience, Skills, Projects)</li>
            <li>Don't use tables, text boxes, or images for content</li>
            <li>Save as PDF (not .docx)</li>
            <li>Use a normal font (Helvetica, Arial, Calibri, Times) at 10-11pt</li>
            <li>Include keywords from the job description verbatim where honest</li>
          </ul>
        </div>

        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/30 p-5">
          <h3 className="text-base font-semibold text-ink-900">Strong bullet vs weak bullet</h3>
          <p className="mt-3 text-xs"><strong>Weak:</strong> "Worked on user authentication system using JWT."</p>
          <p className="mt-1 text-xs"><strong>Strong:</strong> "Built JWT-based auth (Express + Redis) for 12k MAU app — cut session DB load by 80%."</p>
          <p className="mt-3 text-xs text-emerald-800">Pattern: <strong>action verb + technical detail + measurable impact</strong>. Hiring managers skim for impact numbers.</p>
        </div>

        {/* Interview prep */}
        <h2 className="mt-12 text-xl font-bold text-ink-900">Interview prep by track</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Software Engineer",
              prepFor: "DSA (LeetCode 100 medium), system design basics (Karaiyappa video, Designing Data-Intensive Apps), Git/SQL/Linux fundamentals, behavioural (STAR format)",
              resources: "LeetCode + NeetCode 150 + InterviewBit. For system design: ByteByteGo + Alex Xu's books.",
            },
            {
              title: "UPSC / Civil Services",
              prepFor: "GS Mains question bank (Vision IAS test series), current affairs depth, personality-test mocks, optional subject prep, essay practice",
              resources: "Vision IAS / Shankar IAS / Forum IAS materials. PYQ analysis is highest leverage.",
            },
            {
              title: "Banking PO + RBI",
              prepFor: "Quant aptitude, reasoning, English, banking awareness (RBI annual report, monetary policy), economy + current affairs",
              resources: "Practicemock, Adda247, Oliveboard for mocks. RBI annual report PDFs free.",
            },
            {
              title: "MBA — IIM/MDI/SPJIMR",
              prepFor: "CAT mocks, WAT (written ability), GD (group discussion), Personal Interview. Profile fit + answer-why questions matter.",
              resources: "TIME, IMS, Career Launcher for full prep. WAT/GD/PI bank from past-year IIM-WAT-PI books.",
            },
            {
              title: "Design — UX / Product",
              prepFor: "Portfolio review prep, whiteboard challenge prep, behavioural (why this company/role), case study walk-through",
              resources: "Lessons.design (free), Stage Free portfolio templates, dribbble for portfolio benchmarks",
            },
            {
              title: "MBA Consulting (MBB)",
              prepFor: "Case interview practice (50+ cases), market sizing, profitability frameworks, structured problem-solving",
              resources: "Case In Point (Cosentino), RocketBlocks paid, Management Consulted free guide",
            },
          ].map((t) => (
            <div key={t.title} className="rounded-lg border border-ink-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-ink-900">{t.title}</h3>
              <p className="mt-2 text-xs text-ink-700"><strong>What to prep:</strong> {t.prepFor}</p>
              <p className="mt-2 text-xs text-ink-600"><strong>Resources:</strong> {t.resources}</p>
            </div>
          ))}
        </div>

        {/* Salary negotiation */}
        <h2 className="mt-12 text-xl font-bold text-ink-900">Salary negotiation (fresher edition)</h2>

        <div className="mt-4 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">3 things that matter</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs">
            <li>
              <strong>Anchor with data, not feelings.</strong> Use{" "}
              <Link href="/careers" className="text-saffron-700 underline">our careers section</Link> for
              salary bands by role. Also look at AmbitionBox, Levels.fyi (tech), Glassdoor.
              "Industry standard for your role + my tier is ₹X-Y. Where can you place me?"
            </li>
            <li>
              <strong>Negotiate TC, not just base.</strong> Total comp = base +
              variable + stocks/RSUs + sign-on + relocation + benefits. Top
              firms split heavily into variable + stocks.
            </li>
            <li>
              <strong>Get the offer in writing first.</strong> Negotiate after
              you have the offer letter or detailed verbal offer. Negotiating
              before puts you at a disadvantage.
            </li>
          </ol>
        </div>

        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/30 p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-900">Things that hurt freshers in negotiation</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Sharing your "current package" first — anchors negotiation low</li>
            <li>Accepting verbal offers without written confirmation</li>
            <li>Negotiating without a competing offer (use multiple shortlists strategically)</li>
            <li>Asking for "a fair amount" — give specific numbers</li>
            <li>Saying yes immediately — take 24 hours minimum to think + counter</li>
          </ul>
        </div>

        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">Roadmap</p>
          <p className="mt-2">
            Coming next: downloadable resume templates per career (CS, finance, govt-services,
            design, content). AI-customised version that tailors a base template to your background
            using the existing AI tutor infrastructure.
          </p>
        </div>
      </section>
    </main>
  );
}
