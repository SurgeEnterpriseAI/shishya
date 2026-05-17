# Shishya — Cross-channel launch pack (beyond Reddit)

> Companion to MARKETING_DAY1.md (which covers Reddit + Telegram + Quora).
> Every post below has its own utm_source baked into the link so tomorrow
> we can read `signupReferrerHost` in the DB and know exactly which channel
> converted. Order is by yield-per-effort for an Indian exam-prep platform.

## Posting rules (apply to every channel)

- The first-comment rule: on Reddit, LinkedIn, FB groups, Discord — put the
  link in the FIRST COMMENT, not the post body. Algorithms downrank link
  posts. Bodies stay link-free.
- Vary the text per channel. Copy-pasting the same paragraph everywhere
  trips spam detection on every major platform.
- No mass-DMing strangers. Ever. Instant ban risk on every platform.
- Disclose ownership when natural: "I built this", "(my project, free)".
  Hiding it performs worse than admitting it.
- Pace it: 2-3 channels per day for 4-5 days beats firehose-then-silence.

## Channel 1 — LinkedIn (founder voice)

**Account:** Venu Gopal Reddy Muvva (personal profile)
**Best time IST:** 9-10 AM weekdays
**Link to use:** `https://shishya.in/?utm_source=linkedin&utm_campaign=founder_launch`
**Where to put the link:** first comment, not the post body.

### Post text — paste verbatim

```
For the last 9 months I have been quietly building something for the 30 million Indian students who write an entrance exam every year.

Shishya. Free. No ads. No "premium" lock. 163 entrance exams covered — JEE, NEET, UPSC, SSC, all state-level, banking, defence, civil services.

What it actually does:
- Generates a real mock test for any exam in under 10 seconds, customised to your weak topics
- Reads your performance and tells you what to study next, not in vague platitudes but at the chapter level
- A built-in tutor that explains every wrong answer the moment you submit
- Hindi, Telugu, Kannada, Tamil, Bengali, Gujarati, Marathi, Punjabi — questions translate to your language with one click

I built it because the existing options either cost more than a student can afford or treat aspirants as test subjects to upsell to. India deserves better, and AI finally makes "better" cheap to produce.

It is live. If you know an aspirant who is grinding for an exam right now, please send them the link in the first comment. That is the only marketing budget I have.

— Venu
Founder, Surge Software Solutions
```

### First-comment text

```
Link: https://shishya.in/?utm_source=linkedin&utm_campaign=founder_launch

Genuinely free, no signup wall on browsing. Sign in to save attempts. Feedback welcome — DM me if anything is broken.
```

## Channel 2 — LinkedIn (company page)

**Account:** Surge Enterprise AI / Surge Software Solutions company page
**Best time IST:** 11 AM weekdays (after the personal post has 2-3 hours of head start)
**Link:** `https://shishya.in/?utm_source=linkedin_company&utm_campaign=launch`

### Post text

```
Surge Enterprise AI's first consumer product is live: Shishya.

A free, AI-first entrance-exam prep platform for India. 163 exams. 9 languages. Adaptive mock generation. Built-in tutor.

The build philosophy: every Indian student should have the same quality of prep regardless of what their family can afford. AI makes that economically possible for the first time.

We will keep it free. The business model is enterprise, not ads.

Try it. Share it. Tell us what to fix.
```

### First-comment

```
https://shishya.in/?utm_source=linkedin_company&utm_campaign=launch
```

## Channel 3 — X (Twitter)

**Account:** Your personal X handle
**Best time IST:** 8-10 PM weekdays (Indian Twitter peaks evening)
**Link:** `https://shishya.in/?utm_source=x&utm_campaign=launch`

### Thread (paste each tweet as a separate post in a thread)

**Tweet 1**
```
I built a free AI-tutored prep platform for the 30M Indians who write an entrance exam every year.

163 exams. JEE to UPSC to RRB. 9 languages. Adaptive mock tests in 10 seconds.

No paywall. No upsell. Live now.

https://shishya.in/?utm_source=x&utm_campaign=launch
```

**Tweet 2**
```
The pain it solves:

- Existing prep sites charge ₹5,000-₹50,000. Most students can't justify it.
- "Free" sites are stuffed with ads and 5-year-old PDFs.
- Nobody adapts to YOUR weak topics. You drill where you're already strong.

Shishya does the adaptive part. Free, no asterisks.
```

**Tweet 3**
```
What's actually under the hood:

- 10,355 PYQs across 97 exams (and growing daily)
- Adaptive mock generation per attempt
- Question translation into 13 Indian languages
- A tutor that explains every wrong answer

Costs me real money to run. Worth it.
```

