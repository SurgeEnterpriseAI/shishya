// "Scholarships open at this stage" on a life-stage hub (30 Sep 2026, P1
// build 1, spec §2.2 block 7 — agent B).
//
// The list is the model's: the stage's scholarship levels, open schemes only
// (scholarshipsForStage over OFFERED_SCHEMES — presented, not discontinued),
// national ones (P1 hubs take no state). Each row links the scheme's own
// Shishya page, which says who can apply and links the official portal; no
// amount or date is repeated here. The count is the list's length. The first
// SCHOLARSHIP_PREVIEW_MAX show; the rest sit in the same server HTML inside
// <details> (nothing gated, no JS). Server component.

import Link from "next/link";
import type { PathStageId } from "@/data/paths";
import type { Scholarship } from "@/data/scholarships";
import { fillCopy, pathCopy } from "@/lib/paths/copy";
import { pathViewCopy } from "./view-copy";
import { previewSplit, scholarshipsAllHref } from "./view-helpers";

function Row({ s }: { s: Pick<Scholarship, "id" | "name" | "awardingBody"> }) {
  return (
    <li>
      <Link href={`/scholarships/${s.id}`} prefetch={false} className="block rounded-lg border border-ink-200 bg-white px-3 py-2 hover:border-saffron-400 hover:bg-saffron-50/40">
        <span className="block text-sm font-medium text-ink-900">{s.name}</span>
        <span className="block text-[11px] text-ink-500">{s.awardingBody}</span>
      </Link>
    </li>
  );
}

export function StageScholarships({
  scholarships,
  stageId,
  locale,
  id = "scholarships",
}: {
  scholarships: readonly Pick<Scholarship, "id" | "name" | "awardingBody">[];
  stageId: PathStageId;
  locale?: string | null;
  id?: string;
}) {
  if (scholarships.length === 0) return null;
  const c = pathCopy(locale);
  const v = pathViewCopy(locale);
  const { shown, rest } = previewSplit(scholarships);
  const allHref = scholarshipsAllHref(stageId);
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-10">
      <h2 id={`${id}-heading`} className="text-xl font-semibold text-ink-900">
        {c.blocks.scholarships}
      </h2>
      <p className="mt-1 text-xs text-ink-600">{fillCopy(v.scholarshipsCount, { n: scholarships.length })}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {shown.map((s) => (
          <Row key={s.id} s={s} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer py-2 text-sm font-semibold text-saffron-700 hover:text-saffron-800">
            {fillCopy(v.showMore, { n: rest.length })}
          </summary>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {rest.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </ul>
        </details>
      )}
      <p className="mt-3 text-sm">
        <Link href={allHref} prefetch={false} className="font-semibold text-saffron-700 underline hover:text-saffron-800">
          {stageId === "after-10th" ? v.scholarshipsAllAfter10 : v.scholarshipsAllAfter12} →
        </Link>
      </p>
    </section>
  );
}
