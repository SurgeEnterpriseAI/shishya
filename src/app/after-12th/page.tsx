// /after-12th — "What can I do after Class 12?" (30 Sep 2026, P1 build 1,
// spec §2.2 — agent B).
//
// The life-stage hub after Class 12: the course families (engineering,
// medicine, law, design, commerce, university degrees, defence, architecture
// …, from the path registry) side by side — what each is, how long it takes
// where an official page states it, the Class 11-12 options a sourced rule
// keeps it open from, where it leads and its entrance exams (linked only
// while live) — then government jobs and exams after Class 12
// (/exams/after/12th), open and distance learning and study abroad. The
// model is src/lib/paths/stage-pages.ts afterTwelfthModel: every count is a
// list's length, every rule is confirmed on an official page with its source
// and read day, the scholarships are the open undergraduate schemes, and the
// "exams after Class 12" count comes from levelCounts (none printed when the
// rows cannot be read).
//
// Indexable while at least STAGE_HUB_MIN_LIVE_OPTIONS options open a page;
// otherwise noindex,follow. English only in P1 (no twin, spec F7). Tutor
// entry = a seeded general-tutor link. No salary, no ranking word, nothing
// gated. Hourly ISR.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { StageHubView } from "@/components/paths/StageHubView";
import { loadStageHubInputs } from "@/components/paths/stage-hub-data";
import { PATH_SEARCH_TERMS } from "@/lib/paths/copy";
import { stageHubFaq, stageHubJsonLd } from "@/lib/paths/path-jsonld";
import { afterTwelfthModel } from "@/lib/paths/stage-pages";

export const revalidate = 3600;

// Title, description, canonical and the index gate do not depend on the
// live exam set (the option rows' pages are fixed), so no read here.
const META_MODEL = afterTwelfthModel(new Set<string>());

export const metadata: Metadata = {
  title: META_MODEL.title,
  description: META_MODEL.description,
  alternates: { canonical: META_MODEL.canonical, types: { "text/markdown": `${META_MODEL.canonical}/context.md` } },
  robots: META_MODEL.indexable ? undefined : { index: false, follow: true },
  keywords: [...PATH_SEARCH_TERMS.en.after12],
  openGraph: { title: META_MODEL.h1, description: META_MODEL.description, url: META_MODEL.canonical, siteName: "Shishya", locale: "en_IN", type: "website" },
};

export default async function AfterTwelfthPage() {
  const { live, examsAfterTotal } = await loadStageHubInputs("12th");
  const model = afterTwelfthModel(live, { examsAfterTotal });
  const faq = stageHubFaq(model);
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd data={stageHubJsonLd(model, faq)} />
      <Header />
      <StageHubView model={model} faq={faq} />
    </main>
  );
}
