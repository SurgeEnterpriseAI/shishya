// Retrieval — semantic search over the knowledge spine.
//
// Returns chunks ranked by cosine similarity, each carrying its source's
// title/url/publisher/reliability tier so callers can cite provenance.
// Scoping: exam-specific sources for the student's exam PLUS cross-exam
// sources (examCode null, e.g. NCERT) are searched together; archived
// sources are always excluded.
//
// Reliability-aware ranking: similarity is the primary signal; a small
// tier bonus breaks near-ties in favour of more authoritative sources
// without letting a low-relevance official doc beat a high-relevance one.

import { Prisma, type PrismaClient, type SourceReliability } from "@prisma/client";
import { embedQuery, toVectorLiteral } from "./embeddings";

export interface RetrievedChunk {
  chunkId: string;
  text: string;
  heading: string | null;
  similarity: number; // 0..1 cosine
  score: number; // similarity + tier bonus (ranking key)
  source: {
    id: string;
    title: string;
    url: string | null;
    publisher: string | null;
    tier: SourceReliability;
    publishedAt: Date | null;
  };
}

const TIER_BONUS: Record<SourceReliability, number> = {
  OFFICIAL: 0.06,
  STANDARD_TEXT: 0.05,
  PYQ: 0.04,
  CURATED: 0.03,
  COMMUNITY: 0,
};

export interface RetrieveOpts {
  examCode?: string;
  topicCode?: string;
  limit?: number; // default 6
  /** Drop results below this cosine similarity. Default 0.35. */
  minSimilarity?: number;
}

export async function retrieve(
  prisma: PrismaClient,
  query: string,
  opts: RetrieveOpts = {},
): Promise<RetrievedChunk[]> {
  const limit = Math.min(opts.limit ?? 6, 20);
  const minSim = opts.minSimilarity ?? 0.35;
  const qvec = toVectorLiteral(await embedQuery(query));

  // Over-fetch then re-rank with the tier bonus in JS — keeps SQL simple.
  const rows = await prisma.$queryRaw<
    Array<{
      chunkId: string;
      text: string;
      heading: string | null;
      similarity: number;
      sourceId: string;
      title: string;
      url: string | null;
      publisher: string | null;
      tier: SourceReliability;
      publishedAt: Date | null;
    }>
  >(Prisma.sql`
    SELECT
      c.id            AS "chunkId",
      c.text          AS "text",
      c.heading       AS "heading",
      1 - (c.embedding <=> ${qvec}::vector) AS "similarity",
      s.id            AS "sourceId",
      s.title         AS "title",
      s.url           AS "url",
      s.publisher     AS "publisher",
      s.tier          AS "tier",
      s."publishedAt" AS "publishedAt"
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeSource" s ON s.id = c."sourceId"
    WHERE c.embedding IS NOT NULL
      AND s."archivedAt" IS NULL
      AND (s."examCode" IS NULL OR s."examCode" = ${opts.examCode ?? null})
      AND (${opts.topicCode ?? null}::text IS NULL OR s."topicCode" IS NULL OR s."topicCode" = ${opts.topicCode ?? null})
    ORDER BY c.embedding <=> ${qvec}::vector
    LIMIT ${limit * 3}
  `);

  return rows
    .map((r) => ({
      chunkId: r.chunkId,
      text: r.text,
      heading: r.heading,
      similarity: r.similarity,
      score: r.similarity + TIER_BONUS[r.tier],
      source: {
        id: r.sourceId,
        title: r.title,
        url: r.url,
        publisher: r.publisher,
        tier: r.tier,
        publishedAt: r.publishedAt,
      },
    }))
    .filter((r) => r.similarity >= minSim)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Render retrieved chunks as a grounding block for prompts, with citations. */
export function renderGroundingBlock(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "";
  const lines: string[] = [
    "# Retrieved source material (cite by [S1], [S2]… — prefer OFFICIAL > STANDARD_TEXT > PYQ > CURATED > COMMUNITY when sources disagree)",
  ];
  chunks.forEach((c, i) => {
    const tag = `S${i + 1}`;
    const meta = [
      c.source.publisher,
      c.source.tier,
      c.source.publishedAt ? c.source.publishedAt.toISOString().slice(0, 10) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    lines.push(`\n[${tag}] ${c.source.title}${meta ? ` (${meta})` : ""}${c.heading ? ` — ${c.heading}` : ""}`);
    lines.push(c.text);
  });
  return lines.join("\n");
}
