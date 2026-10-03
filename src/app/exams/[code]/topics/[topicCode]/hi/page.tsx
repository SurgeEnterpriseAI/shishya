// /exams/:code/topics/:topicCode/hi — Hindi study notes (gap-fill #3).
// "In hindi" is a literal user request and the Hindi-belt is the largest
// cohort; every SEO surface was English-only. This page serves the Hindi
// translation of the topic's teaching notes with proper hreflang pairing
// to the English original, targeting Devanagari searches
// ("एसएससी जीडी गणित नोट्स") we were invisible for.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { ExamSignUpContext } from "@/components/ExamSignUpContext";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { NotesMarkdown } from "@/components/NotesMarkdown";
import { stripInventedCounts } from "@/lib/note-claims";
import { ShareExamButton } from "@/components/ShareExamButton";
import { SignupInline } from "@/components/SignupInline";
import { splitAfterFirstSection } from "@/lib/content-signup";
// 30 Sep 2026 (sign-up build 3 review): the practice rule for the sign-up
// line (src/lib/exam-practice-state.ts), cached; a failed read claims none.
import { examPracticeState } from "@/lib/db/exam-practice";
// 3 Oct 2026 (fix plan C12): the heading count that tells a cut Hindi note.
import { noteHeadingCount } from "@/lib/topic-notes";

export const revalidate = 3600;

async function load(code: string, topicCode: string) {
  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code }),
    select: { id: true, code: true, shortName: true, name: true, active: true },
  });
  if (!exam || !exam.active) return null;
  const topic = await prisma.topic.findFirst({
    where: { code: topicCode, subject: { examId: exam.id } },
    select: {
      code: true,
      name: true,
      subject: { select: { name: true } },
      noteTranslations: { where: { locale: "hi" }, select: { content: true, generatedAt: true } },
      // The English note, only to compare heading counts (C12).
      teachingNote: { select: { content: true } },
    },
  });
  if (!topic || topic.noteTranslations.length === 0) return null;
  return { exam, topic, hi: topic.noteTranslations[0] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; topicCode: string }>;
}): Promise<Metadata> {
  const { code, topicCode } = await params;
  const data = await load(code, topicCode);
  if (!data) return { title: "नोट्स — Shishya" };
  const { exam, topic } = data;
  const enUrl = `https://shishya.in/exams/${exam.code}/topics/${topic.code}`;
  const hiUrl = `${enUrl}/hi`;
  const title = `${topic.name} — ${exam.shortName} हिंदी नोट्स | Shishya`;
  const description = `${exam.shortName} (${exam.name}) के लिए ${topic.name} के मुफ़्त हिंदी स्टडी नोट्स — कॉन्सेप्ट, फ़ॉर्मूले, आम गलतियाँ और प्रैक्टिस। बिना कोचिंग फीस, Shishya पर।`;
  return {
    title,
    description,
    alternates: {
      canonical: hiUrl,
      languages: { "en-IN": enUrl, "hi-IN": hiUrl, "x-default": enUrl },
    },
    openGraph: { title, description, url: hiUrl, siteName: "Shishya", locale: "hi_IN", type: "article" },
  };
}

