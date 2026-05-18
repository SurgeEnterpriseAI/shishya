# Phase 0 Audit Report — pre-Phase-1 gate

Per the next-shift brief, Phase 0 must be reviewed and acknowledged
before any Phase 1+ feature work proceeds. This report covers all
four audit categories.

---

## 0.1 Verification loop integrity

### What I tested (mechanically — no browser sessions available)

| Test | Expected | Actual | Verdict |
|---|---|---|---|
| `POST /api/facts/:id/verify` without auth | 401 | 401 `{"error":"UNAUTHENTICATED"}` | ✅ |
| `GET /api/facts/fkt-does-not-exist` | 404 | 404 `{"error":"Fact not found"}` | ✅ |
| `POST` with bad `actionType` while unauthed | 401 (auth short-circuits) | 401 | ✅ (correct ordering) |
| `POST` FLAG without notes | 400 (zod) | 401 (auth short-circuits) | ⚠ can't fully test without session |
| `POST` SUGGEST_UPDATE without proposedValue | 400 (zod) | 401 | ⚠ same |

### What I CANNOT test without a real browser session

Per your brief:

- ✗ Fresh user sign-up → click NIRF badge → confirm verification → `/me` counter increments
- ✗ Same user clicking verify twice (dedup via unique constraint — `unauthed` test can't verify the path)
- ✗ Anonymous user clicking verify (panel should prompt sign-in, not silently fail)
- ✗ "This doesn't match" flag form opens, submits, admin queue receives
- ✗ Badge state transition AI → Verified after 3 community confirms (would need 3 fresh accounts)
- ✗ Verification panel timeline shows real timestamps + correct verifier badges

**This list is the gating risk.** Until you (or a real student in a browser) walks through the demo path, I can't certify the loop end-to-end. The HTML structure check I did earlier confirms the buttons render correctly + the API endpoints respond correctly, but a live click + auth + DB write chain still needs human verification.

Recommendation: **before Phase 1, you sign in once and run the full demo path** (sign up fresh if you want; or just use your existing account on a fact you haven't already verified). Report back what happens. If it works, Phase 0.1 closes; if not, log the failure and I diagnose.

---

## 0.2 Attribution middleware audit

```
All-time User table breakdown:
  NULL                                  : 73   (old signups, pre-fix)
  shishya.in                            :  6   (internal homepage → /login)
  linkedin.com                          :  1   (first real external referral!)
  com.google.android.googlequicksearchbox : 1   (Google search app on Android)

Signups since the AWAIT fix (09:30 UTC May 17):
  BEFORE matcher-fix (await-only):
    captured        : 1
    NULL            : 0
  AFTER matcher-fix:
    captured        : 4    (3 × shishya.in, 1 × Android Google Search)
    NULL (never reached dashboard, can't capture) : 3
    NULL (reached dashboard but capture failed)    : 0   ← critical bucket empty
```

**Verdict: HEALTHY.** Every user who completed the signup + reached `/dashboard` was successfully attributed. The 3 NULL-after-fix users all show `emailVerified=null, onboardedAt=null` — they abandoned mid-OAuth flow before any capture could run. That's a signup-funnel issue, NOT an attribution bug.

The `linkedin.com` row in the all-time tally is the first real external referral we have on record. So the marketing posts ARE working when people actually complete signup.

Closes Phase 0.2.

---

## 0.3 Data quality audit — 25-fact random sample

### Source-URL resolves after retry with `GET` + browser UA

| Outcome | Count | Notes |
|---|---|---|
| 200 OK (with or without harmless trailing-slash redirect) | 18 | NIRF, IIT-system, IIM-system, NLU-system mostly fine |
| HEAD-blocked but `GET` returns 200 | 3 | IIT Kharagpur, RMNLU Lucknow, IIM Shillong (transient 500) |
| Truly unreachable from this machine | 2 | `biharboardonline.bihar.gov.in`, `maef.nic.in` (may be IP/UA blocking; needs browser check) |
| **Confirmed broken** | 2 | `cbse.gov.in/cbsenew/scholarship.html` → 404. `aicte-india.org → aicte.gov.in/.../Saksham` → 404 |

**Net source-resolves rate: 21 / 25 = 84%.**

That's below your 90% threshold for proceeding. Three things to address before Phase 1:

1. **CBSE single-girl scholarship URL is 404.** The CBSE scholarships page moved or got removed. Need to find the new URL or remove the fact.
2. **AICTE Saksham URL is 404.** Same — AICTE migrated `aicte-india.org` → `aicte.gov.in` and the Saksham path under the new domain returns 404. Need to find the current page.
3. **Bihar Board and MAEF sites unreachable from my machine** — may be infrastructure issues or IP blocking. Visit each in a browser to confirm whether the source is genuinely down or just blocking automated requests. If genuinely down, the FACT needs a different source URL.

**No claim-value accuracy spot-check done** — I can't read source PDFs or HTML pages reliably from a script and judge content. That part needs human review per the brief.

### Sample of the actual confirmed-broken URLs

- `https://www.cbse.gov.in/cbsenew/scholarship.html` — 404
  - Used by: scholarship `cbse-single-girl` (Eligibility, Amount, Application URL, Application window — 4 facts)
- `https://www.aicte-india.org/schemes/students-development-schemes/Saksham` — redirects to aicte.gov.in/.../Saksham which is 404
  - Used by: scholarship `saksham-aicte` (Eligibility — 1 fact, possibly more)

So the data-quality bug affects ~5 facts directly. Once those scholarship URLs are corrected, the seed re-runs and `aiCheckCount` resets, the accuracy rate should jump above 90%.

---

## 0.4 Cross-link sanity check on 5 exam pages

| Exam | Category | Maps to stream | Result |
|---|---|---|---|
| JEE Main (`JEE_MAIN`) | ENGINEERING | engineering | ✅ Top 5 = IIT Madras #1, IIT Delhi #2, IISc, IIT Bombay #3, IIT Kanpur #4. *(See note 1)* |
| NEET UG (`NEET_UG`) | MEDICAL | medical | ✅ Top 5 = AIIMS Delhi, PGIMER Chandigarh, CMC Vellore, NIMHANS, JIPMER |
| CLAT | n/a | n/a | ⚠ **Exam doesn't exist in DB** — no `/exams/CLAT` page to render cross-links on |
| TNPSC Group I (`TN_TNPSC_GROUP1`) | STATE_LEVEL | — | ✅ Correctly returns NO cross-links |
| GATE CS (`GATE_CSE`) | ENGINEERING | engineering | ✅ Same engineering list. Works via ENGINEERING category fallback. *(The override map has `GATE` instead of `GATE_CSE` — dead code; doesn't break anything because the category fallback catches it.)* |

**Note 1:** IISc Bangalore renders as "NIRF engineering #2" on the JEE Main exam page, but its actual NIRF data has only `overall=2, university=1, research=1` — no `engineering` rank. The component is showing the **overall rank** with the **wrong category label**. Minor display bug; fact-value is wrong. Affects every exam page that surfaces IISc in its top-5 engineering cross-link list.

### Cross-link verdict

4/5 working as intended. One content gap (CLAT not seeded) and one minor display bug (IISc label).

---

## Risks + technical debt observed

1. **The `seed-facts.ts` is run-it-yourself-from-local.** No Vercel cron or admin trigger. If data gets stale, someone needs to remember to re-run it. Eventually this should be a scheduled job.

2. **Source URLs are seeded once and never re-checked.** The AI verification background job (spec Phase 4) is the right home for this — it would catch the CBSE/AICTE 404s automatically and flip those facts to `NEEDS_REVIEW`. Without that cron, our `lastAiCheckDate` is essentially `ingestion date` and never updates.

3. **The dedup pre-check in `POST /api/facts/[id]/verify` races against the unique constraint.** Two near-simultaneous clicks from the same user could both pass the pre-check then one fail at the constraint. The catch handles it (returns 409), but the experience would be "I clicked once and got success, then clicked again and got 'already verified'" which is correct but jarring. Low priority.

4. **`computeFactStatus` runs after every verification.** Cheap right now (single-fact recalc) but if a Trusted Verifier programmatically batches 50 verifies, that's 50 status recomputes. Eventually batch these.

5. **`/me` page joins Verification → Fact in a single raw SQL query.** Works fine at current scale; fine in raw SQL. Move to typed Prisma once local generate stops blocking.

6. **No retry logic on the `POST verify` endpoint.** If the transaction fails mid-way (e.g., counter update succeeds but status recompute fails), no rollback because the success counters are already committed. Should be wrapped in a single transaction OR done with optimistic concurrency. The current `prisma.$transaction` wrapper handles inserts but not the second-pass status update.

7. **The new badge progress pill (`1/3`) is rendered via raw SQL → server component path.** Whenever a verification lands the page won't update without a refresh. Could be improved with server-side mutation + redirect or a client-side optimistic update inside `VerificationPanel`.

8. **Scholarship facts use page-anchor IDs (`/scholarships#slug`) for pageId** — they don't have their own route. The verification panel works, but a user who clicks a scholarship fact badge can't be linked back to a meaningful page from the panel. When Phase 2 ships per-scholarship pages at `/scholarships/[slug]`, the seed script should migrate the pageIds.

9. **CBSE single-girl scholarship and AICTE Saksham have broken official URLs** — content correction needed before AI re-verification cron runs (otherwise those facts immediately flip to `SOURCE_UNREACHABLE`).

---

## Recommendation: gate Phase 1 on three things

**Cannot proceed safely until:**

1. **You or a real student walks the demo path in a browser** (sign in, click NIRF badge on `/colleges/iit-madras`, submit a verification, hit `/me`, confirm counter incremented + activity row visible). I can't do this from a script.

2. **Fix the 2 confirmed broken source URLs** (CBSE single-girl + AICTE Saksham). I can do this if you tell me the new official URLs, or skip and let the future AI verification job auto-flag them.

3. **Confirm the IISc-engineering-rank-mislabel is acceptable** as-is OR I patch the `CollegesForExamSection` sort fallback to label correctly when falling back to overall rank.

If those three close, Phase 0 closes and I move to Phase 1 (verification spec Phases 4-5: Trusted Verifier admin queue + Domain Expert credential flow).

---

## What I will NOT touch until Phase 0 closes

Per your gate: no Phase 1, no Phase 2, no Phase 3+, no new sections, no schema migrations, no scholarships ingestion, no Worldwide content. Standing by.
