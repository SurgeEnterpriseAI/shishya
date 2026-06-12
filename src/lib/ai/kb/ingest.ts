// Knowledge ingestion — turn a source document into embedded, provenance-
// tracked chunks. Idempotent: re-ingesting identical content is a no-op
// (contentHash unique); changed content archives the old source and ingests
// fresh, so retrieval never mixes versions.

import { createHash } from "node:crypto";
import { PrismaClient, Prisma, SourceReliability, Language } from "@prisma/client";
import { chunkMarkdown } from "./chunker";
import { embed, toVectorLiteral } from "./embeddings";

export interface IngestArgs {
  title: string;
  content: string; // markdown or plain text
  tier: SourceReliability;
  url?: string;
  publisher?: string;
  examCode?: string;
  topicCode?: string;
  language?: Language;
  publishedAt?: Date;
}

export interface IngestResult {
  sourceId: string;
  chunks: number;
  skipped: boolean; // true when identical content was already ingested
  supersededSourceId?: string;
}

export async function ingestDocument(
  prisma: PrismaClient,
  args: IngestArgs,
): Promise<IngestResult> {
  const contentHash = createHash("sha256").update(args.content).digest("hex");

  const existing = await prisma.knowledgeSource.findUnique({ where: { contentHash } });
  if (existing) {
    return { sourceId: existing.id, chunks: 0, skipped: true };
  }

  // Same title+scope but different content → archive the predecessor.
  const predecessor = await prisma.knowledgeSource.findFirst({
    where: {
      title: args.title,
      examCode: args.examCode ?? null,
      topicCode: args.topicCode ?? null,
      archivedAt: null,
    },
  });
  if (predecessor) {
    await prisma.knowledgeSource.update({
      where: { id: predecessor.id },
      data: { archivedAt: new Date() },
    });
  }

  const chunks = chunkMarkdown(args.content);
  if (chunks.length === 0) throw new Error(`"${args.title}": no content to ingest after chunking`);

  // Embed with the heading breadcrumb prepended — it carries topical signal.
  const vectors = await embed(
    chunks.map((c) => (c.heading ? `${c.heading}\n\n${c.text}` : c.text)),
    "document",
  );

  const source = await prisma.knowledgeSource.create({
    data: {
      title: args.title,
      url: args.url,
      publisher: args.publisher,
      tier: args.tier,
      examCode: args.examCode,
      topicCode: args.topicCode,
      language: args.language ?? "EN",
      contentHash,
      publishedAt: args.publishedAt,
    },
  });

  // Insert chunks with embeddings. Prisma can't write Unsupported("vector")
  // through the client, so create rows first, then set vectors via raw SQL.
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const row = await prisma.knowledgeChunk.create({
      data: {
        sourceId: source.id,
        seq: c.seq,
        heading: c.heading,
        text: c.text,
        tokenEst: c.tokenEst,
      },
      select: { id: true },
    });
    await prisma.$executeRaw(
      Prisma.sql`UPDATE "KnowledgeChunk" SET embedding = ${toVectorLiteral(vectors[i])}::vector WHERE id = ${row.id}`,
    );
  }

  return {
    sourceId: source.id,
    chunks: chunks.length,
    skipped: false,
    supersededSourceId: predecessor?.id,
  };
}
