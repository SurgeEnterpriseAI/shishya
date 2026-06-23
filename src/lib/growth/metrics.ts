// Compute the weekly growth-metrics snapshot that feeds the Gemini growth
// analyst. SERVER-ONLY. Everything here is read-only aggregation over the
// analytics + product tables, structured so an LLM can reason about the
// funnel without us pre-deciding the conclusion.

import { prisma } from "@/lib/db/prisma";

export interface GrowthMetrics {
  generatedAt: string;
  window: { thisWeek: { from: string; to: string }; lastWeek: { from: string; to: string } };
  thisWeek: WeekSlice;
  lastWeek: WeekSlice;
  deltas: Record<string, number | null>; // week-over-week % change
  topEntryPages: { path: string; views: number }[];
  channels: { refHosts: { host: string; visitors: number }[]; utmSources: { source: string; visitors: number }[] };
  funnel: { visitors: number; engaged: number; hitLoginGate: number; signups: number; engagedRate: number; gateToSignupRate: number };
  aptitude: { attempts: number; passed: number };
  // Free (signed-out) AI-tutor usage — the ungated tutor is a key
  // conversion lever, so its engagement feeds the analyst directly.
  freeTutor: { conversations: number; turns: number; multiTurnPct: number };
  returningUsers: number; // signed-in users active this week who joined >7d ago
  allTime: { users: number; mocks: number; aptitudeAttempts: number };
}

interface WeekSlice {
  uniqueVisitors: number;
  anon: number;
  signedIn: number;
  pageViews: number;
  signups: number;
  conversionPct: number; // signups / uniqueVisitors
  mocksCreated: number;
  mocksAttempted: number;
  mockCompletionPct: number; // attempted / created
}

const DAY = 86_400_000;
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
function wow(now: number, prev: number): number | null {
  if (prev === 0) return now === 0 ? 0 : null; // null = "new / from zero"
  return Math.round(((now - prev) / prev) * 1000) / 10;
}

