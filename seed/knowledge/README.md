# Knowledge corpus — source documents for the knowledge spine

Markdown documents in this tree get ingested into the RAG knowledge base
(`KnowledgeSource` / `KnowledgeChunk`) via `npm run kb:ingest`. The AI tutor
retrieves and **cites** these through its `search_knowledge` tool; the
content factory grounds question generation in them.

## Layout

```
seed/knowledge/
  <exam-or-area>/         one folder per exam (ssc-cgl, neet-ug, …) or
                          cross-exam area (ncert, careers, …)
    *.md                  one document per coherent source
```

## Authoring rules

1. **Every document starts with a provenance blockquote** — where the facts
   come from, the canonical URL, and the date they were last verified.
2. **Use headings generously.** The chunker splits on headings and carries
   the breadcrumb into retrieval — `## Eligibility — age` retrieves far
   better than a wall of text.
3. **No invented facts.** If a number can't be traced to the cited source,
   it doesn't go in. Write "check the official notification" instead.
4. **Date-sensitive facts get the year in the filename/title**
   (`ssc-cgl-2026-notification-key-facts.md`) so a new cycle is a new
   document, and the old one gets archived automatically on re-ingest.

## Reliability tiers (passed at ingest time)

| Tier | Meaning | Example |
|---|---|---|
| `OFFICIAL` | Text taken directly from the official body | SSC notification PDF text |
| `STANDARD_TEXT` | Standard reference material | NCERT chapter summaries |
| `PYQ` | Previous-year question papers | CGL 2023 Tier 1 paper |
| `CURATED` | Shishya-authored, cross-verified summaries | files in ssc-cgl/ |
| `COMMUNITY` | Community-contributed, unverified | student-submitted notes |

Curated summaries of official documents are `CURATED`, not `OFFICIAL` —
upgrade only when the text is verified against the official PDF itself.

## Ingesting

One-time DB setup (enables pgvector + index): `npm run kb:setup`
Requires `VOYAGE_API_KEY` in the environment.

```bash
# whole folder at one tier
npm run kb:ingest -- --dir seed/knowledge/ssc-cgl --tier CURATED \
  --exam SSC_CGL --publisher Shishya --url https://ssc.gov.in/

# single document with full provenance
npm run kb:ingest -- --file seed/knowledge/ssc-cgl/ssc-cgl-exam-pattern.md \
  --title "SSC CGL — Exam pattern (Tier 1 and Tier 2)" --tier CURATED \
  --exam SSC_CGL --publisher Shishya --url https://ssc.gov.in/ --published 2026-06-12
```

Re-ingesting unchanged files is a no-op (content hash); a changed file
archives the old version so retrieval never mixes stale and fresh facts.
