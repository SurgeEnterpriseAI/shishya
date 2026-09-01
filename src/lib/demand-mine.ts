// Demand mining (1 Sep 2026) — turns free-form user text into the
// /admin/demand heatmap the founder builds features from.
//
// Sources (free-form ONLY — seeded chat prompts are our phrasing, and
// CTA taps are already measured by analytics + PulseAsk chips):
//   • ChatMessage role=USER, minus known seed templates
//   • PulseFeedback free text (chips excluded — counted at /admin/pulse)
//   • TeacherRequest messages (minus tap beacons)
//   • FeatureRequest bodies (/ideas board)
//
// Pipeline: gather window → PII scrub → ONE Claude call per ~120 items
// classifies each into a CONTROLLED VOCABULARY of clusters (reuse-first;
// new clusters allowed) under a fixed category taxonomy → DemandSignal
// rows, deduped forever on (source, sourceId). Weekly consolidation
// merges near-duplicate clusters and writes a "build next" digest.
//
// Cost: tens of free-form items/day → one Sonnet call ≈ pennies.

import type { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "@/lib/ai/client";

// Fixed taxonomy — the heatmap's row groups. The model must pick one
// per signal; "other" is the escape hatch we review weekly.
export const DEMAND_CATEGORIES = [
  "practice", // mocks, quizzes, PYQs, sectional/topic tests
  "content", // notes, PDFs, downloads, books, videos
  "planning", // study plans, schedules, weightage, strategy
  "dates-info", // exam dates, notifications, eligibility, application help
  "results-analysis", // cutoffs, rank, am-I-on-track, score interpretation
  "language", // wants Hindi/Telugu/regional language anything
  "tutor-quality", // AI tutor answer quality, depth, format complaints
  "platform-ux", // navigation, login, bugs, speed, mobile issues
  "human-help", // real teacher, mentor, counselling, doubt clearing
  "motivation", // encouragement, streaks, consistency, exam anxiety
  "other",
] as const;

// Chat messages that START with one of these are our own prefilled
// seeds (results page, topic pages, PYQ pages, dashboards) — the
// student tapped a button we wrote, so the words aren't theirs.
const SEED_PREFIXES = [
  "I just took a ",
  "I just finished a ",
  "On my last ",
  "I'm solving the ",
  "I'm studying ",
  "I'm weak in ",
  "Teach me ",
  "Walk me through the ",
  "Pick up where we left off",
  "Make me a 30-minute study plan",
];

export interface DemandItem {
  source: "chat" | "pulse" | "teacher" | "ideas";
  sourceId: string;
  text: string;
  examCode: string | null;
  saidAt: Date;
}

/** Strip emails and long digit runs (phone numbers) before anything
 *  reaches the LLM or the quote column. */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "[number]")
    .replace(/\s+/g, " ")
    .trim();
}

function isSeeded(text: string): boolean {
  return SEED_PREFIXES.some((p) => text.startsWith(p));
}

/** Gather free-form items in [since, until). Queries run SEQUENTIALLY —
 *  Neon discipline: never two DB-heavy chains in parallel. */
export async function gatherItems(
  db: PrismaClient,
  since: Date,
  until: Date,
  cap = 400,
): Promise<DemandItem[]> {
  const items: DemandItem[] = [];

  const chat = await db.$queryRaw<{ id: string; content: string; createdAt: Date; examCode: string | null }[]>`
    SELECT m.id, m.content, m."createdAt", e.code AS "examCode"
    FROM "ChatMessage" m
    JOIN "ChatSession" s ON s.id = m."sessionId"
    LEFT JOIN "Exam" e ON e.id = s."examId"
    WHERE m.role = 'USER' AND m."createdAt" >= ${since} AND m."createdAt" < ${until}
      AND LENGTH(m.content) BETWEEN 8 AND 2000
    ORDER BY m."createdAt" DESC LIMIT ${cap}`.catch(() => []);
  for (const r of chat) {
    const t = r.content.trim();
    if (isSeeded(t)) continue;
    items.push({ source: "chat", sourceId: r.id, text: scrub(t).slice(0, 300), examCode: r.examCode, saidAt: r.createdAt });
  }

  const pulse = await db.$queryRaw<{ id: string; text: string; examCode: string | null; createdAt: Date }[]>`
    SELECT id, text, "examCode", "createdAt" FROM "PulseFeedback"
    WHERE text IS NOT NULL AND "createdAt" >= ${since} AND "createdAt" < ${until}
    ORDER BY "createdAt" DESC LIMIT 100`.catch(() => []);
  for (const r of pulse) {
    items.push({ source: "pulse", sourceId: r.id, text: scrub(r.text).slice(0, 300), examCode: r.examCode, saidAt: r.createdAt });
  }

  const teacher = await db.$queryRaw<{ id: string; message: string; examCode: string | null; createdAt: Date }[]>`
    SELECT id, message, "examCode", "createdAt" FROM "TeacherRequest"
    WHERE "createdAt" >= ${since} AND "createdAt" < ${until}
      AND message NOT LIKE '[WHATSAPP tap]%' AND message NOT LIKE '[CALL tap]%'
      AND LENGTH(message) >= 8
    ORDER BY "createdAt" DESC LIMIT 100`.catch(() => []);
  for (const r of teacher) {
    items.push({ source: "teacher", sourceId: r.id, text: scrub(r.message).slice(0, 300), examCode: r.examCode, saidAt: r.createdAt });
  }

  const ideas = await db.$queryRaw<{ id: string; title: string; body: string; examCode: string | null; createdAt: Date }[]>`
    SELECT id, title, body, "examCode", "createdAt" FROM "FeatureRequest"
    WHERE "createdAt" >= ${since} AND "createdAt" < ${until}
    ORDER BY "createdAt" DESC LIMIT 50`.catch(() => []);
  for (const r of ideas) {
    items.push({ source: "ideas", sourceId: r.id, text: scrub(`${r.title}. ${r.body}`).slice(0, 300), examCode: r.examCode, saidAt: r.createdAt });
  }

  return items.slice(0, cap);
}

