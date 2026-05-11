// /admin/insights — operator-facing Shishya monitoring dashboard.
//
// Audience: the admin Google account (anyone whose email is listed in
// ADMIN_EMAILS env var). Not for students. Surfaces every actionable
// signal the operator needs to grow + run Shishya: growth, engagement,
// funnel, top exams, content health, AI cost, recent activity feed.
//
// Server Component — every query runs in parallel via Promise.all so the
// page renders in one round-trip. No chart library; bars are styled divs.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { formatDisplayScorePct } from "@/lib/scoring";

export const dynamic = "force-dynamic";

// Rough per-chat-message Anthropic cost estimate. Sonnet 4.5 input is
// ~$3/M tokens, output ~$15/M. Avg tutor turn = ~6k input (mostly cached
// syllabus + persona) + ~700 output. Anchor each ASSISTANT message at
// ~$0.025 and each USER message at ~$0 (just the round-trip echo).
const COST_PER_ASSISTANT_MSG = 0.025;

export default async function AdminInsightsPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const since = (days: number) => new Date(now.getTime() - days * dayMs);
  const day1 = since(1);
  const day7 = since(7);
  const day30 = since(30);
  const day90 = since(90);
  const startOfDayUtc = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const today = startOfDayUtc(now);

  const [
    // ─── Hero strip (today) ───────────────────────────────────────────
    signupsToday,
    activeUsersToday,        // distinct attempt.userId today
    mocksSubmittedToday,
    chatMsgsToday,

    // ─── Growth (cumulative + windowed) ───────────────────────────────
    totalUsers,
    usersLast7d,
    usersLast30d,
    signupTimeline,          // 30 daily buckets (day, count)

    // ─── Engagement ───────────────────────────────────────────────────
    attempts7d,
    attempts30d,
    chatMsgs7d,
    chatMsgs30d,
    dauArr,                  // distinct active userIds today
    wauArr,                  // distinct active userIds last 7d
    mauArr,                  // distinct active userIds last 30d
    attemptTimeline,         // last 30 days

    // ─── Funnel (lifetime) ────────────────────────────────────────────
    usersWithEnrollment,
    usersWithMockSubmit,
    usersWithTwoMocks,
    usersWithChat,

    // ─── Top exams (by enrollment + activity) ─────────────────────────
    topExamsByEnrollment,
    topExamsByAttempts,
    topExamsByChat,

    // ─── Content health ───────────────────────────────────────────────
    totalExams,
    activeExams,
    totalQuestions,
    validatedQuestions,
    pendingAiQuestions,
    totalSystemMocks,
    topicsTotal,
    topicsWithNotes,

    // ─── AI usage ─────────────────────────────────────────────────────
    assistantMsgsToday,
    assistantMsgs7d,
    assistantMsgs30d,
    topAskedTopicsRaw,

    // ─── Recent feeds ─────────────────────────────────────────────────
    recentMocks,
    recentSignups,
    recentChats,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: day1 } } }),
    prisma.attempt
      .groupBy({ by: ["userId"], where: { startedAt: { gte: day1 } } })
      .then((rows) => rows.length),
    prisma.attempt.count({
      where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: day1 } },
    }),
    prisma.chatMessage.count({ where: { createdAt: { gte: day1 } } }),

    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: day7 } } }),
    prisma.user.count({ where: { createdAt: { gte: day30 } } }),
    prisma.$queryRawUnsafe<Array<{ day: Date; count: bigint }>>(
      `SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
         FROM "User"
        WHERE "createdAt" >= $1
        GROUP BY 1
        ORDER BY 1 ASC`,
      day30
    ),

    prisma.attempt.count({
      where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: day7 } },
    }),
    prisma.attempt.count({
      where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: day30 } },
    }),
    prisma.chatMessage.count({ where: { createdAt: { gte: day7 } } }),
    prisma.chatMessage.count({ where: { createdAt: { gte: day30 } } }),
    prisma.attempt
      .groupBy({ by: ["userId"], where: { startedAt: { gte: day1 } } })
      .then((rows) => rows.length),
    prisma.attempt
      .groupBy({ by: ["userId"], where: { startedAt: { gte: day7 } } })
      .then((rows) => rows.length),
    prisma.attempt
      .groupBy({ by: ["userId"], where: { startedAt: { gte: day30 } } })
      .then((rows) => rows.length),
    prisma.$queryRawUnsafe<Array<{ day: Date; count: bigint }>>(
      `SELECT date_trunc('day', "finishedAt") AS day, COUNT(*)::bigint AS count
         FROM "Attempt"
        WHERE "finishedAt" >= $1 AND "status" IN ('SUBMITTED','AUTO_SUBMITTED')
        GROUP BY 1
        ORDER BY 1 ASC`,
      day30
    ),

    prisma.enrollment.groupBy({ by: ["userId"] }).then((r) => r.length),
    prisma.attempt
      .groupBy({
        by: ["userId"],
        where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
      })
      .then((r) => r.length),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM (
         SELECT "userId" FROM "Attempt"
          WHERE "status" IN ('SUBMITTED','AUTO_SUBMITTED')
          GROUP BY "userId"
         HAVING COUNT(*) >= 2
       ) t`
    ).then((r) => Number(r[0]?.count ?? 0)),
    prisma.chatSession.groupBy({ by: ["userId"] }).then((r) => r.length),

    prisma.enrollment
      .groupBy({ by: ["examId"], _count: { userId: true } })
      .then(async (rows) => {
        const examIds = rows.map((r) => r.examId);
        const exams = await prisma.exam.findMany({
          where: { id: { in: examIds } },
          select: { id: true, code: true, shortName: true },
        });
        const byId = new Map(exams.map((e) => [e.id, e]));
        return rows
          .map((r) => ({ ...byId.get(r.examId), count: r._count.userId }))
          .filter((r) => !!r.code)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }),
    prisma.$queryRawUnsafe<Array<{ examId: string; count: bigint }>>(
      `SELECT m."examId" AS "examId", COUNT(*)::bigint AS count
         FROM "Attempt" a
         JOIN "Mock" m ON m.id = a."mockId"
        WHERE a."status" IN ('SUBMITTED','AUTO_SUBMITTED')
        GROUP BY m."examId"
        ORDER BY count DESC
        LIMIT 10`
    ).then(async (rows) => {
      const exams = await prisma.exam.findMany({
        where: { id: { in: rows.map((r) => r.examId) } },
        select: { id: true, code: true, shortName: true },
      });
      const byId = new Map(exams.map((e) => [e.id, e]));
      return rows.map((r) => ({ ...byId.get(r.examId)!, count: Number(r.count) }));
    }),
    prisma.chatSession
      .groupBy({ by: ["examId"], _count: { id: true } })
      .then(async (rows) => {
        const examIds = rows
          .map((r) => r.examId)
          .filter((id): id is string => typeof id === "string");
        const exams = await prisma.exam.findMany({
          where: { id: { in: examIds } },
          select: { id: true, code: true, shortName: true },
        });
        const byId = new Map(exams.map((e) => [e.id, e]));
        return rows
          .filter((r): r is typeof r & { examId: string } => typeof r.examId === "string")
          .map((r) => ({ ...byId.get(r.examId), count: r._count.id }))
          .filter((r) => !!r.code)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }),

    prisma.exam.count(),
    prisma.exam.count({ where: { active: true } }),
    prisma.question.count(),
    prisma.question.count({ where: { validated: true } }),
    prisma.question.count({ where: { source: "AI_GENERATED", validated: false } }),
    prisma.mock.count({ where: { userId: null } }),
    prisma.topic.count(),
    prisma.topic.count({ where: { notes: { not: null } } }),

    prisma.chatMessage.count({ where: { role: "ASSISTANT", createdAt: { gte: day1 } } }),
    prisma.chatMessage.count({ where: { role: "ASSISTANT", createdAt: { gte: day7 } } }),
    prisma.chatMessage.count({ where: { role: "ASSISTANT", createdAt: { gte: day30 } } }),
    prisma.chatMessage.findMany({
      where: { role: "ASSISTANT", createdAt: { gte: day30 } },
      select: { metadata: true },
      take: 2000,
    }),

    prisma.attempt.findMany({
      where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
      orderBy: { finishedAt: "desc" },
      take: 20,
      include: {
        user: { select: { email: true, name: true } },
        mock: {
          select: { title: true, exam: { select: { shortName: true, code: true } } },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { email: true, name: true, createdAt: true },
    }),
    prisma.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        user: { select: { email: true } },
        exam: { select: { shortName: true, code: true } },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  // ── Derive top topics asked from tool-use metadata ──────────────────
  const topicCounts = new Map<string, number>();
  for (const m of topAskedTopicsRaw) {
    const md = m.metadata as { toolCalls?: Array<{ args?: { topic_code?: string } }> } | null;
    for (const c of md?.toolCalls ?? []) {
      const code = c?.args?.topic_code;
      if (typeof code === "string") {
        topicCounts.set(code, (topicCounts.get(code) ?? 0) + 1);
      }
    }
  }
  const topAskedTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // ── Fill timelines into 30-day arrays so rendering is uniform ───────
  const timeline30 = (rows: Array<{ day: Date; count: bigint }>) => {
    const map = new Map(rows.map((r) => [startOfDayUtc(r.day).getTime(), Number(r.count)]));
    const out: Array<{ day: Date; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = startOfDayUtc(new Date(today.getTime() - i * dayMs));
      out.push({ day: d, count: map.get(d.getTime()) ?? 0 });
    }
    return out;
  };
  const signups30 = timeline30(signupTimeline);
  const attempts30 = timeline30(attemptTimeline);

  // ── AI spend (rough estimate) ───────────────────────────────────────
  const aiSpendToday = assistantMsgsToday * COST_PER_ASSISTANT_MSG;
  const aiSpend7d = assistantMsgs7d * COST_PER_ASSISTANT_MSG;
  const aiSpend30d = assistantMsgs30d * COST_PER_ASSISTANT_MSG;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">Admin</Link> · Insights
        </p>
        <h1 className="text-2xl font-bold text-ink-900">Shishya insights</h1>
        <p className="mt-1 text-sm text-ink-600">
          Live monitoring — growth, engagement, AI usage, content health. Refresh anytime; everything queries Postgres directly.
        </p>

        {/* ── Today at a glance ─────────────────────────────────────── */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-ink-800">Today</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Hero label="New signups" value={signupsToday} accent="primary" />
            <Hero label="Active students" value={activeUsersToday} accent="ok" />
            <Hero label="Mocks submitted" value={mocksSubmittedToday} accent="ok" />
            <Hero label="Chat messages" value={chatMsgsToday} accent="primary" />
          </div>
        </section>

        {/* ── Growth ─────────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">Growth</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Hero label="Total users" value={totalUsers} />
            <Hero label="Last 7 days" value={usersLast7d} />
            <Hero label="Last 30 days" value={usersLast30d} />
          </div>
          <div className="mt-4 rounded-md border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
              Daily new signups (last 30 days)
            </p>
            <BarChart data={signups30} colour="bg-saffron-500" />
          </div>
        </section>

        {/* ── Engagement ─────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">Engagement</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Hero label="DAU" value={dauArr} />
            <Hero label="WAU" value={wauArr} />
            <Hero label="MAU" value={mauArr} />
            <Hero label="Stickiness (DAU/MAU)" value={mauArr > 0 ? Math.round((dauArr / mauArr) * 100) : 0} suffix="%" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Hero label="Mocks · 7d" value={attempts7d} />
            <Hero label="Mocks · 30d" value={attempts30d} />
            <Hero label="Chat msgs · 7d" value={chatMsgs7d} />
            <Hero label="Chat msgs · 30d" value={chatMsgs30d} />
          </div>
          <div className="mt-4 rounded-md border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
              Daily mock submissions (last 30 days)
            </p>
            <BarChart data={attempts30} colour="bg-emerald-500" />
          </div>
        </section>

        {/* ── Funnel ─────────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">Lifetime funnel</h2>
          <p className="mt-1 text-xs text-ink-500">
            Where students drop off between signup and a real practice loop.
          </p>
          <FunnelTable
            steps={[
              { label: "Signed up", count: totalUsers },
              { label: "Enrolled in ≥1 exam", count: usersWithEnrollment },
              { label: "Submitted ≥1 mock", count: usersWithMockSubmit },
              { label: "Took ≥2 mocks (retained)", count: usersWithTwoMocks },
              { label: "Chatted with Shishya AI", count: usersWithChat },
            ]}
          />
        </section>

        {/* ── Top exams ──────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">Top exams</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TopList title="By enrollments" items={topExamsByEnrollment} />
            <TopList title="By mocks submitted" items={topExamsByAttempts} />
            <TopList title="By chat sessions" items={topExamsByChat} />
          </div>
        </section>

        {/* ── Content health ─────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">Content health</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Hero label="Active exams" value={activeExams} secondary={`/ ${totalExams}`} />
            <Hero label="Validated questions" value={validatedQuestions} secondary={`/ ${totalQuestions}`} accent="ok" />
            <Hero label="Pending AI review" value={pendingAiQuestions} accent={pendingAiQuestions > 0 ? "warn" : "muted"} />
            <Hero label="System mocks built" value={totalSystemMocks} />
            <Hero label="Topics with notes" value={topicsWithNotes} secondary={`/ ${topicsTotal}`} />
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Coverage =
            {" "}
            <strong>{topicsTotal > 0 ? Math.round((topicsWithNotes / topicsTotal) * 100) : 0}%</strong>
            {" "}of topics have study notes generated.
          </p>
        </section>

        {/* ── AI usage + cost ────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">AI usage &amp; estimated cost</h2>
          <p className="mt-1 text-xs text-ink-500">
            Anthropic spend approximated at ${COST_PER_ASSISTANT_MSG.toFixed(3)}/assistant message (Sonnet 4.5, ~6k cached input + 700 output).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Hero label="Assistant msgs · today" value={assistantMsgsToday} secondary={`~$${aiSpendToday.toFixed(2)}`} accent="primary" />
            <Hero label="Assistant msgs · 7d" value={assistantMsgs7d} secondary={`~$${aiSpend7d.toFixed(2)}`} />
            <Hero label="Assistant msgs · 30d" value={assistantMsgs30d} secondary={`~$${aiSpend30d.toFixed(2)}`} />
          </div>
          {topAskedTopics.length > 0 && (
            <div className="mt-4 rounded-md border border-ink-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
                Top topics asked about (last 30 days, from tool-use traces)
              </p>
              <ul className="mt-2 space-y-1">
                {topAskedTopics.map(([code, count]) => (
                  <li key={code} className="flex items-baseline justify-between text-xs">
                    <code className="text-ink-800">{code}</code>
                    <span className="tabular-nums text-ink-500">×{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Recent activity ────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">Recent activity</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-md border border-ink-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Latest mocks</p>
              <ul className="mt-2 space-y-1">
                {recentMocks.map((a) => (
                  <li key={a.id} className="text-xs">
                    <p className="truncate text-ink-900">
                      <span className="font-medium">{a.mock.exam.shortName}</span>{" "}
                      <span className="text-ink-500">· {formatDisplayScorePct(a.scorePct)}</span>
                    </p>
                    <p className="truncate text-[11px] text-ink-500">
                      {(a.user.name ?? a.user.email ?? "anon").split("@")[0]} · {fmtRelative(a.finishedAt ?? a.startedAt)}
                    </p>
                  </li>
                ))}
                {recentMocks.length === 0 && <li className="text-xs text-ink-500">No mocks yet.</li>}
              </ul>
            </div>
            <div className="rounded-md border border-ink-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Latest signups</p>
              <ul className="mt-2 space-y-1">
                {recentSignups.map((u, i) => (
                  <li key={i} className="text-xs">
                    <p className="truncate text-ink-900">{u.name ?? "—"}</p>
                    <p className="truncate text-[11px] text-ink-500">
                      {u.email ?? "—"} · {fmtRelative(u.createdAt)}
                    </p>
                  </li>
                ))}
                {recentSignups.length === 0 && <li className="text-xs text-ink-500">No signups yet.</li>}
              </ul>
            </div>
            <div className="rounded-md border border-ink-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Latest chats</p>
              <ul className="mt-2 space-y-1">
                {recentChats.map((c) => (
                  <li key={c.id} className="text-xs">
                    <p className="truncate text-ink-900">
                      {c.exam?.shortName ?? "—"}{" "}
                      <span className="text-ink-500">· {c._count.messages} msgs</span>
                    </p>
                    <p className="truncate text-[11px] text-ink-500">
                      {(c.user?.email ?? "anon").split("@")[0]} · {fmtRelative(c.updatedAt)}
                    </p>
                  </li>
                ))}
                {recentChats.length === 0 && <li className="text-xs text-ink-500">No chats yet.</li>}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Quick links ────────────────────────────────────────────── */}
        <section className="mt-10 flex flex-wrap gap-2 text-xs">
          <Link href="/admin" className="rounded-md border border-ink-300 px-3 py-1.5 hover:bg-ink-50">
            Admin home
          </Link>
          <Link href="/admin/coverage" className="rounded-md border border-ink-300 px-3 py-1.5 hover:bg-ink-50">
            Content coverage
          </Link>
          <Link href="/admin/questions?source=AI_GENERATED&validated=false" className="rounded-md border border-ink-300 px-3 py-1.5 hover:bg-ink-50">
            Review pending AI questions ({pendingAiQuestions})
          </Link>
          <Link href="/admin/sme-stats" className="rounded-md border border-ink-300 px-3 py-1.5 hover:bg-ink-50">
            SME stats
          </Link>
        </section>
      </section>
    </main>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────

function Hero({
  label,
  value,
  secondary,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  secondary?: string;
  suffix?: string;
  accent?: "primary" | "ok" | "warn" | "muted";
}) {
  const tone =
    accent === "primary"
      ? "border-saffron-200 bg-saffron-50"
      : accent === "ok"
      ? "border-emerald-200 bg-emerald-50"
      : accent === "warn"
      ? "border-amber-200 bg-amber-50"
      : accent === "muted"
      ? "border-ink-200 bg-ink-50"
      : "border-ink-200 bg-white";
  return (
    <div className={`rounded-md border p-4 ${tone}`}>
      <p className="text-2xl font-bold tabular-nums text-ink-900">
        {Number(value).toLocaleString("en-IN")}
        {suffix ? <span className="text-base font-medium text-ink-600">{suffix}</span> : null}
      </p>
      <p className="mt-0.5 text-xs text-ink-600">{label}</p>
      {secondary && <p className="mt-0.5 text-[11px] text-ink-500">{secondary}</p>}
    </div>
  );
}

function BarChart({ data, colour }: { data: Array<{ day: Date; count: number }>; colour: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-3">
      <div className="flex h-24 items-end gap-[2px]">
        {data.map((d) => {
          const h = Math.max(2, Math.round((d.count / max) * 96));
          return (
            <div key={d.day.toISOString()} className="flex flex-1 flex-col items-center">
              <div
                className={`w-full rounded-t-sm ${colour}`}
                style={{ height: `${h}px` }}
                title={`${d.day.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}: ${d.count}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-400">
        <span>{data[0]?.day.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
        <span>peak {max}</span>
        <span>{data[data.length - 1]?.day.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

function FunnelTable({ steps }: { steps: Array<{ label: string; count: number }> }) {
  const top = steps[0]?.count ?? 1;
  return (
    <div className="mt-3 rounded-md border border-ink-200 bg-white p-4">
      <ul className="space-y-2">
        {steps.map((s, i) => {
          const pctOfTop = top > 0 ? (s.count / top) * 100 : 0;
          const pctOfPrev = i === 0 ? 100 : steps[i - 1].count > 0 ? (s.count / steps[i - 1].count) * 100 : 0;
          return (
            <li key={s.label} className="text-sm">
              <div className="flex items-baseline justify-between">
                <p className="text-ink-800">{s.label}</p>
                <p className="text-xs text-ink-500 tabular-nums">
                  <strong className="text-ink-900">{s.count.toLocaleString("en-IN")}</strong>{" "}
                  · {pctOfTop.toFixed(1)}% of signups{" "}
                  {i > 0 && <span className="text-ink-400">· {pctOfPrev.toFixed(0)}% step conv.</span>}
                </p>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div className="h-full bg-saffron-500" style={{ width: `${pctOfTop}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: Array<{ code?: string; shortName?: string; count: number }>;
}) {
  return (
    <div className="rounded-md border border-ink-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-ink-500">No data yet.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((it) => (
            <li key={it.code} className="flex items-baseline justify-between text-xs">
              <Link
                href={`/exams/${it.code}`}
                className="truncate text-ink-800 hover:text-saffron-700 hover:underline"
              >
                {it.shortName ?? it.code}
              </Link>
              <span className="tabular-nums text-ink-500">{it.count.toLocaleString("en-IN")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtRelative(d: Date | null): string {
  if (!d) return "—";
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
