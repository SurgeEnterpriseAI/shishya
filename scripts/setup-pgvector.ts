// One-time database setup for the knowledge spine.
//
//   npm run kb:setup
//
// 1. Enables the pgvector extension (supported on Neon).
// 2. Adds an HNSW ANN index on KnowledgeChunk.embedding for fast cosine search.
//
// Run AFTER `prisma db push` / migrate has created the KnowledgeChunk table.
// Idempotent — safe to re-run.

import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Enabling pgvector extension…");
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);

    console.log("Creating HNSW index on KnowledgeChunk.embedding (cosine)…");
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw"
       ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops)`,
    );

    console.log("✓ pgvector ready.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ kb:setup failed:", err.message ?? err);
  process.exit(1);
});