const SYSTEM = `You classify what Indian government-exam aspirants are ASKING FOR on a free prep platform (Shishya). Input: numbered user texts (tutor chat, feedback notes, requests). Output: STRICT JSON only.

For each item decide:
- "demand": true only if the text expresses a want/need/gap/complaint the platform could act on (a feature, more content, better info, help). Pure study questions ("what is Article 356?"), greetings, answers to the tutor, and gibberish are demand:false.
- "cluster": REUSE an existing cluster key from the vocabulary whenever the need is the same — invent "new:<slug>" ONLY when nothing fits. Slugs: kebab-case, 2-4 words, describing the NEED not the exam (e.g. "full-pyq-papers", "topic-wise-mocks", "pdf-downloads").
- "label": short human label for new clusters only (e.g. "Full PYQ papers").
- "category": exactly one of ${JSON.stringify(DEMAND_CATEGORIES)}.
- "lang": the script/language of the text — "en", "hi", "te", or "other".

Be conservative and consistent: 100 similar asks must land in ONE cluster, not five. Never echo emails or phone numbers.

Output shape (no markdown fences):
{"results":[{"i":0,"demand":true,"cluster":"full-pyq-papers","label":null,"category":"practice","lang":"en"}, ...]}`;

interface Verdict {
  i: number;
  demand: boolean;
  cluster?: string;
  label?: string | null;
  category?: string;
  lang?: string;
}

export interface MineResult {
  scanned: number;
  demands: number;
  newClusters: number;
  inserted: number;
}

