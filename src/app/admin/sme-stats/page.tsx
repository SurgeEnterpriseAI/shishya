// /admin/sme-stats — SME validation acceptance rate per topic and per source.
//
// Shows the founder + SMEs how AI-generated questions are landing once humans
// review them. The key metric is **acceptance rate** for AI_GENERATED →
// AI_VALIDATED — that's the proof that option (b) (AI-first content with SME
// validation) is working.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";

export default async function SmeStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ examCode?: string }>;
}) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");
  const sp = await searchParams;
  const examFilter = sp.examCode ?? "";

  // Group questions by exam → topic → source × validation status
  const where = examFilter ? { exam: { code: examFilter } } : {};

  const [perSource, exams, perTopicRaw] = await Promise.all([
    // Aggregate: counts per source × validation state
    prisma.question.groupBy({
      by: ["source", "validated"],
      where,
      _count: { _all: true },
    }),
    prisma.exam.findMany({
      select: { code: true, shortName: true },
      orderBy: { code: "asc" },
    }),
    prisma.question.groupBy({
      by: ["topicId", "source", "validated"],
      where,
      _count: { _all: true },
    }),
  ]);

  // Need topic names + per-rejection counts (tag-based) — fetch once.
  const topicIds = [...new Set(perTopicRaw.map((r) => r.topicId))];
  const [topics, rejectedRows] = await Promise.all([
    prisma.topic.findMany({
      where: { id: { in: topicIds } },
      include: { subject: { include: { exam: { select: { code: true, shortName: true } } } } },
    }),
    prisma.question.findMany({
      where: { ...where, tags: { has: "rejected" } },
      select: { topicId: true },
    }),
  ]);
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const rejectedByTopic = new Map<string, number>();
  for (const r of rejectedRows) {
    rejectedByTopic.set(r.topicId, (rejectedByTopic.get(r.topicId) ?? 0) + 1);
  }

  // Roll up per-topic rows into validated/pending/rejected for each source
  type Roll = {
    topicId: string;
    topicName: string;
    examShort: string;
    examCode: string;
    aiValidated: number;
    aiPending: number;
    rejected: number;
    smeAuthored: number;
    pyq: number;
    total: number;
  };
  const rollMap = new Map<string, Roll>();
  for (const r of perTopicRaw) {
    const t = topicById.get(r.topicId);
    if (!t) continue;
    const key = r.topicId;
    const roll = rollMap.get(key) ?? {
      topicId: r.topicId,
      topicName: t.name,
      examShort: t.subject.exam.shortName,
      examCode: t.subject.exam.code,
      aiValidated: 0,
      aiPending: 0,
      rejected: 0,
      smeAuthored: 0,
      pyq: 0,
      total: 0,
    };
    roll.total += r._count._all;
    if (r.source === "AI_VALIDATED") roll.aiValidated += r._count._all;
    if (r.source === "AI_GENERATED" && r.validated === false) roll.aiPending += r._count._all;
    if (r.source === "AI_GENERATED" && r.validated === true) roll.aiValidated += r._count._all;
    if (r.source === "SME") roll.smeAuthored += r._count._all;
    if (r.source === "PYQ") roll.pyq += r._count._all;
    rollMap.set(key, roll);
  }
  for (const roll of rollMap.values()) {
    roll.rejected = rejectedByTopic.get(roll.topicId) ?? 0;
  }
  const rolls = [...rollMap.values()].sort((a, b) => {
    if (a.examShort !== b.examShort) return a.examShort.localeCompare(b.examShort);
    return b.total - a.total;
  });

  // Aggregate from perSource: across the (filtered) exam set
  let aiValidatedTotal = 0;
  let aiGeneratedTotal = 0; // AI_GENERATED — both validated and not
  let aiPendingTotal = 0;
  for (const r of perSource) {
    if (r.source === "AI_VALIDATED") aiValidatedTotal += r._count._all;
    if (r.source === "AI_GENERATED") {
      aiGeneratedTotal += r._count._all;
      if (!r.validated) aiPendingTotal += r._count._all;
    }
  }
  const aiReviewedTotal = aiValidatedTotal + (aiGeneratedTotal - aiPendingTotal);
  // Acceptance rate: of AI questions reviewed (validated + rejected), what fraction were validated?
  const reviewedAi = aiReviewedTotal; // validated count already included in aiValidatedTotal
  // For acceptance rate, count rejected AI questions as denominator too
  const rejectedAi = rolls.reduce((s, r) => s + r.rejected, 0);
  const acceptanceDenominator = aiValidatedTotal + rejectedAi;
  const acceptanceRate = acceptanceDenominator === 0 ? 0 : (aiValidatedTotal / acceptanceDenominator) * 100;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">Admin</Link> · SME stats
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">AI question pipeline</h1>
        <p className="mt-1 text-sm text-ink-600">
          Acceptance rate of AI-generated questions after SME review. The number we want trending up.
        </p>

        {/* Filter */}
        <form className="mt-5 flex gap-2" method="get">
          <select
            name="examCode"
            defaultValue={examFilter}
            className="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-sm"
            onChange={(e) => e.currentTarget.form?.submit()}
          >
            <option value="">All exams</option>
            {exams.map((e) => (
              <option key={e.code} value={e.code}>{e.shortName}</option>
            ))}
          </select>
        </form>

        {/* Top-line stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="AI generated (all-time)" value={aiGeneratedTotal + aiValidatedTotal} />
          <Stat label="Pending SME review" value={aiPendingTotal} accent="warn" />
          <Stat label="AI-validated" value={aiValidatedTotal} accent="ok" />
          <Stat
            label="Acceptance rate"
            value={`${acceptanceRate.toFixed(1)}%`}
            valueIsString
            accent={acceptanceRate >= 70 ? "ok" : acceptanceRate >= 40 ? "warn" : "bad"}
            sublabel={`${aiValidatedTotal} accepted · ${rejectedAi} rejected`}
          />
        </div>

        <p className="mt-3 text-xs text-ink-500">
          Acceptance rate counts only AI questions that have been reviewed (validated or rejected). Pending questions are excluded.
        </p>

        {/* Per-topic breakdown */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">Per-topic breakdown</h2>
          {rolls.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              No AI-generated questions yet. Run{" "}
              <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run generate:questions -- --exam SSC_CGL --topic quant.percentage --count 20</code>
              {" "}to start.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-md border border-ink-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Topic</th>
                    <th className="px-3 py-2 text-right font-medium">AI validated</th>
                    <th className="px-3 py-2 text-right font-medium">Pending</th>
                    <th className="px-3 py-2 text-right font-medium">Rejected</th>
                    <th className="px-3 py-2 text-right font-medium">SME</th>
                    <th className="px-3 py-2 text-right font-medium">Acceptance</th>
                    <th className="px-3 py-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {rolls.map((r) => {
                    const denom = r.aiValidated + r.rejected;
                    const acc = denom === 0 ? null : (r.aiValidated / denom) * 100;
                    return (
                      <tr key={r.topicId} className="hover:bg-ink-50/50">
                        <td className="px-4 py-2">
                          <p className="font-medium text-ink-900">{r.topicName}</p>
                          <p className="text-xs text-ink-500">{r.examShort}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.aiValidated}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.aiPending > 0 ? (
                            <Link
                              href={`/admin/questions?examCode=${r.examCode}&validated=false&source=AI_GENERATED`}
                              className="text-amber-700 hover:underline"
                            >
                              {r.aiPending} →
                            </Link>
                          ) : (
                            <span className="text-ink-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                          {r.rejected || <span className="text-ink-400">0</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.smeAuthored || <span className="text-ink-400">0</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {acc == null ? (
                            <span className="text-xs text-ink-400">—</span>
                          ) : (
                            <span
                              className={
                                acc >= 70
                                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                  : acc >= 40
                                  ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                                  : "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
                              }
                            >
                              {acc.toFixed(0)}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={`/admin/questions?examCode=${r.examCode}`}
                            className="text-xs text-saffron-700 hover:underline"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* How to read this */}
        <aside className="mt-10 rounded-md border border-ink-200 bg-saffron-50/30 p-4">
          <h3 className="text-sm font-semibold text-ink-800">How to read this page</h3>
          <ul className="mt-2 space-y-1 text-xs text-ink-600">
            <li>• <strong>AI validated</strong> = SME reviewed and approved. These are live for students.</li>
            <li>• <strong>Pending</strong> = AI-generated, awaiting SME review. Click to start reviewing.</li>
            <li>• <strong>Rejected</strong> = AI-generated, SME marked as not usable. Counts against acceptance rate.</li>
            <li>• <strong>Acceptance rate</strong> = AI validated ÷ (AI validated + rejected). Target: ≥70% for the pipeline to be considered viable.</li>
            <li>• Below 40% acceptance: tighten the prompts in <code>scripts/generate-questions.ts</code> or the few-shot examples.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  sublabel,
  accent,
  valueIsString,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  accent?: "ok" | "warn" | "bad";
  valueIsString?: boolean;
}) {
  const tone =
    accent === "ok"
      ? "border-emerald-200 bg-emerald-50"
      : accent === "warn"
      ? "border-amber-200 bg-amber-50"
      : accent === "bad"
      ? "border-rose-200 bg-rose-50"
      : "border-ink-200 bg-white";
  return (
    <div className={`rounded-md border p-4 ${tone}`}>
      <p className="text-2xl font-bold text-ink-900">
        {valueIsString ? value : (value as number).toLocaleString("en-IN")}
      </p>
      <p className="mt-0.5 text-xs text-ink-600">{label}</p>
      {sublabel && <p className="mt-1 text-[11px] text-ink-500">{sublabel}</p>}
    </div>
  );
}
