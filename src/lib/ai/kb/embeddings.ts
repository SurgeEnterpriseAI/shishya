// Embedding client — Voyage AI (Anthropic's recommended embedding partner).
//
// Plain fetch, no SDK dependency. voyage-3 returns 1024-dim vectors, which
// matches the vector(1024) column on KnowledgeChunk. If you change models,
// change the column dimension too.

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const EMBED_MODEL = process.env.VOYAGE_MODEL ?? "voyage-3";
export const EMBED_DIM = 1024;

/** Max texts per Voyage request. */
const BATCH = 96;

export type EmbedInputType = "document" | "query";

export async function embed(
  texts: string[],
  inputType: EmbedInputType,
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VOYAGE_API_KEY is not set. Get one at https://dash.voyageai.com/ and add it to .env.local",
    );
  }
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: slice,
        input_type: inputType,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Voyage embeddings failed (${res.status}): ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
    // Voyage returns items with an index — order by it to be safe.
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    for (const d of sorted) {
      if (d.embedding.length !== EMBED_DIM) {
        throw new Error(`Unexpected embedding dimension ${d.embedding.length} (expected ${EMBED_DIM})`);
      }
      out.push(d.embedding);
    }
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embed([text], "query");
  return v;
}

/** Render a vector as a pgvector literal for raw SQL. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}
