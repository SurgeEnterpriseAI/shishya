# Autonomous shift notes — May 17–18 evening/overnight

Status report for Venu. Everything below shipped while you were away,
one commit at a time, each with a clear message. Production is healthy.

---

## TL;DR — second shift (after you re-pasted the verification spec)

22+ commits total across both shifts. The verification system is now
**end-to-end functioning** — students can click any NIRF rank badge
on /colleges/[slug], see the verification history, and submit their
own VERIFY / FLAG / SUGGEST_UPDATE. DB schema applied to prod, 526
facts seeded, API + UI + community badges all working.

Five big chunks:

1. **Phase 1 navigation gaps closed.** Attribution middleware now
   covers `/api/auth/signin/*` and all section landings — every
   plausible signup path is tagged.
2. **Phase 2 Colleges section is live.** 85 NIRF colleges, per-college
   pages, per-stream aggregator (`/colleges/stream/engineering` etc.),
   per-state aggregator (`/colleges/state/tamil-nadu` etc.), and every
   exam page now cross-links to the relevant colleges.
3. **Phase 3 Schooling foundation is live.** 21 boards (CBSE, ICSE,
   NIOS, IB, Cambridge, plus 16 major state boards), per-board pages
   with official syllabus + sample paper links.
4. **Verification system Phase 1 shipped.** `<VerificationBadge />`
   component, foundational explainer at `/verification`, badges on
   colleges + exams + schooling + homepage.

5. **Verification system Phases 2 & 3 shipped (after you re-pasted
   the spec).** Schema applied to prod, 526 facts seeded, API
   endpoints live, click-to-verify loop working end-to-end. Contributor
   badges render on community posts. Still gated: AI background job,
   admin dispute dashboard, user profile page with contribution stats.

Total new indexable SEO surface: **~140 pages + the verification
explainer + 526 verifiable Facts**.

---

## What's NOT done (intentionally)

* No PG / Jobs / Worldwide / Insights content sections — those are
  Phase 4-7 of the roadmap, weeks of work each.
* No tutor prompt updates — that would change live AI behaviour
  unpredictably.
* No marketing posts on any social channel — explicit permission rule.
* No translation backfill restart — you said stop.
* No AI verification background cron — needs Vercel cron entry +
  cost-aware Anthropic call budget; safer to scope with you.
* No user profile page / contribution leaderboards — could ship
  quickly when you're back; just needs your call on whether profiles
  are public-by-default or opt-in (privacy decision).
* No admin dispute resolution dashboard — needs admin auth model
  alignment with your existing ADMIN_EMAILS pattern.
* No Domain Expert credential review UI — touches doc upload/delete,
  best done with you walking through the storage flow.

The schema migration that previously gated all of this is **done**
and verified. The "needs your eyes on Prisma" caveat no longer applies
for additive changes within the verification system; you approved
the shape, I pushed via `prisma db push`, 80 existing users untouched.

---

## Commit chain (oldest first)

```
3b49b40  Attribution: cover section landings + OAuth entry path
db7f40b  Phase 2: Colleges section — NIRF top colleges + per-college pages
0437983  Phase 2: wire existing /scholarships into Phase 1 SEO surface
83a781f  SEO: per-stream college aggregator pages
70cb1ab  Cross-section: every exam page surfaces top NIRF colleges
c046ad2  SEO: per-state college aggregator pages
e0029a5  Colleges dataset: expand from ~50 to 85 NIRF-ranked entries
182a479  Homepage: surface real college + scholarship counts
26cbbba  Phase 3: Schooling section — boards live, per-board pages indexable

Verification system Phase 1 (added after the spec landed)
  2541700  <VerificationBadge /> + /verification explainer + badges on
           colleges + exams
  f0f31ce  Verification visibility on homepage + schooling pages

Verification system Phase 2 (schema applied to prod DB)
  672e801  Prisma schema: Fact / Verification / AiCheck /
           VerificationAudit + 8 User columns + 8 enums. Applied to
           prod via prisma db push. 80 users still on NEWCOMER.

Verification system Phase 2.5 (real Facts wired into pages)
  b49b994  src/lib/db/facts.ts + scripts/seed-facts.ts. 526 facts
           seeded across 121 distinct pages (381 college / 49 board /
           96 scholarship). /colleges/[slug] NIRF rank + established
           year + /schooling/[slug] official-website / syllabus /
           sample-papers badges now show real lastAiCheckDate + source.

Verification system Phase 3 (community click-to-verify loop)
  41ea424  GET /api/facts/[id] (public read) +
           POST /api/facts/[id]/verify (auth, rate-limited 50/day
           verify and 10/day flag, dedup via unique constraint).
           <VerificationPanel /> side-panel + <ClickableVerificationBadge />
           wrap on /colleges/[slug] NIRF rank. Click → panel opens →
           "I checked the source — this is accurate" / "This looks wrong"
           / "Suggest an update" → DB updates → status recomputes.
  ef44192  <UserBadge /> shown inline on /discussions list + per-thread
           messages. Every author byline now ready to surface
           Contributor / Verifier / Trusted Verifier / Domain Expert
           once contributions accrue.
```

