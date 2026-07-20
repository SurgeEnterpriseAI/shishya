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
import { prisma } from "@/lib/db/prisma";
import { NotesMarkdown } from "@/components/NotesMarkdown";
import { ShareExamButton } from "@/components/ShareExamButton";

export const revalidate = 3600;

async function load(code: string, topicCode: string) {
  const exam = await prisma.exam.findUnique({
    where: { code },
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
  const enUrl = `https://shishya.in/exams/${exam.code}/topics/${topic.code}`;

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

        <article className="prose prose-sm sm:prose-base mt-8 max-w-none">
          <NotesMarkdown markdown={hi.content} />
        </article>

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">अब खुद को परखें</p>
          <p className="mt-1 text-sm text-ink-600">
            {topic.name} पर 5 असली {exam.shortName} सवाल — तुरंत जवाब, कोई साइनअप नहीं, ~3 मिनट।
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
