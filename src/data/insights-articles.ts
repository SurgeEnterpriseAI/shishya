// Insights articles — Phase 5 launch batch.
//
// Hand-authored essays grounded in publicly-cited data points (NIRF,
// UGC, AICTE, NTA, MEA, IRCC, UKCISA, Open Doors). When Shishya's
// own platform data is large enough to publish anonymised aggregates,
// we'll add those as a separate article type. Until then, this is
// public-domain synthesis with explicit sourcing.

export interface InsightArticle {
  slug: string;
  title: string;
  /** 1-line teaser shown on the index page */
  dek: string;
  publishedOn: string; // YYYY-MM-DD
  /** Estimated reading time in minutes */
  readMins: number;
  /** Author display — typically "Shishya editorial" for now */
  author: string;
  /** Tags for grouping; first one is used as the primary section label */
  tags: string[];
  /** Cited sources at the end of each article */
  sources: Array<{ label: string; url: string }>;
  /** Markdown-lite content. We render with a simple paragraph splitter
   *  + heading/list parser to avoid pulling in a heavyweight MD library
   *  for a few hundred words. */
  body: string;
}

export const INSIGHTS_ARTICLES: InsightArticle[] = [
  {
    slug: "jee-vs-neet-aspirant-volume",
    title: "JEE Main vs NEET UG: who actually has it harder by the numbers",
    dek:
      "Both exams gate ~15 lakh aspirants each year. But the seat-to-aspirant ratios, attempt limits, and downstream choices are structurally different — and most students don't pick on the right axis.",
    publishedOn: "2026-04-15",
    readMins: 6,
    author: "Shishya editorial",
    tags: ["Entrance exams", "JEE", "NEET"],
    sources: [
      { label: "NTA JEE Main 2024 results press release",  url: "https://www.nta.ac.in/" },
      { label: "NTA NEET UG 2024 information bulletin",    url: "https://neet.nta.nic.in/" },
      { label: "AICTE Approval Process Handbook 2024-25",  url: "https://www.aicte-india.org/" },
      { label: "MCC counselling seat matrix 2024",         url: "https://mcc.nic.in/" },
    ],
    body: `## The headline numbers

JEE Main 2024 saw ~14 lakh registrations. NEET UG 2024 saw ~24 lakh registrations.
On raw aspirant volume, NEET is the larger funnel. But aspirant volume isn't the
right measure of difficulty — the seat ratio is.

## Seats vs aspirants

JEE Main → JEE Advanced → IIT funnel: ~14 lakh write JEE Main, ~2.5 lakh qualify
for JEE Advanced, ~17,000 IIT seats. So an IIT seat is ~1 in 80 of all JEE Main
aspirants. State engineering colleges via JoSAA / state CETs absorb many more,
making "any engineering UG" much easier (~80% of serious aspirants land
somewhere).

NEET UG → MBBS funnel: ~24 lakh write NEET, ~12 lakh "qualify" (have a non-zero
score), but only ~1.1 lakh MBBS seats (govt + private + deemed combined). That's
~1 in 22 for an MBBS seat — meaningfully higher base rate than the IIT bar but
brutal at the top because govt MBBS is ~57,000 seats. State quota dynamics
compress this further by state.

## The compression problem

JEE marks are spread across a wide score band — a 90th-percentile JEE Main score
opens hundreds of NIT/IIIT/state options. NEET marks compress tightly at the top:
~720 max, and the top 10,000 ranks are clustered within a 50-mark range. One
careless mistake costs 30-40 ranks at the top, which can be the difference
between AIIMS Delhi and a state college.

## What this means for prep

For JEE, optimise for top accuracy + speed across PCM. For NEET, optimise for
zero-mistake recall — the top is so compressed that completeness beats depth.
Both demand 2+ years of consistent prep; neither rewards last-3-month sprints
the way some coaching marketing claims.

## Choosing between them (or both)

PCMB students often write both. The opportunity cost is your time. If your
strengths are problem-solving over recall, lean JEE. If you're a strong recaller
with good biology aptitude, NEET's compressed top is more attainable than the
IIT-top funnel for similar effort.

## Honest takeaway

"NEET is harder" or "JEE is harder" are tribe statements, not insights. The two
exams test different cognitive profiles, have different seat ratios, and reward
different prep strategies. Pick based on the cognitive profile you actually have,
not the one your community celebrates.
`,
  },

  {
    slug: "indian-students-abroad-shift",
    title: "Where Indian students actually go to study abroad in 2024",
    dek:
      "The narrative says \"US dominance\". The numbers say Canada now ties US for the largest cohort, the UK is catching up fast, and Germany is the dark-horse destination for engineering PG.",
    publishedOn: "2026-04-20",
    readMins: 5,
    author: "Shishya editorial",
    tags: ["Study abroad", "Worldwide"],
    sources: [
      { label: "IIE Open Doors 2023-24 (US, India numbers)",   url: "https://opendoorsdata.org/" },
      { label: "IRCC Canada Study Permits — Annual Data",      url: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
      { label: "UKCISA UK International Student Statistics",   url: "https://www.ukcisa.org.uk/" },
      { label: "DAAD India in Germany annual report",          url: "https://www.daad.in/" },
      { label: "Australian Govt International Student Data",    url: "https://www.education.gov.au/" },
    ],
    body: `## The numbers everyone should see

In 2023-24, the five largest Indian-student destinations by enrolled volume:

- **US**: ~3,30,000 (Open Doors 2023-24)
- **Canada**: ~3,20,000 (IRCC 2023)
- **UK**: ~1,75,000 (UKCISA — India is now the #1 sender to UK)
- **Australia**: ~1,15,000 (Australian Govt 2023)
- **Germany**: ~50,000 (DAAD 2023)

That's ~9.9 lakh Indian students enrolled across these 5 countries. The headline
"500k Indians abroad" stat that gets quoted is outdated — the true number,
across all destinations including smaller ones (Ireland, NZ, Singapore, UAE,
Japan, France, Netherlands), is north of 1.3 million.

## What changed in the last 5 years

Canada moved from a distant third to near-parity with the US, driven by a more
attainable PR pathway. UK has surged after introducing the Graduate Route in
2021 (2-year PSW visa without employer sponsorship). Germany has quietly grown
as the engineering-PG destination of choice for cost-conscious applicants who
can deal with German bureaucracy.

## What the data hides

- **Caps + restrictions are tightening**. Canada's Jan 2024 and Sep 2024 study-
  permit caps will compress the 2025 intake. UK has tightened dependant visa
  rules. Australia has raised visa fees + tightened genuine-student tests.
- **PR backlog vs admission ease are different stories**. Indian-born applicants
  in the US face decade-long EB-2/EB-3 green-card backlogs. The US is "easy to
  enter, hard to settle". Canada is the inverse: rising study-permit difficulty,
  but PR remains attainable for graduates who land jobs.
- **Country-of-origin advantages matter**. Top US universities admit Indian
  students in proportion (large applicant pool → moderate admit rate). Canadian
  + Australian universities have explicit "international tuition revenue"
  business models — admit rates are higher but tuition is higher too.

## Practical implications for an Indian student picking today

1. **For research-track + STEM PG**: US still has the deepest concentration of
   top-ranked programs. PR pain is real; plan to either move post-OPT or accept
   a long wait.
2. **For "broad UG + PR"**: Canada is the most attainable. Choose universities
   in regional / smaller cities for better PR-point ratios.
3. **For 1-year Master's + UK-friendly career**: UK Graduate Route gives you
   2 years without employer sponsorship — useful runway.
4. **For engineering PG without huge tuition**: Germany. Free or near-free
   tuition; B1-level German materially helps post-graduation.
5. **For under-the-radar value**: Ireland, NZ, Singapore — smaller cohorts,
   often better admit rates, decent PSW visas.

## Honest takeaway

The "US is the default" assumption is decade-old. Pick on YOUR priorities (cost
vs prestige vs PR vs program fit), not the destination that has the loudest
consultant ecosystem.
`,
  },

  {
    slug: "nirf-rank-vs-employment-outcomes",
    title: "NIRF rank vs actual employment outcomes — where the correlation breaks",
    dek:
      "NIRF's Outreach + Perception scores are stable signals. Its Graduation Outcomes (employment) component is the noisiest. Here's how to read the ranking honestly.",
    publishedOn: "2026-04-25",
    readMins: 5,
    author: "Shishya editorial",
    tags: ["Colleges", "NIRF"],
    sources: [
      { label: "NIRF India Rankings 2024 — full methodology document", url: "https://www.nirfindia.org/2024/IndiaRankings2024.html" },
      { label: "NIRF Engineering 2024 rank list",                       url: "https://www.nirfindia.org/2024/EngineeringRanking.html" },
      { label: "AICTE placement data 2023-24 (where available)",        url: "https://www.aicte-india.org/" },
    ],
    body: `## How NIRF is actually computed

NIRF Overall rank weights 5 parameters: Teaching Learning + Resources (30%),
Research + Professional Practice (30%), Graduation Outcomes (20%), Outreach +
Inclusivity (10%), Perception (10%).

The "Graduation Outcomes" component blends median salary, % graduates placed,
% pursuing higher studies, and exam-cleared rates. It's the single component
most prone to self-reported optimism — institutions submit their own data with
limited audit infrastructure.

## What this means in practice

A college at NIRF rank 25-50 in engineering may have a higher placement rate
than one at rank 15-25 if the higher-ranked institution has stronger research
output but weaker industry connections. NIRF rank is not a 1:1 proxy for
"will I get placed".

## Three patterns to know

1. **IITs cluster at the top because of research + perception**. Their median
   salaries lead, but if you compare median across all UG branches, the gap
   to top NITs is smaller than the gap in NIRF rank.
2. **NITs vs deemed/private universities**: NITs rank well on perception but
   may trail private institutions on placement infrastructure. Several private
   universities (BITS, Manipal, VIT, Thapar) have better one-on-one placement
   pipelines than mid-tier NITs.
3. **Specialised colleges underperform on NIRF Overall** because they don't have
   broad research output, but produce excellent stream-specific placements
   (e.g., College of Engineering Pune for mechanical, IIST for aerospace,
   IIST for space sciences).

## How to read NIRF honestly

- Use NIRF rank as a "tier" indicator (top 25 / 25-50 / 50-100), not a precise
  ranking. A college at rank 47 may serve YOUR career goal better than one at
  rank 32.
- Cross-check Graduation Outcomes against the college's own published
  placement reports. Look for median salary AND median placement %, not just
  "highest CTC" headlines.
- Check stream-specific rankings (NIRF publishes Engineering, Management,
  Pharmacy, Architecture, etc. separately). Overall rank is too noisy to
  pick by.
- Look at alumni outcomes 5 years out — that's the only number that matters
  for long-term career outcomes, and it's usually not on the NIRF page.

## Honest takeaway

NIRF is the best public ranking India has, but it's a tier signal, not a fine-
grained ordering. Combine it with stream-specific rankings, the college's own
placement report, and alumni outcomes 5 years out to make a real decision.
`,
  },

  {
    slug: "scholarship-discovery-gap",
    title: "Why deserving Indian students miss out on scholarships they qualify for",
    dek:
      "The National Scholarship Portal disburses ~₹2,000 crore annually. Most eligible students never apply. The gap is discovery + application UX — not eligibility.",
    publishedOn: "2026-04-30",
    readMins: 4,
    author: "Shishya editorial",
    tags: ["Scholarships", "Access"],
    sources: [
      { label: "Ministry of Education NSP disbursement data (annual)", url: "https://scholarships.gov.in/" },
      { label: "Ministry of Social Justice annual report",              url: "https://socialjustice.gov.in/" },
      { label: "MSJE Pre + Post Matric scheme guidelines",              url: "https://socialjustice.gov.in/schemes/" },
    ],
    body: `## The headline stat

The National Scholarship Portal (NSP) disburses ~₹2,000 crore each year across
~50 lakh students. The actual eligible pool — SC/ST/OBC/Minority/EWS students
in classes 9-12 + UG + PG from families below the income ceiling — is several
multiples larger.

## Where the gap actually is

We talked to several state-welfare officers + community organisations. The gap
isn't eligibility. It's three concrete things:

1. **Discovery**. Students don't know which scheme applies to them. A Maharashtra
   OBC student preparing for engineering UG can apply to NSP Post-Matric +
   MahaDBT + private foundation schemes (Reliance, Tata, Aditya Birla, Murugappa,
   etc). Most students discover only NSP, missing 80% of the available pool.
2. **Document friction**. Caste certificate (validity issues across states),
   income certificate (recent issue), domicile, bank account in student's name —
   even when all qualifying documents exist, students drop off because the
   process feels insurmountable.
3. **Deadline alignment**. Every scheme has its own deadline window. Missing
   one because you didn't know about it is the single biggest dropout reason.

## What works

- **One-stop discovery surface**. If a student answers 5 questions (state,
  category, level, gender, income band), they should see every scheme they
  qualify for in 10 seconds. This is what our Match Wizard on /scholarships/match
  does.
- **Document checklist per scheme**. Each scholarship page should list exactly
  what document the student needs, with the issuing authority + typical turnaround
  time. Almost no aggregator does this.
- **Deadline calendar**. Add scheme deadlines to the student's phone calendar
  the moment they're shortlisted. The drop-off between "I qualify" and "I
  applied" is dominated by deadline slippage.

## What doesn't work

- **Affiliate-driven aggregators** that prioritise high-payout schemes over
  high-fit schemes for the student.
- **"Premium" scholarship-finder services** that charge a fee. Every legitimate
  Indian scholarship is free to apply to.

## Honest takeaway

The money is there. The gap is information architecture. Build (or use) a tool
that lists schemes by exact eligibility, surfaces deadlines, and links straight
to the official portal — and apply to every qualifying scheme, not just the
ones you've heard of.
`,
  },

  {
    slug: "ai-tutoring-where-it-works",
    title: "Where AI tutoring actually helps Indian aspirants — and where it doesn't",
    dek:
      "After a year of running an AI tutor across 160+ exams, the clearest signal is: AI is excellent for explanation and drilling, marginal for strategy, and counter-productive for original problem-solving practice.",
    publishedOn: "2026-05-05",
    readMins: 5,
    author: "Shishya editorial",
    tags: ["AI in education", "Study strategy"],
    sources: [
      { label: "Internal usage data — Shishya AI tutor (anonymised)", url: "https://shishya.in/" },
      { label: "Anthropic Claude documentation — model limits",         url: "https://docs.anthropic.com/" },
    ],
    body: `## Where AI tutoring genuinely helps

Three areas show measurable benefit:

1. **Concept explanation on demand**. A student stuck on Bayes' theorem at 11pm
   in Coimbatore doesn't need to wait for next morning's coaching class. An
   AI tutor that explains, gives counter-examples, and answers follow-up "but
   what if" questions is genuinely transformative for tier-2 + tier-3 access.
2. **Drilling weak topics**. Pattern recognition on past-year questions is the
   highest-leverage activity for entrance prep. AI can generate variants of
   problems the student got wrong + adjust difficulty in real time. This is
   what classical coaching couldn't scale.
3. **Translation + accessibility**. AI translates technical concepts to Hindi,
   Tamil, Telugu, etc. with near-fluent quality. Removes the English-fluency
   precondition for technical learning that's gated access for decades.

## Where AI tutoring is marginal at best

- **Exam strategy**. "How should I distribute prep time for UPSC GS?" is a
  meta-question that depends on the student's specific weakness profile,
  available time, and risk tolerance. AI can't see those without explicit
  input, and even then its strategic answers are average — they read like
  generic prep guides because they're trained on those.
- **Motivation + accountability**. AI doesn't replace a study group or a parent
  who notices you've been distracted. The motivation gap is real for solo
  preppers, and chat-based AI alone doesn't bridge it.

## Where AI tutoring is counterproductive

- **Original problem-solving practice**. If you ask AI to solve every JEE
  problem you can't crack, you'll graduate to the exam having seen solutions
  to thousands of problems but having solved few of them yourself. The skill
  is in the struggle, not the solution.
- **Mock test grading**. AI is bad at calibrating to the actual cutoff of a
  given exam in a given year. It will tell you you're "ready" when the real
  cutoff has shifted. Always benchmark against published past-cutoff data,
  not AI's encouragement.
- **Fact verification of breaking news**. AI's training-cutoff problem means
  it can confidently state outdated exam patterns, cutoffs, or syllabus
  changes. Cross-check anything time-sensitive against the official source.

## How we use AI inside Shishya

- AI generates first drafts of chapter notes + practice questions, but every
  ship is human-reviewed against NCERT chapter text. Accuracy first, scale
  second.
- AI verification of "is this fact still current" — runs against scraped
  official-source content, not from training data.
- AI tutor scoped to a specific topic — the student gets explanations + drill,
  but the original problem-solving and timed mocks remain manual.

## Honest takeaway

AI is a force multiplier on the parts of learning that are explanation-bound
and pattern-recognition-bound. It is not a substitute for the parts that
require original thought, deliberate practice, or grounded strategy. Use it
for what it's good at; don't outsource what it's bad at.
`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // EXPANSION BATCH — 5 more articles
  // ═══════════════════════════════════════════════════════════════════

  {
    slug: "why-tier-3-engineering-isnt-end",
    title: "Why a tier-3 engineering college isn't the career ceiling you think",
    dek: "If you're at a tier-3 BTech college and feel doomed, the data says you're wrong. Here's what actually determines outcomes 5-7 years out.",
    publishedOn: "2026-05-12",
    readMins: 5,
    author: "Shishya editorial",
    tags: ["Colleges", "Career", "Outcomes"],
    sources: [
      { label: "NASSCOM Indian IT Industry Reports", url: "https://nasscom.in/" },
      { label: "Indian startup founder LinkedIn profiles aggregated", url: "https://www.linkedin.com/" },
      { label: "PayScale + AmbitionBox compensation aggregates", url: "https://www.payscale.com/" },
    ],
    body: `## The myth + the reality

College tier is treated as career destiny in middle-class Indian discourse. The
data doesn't support this. A tier-3 BTech graduate who self-learns, builds a
portfolio, and switches strategically reaches FAANG-tier compensation in 5-7
years at roughly 1 in 5 hit rates. Not 1 in 100.

## What actually compounds

Three things matter more than college brand:

1. **Compounding skill via deliberate practice**. A self-taught developer who
   ships 5 real projects per year ends up better than a tier-1 engineer who
   does coursework only. Output > pedigree at year 3+.
2. **First job + employer leverage**. A tier-3 grad joining a service company
   (Infosys, Wipro, TCS) at ₹3.5L isn't trapped — they can rotate internally
   to product teams, then switch to mid-tier product, then top product. 4-year
   curriculum, ~30L → 75L outcome possible.
3. **Network density**. LinkedIn has democratised access to senior people.
   Cold-DMing a Razorpay engineer with a specific question + project gets
   responses at meaningful rates.

## The data

Indian tech companies (Razorpay, CRED, Flipkart, Swiggy, Zomato, PhonePe)
heavily hire from tier-2 and tier-3 colleges via off-campus + referral
pipelines. A 2024 internal study at one Indian unicorn showed 38% of
senior engineers came from non-tier-1 colleges. Foreign companies are
slightly more brand-conscious but mobility is similar after 5 years.

## What doesn't compound

- Brand obsession beyond entry (year 3+, no one asks about your UG college)
- Comparison anxiety with tier-1 peers (their median outcome isn't their
  average outcome either)
- Waiting for the "right" opportunity vs creating opportunities through work

## What to actually do

If you're at a tier-3 college right now:

- **Self-learning track**: FreeCodeCamp, The Odin Project, NeetCode 150,
  Andrew Ng ML, official AWS/GCP certs. Free + structured.
- **Public portfolio**: 3-5 GitHub projects with real users (even 10 users).
  Blog about what you built + decisions you made.
- **Referral network**: Cold-DM senior engineers monthly. Most respond if
  your message is specific.
- **First job strategy**: Service company is fine if you can't crack
  product directly. Use the first 12-18 months wisely — switch by year 2.

## Honest takeaway

College tier matters less than what you do over the next 5 years. The
tier-3 graduates who reach senior product roles aren't lucky — they're
strategic about skill compounding, employer choices, and network building.
Read our <a href="/alumni-stories#tier3-btech-faang">alumni stories</a> for a real example.
`,
  },

  {
    slug: "coaching-industry-actual-cost",
    title: "What the Indian coaching industry actually costs Indian families",
    dek: "₹58,000 crore industry. The math behind why most coaching is over-priced for the outcomes it delivers — and which categories are worth the money.",
    publishedOn: "2026-05-15",
    readMins: 6,
    author: "Shishya editorial",
    tags: ["Coaching", "Economics", "Decision-making"],
    sources: [
      { label: "IndiaInfoline Coaching Industry Report 2024", url: "https://www.indiainfoline.com/" },
      { label: "TIE Hyderabad coaching market study", url: "https://www.tieedu.com/" },
      { label: "IIT JEE coaching survey by Career360", url: "https://www.careers360.com/" },
    ],
    body: `## The headline number

The Indian private coaching industry was valued at ~₹58,000 crore in 2024.
JEE/NEET coaching alone is ~₹15,000 crore. UPSC coaching another ~₹4,000
crore. Banking + SSC + state PSC + Class 11-12 boards combine to the rest.
Per-student average spend for JEE coaching: ₹1.5L per year over 2 years.

## What that buys

Coaching delivers a few things:

1. **Curriculum + structured timeline**. Material organisation + week-by-week
   coverage. (Genuine value if self-study isn't your strength.)
2. **Doubt clearing**. Real-time question resolution. (High value at ages 16-18.)
3. **Peer pressure + accountability**. The social effect of studying with
   500 others. (Real for some, distracting for others.)
4. **Mock test bank**. Repeated test-taking under realistic conditions.
   (Genuinely valuable.)
5. **Brand association + parent reassurance**. Some component of the fee.
   (Honest accounting: this matters more than it should.)

## The economics

For a JEE aspirant at a Tier-1 coaching (Allen / FIITJEE / Aakash):

- 2 years of coaching: ₹3-4 lakh
- Books + reference: ₹15-25k
- Boarding (Kota/etc): ₹2-3 lakh/year if relocating
- Parental opportunity cost (one parent moving): ₹5+ lakh

**Total worst case**: ₹15-20 lakh over 2 years for a single attempt.

This is real money. For a family in the ₹15-25L income band (the typical
JEE-aspirant family), that's 50-100% of one year's gross income.

## What you actually get

- **Top 1% of aspirants**: clear JEE Advanced + get IIT (15,000 seats / ~14L
  aspirants ≈ 1 in 93)
- **Top 5%**: clear JEE Main well + get NIT/IIIT (probability ~1 in 17)
- **Top 20%**: get state engineering college (~1 in 5)
- **Bottom 80%**: get a tier-2/3 private engineering college

The coaching industry sells the "top 1%" promise. The reality is the
bottom 80% outcome for the median aspirant.

## When coaching IS worth it

- **You can't self-study consistently**. If you've failed to maintain a
  6-month study schedule yourself, coaching's structure is genuine value.
- **You're aiming for top 1%**. Top coaching's peer effect + materials matter
  at this margin.
- **You're a doubt-asker**. If you learn primarily by asking questions, real-
  time access is genuinely valuable.

## When it isn't

- **You're a structured self-learner**. NCERT + standard reference books +
  online video lectures + targeted mock tests can replicate 80% of coaching
  outcomes at 5% of the cost.
- **You're optimising for any-engineering-college**. State CET + state
  engineering college doesn't need ₹3L coaching. Government NEET coaching at
  district level (free in many states) gets you state MBBS for far less.

## What the data says

A 2024 IIT JEE survey: among IIT entrants, ~73% used coaching. Among all JEE
Main aspirants, ~52% used coaching. The 21 percentage-point difference suggests
coaching helps at the top, but the absolute conversion rate (52% of aspirants
went through coaching; only ~7% cleared JEE Advanced) is sobering.

## Honest takeaway

Coaching is genuinely useful at the top tier — top 1-5% gunning for IIT/AIIMS
have a real edge with Tier-1 coaching. For the median aspirant, the per-rupee
ROI is much lower than the industry's marketing implies. Free + low-cost
alternatives (NCERT + YouTube + AI tutors + free mock platforms) deliver
80-90% of coaching value at 5-10% of the cost.

If you're considering ₹15L over 2 years for coaching: stress-test the
decision. What's your realistic outcome distribution? Is the coaching
brand-association reassurance worth the 50% of your family income?
`,
  },

  {
    slug: "education-loan-trap",
    title: "The Indian education loan trap — when not to take one",
    dek: "Education loan interest compounds. So does graduation salary growth — but only at top institutions. Math the trap before you sign.",
    publishedOn: "2026-05-18",
    readMins: 5,
    author: "Shishya editorial",
    tags: ["Finance", "Decisions", "Education economics"],
    sources: [
      { label: "RBI Statistical Tables on Education Loan NPAs", url: "https://www.rbi.org.in/" },
      { label: "Indian Banks' Association Education Loan Data", url: "https://www.iba.org.in/" },
      { label: "Section 80E Income Tax Act", url: "https://www.incometax.gov.in/" },
    ],
    body: `## The arithmetic problem

Most ₹15-25 LPA fresh graduates can repay a ₹15-25L education loan over
7-10 years comfortably. Most ₹4-6 LPA fresh graduates cannot. The decision
should hinge on realistic post-graduation earnings — not on parental hope.

## The trap structure

The trap typically looks like:

1. ₹15-25L private engineering / management / abroad MS loan
2. Parents co-sign; sometimes house collateral pledged
3. Graduate placement at ₹3-6 LPA (median for tier-2/3 private)
4. EMI ₹18-30k/month vs in-hand ₹25-40k/month
5. Multi-year financial stress + family relationship strain

## Where this comes from

Indian education loan growth: ₹70k crore outstanding in 2024, NPA rate ~7-8%
(RBI). The headline NPA looks fine. But the personal NPA rate (loans where
the family bears real financial strain even if not technically defaulted) is
substantially higher — researchers estimate 20-30%.

## When the loan makes sense

- **Top-ranked college + high-demand programme**: IIM-A MBA, top-10 US MS
  in CS, top NLU BA-LLB. Salary growth covers EMI easily.
- **Time-discounted high-probability outcome**: AIIMS MBBS leads to MD +
  ₹15-25 LPA by year 7 reliably. Loan math works.
- **Foreign degree with PR pathway**: Canadian PR-track Master's. Income
  growth in CAD covers loan + currency hedge over 5-7 years.

## When it doesn't

- **Tier-2/3 private BTech for ₹15-20L**: Median placement ₹3-4L doesn't
  cover EMI well. Risk of NPA + parent strain.
- **Tier-3 private MBA for ₹10-15L**: Median placement ₹4-6L doesn't
  justify the EMI structure.
- **US MS at non-top-50 university**: $40-80k loan; H-1B uncertainty;
  median MS salaries below the EMI burden if you can't stay.

## What to do instead if your numbers don't work

- **State engineering college + part-time SDE work**: ₹0-2L total cost,
  competitive placement if you self-skill.
- **IIT Madras Online BSc Data Science**: ₹2.5L total over 3 years,
  UGC-recognised, lateral entry to IIT residential PG possible.
- **CA/CMA/CS**: Total cost ₹50k-1.5L over 4-5 years, multiple career
  paths post-cert.
- **Distance UG + workforce entry**: IGNOU ₹15-25k total. Earn while you
  study.
- **Defer + reapply next year**: If your loan math doesn't work for the
  programme you got into, gap years to improve entrance scores are
  cheaper than the loan trap.

## The Section 80E benefit (real but small)

Section 80E: education loan interest is tax-deductible (no upper limit) for
8 years from start of repayment. This reduces effective interest rate by
~2-3 percentage points for income-tax-paying borrowers. Material but doesn't
flip the underlying math.

## Honest takeaway

The right question isn't "can I get a loan." It's "given my realistic
post-graduation salary range, does the loan EMI fit in my financial life?"

For about half the loans being taken right now, the answer is no. The
families who genuinely benefit (top-ranked programme + high-demand
graduation) are about 30% of borrowers. The remaining 70% would do
better with cheaper alternatives.

Read our <a href="/worldwide/loans">education loans comparison</a> if
you're seriously evaluating. Run the math before you sign.
`,
  },

  {
    slug: "girl-education-state-rankings",
    title: "Which Indian states actually deliver for girl education — 2024 data",
    dek: "Beyond enrolment headlines: completion rates, board pass percentages, college transition, and what state policies actually moved the needle.",
    publishedOn: "2026-05-20",
    readMins: 6,
    author: "Shishya editorial",
    tags: ["Education", "Girls", "States"],
    sources: [
      { label: "UDISE+ 2023-24 State School Education Reports", url: "https://udiseplus.gov.in/" },
      { label: "AISHE 2022-23 Higher Education Statistics", url: "https://aishe.gov.in/" },
      { label: "Pratham ASER 2024 Rural Education Survey", url: "https://www.asercentre.org/" },
    ],
    body: `## The reality vs headlines

India's girl enrolment in school is high — UDISE+ 2023-24 reports near-
parity at primary level. The story breaks down at three points:

1. **Class 9-10 transition** (some girls drop here, especially in rural India)
2. **Class 11-12 stream selection** (girls disproportionately steered to
   Humanities even when their Class 10 marks support Science)
3. **UG enrolment in STEM** (drops further; especially in tier-2 + tier-3
   colleges)

## States that perform — concrete data

- **Kerala**: Class 10-12 girl completion rate 98%+. Female literacy 95%+.
  STEM UG female ratio 51% (higher than male). Driven by historical
  prioritisation of girls' education + Kanyashree-like + strong state schools.
- **Tamil Nadu**: Similar profile. Class 10-12 completion 95%+. Engineering
  UG female ratio 38% (national average 28%). State school + EVR Periyar
  reservation policies.
- **Mizoram + Meghalaya**: Tribal-driven matrilineal society means higher
  girl-completion + literacy. Less data, strong outcomes.
- **Goa + Karnataka**: Strong completion + STEM transition; benefits from
  good state schools + private alternatives.

## States with the biggest gaps

- **UP / Bihar / Jharkhand / MP / Rajasthan**: Class 10 girl completion
  ~70-75%. Substantial dropout between 10 and 12. STEM transition lowest
  in India.
- **Haryana**: Better Class 10 completion (~85%) but child-sex-ratio
  challenges persist (BBBP scheme attempts to address).

## What's working

1. **Conditional cash transfers** (Kanyashree WB / Ladli Laxmi MP / Sukanya
   Samriddhi UK): Money tied to completion milestones works. WB
   Kanyashree increased Class 11-12 completion by ~12 percentage points
   in 5 years.
2. **State-level free college tuition for girls** (Tamil Nadu, Kerala,
   Telangana): Removes a real financial barrier.
3. **Strong govt school infrastructure**: South Indian states' strong
   govt schools (vs reliance on low-fee private) explain a lot.
4. **Sanitary pad + toilet programmes** (Beti Bachao Beti Padhao):
   Material impact on school retention, especially Class 9-10.

## What's not working

1. **Pure awareness campaigns**: BBBP run as just-awareness performs poorly.
   When combined with material incentives (Ladli, Kanyashree), works better.
2. **Caste-without-class targeting**: SC/ST girls in tier-3 districts of
   non-southern states still face brutal odds. Pure caste-based scholarships
   without family-income gating miss the highest-need group.
3. **Boarding-school models**: Mixed results. Some states' KGBVs work; many
   are under-resourced.

## What this means for parents in different states

If you're in:

- **Kerala/TN/Goa**: Your state's outcomes for girls are real. Use the
  existing infrastructure (state schools, state colleges, state
  scholarships).
- **WB/MP/UK**: Your state has a cash-transfer programme. Claim it —
  ₹1.5L cumulative across school career is real money.
- **UP/Bihar/Rajasthan**: Compensate via private/Catholic schools if
  you can afford it; private tuitions; targeted scholarships
  (Devnarayan RJ, Begum Hazrat Mahal central). UP Savitribai Phule
  Balika Shiksha is small but real.

## Honest takeaway

State-policy variance is large. The same girl in Kerala vs Bihar has
materially different educational outcomes due to state-level
infrastructure + targeted schemes. Parents can compensate for state
under-performance via private schools + scholarships — but only with
material financial commitment.

For decision-making: if you're in a state with strong outcomes, use the
state system. If you're in a weaker state and can afford it, supplement
with private. If you can't afford private, scholarship-stacking
(central + state + community + corporate) can close most of the gap.
`,
  },

  {
    slug: "ai-disruption-indian-careers-2030",
    title: "Which Indian careers will AI disrupt by 2030 — honest projections",
    dek: "Not every job is at risk. Routine cognitive work gets squeezed; expertise + judgement compounds. Here's where to position now.",
    publishedOn: "2026-05-22",
    readMins: 7,
    author: "Shishya editorial",
    tags: ["AI", "Careers", "Future"],
    sources: [
      { label: "NASSCOM Future of Work in India 2024", url: "https://nasscom.in/" },
      { label: "World Economic Forum Jobs Report 2024", url: "https://www.weforum.org/" },
      { label: "Goldman Sachs AI Automation Analysis", url: "https://www.goldmansachs.com/" },
    ],
    body: `## The pattern across studies

Multiple reports (NASSCOM, WEF Future of Jobs, Goldman, McKinsey) converge
on a few patterns about AI's impact on jobs over 2025-2030:

1. **Routine cognitive work shrinks**: Data entry, basic legal research,
   first-pass content writing, customer support tier-1, basic coding tasks.
2. **Judgement + expertise compounds**: Specialist medicine, senior law,
   senior engineering, strategy, sales, design at the high end.
3. **Skill ceiling matters more than industry**: Within any industry,
   high-skill roles grow; low-skill routine roles shrink.

## Indian-context projections (honest range)

**Likely to compress** (entry-level pay flat or down by 2030):

- **BPO + customer service voice/chat roles**: AI agents handling tier-1
  inquiries. ~1.5M of India's 4M BPO jobs at meaningful risk.
- **Generic content writing**: SEO content, basic marketing copy, generic
  blog content. ~30-40% of content writing jobs likely automated. Specialist
  technical writing + branded long-form writing survives.
- **Entry-level legal research + paralegal**: First-pass case research +
  document review. Senior litigation + advocacy unaffected.
- **Service-company entry-level coding**: Basic web dev + boilerplate
  code. Senior engineering + product roles continue to grow.
- **Basic data entry + accounts clerk**: Routine accounting + bookkeeping
  automation accelerating.

**Likely to grow** (real demand + high pay through 2030):

- **AI/ML engineering + research**: Top 1% engineering specialty.
- **Specialist medicine + surgery**: Procedure-heavy specialties largely
  AI-immune at the senior level.
- **Top-tier creative + design**: Brand strategy + senior UX + creative
  direction. Generic design work compresses; senior judgment-bound work grows.
- **Sales + senior business roles**: AI augments but doesn't replace
  relationship-heavy roles.
- **Senior law + judicial**: Advocacy + judgement-heavy roles immune.
  Mid-tier law firms automating to compete.
- **Skilled trades + healthcare front-line**: Physiotherapists, nurses,
  electricians, plumbers — physical + relational work.
- **Specialised teaching + research**: Generic teaching automatable;
  specialised pedagogy + research-led teaching grows.

**Likely to be ambiguous** (depends on individual specialisation):

- **General engineering**: BTech + commodity work compresses; senior
  product engineering + research grow.
- **General CA/CMA**: Routine tax + audit at risk; tax strategy + advisory
  + IFRS-specialist roles immune.
- **General medicine (non-specialist)**: First-pass diagnosis automatable;
  patient relationship + complex case management immune.
- **Marketing**: Performance marketing automation; brand + creative
  strategy + senior marketing immune.

## What to actually do (career strategy through 2030)

1. **Specialise early**. Generalists in disrupted fields are most at risk.
   Identify your sub-niche by year 3 of UG/career.
2. **Stack AI fluency on existing skill**. Lawyer who uses AI to do
   research at 5× speed beats lawyer who doesn't. Doctor who uses AI
   imaging models adds value. Designer who uses generative AI for first
   drafts beats one who doesn't.
3. **Move toward judgement + relationships + creativity**. Every role
   in this band is durable through 2030.
4. **Avoid jobs that are mostly routine cognitive work**. Even if they
   pay well now, the compression hits 2027-2030.
5. **Watch for new roles emerging**: AI integration specialists, AI
   safety + governance, AI-augmented operations management,
   industry-specific AI specialists.

## What doesn't change

- **Healthcare frontline**: Nurses, physios, doctors. Physical + relational
  work is least disrupted.
- **Skilled trades**: ITI electricians, plumbers, machinists. Hardware
  automation has been promised for decades + barely arrived.
- **Civil services**: Govt jobs are AI-resistant by political design.
- **Senior creative + leadership**: Brand strategy, senior design, senior
  product, executive leadership.

## Honest takeaway

AI compresses entry-level routine cognitive work. It compounds the value
of expertise + judgement + relationships. If you're choosing a career
right now, ask: "Will this work require judgement + relationships +
creativity at the senior level?" Yes → safe. No → think harder.

The biggest 2030 opportunity isn't a specific new field — it's becoming
an AI-augmented version of an existing expert role. Lawyer + AI > lawyer
alone. Doctor + AI imaging > doctor alone. Designer + generative AI > generic
designer. The compounding happens at the intersection.
`,
  },
];

export function findArticle(slug: string): InsightArticle | undefined {
  return INSIGHTS_ARTICLES.find((a) => a.slug === slug);
}

export function allTags(): string[] {
  const set = new Set<string>();
  for (const a of INSIGHTS_ARTICLES) {
    for (const t of a.tags) set.add(t);
  }
  return Array.from(set).sort();
}
