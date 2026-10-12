// SELECT-only read (14 Oct 2026, Release 2, build kids-crawler): what the two
// guest-tutor rules of this release would have done to the last 14 days.
//
//   A. The crawler hold (src/lib/guest-seed-hold.ts): of the cookie-less guest
//      tutor rows (AnonTutorLog.anonId NULL; Class 8-12 school chats log every
//      guest row without an id, so they are counted apart), how many follow an
//      identity-less /chat page view whose user agent was on the scrub's
//      convicted list BEFORE the turn — the list as the route reads it
//      (ua-sweep tags of the last 30 days), lagged 2 hours for the hourly scrub
//      and the hour-long cache — and how many real-looking rows it spares.
//      Rule 5 (review, 11 Oct 2026): a page view with a referrer or a utm tag
//      (a walk-in) is never held; the read also counts how many page views on
//      the listed agents carried a utm tag (walk-ins sharing a listed agent).
//   B. Kids' exams (src/lib/kids-tutor.ts): guest rows on a kids' exam (now no
//      AI and no row), and what signed-in members did there (unchanged).
//
// Nothing is written. Prints counts, user-agent hashes and seed-template
// families — never a guest's own words.
// USAGE: npx tsx --env-file=.env.local scripts/measure-guest-seed-hold.ts [days=14]

import { PrismaClient } from "@prisma/client";
import { convictedAgentsSql, CONVICTED_AGENT_TAG_LIKE, CONVICTED_AGENT_WINDOW_DAYS } from "@/lib/guest-seed-hold";
import { isKidsExamCode } from "@/lib/signin-cta";

const p = new PrismaClient();
const days = Math.max(1, Math.min(60, Number.parseInt(process.argv[2] ?? "14", 10) || 14));
const SCHOOL_RE = "^(NCERT|CISCE)_C(0[1-9]|1[0-2])$";
const LAG_HOURS = 2;