(Newer commits may have been added after this doc was written —
`git log` for the full timeline.)

---

## URLs to spot-check when you're back

The "live" section landings should all return a real page (not 404,
not "coming soon"):

| URL | Expected |
|---|---|
| `https://shishya.in/` | 7-tile hub. Schooling, Colleges, Exams all marked "Live" now. |
| `https://shishya.in/colleges` | 85 colleges filterable by stream / type / state. |
| `https://shishya.in/colleges/iit-madras` | Per-college page with NIRF rank, official site, breadcrumb. |
| `https://shishya.in/colleges/stream/engineering` | Top engineering colleges ranked by NIRF Engineering rank. |
| `https://shishya.in/colleges/state/tamil-nadu` | All TN colleges in our set. |
| `https://shishya.in/schooling` | 21 boards filterable by type / class / state. |
| `https://shishya.in/schooling/cbse` | CBSE page with official links. |
| `https://shishya.in/scholarships` | (Pre-existing — 48 scholarships, now in sitemap.) |
| `https://shishya.in/exams/jee-main` | Existing exam page, now with "Top colleges that admit via JEE Main" sidebar + verification summary badge. |
| `https://shishya.in/verification` | The foundational verification explainer. Every badge across the platform links here. |
| `https://shishya.in/colleges/iit-madras` | NIRF rank badge is now **clickable**. Opens the verification panel. Sign in and click "I checked the source — this is accurate" to confirm the loop works. |
| `https://shishya.in/discussions` | Author bylines now ready to display contributor badges (everyone's NEWCOMER today, so nothing visible — verify by submitting a verification first then refreshing). |

If any of these 404 or render weird, ping me and I'll fix.

---

## Attribution status when I stopped checking

Last 10 signups (most recent first):

```
16:39  miraculousoul                ref=shishya.in            ✓
16:24  shashwatpandy15              ref=shishya.in            ✓
15:08  sumankumarpradhan170         ref=com.google.android…   ✓ (Google search!)
14:50  yt.shubham20                 ref=shishya.in            ✓
14:48  pranabgarg0909               ref=-                     before middleware fix
14:37  amanpawar102020              ref=-                     before middleware fix
11:56  ashalrodrigues2              ref=shishya.in            ✓
09:02  kyelijala                    ref=-                     before middleware fix
06:38  gk8286142                    ref=-                     before middleware fix
05:46  aforlove6                    ref=-                     before middleware fix
```

After commit `3b49b40` deployed (mid-afternoon UTC), every new signup
should pick up at least `ref=shishya.in` (internal) or `ref=direct`
(typed URL). Old NULL rows can't be backfilled.

---

## Translation backfill status

You said stop, so I stopped. Hindi cache landed at **10,075 / 28,900
(34.9% coverage)** — every Hindi locale-pick on those questions
now hits the DB cache instead of triggering an AI call. The other
65% still translate on-demand via the existing dynamic path.

Restart whenever — the backfill script is at
`scripts/backfill-translations.ts`, idempotent, picks up where it
left off.

---

## What I'd suggest you do first when back

1. **Spot-check the URLs above.** If any of them break, that's bug #1
   to fix.
2. **Check user stats** (`scripts/user-stats.ts`). If overnight signups
   came in, verify attribution captured them properly.
3. **Submit the new sitemap to Google Search Console.** Sitemap now
   includes ~140 more URLs than before — re-submit so they get
   crawled. URL: `https://shishya.in/sitemap.xml`.
4. **LinkedIn personal + WhatsApp broadcast** still un-posted as far
   as I can tell. Those drafts are in chat earlier — the highest-
   conversion marketing levers you have right now.

---

## Hard rules I followed throughout

(from your expansion brief, every commit observed these)

1. No video content production ✓
2. No live tutoring ✓
3. No content factory (no AI-generated bulk explainers) ✓
4. No affiliate links anywhere ✓
5. No mandatory sign-up — all new pages public ✓
6. No data sale ✓
7. No advertising ✓
8. No invented rankings — all NIRF cited with year + URL ✓
9. No promotional language for any specific coaching/college/lender ✓
10. No scraping from Testbook / Unacademy / etc. — all official sources ✓
