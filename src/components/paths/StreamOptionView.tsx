// The body of /schooling/streams/{option} (30 Sep 2026, P1 build 1, spec
// §2.3 — agent B). The route file loads the live-exam map and renders this
// with the model from src/lib/paths/stream-pages.ts; everything printed here
// is in that model, so tests/unit/paths-views.test.ts renders it with a
// fixture and no DB.
//
// Order: breadcrumb · H1 (both vocabularies) · lead (what it is, how long —
// a confirmed duration with its source —, who it suits) · subjects board by
// board (confirmed rows only; unread boards only as "check the official
// site") · what it keeps open / closes (each rule with its source) · exams
// (linked only while live) · rules to know (confirmed facts with sources) ·
// where it can lead (course families → colleges → careers, computed) · tutor
// entry (a seeded general-tutor link; after-10th readers, never Class 1-7) ·
// save slot (build 2) · the other options · sources and last checked.
// No salary, no ranking word, no typed count.

import Link from "next/link";
import { STREAM_OPTIONS, findStage } from "@/data/paths";
import { pathCopy } from "@/lib/paths/copy";
import { streamPagePath, streamShortLabel } from "@/lib/paths/index-helpers";
import type { StreamEdgeLine, StreamPageModel } from "@/lib/paths/stream-pages";
import { BoardStreamTable } from "./BoardStreamTable";
import { ExamChipList } from "./ExamChipList";
import { PathBreadcrumb } from "./PathBreadcrumb";
import { PathFactList } from "./PathFactList";
import { PathNextLinks } from "./PathNextLinks";
import { PathSources } from "./PathSources";
import { StageSaveSlot } from "./StageSaveSlot";
import { StageTutorEntry } from "./StageTutorEntry";
import { pathViewCopy } from "./view-copy";
import { breadcrumbTrail, factCellText, readOnText } from "./view-helpers";

function EdgeLines({ lines, locale }: { lines: readonly StreamEdgeLine[]; locale?: string | null }) {
  const v = pathViewCopy(locale);
  return (
    <ul className="mt-2 space-y-3">
      {lines.map((l) => (
        <li key={`${l.kind}|${l.to}`} className="text-sm text-ink-800">
          {l.href ? (
            <Link href={l.href} prefetch={false} className="font-semibold text-ink-900 underline decoration-saffron-300 underline-offset-2 hover:text-saffron-700">
              {l.label}
            </Link>
          ) : (
            <span className="font-semibold text-ink-900">{l.label}</span>
          )}
          {/* 1 Oct 2026: the exam whose rule this family line quotes, as its
              chip — the exam's own line, which said the same, is folded in. */}
          {l.exams.length > 0 && (
            <div className="mt-1" data-line-exams="">
              <ExamChipList chips={l.exams} locale={locale} compact />
            </div>
          )}
          {l.note && <span className="block text-xs text-ink-700">{l.note}</span>}
          {l.source && (
            <span className="block break-words text-[11px] text-ink-500">
              <a href={l.source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-700">
                {v.source}: {l.source.publisher}
              </a>
              , {readOnText(l.source, locale)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function StreamOptionView({ model, locale }: { model: StreamPageModel; locale?: string | null }) {
  const c = pathCopy(locale);
  const v = pathViewCopy(locale);
  const stage = findStage("after-10th");
  const duration = factCellText(model.lead.duration, locale);
  const durationSource = model.lead.duration?.status === "confirmed" ? model.lead.duration.source : null;
  const others = STREAM_OPTIONS.filter((o) => o.slug !== model.slug).map((o) => ({ href: streamPagePath(o.slug), label: streamShortLabel(o.slug, locale) }));

  return (
    <section className="container-prose py-10" data-stream-option={model.slug}>
      <PathBreadcrumb trail={breadcrumbTrail(model.breadcrumb, v.home)} label={v.breadcrumbLabel} />
      <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">{model.h1}</h1>
      <p className="mt-3 max-w-3xl text-base text-ink-700">{model.lead.whatItIs}</p>

      <dl className="mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
        {duration && (
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{c.table.duration}</dt>
            <dd className="mt-1 text-sm text-ink-800">
              {duration}
              {durationSource && (
                <span className="mt-1 block break-words text-[11px] text-ink-500">
                  <a href={durationSource.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-700">
                    {v.source}: {durationSource.publisher}
                  </a>
                  , {readOnText(durationSource, locale)}
                </span>
              )}
            </dd>
          </div>
        )}
        <div className="rounded-lg border border-ink-200 bg-white p-4">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{c.table.suits}</dt>
          <dd className="mt-1 text-sm text-ink-800">{model.lead.suits}</dd>
        </div>
      </dl>

      <BoardStreamTable table={model.boardTable} locale={locale} />

      {(model.keepsOpen.length > 0 || model.closes.length > 0) && (
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {model.keepsOpen.length > 0 && (
            <section id="keeps-open" aria-labelledby="keeps-open-heading" className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
              <h2 id="keeps-open-heading" className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                {c.blocks.keepsOpen}
              </h2>
              <EdgeLines lines={model.keepsOpen} locale={locale} />
            </section>
          )}
          {model.closes.length > 0 && (
            <section id="closes" aria-labelledby="closes-heading" className="rounded-lg border border-rose-200 bg-rose-50/30 p-4">
              <h2 id="closes-heading" className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
                {c.blocks.closes}
              </h2>
              <EdgeLines lines={model.closes} locale={locale} />
            </section>
          )}
        </div>
      )}

      {model.exams.length > 0 && (
        <section id="exams" aria-labelledby="exams-heading" className="mt-10">
          <h2 id="exams-heading" className="text-xl font-semibold text-ink-900">
            {c.blocks.exams}
          </h2>
          <div className="mt-3">
            <ExamChipList chips={model.exams} locale={locale} />
          </div>
        </section>
      )}

      <PathFactList facts={model.facts} locale={locale} />

      <PathNextLinks
        heading={c.blocks.next}
        groups={[
          { heading: c.blocks.families, links: model.next.families.map((f) => ({ href: f.href, label: f.name })), variant: "cards" },
          { heading: c.blocks.collegeStreams, links: model.next.collegeStreams, variant: "cards" },
          { heading: c.blocks.careers, links: model.next.careers, variant: "chips" },
          { heading: v.alsoOnShishya, links: model.existingPages, variant: "cards" },
        ]}
      />

      <StageTutorEntry stage={stage} href={model.tutorHref} locale={locale} />
      <StageSaveSlot />

      <nav aria-labelledby="other-options-heading" className="mt-10">
        <h2 id="other-options-heading" className="text-base font-semibold text-ink-900">
          {v.otherOptions}
        </h2>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {others.map((o) => (
            <li key={o.href}>
              <Link href={o.href} prefetch={false} className="inline-block rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-800 hover:border-saffron-400">
                {o.label}
              </Link>
            </li>
          ))}
        </ul>
        {stage && (
          <p className="mt-3 text-sm">
            <Link href={stage.hubPath} prefetch={false} className="font-semibold text-saffron-700 underline hover:text-saffron-800">
              {v.allOptionsAfter10} →
            </Link>
          </p>
        )}
      </nav>

      <PathSources sources={model.sources} locale={locale} />
    </section>
  );
}