/** Our own seed links' opening words (topic page, hub, exam-week block, home, results, landing doors). */
const SEED_FAMILIES: Array<[string, RegExp]> = [
  ["walk-me-through-these", /^Walk me through these /],
  ["walk-me-through-syllabus", /^Walk me through the .* syllabus/],
  ["quiz-me-weakest", /^Quiz me on my weakest /],
  ["quiz-me-on", /^Quiz me on /],
  ["teach-me", /^Teach me /],
  ["go-deeper", /^Go deeper on /],
  ["shortcuts", /^Give me 3 fastest shortcuts/],
  ["common-mistakes", /^What are the most common mistakes/],
  ["im-studying", /^I'm studying /],
  ["study-plan", /^Make me a 30-minute study plan/],
  ["exam-in-n-days", /^My .* exam is in \d+ days?/],
  ["concept-got-wrong", /^Explain the concept I got wrong/],
  // src/lib/landing-actions.ts (the exam and career landing doors).
  ["tell-me-what-to-know", /^Tell me what I should know about /],
  ["how-do-i-become", /^How do I become /],
];
const family = (m: string) => SEED_FAMILIES.find(([, re]) => re.test(m))?.[0] ?? "other (typed or a starter)";

type Row = {
  id: string;
  createdAt: Date;
  examCode: string | null;
  noreply: boolean;
  msg: string;
  pvAt: Date | null;
  client: string | null;
  tag: string | null;
  uaHash: string | null;
  refHost: string | null;
  utmSource: string | null;
  convictedBefore: boolean;
};

async function main() {
  const [{ now }] = await p.$queryRawUnsafe<{ now: Date }[]>(`SELECT now() AS now`);
  console.log(`now ${now.toISOString()} · window ${days} days · list = ua-sweep tags of the last ${CONVICTED_AGENT_WINDOW_DAYS} days, lagged ${LAG_HOURS} h\n`);

  const t0 = Date.now();
  const list = await p.$queryRawUnsafe<{ uaHash: string }[]>(convictedAgentsSql());
  console.log(`the route's list today: ${list.length} user agents (read in ${Date.now() - t0} ms)\n`);

  const [tot] = await p.$queryRawUnsafe<{ all: number; nocookie: number; nocookie_school: number; withcookie: number }[]>(`
    SELECT COUNT(*)::int "all",
      COUNT(*) FILTER (WHERE "anonId" IS NULL)::int nocookie,
      COUNT(*) FILTER (WHERE "anonId" IS NULL AND "examCode" ~ '${SCHOOL_RE}')::int nocookie_school,
      COUNT(*) FILTER (WHERE "anonId" IS NOT NULL)::int withcookie
    FROM "AnonTutorLog" WHERE "createdAt" > now() - interval '${days} days'`);
  console.log(`A. guest tutor rows: ${tot.all} · with the cookie ${tot.withcookie} (never held: rule 3) · cookie-less ${tot.nocookie} (school ${tot.nocookie_school}, logged without an id by design)`);

  const rows = await p.$queryRawUnsafe<Row[]>(`
    SELECT g.id, g."createdAt", g."examCode", (g.reply IS NULL) noreply, g."userMessage" msg,
      pv."createdAt" "pvAt", pv.client, pv.props->>'retroTag' tag, pv."uaHash", pv."refHost", pv."utmSource",
      (pv."uaHash" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "AnalyticsEvent" t
        WHERE t."uaHash" = pv."uaHash" AND t.client = 'bot' AND t.props->>'retroTag' LIKE '${CONVICTED_AGENT_TAG_LIKE}'
          AND t."createdAt" BETWEEN g."createdAt" - interval '${CONVICTED_AGENT_WINDOW_DAYS} days' AND g."createdAt" - interval '${LAG_HOURS} hours'
      )) "convictedBefore"
    FROM "AnonTutorLog" g
    LEFT JOIN LATERAL (
      SELECT * FROM "AnalyticsEvent" e
      WHERE e.kind = 'PAGE_VIEW' AND e."userId" IS NULL AND e."anonId" IS NULL
        AND split_part(COALESCE(e.path,''),'?',1) IN ('/chat', '/hi/chat', '/te/chat')
        AND e."createdAt" BETWEEN g."createdAt" - interval '5 minutes' AND g."createdAt" + interval '10 seconds'
      ORDER BY abs(EXTRACT(EPOCH FROM (g."createdAt" - e."createdAt"))) ASC LIMIT 1
    ) pv ON TRUE
    WHERE g."createdAt" > now() - interval '${days} days' AND g."anonId" IS NULL
      AND (g."examCode" IS NULL OR g."examCode" !~ '${SCHOOL_RE}')
    ORDER BY g."createdAt"`);

  // Rule 5: a landing with a referrer or a utm tag is never held.
  const walkIn = (r: Row) => !!(r.refHost || r.utmSource);
  const held = rows.filter((r) => r.convictedBefore && !walkIn(r));
  const spared = rows.filter((r) => !r.convictedBefore || walkIn(r));
  console.log(`   cookie-less, not school: ${rows.length}`);
  console.log(`   WOULD BE HELD (convicted user agent ≥${LAG_HOURS} h before the turn): ${held.length}`);
  console.log(`   spared: ${spared.length}`);
  const fam = (rs: Row[]) => {
    const m = new Map<string, number>();
    for (const r of rs) m.set(family(r.msg), (m.get(family(r.msg)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(" · ");
  };
  console.log(`   held, by seed family: ${fam(held) || "none"}`);
  const agents = new Map<string, number>();
  for (const r of held) agents.set(r.uaHash!, (agents.get(r.uaHash!) ?? 0) + 1);
  console.log(`   held, by user agent: ${[...agents.entries()].sort((a, b) => b[1] - a[1]).map(([h, n]) => `${h} ${n}`).join(" · ")}`);
  console.log(`   convicted but spared by rule 5 (a referrer or utm on the page view): ${rows.filter((r) => r.convictedBefore && walkIn(r)).length}`);
  console.log(`   held whose page view was a bot at ingest or ua-sweep tagged: ${held.filter((r) => r.client === "bot").length} (untagged browser: ${held.filter((r) => r.client !== "bot").length})`);
  console.log(`   spared rows:`);
  for (const r of spared) {
    const why = !r.pvAt ? "no /chat page view within 5 min" : walkIn(r) ? "a referrer or utm tag (rule 5)" : !r.uaHash ? "page view has no UA hash" : list.some((x) => x.uaHash === r.uaHash) ? "agent convicted only later" : "agent not convicted";
    console.log(`     ${r.createdAt.toISOString().slice(0, 16)} ${String(r.examCode ?? "general").padEnd(18)} ${family(r.msg).padEnd(26)} ${r.client ?? "-"} ${r.tag ?? ""} — ${why}`);
  }
  const perDay = new Map<string, number>();
  for (const r of held) {
    const d = new Date(r.createdAt.getTime() + 5.5 * 3600_000).toISOString().slice(5, 10);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  console.log(`   held per IST day: ${[...perDay.entries()].map(([d, n]) => `${d} ${n}`).join(" · ")}`);
  const [tagged] = await p.$queryRawUnsafe<{ views: number; agents: number }[]>(`
    SELECT COUNT(*)::int views, COUNT(DISTINCT e."uaHash")::int agents
    FROM "AnalyticsEvent" e JOIN (${convictedAgentsSql()}) l ON l."uaHash" = e."uaHash"
    WHERE e.kind = 'PAGE_VIEW' AND e."createdAt" > now() - interval '${CONVICTED_AGENT_WINDOW_DAYS} days' AND e."utmSource" IS NOT NULL`);
  console.log(`   walk-ins sharing a listed agent (utm-tagged page views, last ${CONVICTED_AGENT_WINDOW_DAYS} days): ${tagged.views} on ${tagged.agents} agents — rule 5 never holds them`);

  // B. Kids' exams.
  const kidsRows = await p.$queryRawUnsafe<{ examCode: string; n: number; nocookie: number }[]>(`
    SELECT "examCode", COUNT(*)::int n, COUNT(*) FILTER (WHERE "anonId" IS NULL)::int nocookie
    FROM "AnonTutorLog" WHERE "createdAt" > now() - interval '${days} days' AND "examCode" IS NOT NULL
    GROUP BY 1`);
  const kids = kidsRows.filter((r) => isKidsExamCode(r.examCode));
  const kidsN = kids.reduce((a, r) => a + r.n, 0);
  console.log(`\nB. kids' exams — guest tutor rows in ${days} days (now: no AI, no row): ${kidsN} (cookie-less ${kids.reduce((a, r) => a + r.nocookie, 0)})`);
  console.log(`   ${kids.map((r) => `${r.examCode} ${r.n}`).join(" · ") || "none"}`);
  const members = await p.$queryRawUnsafe<{ code: string; users: number; questions: number }[]>(`
    SELECT e.code, COUNT(DISTINCT s."userId")::int users, COUNT(m.id)::int questions
    FROM "ChatMessage" m JOIN "ChatSession" s ON s.id = m."sessionId" JOIN "Exam" e ON e.id = s."examId"
    WHERE m.role = 'USER' AND m."createdAt" > now() - interval '30 days'
    GROUP BY 1`);
  const mk = members.filter((r) => isKidsExamCode(r.code));
  console.log(`   signed-in members on kids' exams, last 30 days (unchanged): ${mk.reduce((a, r) => a + r.questions, 0)} questions from ${mk.reduce((a, r) => a + r.users, 0)} member-exam pairs — ${mk.map((r) => `${r.code} ${r.questions}q/${r.users}u`).join(" · ") || "none"}`);
  const active = await p.$queryRawUnsafe<{ code: string }[]>(`SELECT code FROM "Exam" WHERE active = TRUE`);
  console.log(`   active kids' exams: ${active.map((r) => r.code).filter((c) => isKidsExamCode(c)).sort().join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