/** Classify a window of items and persist signals. */
export async function mineDemand(db: PrismaClient, since: Date, until: Date): Promise<MineResult> {
  const items = await gatherItems(db, since, until);
  const out: MineResult = { scanned: items.length, demands: 0, newClusters: 0, inserted: 0 };
  if (items.length === 0) return out;

  const vocab = await db.$queryRaw<{ key: string; label: string; category: string }[]>`
    SELECT key, label, category FROM "DemandCluster" WHERE status = 'active' ORDER BY key`.catch(() => []);
  const vocabLine = vocab.map((v) => `${v.key}: ${v.label} (${v.category})`).join("\n") || "(none yet)";

  const BATCH = 120;
  for (let start = 0; start < items.length; start += BATCH) {
    const batch = items.slice(start, start + BATCH);
    const user = `EXISTING CLUSTER VOCABULARY (reuse first):\n${vocabLine}\n\nITEMS:\n${batch
      .map((it, i) => `${i}. [${it.source}${it.examCode ? "/" + it.examCode : ""}] ${it.text}`)
      .join("\n")}`;

    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    let parsed: { results?: Verdict[] } | null = null;
    try {
      parsed = JSON.parse(text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, ""));
    } catch {
      const f = text.indexOf("{");
      const l = text.lastIndexOf("}");
      if (f >= 0 && l > f) {
        try {
          parsed = JSON.parse(text.slice(f, l + 1));
        } catch {}
      }
    }
    if (!parsed?.results) continue;

    for (const v of parsed.results) {
      if (!v.demand || !Number.isInteger(v.i) || v.i < 0 || v.i >= batch.length) continue;
      const it = batch[v.i];
      const rawKey = String(v.cluster ?? "").toLowerCase();
      const isNew = rawKey.startsWith("new:");
      const key = (isNew ? rawKey.slice(4) : rawKey).replace(/[^a-z0-9-]/g, "").slice(0, 48);
      if (!key) continue;
      const category = (DEMAND_CATEGORIES as readonly string[]).includes(v.category ?? "") ? (v.category as string) : "other";
      const label = (v.label ?? key.replace(/-/g, " ")).slice(0, 80);
      const lang = ["en", "hi", "te", "other"].includes(v.lang ?? "") ? (v.lang as string) : null;

      // Upsert the cluster (a "new:" key the vocab already has just reuses it).
      const upserted = await db.$executeRaw`
        INSERT INTO "DemandCluster" (key, label, category, status, "firstSeen", "lastSeen")
        VALUES (${key}, ${label}, ${category}, 'active', NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET "lastSeen" = NOW()`;
      if (isNew && upserted === 1) out.newClusters++;

      // Resolve merged clusters to their survivor so late signals never
      // resurrect a merged key.
      const target = await db.$queryRaw<{ key: string; category: string }[]>`
        SELECT COALESCE(NULLIF(status,'active'), 'active') AS status, COALESCE("mergedInto", key) AS key, category
        FROM "DemandCluster" WHERE key = ${key} LIMIT 1`.catch(() => [] as any[]);
      const finalKey = target[0]?.key ?? key;
      const finalCat = target[0]?.category ?? category;

      const ins = await db.$executeRaw`
        INSERT INTO "DemandSignal" (id, "clusterKey", category, source, "sourceId", "examCode", language, quote, "saidAt", "createdAt")
        VALUES (${crypto.randomUUID()}, ${finalKey}, ${finalCat}, ${it.source}, ${it.sourceId}, ${it.examCode}, ${lang}, ${it.text.slice(0, 200)}, ${it.saidAt}, NOW())
        ON CONFLICT (source, "sourceId") DO NOTHING`;
      out.inserted += ins;
      out.demands++;
    }
  }
  return out;
}

/** Weekly pass: merge/rename near-duplicate clusters and write the
 *  founder's "build next" digest. */
export async function consolidateDemand(db: PrismaClient): Promise<{ merges: number; digest: string | null }> {
  const rows = await db.$queryRaw<{ key: string; label: string; category: string; n: bigint; wk: bigint }[]>`
    SELECT c.key, c.label, c.category,
      COUNT(s.id) n,
      COUNT(s.id) FILTER (WHERE s."saidAt" >= NOW() - interval '7 days') wk
    FROM "DemandCluster" c LEFT JOIN "DemandSignal" s ON s."clusterKey" = c.key
    WHERE c.status = 'active'
    GROUP BY c.key, c.label, c.category ORDER BY n DESC LIMIT 120`.catch(() => []);
  if (rows.length === 0) return { merges: 0, digest: null };

  const listing = rows.map((r) => `${r.key} | ${r.label} | ${r.category} | total=${Number(r.n)} | last7d=${Number(r.wk)}`).join("\n");
  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1800,
    messages: [
      {
        role: "user",
        content: `Demand clusters from an Indian govt-exam prep platform (key | label | category | total | last7d):\n${listing}\n\nTasks:\n1. "merges": pairs where two keys describe the SAME need — [{"from":"key-a","into":"key-b"}] (survivor = higher total). Only merge when clearly identical; empty array is fine.\n2. "digest": 3-5 sentences for the founder — which needs are rising, which ONE feature to build next and why, grounded ONLY in these counts. Plain text, no hype.\n\nSTRICT JSON: {"merges":[...],"digest":"..."}`,
      },
    ],
  });
  const text = resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  let parsed: { merges?: { from: string; into: string }[]; digest?: string } | null = null;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, ""));
  } catch {
    const f = text.indexOf("{");
    const l = text.lastIndexOf("}");
    if (f >= 0 && l > f) {
      try {
        parsed = JSON.parse(text.slice(f, l + 1));
      } catch {}
    }
  }

  let merges = 0;
  const valid = new Set(rows.map((r) => r.key));
  for (const m of parsed?.merges ?? []) {
    if (!valid.has(m.from) || !valid.has(m.into) || m.from === m.into) continue;
    await db.$executeRaw`UPDATE "DemandSignal" SET "clusterKey" = ${m.into} WHERE "clusterKey" = ${m.from}`;
    await db.$executeRaw`UPDATE "DemandCluster" SET status = 'merged', "mergedInto" = ${m.into} WHERE key = ${m.from}`;
    merges++;
  }

  const digest = parsed?.digest?.slice(0, 2000) ?? null;
  if (digest) {
    await db.$executeRaw`INSERT INTO "DemandDigest" (id, text, "createdAt") VALUES (${crypto.randomUUID()}, ${digest}, NOW())`;
  }
  return { merges, digest };
}
