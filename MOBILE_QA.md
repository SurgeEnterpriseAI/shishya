# Mobile QA checklist · Shishya

Run on a **real Android device** (not Chrome DevTools mobile emulation — they hide too many real issues). 10 minutes.

Connect your laptop and phone to the same Wi-Fi, find your laptop's local IP (`ipconfig` on Windows), and open `http://<your-ip>:3000` on the phone.

> If `npm run dev` only listens on localhost, restart it with: `npx next dev --hostname 0.0.0.0` so the phone can reach it.

---

## Visual sanity (1 min)

| # | Page | Check |
|---|------|-------|
| 1 | `/` | Hero, value props, exam grid all readable. No horizontal scroll. |
| 2 | `/` | Tap **हिं** in header — entire page renders in Devanagari. Tap **EN** — back to English. |
| 3 | `/` | "Sign in with Google" button visible above the fold. |
| 4 | `/login` | Card centred, button reachable with thumb. |
| 5 | `/dashboard` | Cards stack vertically, no overflow. |
| 6 | `/exams/SSC_CGL` | Syllabus list readable; weakness bars not clipped. |

---

## Critical interactions (5 min)

| # | Flow | Pass criteria |
|---|------|---------------|
| 7 | Sign in with Google | Returns you to `/dashboard` with your name in the welcome header. |
| 8 | Tap **Take diagnostic mock** on `/exams/SSC_CGL` | Mock player opens with timer top-right and Q1 visible. |
| 9 | Mock player — answer flow | Tap an option (A/B/C/D) — visibly selected. Tap **Save & next →** advances. |
| 10 | Mock player — palette | Tap any number in the palette grid → jumps to that question. Current Q has saffron ring. |
| 11 | Mock player — mark for review | Tap "Mark for review" — pill turns amber and shows ✓. |
| 12 | Mock player — back to a question | Previously-answered Q shows your selection still highlighted. |
| 13 | Mock player — submit | Tap **Review & submit** on Q12 → confirmation modal opens, Submit button works. |
| 14 | Results page | Score cards visible. Topic bars rendered. AI diagnostic shown (if API key set). |
| 15 | Per-Q review | Tap any Q row to expand — correct answer green, your answer (if wrong) red. |
| 16 | AI explain | Tap "Explain step-by-step (AI)" — loading state then steps appear within 5s. |
| 17 | Chat tutor | Open `/chat`. Tap a starter prompt. Reply streams in character-by-character. |

---

## Edge cases (3 min)

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 18 | Lock the phone mid-mock for 30s, then unlock | Timer shows correct elapsed time (continued counting). State persists. |
| 19 | Switch tabs mid-mock for 30s, return | Same — autosave fires on visibility change; nothing lost. |
| 20 | Force-kill the browser mid-mock, reopen | Re-enter `/mocks/<id>` — your progress is restored. |
| 21 | Refresh the mock player page | Selected answers preserved (autosave already pushed them). |
| 22 | Submit with 5 questions unanswered | Confirm modal warns "Unanswered questions get 0 marks." |
| 23 | Wait until timer hits 00:00 | Auto-submits without action; results page loads. |
| 24 | Slow-network test (Chrome DevTools → Slow 3G via remote debug, or use airplane mode + slow Wi-Fi) | Submit still completes (longer wait). No data loss. |

---

## Accessibility (1 min)

| # | Check |
|---|-------|
| 25 | Pinch-zoom is enabled (no `<meta name="viewport" maximum-scale="1">`). Verified: yes. |
| 26 | All buttons are ≥40 px tall (thumb-tappable). Spot-check: option buttons, palette numbers, header buttons. |
| 27 | Text contrast — no light-grey-on-white anywhere unreadable. Spot-check: footer copyright, "step 01" labels. |

---

## Hindi rendering (1 min)

| # | Check |
|---|-------|
| 28 | After switching to Hindi, the **शि** logo glyph and Devanagari headings render with proper conjuncts (e.g. "शिक्षा" — not boxes). |
| 29 | Numbers in Hindi pages still render in Latin (5, 10, 12) — that's expected; we don't use Devanagari numerals. |
| 30 | Chat starter prompts in Hindi list correctly. |

---

## What to do if something fails

1. Note the failing item number, device model, browser, OS version.
2. Repro on Chrome DevTools → Device Mode (Pixel 7, Galaxy S20, iPhone 13) — see if it's device-specific.
3. File a quick GitHub issue or paste into the founder thread.
4. Common gotchas:
   - Old Android Chrome (<v100) chokes on some `flex` features → check Tailwind output.
   - iOS Safari can be picky about `100vh` (use `100dvh` or fixed heights when this comes up).
   - Slow phones may show streaming chat as one big chunk instead of character-by-character — that's a perf concern, not a bug.

---

## After mobile QA passes

You're done. Push to `main`. Ship.

```bash
git add -A
git commit -m "Mobile QA passed; ready for soft launch"
git push
```
