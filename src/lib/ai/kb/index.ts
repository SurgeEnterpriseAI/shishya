// Public surface of the knowledge spine (RAG layer).
//
// Sources carry a reliability tier (OFFICIAL > STANDARD_TEXT > PYQ > CURATED
// > COMMUNITY) and full provenance; retrieval returns chunks WITH their
// source so every AI answer can cite where a fact came from.
//
// Setup (once per DB): npm run kb:setup   (enables pgvector + ANN index)
// Ingest:              npm run kb:ingest -- --file <path> --title "..." --tier OFFICIAL [--exam SSC_CGL]

export { ingestDocument, type IngestArgs, type IngestResult } from "./ingest";
export { retrieve, renderGroundingBlock, type RetrievedChunk, type RetrieveOpts } from "./retrieve";
export { chunkMarkdown, type Chunk } from "./chunker";
export { embed, embedQuery, EMBED_DIM } from "./embeddings";
