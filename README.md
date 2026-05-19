# Shishya — `shishya.in`

> **Free, community-driven education companion for every stage of Indian education.**
> Schooling, entrance exams, colleges, scholarships, jobs, study abroad — extensive info, honest answers, and real handholding. Built by [Surge](https://surgesoftware.co.in). For every student.

Shishya means *student / disciple*. The product treats every student as worthy of the best
preparation — regardless of geography, language, or ability to pay coaching fees.

---

## Vision

A student opens the site, signs in with Gmail, picks an exam (SSC CGL / NEET / JEE / ...),
sees the syllabus, takes a diagnostic mock, and from that point on works with an AI tutor
that:

1. **Maps weaknesses** from each attempt — deterministic computation, LLM only frames it.
2. **Generates personalised mocks** — adaptive, topic-focused, or free-form by request.
3. **Explains every wrong answer** — step-by-step in their language.
4. **Coaches weekly** — honest summary of progress, one realistic goal for next week.
5. **Chats** — answer questions, give intuition, suggest next action.

Everything free. Forever, for the core experience.

---

## Top 10 launch exams

| # | Exam | Volume / yr | Status |
|---|------|-------------|--------|
| 1 | SSC CGL | ~30L | **MVP launch** |
| 2 | RRB NTPC | ~1.25Cr | Phase 2 |
| 3 | IBPS PO | ~15L | Phase 2 |
| 4 | NEET UG | ~24L | Phase 2 |
| 5 | JEE Main | ~14L | Phase 3 |
| 6 | UPSC Prelims | ~11L | Phase 3 |
| 7 | CUET UG | ~14L | Phase 3 |
| 8 | CTET | ~30L | Phase 4 |
| 9 | GATE CSE | ~1L | Phase 4 |
| 10 | CAT | ~3.5L | Phase 4 |

The platform supports all 10 from day one in code (`seed/exams/index.ts`). Per-exam
**syllabus** and **question bank** ship in phases. SSC CGL is fully seeded as the launch
example.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                          Browser (PWA)                       │
│           Next.js 15 · Tailwind · shadcn · Hindi/EN           │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                       Next.js API routes                     │
│    auth · exams · mocks · attempts · chat · explain · coach  │
└────────┬───────────────────────────────────┬─────────────────┘
         │                                   │
┌────────▼─────────┐               ┌─────────▼──────────────┐
│   Postgres       │               │   AI Pipeline           │
│   (Prisma)       │               │   src/lib/ai/*          │
│                  │               │                         │
│ Users · Exams    │               │ • diagnostic.ts         │
│ Subjects · Topics│               │ • generator.ts          │
│ Questions · Mocks│               │ • tutor.ts (streaming)  │
│ Attempts         │               │ • explainer.ts          │
│ WeaknessMap      │               │ • coach.ts (weekly job) │
│ ChatSessions     │               │                         │
└──────────────────┘               │   Anthropic SDK         │
                                   │   + prompt caching      │
                                   └─────────────────────────┘
```

**Key engineering choice — prompt caching.** The platform persona, safety rules, and
syllabus blocks are sent as `cache_control: ephemeral` so subsequent calls within the
5-minute TTL pay ~10% for those tokens. This is what makes "free for everyone" viable
at scale.

---

## Repo layout

```
shishya/
├── prisma/
│   └── schema.prisma          # Full data model
├── src/
│   └── lib/
│       └── ai/
│           ├── client.ts       # Shared Anthropic client + caching helpers
│           ├── prompts.ts      # Static prompt blocks (cached)
│           ├── types.ts        # All shared TS types
│           ├── diagnostic.ts   # Post-mock weakness analysis
│           ├── generator.ts    # Adaptive / topic / full mock generation
│           ├── tutor.ts        # Streaming chat tutor
│           ├── explainer.ts    # Step-by-step solution explainer
│           ├── coach.ts        # Weekly progress coach
│           └── index.ts        # Public surface
├── seed/
│   ├── exams/
│   │   ├── index.ts            # All 10 exams metadata
│   │   └── ssc-cgl-syllabus.ts # SSC CGL → 4 subjects → ~55 topics
│   └── questions/
│       └── ssc-cgl-quant.ts    # 50 sample SSC CGL Quant questions
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in:
# - DATABASE_URL  (Neon / Supabase / Railway Postgres)
# - GOOGLE_CLIENT_ID / SECRET   (https://console.cloud.google.com/)
# - ANTHROPIC_API_KEY  (https://console.anthropic.com/)
# - NEXTAUTH_SECRET  (run: openssl rand -base64 32)
```

### 3. Initialise the database

```bash
npm run db:generate          # generate Prisma client
npm run db:push              # push schema to your DB (or use `db:migrate` for migrations)
```

### 4. Seed content

```bash
npm run seed:exams           # 10 exams metadata
npm run seed:ssc-cgl         # SSC CGL syllabus + 50 sample questions
# OR everything in one go:
npm run seed:all
```

### 5. Run locally

```bash
npm run dev
# open http://localhost:3000
```

---

## Content pipeline (the Surge AI play)

We use **AI-first authoring with SME validation**:

1. SME defines the syllabus tree (one-time per exam — already done for SSC CGL).
2. Claude generates questions per topic per difficulty (the 50 in `ssc-cgl-quant.ts`
   are a proof-of-concept of this).
3. SME reviews, fixes, marks `validated: true`.
4. Only `validated: true` questions are served to live mocks.

**Cost saving vs pure SME:** ~5–10x lower per validated question.
**Risk mitigated:** AI hallucinations never reach a student.

---

## AI services — at a glance

| Service | When invoked | Returns |
|---------|--------------|---------|
| `runDiagnostic` | After every mock submission | Weakness map + summary + recommended actions |
| `generateMock` | Student starts a new mock | List of question IDs + rationale |
| `tutorReply` / `tutorStream` | Student opens chat with AI | Reply + suggested follow-up actions |
| `explainSolution` | Student reviews a wrong answer | Step-by-step + why their choice was wrong |
| `generateWeeklyCoach` | Scheduled (Sunday night) | Weekly summary + next-week goal |

All services share `src/lib/ai/client.ts` so caching, model config, and observability stay
consistent.

---

## Roadmap

- [x] Data model
- [x] AI pipeline scaffolding
- [x] SSC CGL syllabus + 50 sample questions (proof of concept)
- [ ] Auth + landing page (UI work — founder)
- [ ] Mock player UI (founder)
- [ ] Diagnostic results screen (founder)
- [ ] Chat tutor UI (founder)
- [ ] Soft launch on shishya.in to 50 students
- [ ] SME validation of AI-generated questions
- [ ] Hindi UI strings + Hindi-language explanations
- [ ] Mobile PWA polish
- [ ] Roll out exams 2–10

---

## License

Code: source-available, terms TBD.
Content: free for student use, attribution required for redistribution.

Built with care by Surge — `surgesoftware.co.in`.
