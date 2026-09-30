// The body of /after-10th and /after-12th (30 Sep 2026, P1 build 1, spec
// §2.2 — agent B). The route files load the live-exam map and the level
// totals, build the model (src/lib/paths/stage-pages.ts) and render this;
// everything printed is in the model, so tests/unit/paths-views.test.ts
// renders it with a fixture and no DB.
//
// Body order (spec §2.2): 1 lead with the computed option count · 2 options
// side by side · 3 rules to know (confirmed only, each with its source and
// read day) · 4 next links · 5 tutor entry · 6 save slot (build 2) ·
// 7 scholarships open at this stage (computed) · 8 exams after Class 10 / 12
// (count from levelCounts, shown only when read) · the one question and
// answer the FAQPage JSON-LD carries (src/lib/paths/path-jsonld.ts
// stageHubFaq — printed here, so the structured data never describes hidden
// text) · 9 sources and last checked.
// Sign-in is the root layout's guest card after the page (never a wall).

import Link from "next/link";
import { fillCopy, pathCopy } from "@/lib/paths/copy";
import type { StageHubModel } from "@/lib/paths/stage-pages";
import { PathBreadcrumb } from "./PathBreadcrumb";
import { PathFactList } from "./PathFactList";
import { PathNextLinks } from "./PathNextLinks";
import { PathSources } from "./PathSources";
import { StageOptionsTable } from "./StageOptionsTable";
import { StageSaveSlot } from "./StageSaveSlot";
import { StageScholarships } from "./StageScholarships";
import { StageTutorEntry } from "./StageTutorEntry";
import { pathViewCopy } from "./view-copy";
import { breadcrumbTrail } from "./view-helpers";

export function StageHubView({
  model,
  faq,
  locale,
}: {
  model: StageHubModel;
  /** The Q&A the page's FAQPage JSON-LD carries; printed visibly when given. */
  faq?: { q: string; a: string } | null;
  locale?: string | null;
}) {
  const c = pathCopy(locale);
  const v = pathViewCopy(locale);
  const total = model.examsAfter.total;
  return (
    <section className="container-prose py-10" data-stage-hub={model.stage.id}>
      <PathBreadcrumb trail={breadcrumbTrail(model.breadcrumb, v.home)} label={v.breadcrumbLabel} />
      <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">{model.h1}</h1>
      <p className="mt-3 max-w-3xl text-base text-ink-700">{model.lead}</p>

      <StageOptionsTable rows={model.options} note={model.stage.id === "after-10th" ? v.optionsNoteAfter10 : v.optionsNoteAfter12} locale={locale} />

      <PathFactList facts={model.facts} locale={locale} />

      <PathNextLinks heading={c.blocks.next} groups={[{ links: model.next, variant: "cards" }]} />

      <StageTutorEntry stage={model.stage} href={model.tutorHref} locale={locale} />
      <StageSaveSlot />

      <StageScholarships scholarships={model.scholarships} stageId={model.stage.id} locale={locale} />

      <section id="exams-after" aria-label={model.examsAfter.label} className="mt-10">
        <Link
          href={model.examsAfter.href}
          prefetch={false}
          className="block rounded-lg border border-saffron-300 bg-saffron-50/40 p-4 hover:border-saffron-500 hover:bg-saffron-50"
        >
          <span className="block text-base font-semibold text-ink-900">{model.examsAfter.label} →</span>
          {total !== null && total > 0 && <span className="mt-0.5 block text-xs text-ink-600">{fillCopy(v.examsListed, { n: total })}</span>}
        </Link>
      </section>

      {faq && (
        <section id="in-short" aria-labelledby="in-short-heading" className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
          <h2 id="in-short-heading" className="text-base font-semibold text-ink-900">
            {faq.q}
          </h2>
          <p className="mt-2 text-sm text-ink-700">{faq.a}</p>
        </section>
      )}

      <PathSources sources={model.sources} locale={locale} />
    </section>
  );
}
