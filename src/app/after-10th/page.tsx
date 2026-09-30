// /after-10th — "What can I do after Class 10?" (30 Sep 2026, P1 build 1,
// spec §2.2 — agent B).
//
// The life-stage hub for a student who has just finished (or is about to
// finish) Class 10: the nine options side by side — the Class 11-12 groups
// (MPC / PCM, BiPC / PCB, PCMB, Commerce, Arts), vocational Class 11-12, the
// polytechnic diploma, ITI and NIOS — each linking its own
// /schooling/streams/{option} page. Every block is computed from the path
// registry (src/data/paths) through the pure model in
// src/lib/paths/stage-pages.ts: the option count in the lead is the list's
// length, a rule prints only when confirmed on an official page (with its
// source and the day it was read), an exam chip links only a live exam, the
// scholarships are the open schemes for Class 11-12 and diplomas, and the
// "exams after Class 10" count comes from levelCounts (none printed when the
// rows cannot be read).
//
// Indexable while at least STAGE_HUB_MIN_LIVE_OPTIONS options open a page
// (isStageHubIndexable); otherwise noindex,follow. English only in P1: no
// /hi or /te twin (a twin URL 307s here, spec F7). The tutor entry is a
// seeded general-tutor link (13+: this stage never includes Class 1-7
// readers). No salary, no ranking word, nothing gated. Hourly ISR: the live
// exam set and the scholarship list move.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { StageHubView } from "@/components/paths/StageHubView";
import { loadStageHubInputs } from "@/components/paths/stage-hub-data";
import { PATH_SEARCH_TERMS } from "@/lib/paths/copy";
import { stageHubFaq, stageHubJsonLd } from "@/lib/paths/path-jsonld";
import { afterTenthModel } from "@/lib/paths/stage-pages";

export const revalidate = 3600;

// Title, description, canonical and the index gate do not depend on the
// live exam set (every option row opens its stream page), so no read here.
const META_MODEL = afterTenthModel(new Set<string>());

export const metadata: Metadata = {
  title: META_MODEL.title,
  description: META_MODEL.description,
  alternates: { canonical: META_MODEL.canonical, types: { "text/markdown": `${META_MODEL.canonical}/context.md` } },
  robots: META_MODEL.indexable ? undefined : { index: false, follow: true },
  keywords: [...PATH_SEARCH_TERMS.en.after10],
  openGraph: { title: META_MODEL.h1, description: META_MODEL.description, url: META_MODEL.canonical, siteName: "Shishya", locale: "en_IN", type: "website" },
};

export default async function AfterTenthPage() {
  const { live, examsAfterTotal } = await loadStageHubInputs("10th");
  const model = afterTenthModel(live, { examsAfterTotal });
  const faq = stageHubFaq(model);
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd data={stageHubJsonLd(model, faq)} />
      <Header />
      <StageHubView model={model} faq={faq} />
    </main>
  );
}