export default async function HindiTopicPage({
  params,
}: {
  params: Promise<{ code: string; topicCode: string }>;
}) {
  const { code, topicCode } = await params;
  const data = await load(code, topicCode);
  if (!data) notFound();
  const { exam, topic, hi } = data;
  // 30 Sep 2026 (sign-up build 3): the guest sign-up line (in Hindi) after
  // the notes' first section; short notes get it after the notes.
  const hiMd = stripInventedCounts(hi.content);
  const hiParts = splitAfterFirstSection(hiMd);
  // 30 Sep 2026 (sign-up build 3 review): "mocks, scores and weak topics"
  // only where the exam has practice.
  const examHasPractice = (await examPracticeState(exam.code)).hasPractice;
  const enUrl = `https://shishya.in/exams/${exam.code}/topics/${topic.code}`;
  // 3 Oct 2026 (fix plan C12): 234 of 420 stored Hindi notes have fewer
  // headings than their English note — the translator stopped at its old
  // token cap. Such a page says so in one line and links the full English
  // note; the stored text is not changed here.
  const hiIncomplete = noteHeadingCount(hi.content) < noteHeadingCount(topic.teachingNote?.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Article", "LearningResource"],
    headline: `${topic.name} — ${exam.shortName} हिंदी स्टडी नोट्स`,
    inLanguage: "hi-IN",
    isAccessibleForFree: true,
    url: `${enUrl}/hi`,
    about: [{ "@type": "Thing", name: topic.name }, { "@type": "Thing", name: exam.name }],
    datePublished: hi.generatedAt.toISOString(),
    publisher: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      {/* What this page tells the sign-up placements on it (2 Oct 2026): the exam's name and what is true of it. Renders nothing. */}
      <ExamSignUpContext code={exam.code} exam={exam.shortName} />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">{exam.shortName}</Link>
          {" · "}
          <span>{topic.subject.name}</span>
          {" · हिंदी"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{topic.name}</h1>
          <Link
            href={`/exams/${exam.code}/topics/${topic.code}`}
            className="rounded-full border border-ink-300 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400"
          >
            Read in English
          </Link>
        </div>

        <div className="mt-4">
          <ShareExamButton
            url={`${enUrl}/hi`}
            message={`${topic.name} (${exam.shortName}) — मुफ़्त हिंदी नोट्स, फ़ॉर्मूले और प्रैक्टिस Shishya पर:`}
            surface="topic"
            label="अपने ग्रुप में शेयर करें:"
          />
        </div>

        {hiIncomplete && (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-ink-700">
            <Link href={`/exams/${exam.code}/topics/${topic.code}`} className="font-medium underline hover:text-ink-900">
              यह हिंदी नोट अधूरा है — पूरा नोट अंग्रेज़ी में पढ़ें
            </Link>
          </p>
        )}

        <article className="prose prose-sm sm:prose-base mt-8 max-w-none">
          {/* 29 Sep 2026: invented question and mark counts are not shown (src/lib/note-claims.ts). */}
          {hiParts ? (
            <>
              <NotesMarkdown markdown={hiParts[0]} rich demoteH1 />
              {/* 30 Sep 2026 (sign-up build 3): the guest sign-up line, once per page, after the first section — client-only, never on Class 1-7 (src/lib/content-signup.ts). */}
              <SignupInline surface="topic" exam={exam.shortName} practice={examHasPractice} locale="hi" revealOffscreen />
              <NotesMarkdown markdown={hiParts[1]} rich demoteH1 />
            </>
          ) : (
            <NotesMarkdown markdown={hiMd} rich demoteH1 />
          )}
        </article>
        {!hiParts && <SignupInline surface="topic" exam={exam.shortName} practice={examHasPractice} locale="hi" revealOffscreen />}

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">अब खुद को परखें</p>
          <p className="mt-1 text-sm text-ink-600">
            {topic.name} पर {exam.shortName} के लिए अभ्यास के सवाल — तुरंत जवाब, कोई साइनअप नहीं।
          </p>
          <Link
            href={`/exams/${exam.code}/topics/${topic.code}/quiz`}
            className="btn-primary mt-3 inline-block !py-2 !px-5 text-sm"
          >
            5 सवालों की क्विज़ शुरू करें →
          </Link>
        </div>

        <p className="mt-6 text-[11px] text-ink-400">
          यह हिंदी अनुवाद Shishya द्वारा तैयार किया गया है। तकनीकी शब्द जान-बूझकर English में रखे गए
          हैं जैसा परीक्षा में आता है। कोई त्रुटि दिखे तो English नोट्स से मिलान करें।
        </p>
      </section>
    </main>
  );
}
