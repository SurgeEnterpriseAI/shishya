// /schooling/streams/{option} — one page per option after Class 10 (30 Sep
// 2026, P1 build 1, spec §2.3 — agent B).
//
// Nine pages (STREAM_OPTION_SLUGS; any other segment is a 404 —
// dynamicParams = false): MPC / PCM, BiPC / PCB, PCMB, Commerce (CEC / MEC),
// Arts / Humanities (HEC), vocational Class 11-12, polytechnic diploma, ITI
// and NIOS Senior Secondary. /schooling/streams stays the parent: its five
// section anchors are kept and each links its full page here (spec §2.4).
// The static segment "streams" outranks /schooling/[slug], and
// src/lib/url-normalize.ts only lower-cases these segments.
//
// Everything printed comes from the pure model in
// src/lib/paths/stream-pages.ts: subjects as each board prints them, from
// CONFIRMED rows only, each with its official source and the day it was read
// (a board whose lists could not be read appears only as "check {board}'s
// official site"); what the option keeps open or closes, each rule with its
// source; exam chips linked only while the exam is live; course families,
// colleges and careers computed from the registry. No textbook text, no
// salary, no ranking word, no typed count.
//
// Index gate (the sitemap uses the same function, src/lib/school/landings.ts):
// isStreamPageIndexable — a Class 11-12 group needs confirmed rows from at
// least STREAM_INDEX_MIN_CONFIRMED boards, the other options one confirmed
// official fact; below it the page renders as noindex,follow (schoolRobots,
// the /schooling rule every page here follows).
//
// Readers are choosing after Class 10 (13+), so the page carries the seeded
// general-tutor entry (src/components/paths/StageTutorEntry.tsx, link built
// in src/lib/paths/stage-tutor.ts — never on a Class 1-7 page). The sign-up
// card is the root layout's, after the page. Hourly ISR (live exam set).

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { StreamOptionView } from "@/components/paths/StreamOptionView";
import { STREAM_OPTION_SLUGS } from "@/data/paths";
import { loadLiveExams } from "@/lib/live-exam-codes";
import { streamSearchTerms } from "@/lib/paths/index-helpers";
import { streamPageJsonLd } from "@/lib/paths/path-jsonld";
import { isStreamPageIndexable, streamPageModel } from "@/lib/paths/stream-pages";
import { schoolRobots } from "@/lib/schooling-data";

export const revalidate = 3600;
export const dynamicParams = false;

interface PageParams {
  option: string;
}

export function generateStaticParams() {
  return STREAM_OPTION_SLUGS.map((option) => ({ option }));
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { option } = await params;
  // Title, description and canonical do not depend on the live exam set.
  const m = streamPageModel(option, new Set<string>());
  if (!m) notFound();
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: m.canonical, types: { "text/markdown": `${m.canonical}/context.md` } },
    robots: schoolRobots(isStreamPageIndexable(m.slug)),
    keywords: streamSearchTerms(m.option).filter((t) => /^[\x20-\x7e]+$/.test(t)),
    openGraph: { title: m.h1, description: m.description, url: m.canonical, siteName: "Shishya", locale: "en_IN", type: "article" },
  };
}

export default async function StreamOptionPage({ params }: { params: Promise<PageParams> }) {
  const { option } = await params;
  const live = await loadLiveExams();
  const model = streamPageModel(option, live);
  if (!model) notFound();
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd data={streamPageJsonLd(model)} />
      <Header />
      <StreamOptionView model={model} />
    </main>
  );
}
