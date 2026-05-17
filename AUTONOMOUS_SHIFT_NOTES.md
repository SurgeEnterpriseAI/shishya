# Autonomous shift notes — May 17–18 evening/overnight

Status report for Venu. Everything below shipped while you were away,
one commit at a time, each with a clear message. Production is healthy.

---

## TL;DR

10 commits shipped. Three big things:

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

Total new indexable SEO surface: **~140 pages** beyond Phase 1
(85 colleges + 8 stream pages + 25 college state pages + 21 board
pages + ~5 cross-section pages).

---

## What's NOT done (intentionally)

* No DB schema migrations — too risky without your eyes on Prisma.
* No PG / Jobs / Worldwide / Insights content sections — those are
  Phase 4-7 of the roadmap, weeks of work each.
* No tutor prompt updates — that would change live AI behaviour
  unpredictably.
* No marketing posts on any social channel — explicit permission rule.
* No translation backfill restart — you said stop.

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
| `https://shishya.in/exams/jee-main` | Existing exam page, now with "Top colleges that admit via JEE Main" sidebar. |

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