**Tweet 4**
```
If you know an aspirant — share this with them. That's all the marketing budget I have.

If you're an aspirant — please break it. DM me what's broken.

https://shishya.in/?utm_source=x&utm_campaign=launch
```

## Channel 4 — Facebook (exam-prep groups)

Facebook is the dark horse for Indian student traffic. The big groups have
50k-300k members and the moderators are usually friendly to free tools.

**Best time IST:** 7-9 PM (Indian FB peaks evening)
**Link template:** `https://shishya.in/exams/<EXAM_SLUG>?utm_source=fb_<group_short>`

### Groups to target (search these names on Facebook)

| Group name (search this) | Approx members | Exam |
|---|---|---|
| SSC CGL Aspirants 2026 | 200K+ | SSC CGL |
| SSC CHSL & MTS Aspirants | 100K+ | SSC CHSL/MTS |
| UPSC Civil Services Preparation | 300K+ | UPSC CSE |
| JEE Mains 2026 Aspirants | 150K+ | JEE Main |
| NEET UG 2026 Aspirants | 200K+ | NEET UG |
| IBPS PO/Clerk Aspirants | 80K+ | IBPS |
| RRB NTPC, Group D, ALP | 80K+ | Railway |
| GATE 2026 Aspirants | 60K+ | GATE |
| CTET / TET Preparation | 80K+ | CTET |
| CAT Preparation 2026 | 50K+ | CAT |

### Post template (rewrite the first sentence per group)

```
[Open with a sentence that matches the group — "Hi SSC CGL folks", "Hi UPSC aspirants" — then the body below]

Hi [exam] folks. I'm a non-aspirant who got tired of watching students pay ₹20,000 for mock test packs that go stale in three months, so I built a free one. 

It generates a fresh mock for [EXAM] every time, adapts to your weak topics from your last attempt, explains wrong answers as you go, and works in [Hindi / your language]. No payment, no signup wall to browse.

If you're prepping, give it a shot and tell me what's missing or broken. I'm building this for real students, not for VCs:

https://shishya.in/exams/<EXAM_SLUG>?utm_source=fb_<group_short>

Mods — happy to remove if this isn't allowed, just delete the post and let me know.
```

### Per-group link presets

```
SSC CGL group       → https://shishya.in/exams/ssc-cgl?utm_source=fb_ssccgl
UPSC group          → https://shishya.in/exams/upsc-cse?utm_source=fb_upsc
JEE group           → https://shishya.in/exams/jee-main?utm_source=fb_jee
NEET group          → https://shishya.in/exams/neet-ug?utm_source=fb_neet
IBPS group          → https://shishya.in/exams/ibps-po?utm_source=fb_ibps
RRB group           → https://shishya.in/exams/rrb-ntpc?utm_source=fb_rrb
GATE group          → https://shishya.in/exams/gate?utm_source=fb_gate
CTET group          → https://shishya.in/exams/ctet?utm_source=fb_ctet
CAT group           → https://shishya.in/exams/cat?utm_source=fb_cat
```

## Channel 5 — Discord (exam-prep servers)

**Link:** `https://shishya.in/?utm_source=discord&utm_campaign=launch`

### Servers to look for (search "Discord exam India" + the exam name)

| Server | How to find |
|---|---|
| JEE/NEET Aspirants India | search "JEE NEET discord India" |
| UPSC Civil Services | search "UPSC discord" |
| Indian Banking Aspirants | search "IBPS discord" |
| Indian Students | r/IndianStudents has an official server link in sidebar |
| btechtards | r/btechtards has a Discord link in sidebar |

### Intro message (post in #introductions or general)

```
Hey folks — built a free AI-based prep platform for Indian entrance exams (JEE, NEET, UPSC, SSC, banking, plus 158 others). Mock tests, adaptive practice, tutor for wrong answers, multilingual.

Genuinely free. Not selling anything. Hoping students here find it useful — would love feedback on what to add next.

https://shishya.in/?utm_source=discord

(Mods: happy to delete if this is too promotional, just ping me.)
```

## Channel 6 — Pagalguy (legacy MBA/CAT forum, still active)

**Link:** `https://shishya.in/exams/cat?utm_source=pagalguy`
**Where:** Find the active CAT/XAT/MBA threads on pagalguy.com → reply with a helpful answer that includes the link.

### Reply template

```
For mocks, the typical paid options are TIME, IMS, CL — each ₹10K-₹30K for a full pack. If budget is a constraint, I'd suggest also trying https://shishya.in/exams/cat?utm_source=pagalguy — it's a free AI-based mock generator, runs adaptive sets based on your weak sections. I built it; happy to take feedback if you find it useful.
```