async function weekSlice(from: Date, to: Date): Promise<WeekSlice> {
  const T = { gte: from, lt: to };
  const [anonRows, authRows, pageViews, signups, mocksCreated, mocksAttempted] = await Promise.all([
    prisma.analyticsEvent.findMany({ where: { createdAt: T, anonId: { not: null } }, select: { anonId: true }, distinct: ["anonId"] }),
    prisma.analyticsEvent.findMany({ where: { createdAt: T, userId: { not: null } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.analyticsEvent.count({ where: { createdAt: T, kind: "PAGE_VIEW" } }),
    prisma.user.count({ where: { createdAt: T } }),
    prisma.mock.count({ where: { createdAt: T } }),
    prisma.attempt.count({ where: { createdAt: T } }),
  ]);
  const uniqueVisitors = anonRows.length + authRows.length;
  return {
    uniqueVisitors,
    anon: anonRows.length,
    signedIn: authRows.length,
    pageViews,
    signups,
    conversionPct: pct(signups, uniqueVisitors),
    mocksCreated,
    mocksAttempted,
    mockCompletionPct: pct(mocksAttempted, mocksCreated),
  };
}

export async function computeGrowthMetrics(now = new Date()): Promise<GrowthMetrics> {
  const thisFrom = new Date(now.getTime() - 7 * DAY);
  const lastFrom = new Date(now.getTime() - 14 * DAY);
  const [thisWeek, lastWeek] = await Promise.all([weekSlice(thisFrom, now), weekSlice(lastFrom, thisFrom)]);

  // Pull this week's events once for funnel + entry-page + channel derivation.
  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: thisFrom, lt: now } },
    select: { kind: true, userId: true, anonId: true, path: true, refHost: true, utmSource: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Sessions keyed by visitor.
  const sessions = new Map<string, typeof events>();
  for (const e of events) {
    const k = e.userId ? `u:${e.userId}` : `a:${e.anonId ?? "?"}`;
    if (!sessions.has(k)) sessions.set(k, []);
    sessions.get(k)!.push(e);
  }

  // Entry pages — first PAGE_VIEW path of each session.
  const entryCount = new Map<string, number>();
  const pathViews = new Map<string, number>();
  const refHostCount = new Map<string, Set<string>>();
  const utmCount = new Map<string, Set<string>>();
  let engaged = 0;
  const ENGAGED_PATH = /\/(mocks|chat|topics|pyq|aptitude)\b/i;
  for (const [k, evs] of sessions) {
    const pvs = evs.filter((e) => e.kind === "PAGE_VIEW");
    if (pvs[0]?.path) entryCount.set(pvs[0].path, (entryCount.get(pvs[0].path) ?? 0) + 1);
    for (const e of pvs) if (e.path) pathViews.set(e.path, (pathViews.get(e.path) ?? 0) + 1);
    // engaged = ≥2 page views OR touched a deep product surface
    if (pvs.length >= 2 || pvs.some((e) => e.path && ENGAGED_PATH.test(e.path))) engaged++;
    for (const e of evs) {
      if (e.refHost) (refHostCount.get(e.refHost) ?? refHostCount.set(e.refHost, new Set()).get(e.refHost)!).add(k);
      if (e.utmSource) (utmCount.get(e.utmSource) ?? utmCount.set(e.utmSource, new Set()).get(e.utmSource)!).add(k);
    }
  }
  const hitLoginGate = new Set(
    events.filter((e) => e.kind === "PAGE_VIEW" && e.path === "/login").map((e) => (e.userId ? `u:${e.userId}` : `a:${e.anonId}`))
  ).size;

  const topEntryPages = [...pathViews.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([path, views]) => ({ path, views }));
  const refHosts = [...refHostCount.entries()].map(([host, s]) => ({ host, visitors: s.size })).sort((a, b) => b.visitors - a.visitors).slice(0, 8);
  const utmSources = [...utmCount.entries()].map(([source, s]) => ({ source, visitors: s.size })).sort((a, b) => b.visitors - a.visitors).slice(0, 8);

  const [aptAttempts, aptPassed, returningUsers, totUsers, totMocks, totApt] = await Promise.all([
    prisma.surgeAptitudeAttempt.count({ where: { createdAt: { gte: thisFrom, lt: now } } }),
    prisma.surgeAptitudeAttempt.count({ where: { createdAt: { gte: thisFrom, lt: now }, passed: true } }),
    // signed-in users active this week who joined more than 7 days ago
    (async () => {
      const ids = [...new Set(events.filter((e) => e.userId).map((e) => e.userId!))];
      if (!ids.length) return 0;
      return prisma.user.count({ where: { id: { in: ids }, createdAt: { lt: thisFrom } } });
    })(),
    prisma.user.count(),
    prisma.mock.count(),
    prisma.surgeAptitudeAttempt.count(),
  ]);

  // Free (anon) tutor engagement this week — grouped into conversations by
  // the pseudonymous anon cookie.
  const anonTutor = await prisma.anonTutorLog.findMany({
    where: { createdAt: { gte: thisFrom, lt: now } },
    select: { anonId: true },
  });
  const convCounts = new Map<string, number>();
  anonTutor.forEach((l, i) => {
    const k = l.anonId ?? `null:${i}`;
    convCounts.set(k, (convCounts.get(k) ?? 0) + 1);
  });
  const freeTutor = {
    conversations: convCounts.size,
    turns: anonTutor.length,
    multiTurnPct: pct([...convCounts.values()].filter((n) => n > 1).length, convCounts.size),
  };

  const deltas: Record<string, number | null> = {
    uniqueVisitors: wow(thisWeek.uniqueVisitors, lastWeek.uniqueVisitors),
    signups: wow(thisWeek.signups, lastWeek.signups),
    conversionPct: wow(thisWeek.conversionPct, lastWeek.conversionPct),
    pageViews: wow(thisWeek.pageViews, lastWeek.pageViews),
    mockCompletionPct: wow(thisWeek.mockCompletionPct, lastWeek.mockCompletionPct),
  };

  return {
    generatedAt: now.toISOString(),
    window: {
      thisWeek: { from: thisFrom.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
      lastWeek: { from: lastFrom.toISOString().slice(0, 10), to: thisFrom.toISOString().slice(0, 10) },
    },
    thisWeek,
    lastWeek,
    deltas,
    topEntryPages,
    channels: { refHosts, utmSources },
    funnel: {
      visitors: thisWeek.uniqueVisitors,
      engaged,
      hitLoginGate,
      signups: thisWeek.signups,
      engagedRate: pct(engaged, thisWeek.uniqueVisitors),
      gateToSignupRate: pct(thisWeek.signups, hitLoginGate),
    },
    aptitude: { attempts: aptAttempts, passed: aptPassed },
    freeTutor,
    returningUsers,
    allTime: { users: totUsers, mocks: totMocks, aptitudeAttempts: totApt },
  };
}