## Channel 7 — Hacker News (Show HN)

**Link:** `https://shishya.in/?utm_source=hn`
**Best time:** Wednesday or Thursday, 9 AM Pacific = 9:30 PM IST. Posts launched at this time get the most engagement in the US morning window.

### Submission

**Title:** `Show HN: Shishya — Free AI-tutored prep for Indian entrance exams`

**URL:** `https://shishya.in/?utm_source=hn`

**Text (the "tell us about your project" box):**

```
30 million students in India write an entrance exam every year — JEE, NEET, UPSC, banking, defence, dozens of state-level. Prep platforms are either expensive (₹10K-₹50K) or full of stale 5-year-old PDFs.

I've been building Shishya for the last 9 months: free AI-tutored prep covering 163 exams. The hard parts:

1. Adaptive mock generation. Every attempt produces a fresh paper from a 10K+ PYQ bank, weighted by the student's weakest topics from their last submission. The AI is Claude Sonnet 4.5 acting as a tutor + paper-setter.

2. Multilingual translation. Question bodies, options, and worked solutions translate to 13 Indian languages on demand, cached per (question, locale). Indic scripts are 3-4x denser at the tokenizer than Latin, so batch sizes are tight.

3. Honest free. No upsell, no premium tier. The business model is enterprise consulting (separate company); Shishya is intentionally subsidised.

Stack: Next.js 15 + Postgres on Neon + Anthropic API + Vercel. ~10K PYQs seeded, 333+ live Hindi translations in the cache, growing daily.

Happy to answer anything. Especially curious about feedback on the adaptive scoring math (rank bands, percentile estimation), which is the hairiest piece.
```

## Channel 8 — IndieHackers + BetaList

### IndieHackers

**Link:** `https://shishya.in/?utm_source=indiehackers`
**Where:** Sign in → "Products" → "Submit a product"

**Title:** `Shishya — Free AI prep for India's 30M entrance-exam students`
**Tagline:** `163 exams. 9 languages. Adaptive mocks. Genuinely free.`

**Description:**
```
Free AI-tutored prep platform for Indian entrance exams (JEE, NEET, UPSC, SSC, IBPS, GATE, and 157 others). Generates adaptive mock tests, explains wrong answers, translates questions into 13 Indian languages. No paywall, no ads — business model is separate enterprise consulting.
```

Then post a build update in the IH "Milestones" section every few days.

### BetaList

**Link:** `https://shishya.in/?utm_source=betalist`
**Where:** betalist.com/submit (free submission, paid for faster review)

**Description (200 chars max):**
```
Free AI-tutored prep for India's 30M entrance-exam aspirants. 163 exams. 9 Indian languages. Adaptive mock generator, built-in tutor, no paywall. Live now.
```

## Channel 9 — Founder's WhatsApp / personal network broadcast

The single highest-converting channel. People you already know trust you;
they share it with the actual aspirants in their family.

**Link:** `https://shishya.in/?utm_source=whatsapp_personal`

### Broadcast message (paste to WhatsApp Business broadcast list)

```
Hi — quick personal favour.

After 9 months of nights-and-weekends I've shipped Shishya — a free AI-tutored prep platform for Indian entrance exams. JEE, NEET, UPSC, SSC, banking, every state exam — 163 in total. Genuinely free, no ads, no premium tier.

I'm not asking you to use it. I'm asking: do you know one student in your family or friend circle who is preparing for any competitive exam right now? Please send them this:

https://shishya.in/?utm_source=whatsapp_personal

That's the entire marketing plan. Word of mouth from people whose judgment students trust. Yours.

Thanks,
Venu
```

## Channel 10 — Press / blog outreach

Pitch one short email per outlet. Personalise the first paragraph; the
rest is the same.

**Link:** `https://shishya.in/?utm_source=press_<outlet>`

### Outlets

| Outlet | Email / submission |
|---|---|
| YourStory | tips@yourstory.com (founder feature pitch) |
| Inc42 | tips@inc42.com |
| Entrackr | tip@entrackr.com |
| ED Times | hello@edtimes.in (student-facing audience, big fit) |
| The Better India | contact@thebetterindia.com (social-good angle works here) |

### Pitch email template

**Subject:** `Free AI-tutored prep for 30M Indian aspirants — Shishya launch`

```
Hi [editor name],

I'm Venu Muvva, founder of Surge Software Solutions in Hyderabad. We just shipped Shishya — a free AI-tutored prep platform covering 163 Indian entrance exams (JEE, NEET, UPSC, SSC, banking, all state-level).

The angle that might interest [outlet name]: the entire platform is funded by our enterprise consulting business, not by ads or paywalls. We genuinely don't charge students. AI has made it economically possible to give a small-town aspirant the same prep quality as a Delhi coaching student, and that's the wedge we're working.

Live now:
https://shishya.in/?utm_source=press_[outlet_short]

Numbers in case it helps frame a story:
- 10,355 PYQs across 97 exams already in the bank
- 9 Indian languages, on-demand translation
- 72 users in the first 24 hours, 42 of those in the last day
- Built solo over 9 months; first product from Surge Enterprise AI

Happy to jump on a 15-min call or send more colour. Founder access, full transparency.

Thanks,
Venu
+91-90100-57000
venumuvva@gmail.com
```

## Channel 11 — Email signature

Update venumuvva@gmail.com and corp@surgesoftware.co.in signatures so every
outbound email is a soft impression. No CTA pressure, just there.

```
—
Venu Gopal Reddy Muvva
Founder, Surge Software Solutions Pvt Ltd

Shishya · Free AI-tutored prep for Indian entrance exams
https://shishya.in/?utm_source=email_sig
```

## Channel 12 — YouTube comments (top exam-prep channels)

You won't get many signups, but the SEO value of a thoughtful comment
under a top-ranked exam video lasts for months.

**Link:** `https://shishya.in/?utm_source=youtube_<channel>`

### Channels and the comment template

Drop one comment per video on RECENT (last 14 days) videos on these channels:

- Adda247 (SSC, banking, railway content)
- Khan Academy India (NEET, JEE)
- Physics Wallah (NEET, JEE)
- Unacademy UPSC / SSC / Banking branches
- StudyIQ (UPSC, SSC)
- Drishti IAS (UPSC Hindi medium)

**Comment template** (rewrite first sentence per video):

```
[Reference one specific point from the video] — solid breakdown. For folks who want to practice questions on this topic right now, I built a free mock generator that adapts to weak areas: https://shishya.in/?utm_source=youtube_addaa247 — no signup wall, just pick the exam and start. Hope it helps someone studying tonight.
```

## Channel 13 — College / coaching WhatsApp groups

Find the official group admins (NOT random group members) for college
batches, coaching institute alumni groups, etc. Drop one polite message.

```
Hi — quick share. I built a free AI prep tool for entrance exams (163 of them). No signup wall, no premium tier. Thought it might be useful for [college name / batch name] students prepping for [exam name]:

https://shishya.in/?utm_source=wagroup_<groupshort>

Happy to remove if this isn't allowed.
```

## Posting order (24-hour plan)

Do them in this order. Spread the load so you don't trigger anti-spam:

1. **0:00 (now)** — LinkedIn personal post (Channel 1)
2. **+30 min** — WhatsApp broadcast to personal network (Channel 9)
3. **+90 min** — LinkedIn company page post (Channel 2)
4. **+3 hr** — Update email signatures on both Gmail accounts (Channel 11)
5. **+4 hr** — Send press emails to YourStory + Inc42 + Entrackr (Channel 10)
6. **Evening 7-9 PM IST** — X / Twitter thread (Channel 3)
7. **Evening 8 PM** — Pick 2 Facebook groups, post per template (Channel 4)
8. **Tomorrow 9 AM** — Discord intros in 2 servers (Channel 5)
9. **Tomorrow Wed 9 PM IST (= 9 AM PST)** — Hacker News Show HN (Channel 7)
10. **Day 3** — IndieHackers + BetaList submissions (Channel 8)
11. **Day 3 onwards** — 1 Pagalguy reply per day, 2 YouTube comments per day (Channels 6 + 12)

## How to read the results tomorrow

The new middleware writes `signupReferrerHost` for every signup. Tomorrow
morning run `npx --yes dotenv-cli -e .env.local -- npx tsx scripts/user-stats.ts`
and the bottom section will show each new user with their `ref=` tag.

Expected breakdown if everything works:
- `linkedin` → Channel 1
- `linkedin_company` → Channel 2
- `x` → Channel 3
- `fb_ssccgl`, `fb_upsc`, etc. → Channel 4
- `discord` → Channel 5
- `pagalguy` → Channel 6
- `hn` → Channel 7
- `indiehackers` / `betalist` → Channel 8
- `whatsapp_personal` → Channel 9
- `press_yourstory`, `press_inc42`, etc. → Channel 10
- `email_sig` → Channel 11
- `youtube_<channel>` → Channel 12
- `wagroup_<groupshort>` → Channel 13
- `direct` → typed URL / paste / messenger that strips referer
- NULL → middleware bug (tell me; this should NOT happen)
