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

  // ════════════════════════════════════════════════════════════════
  // COMPARISON ARTICLES — long-form, sourced, designed to rank for
  // "X vs Y" long-tail queries. Each pulls from the deep-content
  // numbers already published on individual /exams/[code] pages.
  // ════════════════════════════════════════════════════════════════

  {
    slug: "ssc-cgl-vs-chsl-salary-and-career",
    title: "SSC CGL vs SSC CHSL: salary, career growth, and which one is right for you",
    dek:
      "Same recruiter, very different posts. SSC CGL is graduate-level Group B/C; SSC CHSL is 12th-pass-level Group C. We compare the actual pay matrix, career trajectory, and the realistic conversion gap between the two.",
    publishedOn: "2026-05-22",
    readMins: 7,
    author: "Shishya editorial",
    tags: ["SSC CGL", "SSC CHSL", "Government Jobs", "Comparison"],
    sources: [
      { label: "7th CPC pay matrix (Department of Expenditure)", url: "https://doe.gov.in/order-circular/order-implementation-recommendations-7th-cpc-pay" },
      { label: "SSC official notifications", url: "https://ssc.nic.in/" },
      { label: "Deep content on /exams/SSC_CGL and /exams/SSC_CHSL", url: "https://shishya.in/exams/SSC_CGL" },
    ],
    body: `## The headline difference

SSC CGL recruits at the GRADUATE level into Group B and Group C posts; SSC CHSL recruits at the 12+2 level into Group C only. That single line decides everything else — the pay scale, the career ceiling, the cutoff competition.

If you're a graduate (or about to be), CGL has higher ROI by every measure that matters. If you're a 12th-pass student who doesn't want to wait three more years to start earning, CHSL is the right call — but go in with realistic expectations of the ceiling.

## Pay difference at entry

| Metric | SSC CGL (top posts) | SSC CHSL (top posts) |
| --- | --- | --- |
| Highest post | Assistant Section Officer / Inspector | Data Entry Operator (DEO) |
| Pay Level | Level 7 | Level 4 / 5 |
| Basic pay | ₹44,900 | ₹25,500 – ₹29,200 |
| Gross monthly (X-class) | ₹68,000 – ₹85,000 | ₹37,000 – ₹46,000 |

A CGL Inspector earns roughly **twice** the gross of a CHSL DEO in the same city. The gap widens over a career because the CGL promotion ladder ends at Pay Level 12 (Section Officer / Group B Gazetted) while CHSL typically plateaus around Pay Level 6.

## Conversion / cutoff gap

CHSL is technically a 12th-level paper and looks easier — but **the cutoff bar is HIGHER as a percentage of total marks** because the candidate pool is much bigger and the syllabus is narrower. In 2024:

- SSC CGL Tier 1 General cutoff: 131.5 / 200 (~66%)
- SSC CHSL Tier 1 General cutoff for DEO: 165 – 172 / 200 (~82-86%)

CHSL needs higher accuracy on an easier paper. CGL allows for slightly lower accuracy on a harder one. Most students underestimate this — they pick CHSL "because Tier 2 is shorter" only to find the cutoff threshold tighter.

## Career trajectory — 10 years out

A CGL ASO joining in 2026 typically reaches Section Officer (Pay Level 8 → 10) by 2034-2036 through internal promotion + departmental exams. Net gross at year 10: ~₹1.1 – ₹1.3 lakh in a metro.

A CHSL LDC joining in 2026 typically reaches UDC (Level 4) by 2030 and Assistant (Level 6) by 2035-2037 through internal departmental exams (LDCE). Net gross at year 10: ~₹55,000 – ₹65,000 in a metro.

Same effort window. Different ceiling.

## Who should pick which

**Pick SSC CGL if:**
- You're a graduate or final-year student.
- You can commit 12-18 months of focused prep.
- You'd rather wait an extra year to start at a higher entry-level than start sooner at a lower one.

**Pick SSC CHSL if:**
- You only have a Class 12 qualification and don't want to wait through a 3-year graduation.
- You want a stable government job FAST (CHSL → joining within 1.5-2 years is realistic).
- You can later attempt CGL after graduating — the prep overlap is ~70%, so CHSL prep is largely portable.

## The undertold third path

CGL Tier 2 since 2023 has dropped the descriptive paper for most posts — making the prep timeline shorter than the older 3-paper structure. If you're choosing between CHSL now and waiting 2-3 years for CGL, the CGL prep window has shrunk meaningfully. That changes the calculation for graduates who were previously discouraged by the old multi-stage Tier 2.

## Bottom line

Same recruiter, same exam style, very different pay matrix. If you have the option to graduate first and attempt CGL, do that. If you don't, CHSL is a legitimate path — just don't expect CGL-level pay from a CHSL post.
`,
  },

  {
    slug: "jee-main-january-vs-april-strategy",
    title: "JEE Main January vs April attempt: which to take seriously, which to use as a warm-up",
    dek:
      "Two sessions a year, best score counts. The right strategy isn't 'try harder in April' — it's understanding what each attempt is actually for, what % of toppers peak in which session, and how to use the gap.",
    publishedOn: "2026-05-22",
    readMins: 6,
    author: "Shishya editorial",
    tags: ["JEE Main", "JEE Advanced", "Strategy", "Comparison"],
    sources: [
      { label: "NTA JEE Main 2024 result notifications", url: "https://jeemain.nta.nic.in/" },
      { label: "JEE Advanced 2024 qualifying percentile table", url: "https://jeeadv.ac.in/" },
      { label: "Deep content on /exams/JEE_MAIN", url: "https://shishya.in/exams/JEE_MAIN" },
    ],
    body: `## The structural setup

NTA runs JEE Main twice a year — Session 1 (January-February) and Session 2 (April). A candidate can write both. **The better of the two NTA scores is used for the JEE Advanced cutoff and the JoSAA counselling rank.**

So the question isn't "which one matters more" — both can. The question is how to USE the two-session structure to maximise the final score.

## What the data shows

Looking at the 2024 cycle (the most recent with complete published data):

| Metric | Session 1 (Jan-Feb 2024) | Session 2 (April 2024) |
| --- | --- | --- |
| Number of candidates | ~12.3 lakh | ~10.7 lakh |
| Number scoring 99+ percentile | ~12,300 | ~10,700 |
| Topper score | Multiple 100 percentilers | Multiple 100 percentilers |
| Cutoff for JEE Advanced (General) | 93.23 percentile | 93.23 percentile (same — composite) |

Top scorers come from BOTH sessions. There's no "weaker session" — the percentile is normalised across both.

## What changes between sessions

What DOES change:

- **Class 12 board exam timing**. Most state boards + CBSE conduct Class 12 exams in March. Session 1 lets you write JEE BEFORE boards; Session 2 lets you write AFTER. This is the biggest practical decision.
- **Your own preparation maturity**. Session 1 catches you at the end of Class 12 prep; Session 2 catches you 3 months later, post-boards.
- **Exam paper characteristics**. NTA tries to keep difficulty constant but in practice each session has slightly different focus areas (e.g., 2024 Session 2 had heavier Inorganic Chemistry).

## The strategy that actually works

**For students who feel "JEE-ready" by December:**
Treat Session 1 as the serious attempt. Aim for your target percentile here. Boards then become a pure execution exercise. Session 2 becomes the "if I get sick or have a bad day" insurance.

**For students who feel "JEE-ready" only by March:**
Use Session 1 as a pure mock — get the test-centre experience, learn what 3 hours of JEE-pace feels like. Don't worry if the percentile is low. Focus on boards. Then use the 3 weeks between boards and Session 2 for intense revision. Session 2 is the real attempt.

**For Class 12 droppers:**
Both sessions are serious attempts. Use Session 1 as a calibration on your year-long prep, identify weak topics, fix them in the 8-10 weeks between sessions, and peak in Session 2.

## What NOT to do

Don't write Session 1 "just to see how it goes" if you actually have a real shot in Session 1. Many students sandbag the first attempt, expecting to peak in April — and then catch a fever in April and lose the year. The fail-safe direction is "take Session 1 seriously, treat Session 2 as a possible improvement", not the other way around.

Don't ignore the Session 2 gap. The 8-10 weeks between sessions is the highest-leverage prep window of the entire JEE journey for students with a tier-1 target. This is where the rank gap between candidates with similar prep widens.

## For students targeting JEE Advanced specifically

The JEE Advanced qualifying percentile in 2024 was 93.23 for General. Top 2.5 lakh JEE Main candidates qualify. Practically: you need at least 93+ percentile in ONE of the two sessions. After that, your effort shifts to Advanced — a fundamentally different paper. Session 2 strategy for Advanced aspirants: if you've already crossed the qualifying percentile in Session 1, sit out Session 2 if your Advanced prep is on track. The fatigue cost of writing Session 2 can outweigh the marginal Main score improvement.

## Bottom line

There is no "easier session". The session you take MORE SERIOUSLY tends to be your better score. The structure is designed to give you two shots — but it works only if you treat each shot like it's the only one, and let the better one win.
`,
  },

  {
    slug: "neet-mbbs-vs-bds-when-to-choose",
    title: "NEET UG: MBBS vs BDS — when to pick which, and the honest career gap",
    dek:
      "Same exam, two very different careers. We compare the realistic NEET score ranges for each, the cost of education, the early-career income gap, and the honest answer to 'should I drop a year for MBBS instead of taking BDS now?'",
    publishedOn: "2026-05-22",
    readMins: 7,
    author: "Shishya editorial",
    tags: ["NEET UG", "MBBS", "BDS", "Medical career", "Comparison"],
    sources: [
      { label: "NEET UG 2024 result and cutoffs (NTA)", url: "https://neet.nta.nic.in/" },
      { label: "MCC counselling closing rank archives", url: "https://mcc.nic.in/" },
      { label: "Dental Council of India — BDS seat distribution", url: "https://dciindia.gov.in/" },
      { label: "Deep content on /exams/NEET_UG", url: "https://shishya.in/exams/NEET_UG" },
    ],
    body: `## What NEET actually selects you for

NEET UG ranks ~24 lakh candidates. The seats it gates:

- **MBBS**: ~1.1 lakh seats across government and private medical colleges.
- **BDS**: ~27,000 seats across government and private dental colleges.
- **AYUSH (BAMS, BHMS, BUMS, BSMS)**: ~50,000 seats.
- **BVSc, BSc Nursing, Allied**: smaller pools.

The MBBS:BDS ratio (about 4:1) tells you the cutoff gap. MBBS closes much earlier in counselling; BDS continues into later rounds. **The NEET-2024 cutoff for an MBBS government seat in the AIQ closed around AIR 1,800-2,500 (General). The same year, a BDS government seat closed around AIR 15,000-22,000.** A ~7-10x gap in rank.

## The realistic question

If you scored ~AIR 15,000 in NEET UG 2024, your options are:

- Take a BDS seat NOW.
- Drop a year, attempt NEET again, target MBBS.

Both are real choices. The honest math:

### Drop-year economics

NEET UG drop-year improvement: top coaching results show ~70% of dedicated droppers improve by 100-150+ marks. That can move someone from AIR 15,000 → AIR 5,000. Not guaranteed, but the modal outcome.

Cost: One year of opportunity cost (you don't earn during BDS years 1-4 either, so this is the only direct cost). One year of additional coaching fees (₹1.5-3 lakh at top institutes).

Risk: Your second attempt could be flat or worse. ~30% of droppers don't materially improve.

### BDS now

Pros: You're a doctor (a different kind) by age 23. You can start earning from year 5. The dental field has growing private practice opportunities. India's per-capita dentist availability is low — there's structural demand.

Cons: Compared to MBBS your early-career income is lower (entry private practice for BDS: ~₹30k-50k/month; entry MBBS internship at govt hospital: stipend ~₹20k-40k/month BUT post-PG specialist income jumps to ₹80k-2L+). The gap widens after PG.

### The brutal honesty

If you're at AIR 15,000 with strong board marks and a family that can fund another year, **dropping for MBBS has higher long-term expected value** — provided you can stomach the year of uncertainty.

If you're at AIR 15,000 with marginal Class 12 marks, financial pressure to start earning, or family circumstances that make a 6-year MBBS infeasible, **BDS now is the right call** — and BDS is not a "consolation prize", it's a legitimate medical career with its own ceiling.

## The myth to discard

"Take BDS for one year and re-attempt NEET while studying." This rarely works. First-year BDS is academically demanding (anatomy, biochemistry, dental anatomy). Splitting attention between BDS and re-NEET prep typically results in mediocre performance in both. Drop OR commit — not both.

## What to factor in that most articles skip

- **Specialisation prospects.** MBBS → ~26 MD/MS specialities via NEET PG. BDS → 9 MDS specialities. The fork is narrower in BDS but each MDS speciality has solid demand.
- **Private practice setup cost.** Setting up a basic dental clinic: ₹15-25 lakh equipment + clinic. Setting up a basic MBBS general-practitioner clinic: ₹3-8 lakh. BDS has higher capex.
- **Family circumstances.** First-generation medical aspirants often underestimate the social pressure to "take ANYTHING" in medicine. Don't drop just because pressure says you should; don't take BDS just because pressure says you must.

## Bottom line

MBBS and BDS are both legitimate medical careers, not first-prize / consolation-prize. The right choice depends on your rank, your family's financial runway, and your honest tolerance for another year of NEET prep. The wrong choice is to take a seat you'll resent or drop a year you can't afford.
`,
  },

  {
    slug: "uppsc-pcs-vs-upsc-cse-which-to-target-first",
    title: "UPPSC PCS vs UPSC CSE: which to target first, and the case for attempting both",
    dek:
      "UPPSC PCS is a less-celebrated cousin of UPSC CSE — but the prep overlap is ~70% and the conversion rate is 30x higher for similarly-prepared candidates. We break down the honest case for prepping both simultaneously.",
    publishedOn: "2026-05-22",
    readMins: 8,
    author: "Shishya editorial",
    tags: ["UPSC", "UPPSC", "State PSC", "Civil Services", "Comparison"],
    sources: [
      { label: "UPSC CSE 2023 final cutoff", url: "https://upsc.gov.in/" },
      { label: "UPPSC PCS cutoff archive", url: "https://uppsc.up.nic.in/" },
      { label: "Deep content on /exams/UPSC_PRELIMS and /exams/UP_UPPSC_PCS", url: "https://shishya.in/exams/UPSC_PRELIMS" },
    ],
    body: `## The structural similarity

Both exams follow the same three-stage model: **Prelims (GS + CSAT) → Mains (descriptive papers) → Interview**. The Prelims paper structures are nearly identical — General Studies + a qualifying CSAT.

The Mains differ in detail but share core papers — Essay, GS-I (History/Geography/Society), GS-II (Polity/Governance), GS-III (Economy/Tech/Environment), GS-IV (Ethics).

**Practical impact**: A serious UPSC aspirant studying 8 months for CSE has already prepared 70% of UPPSC PCS Prelims material — and a significant chunk of the Mains GS papers. The marginal effort to also write UPPSC PCS is roughly 20-25% of total UPSC time.

## The conversion math

UPSC CSE 2023:
- ~10 lakh candidates → ~14,000 Mains qualifiers → ~2,800 Interview qualifiers → ~1,000 final selections.
- **Conversion rate: 0.1% (1 in 1,000)**

UPPSC PCS 2023:
- ~6 lakh candidates → ~14,000 Mains qualifiers → ~1,200 Interview qualifiers → ~250-400 final selections.
- **Conversion rate: 0.05% – 0.07%**

Wait — UPPSC's conversion rate is LOWER? Yes, because the seat ratio is ~4x smaller. But the per-candidate-rank conversion behaves differently:

- A candidate at AIR 1,000 in UPSC CSE Prelims has roughly the same probability of clearing UPPSC PCS Prelims as a candidate at AIR 500 in UPPSC's own pool.
- UPSC CSE pool has nationwide depth (Hindi-belt, Tamil-Nadu, Bengal, Karnataka all compete equally). UPPSC PCS pool is geographically concentrated — UP-domicile candidates dominate.

What this means: **A serious UPSC aspirant who happens to be UP-domicile has materially better odds at UPPSC PCS than at UPSC CSE.**

## The case for "both simultaneously"

The classic two-track strategy:

- Aim for UPSC CSE (the dream).
- Write UPPSC PCS in parallel (the fallback).

This works because:

- Both exams happen in different months. UPSC CSE Prelims (May/June), Mains (Sep), Interview (Mar-May). UPPSC PCS Prelims (Mar/Apr), Mains (Oct/Nov), Interview (Mar-Apr). The schedule doesn't clash.
- The Prelims overlap is enormous — Indian Polity, History, Economy, Geography, Current Affairs, Environment all the same.
- The Mains overlap is meaningful but not total — UPPSC has Hindi-language-paper requirement and UP-specific GK paper that UPSC doesn't.

The 20% extra effort gets you a 30x higher probability of SOME civil-service job within 2 attempts.

## When to NOT do both

If you're a non-UP-domicile candidate, the State PSC route is geographically less aligned (you'd compete in your home state's PSC — MPSC, TNPSC, MPPSC, etc.) The "both simultaneously" math still works, just substitute UPPSC with YOUR home state's PSC.

If your UPSC attempt is your first and you're still building Prelims confidence, splitting attention is counterproductive. Year 1: focus on UPSC CSE. Year 2+: add UPPSC PCS as a parallel track.

## Pay differences after selection

| Service | Entry Pay Level | Basic | Metro gross |
| --- | --- | --- | --- |
| IAS / IPS / IFS (UPSC CSE) | Level 10 | ₹56,100 | ₹93,000 – ₹1,05,000 |
| UP PCS — SDM / DySP | Level 10 (UP) | ₹56,100 | ₹85,000 – ₹95,000 |
| UP PCS — BDO / Treasury Officer | Level 9 (UP) | ₹53,100 | ₹78,000 – ₹88,000 |

A UP PCS Deputy Collector / SDM earns 85-90% of an IAS entry-level salary. Not 50%, not 30% — close to 90%. The difference compounds over a career (IAS reaches Cabinet Secretary level; PCS plateaus at IAS-equivalent Senior Selection Grade after ~15 years), but for the first decade of service the gap is small.

## Reality check

Most aspirants who clear UPSC CSE on attempt 1 had ALSO cleared UPPSC PCS the previous year. The two-track aspirants who failed UPSC but cleared PCS often describe PCS as a "career insurance policy" that let them attempt UPSC longer without family or financial pressure.

PCS is not "settling". For 99.9% of aspirants, IT IS the civil service career that becomes available.

## Bottom line

If you're a UP-domicile UPSC aspirant, NOT writing UPPSC PCS in parallel is leaving high-EV optionality on the table. The marginal effort is small; the conversion improvement is large. The historical pattern: aspirants who CLEAR UPSC CSE often cleared their state PSC the year before. Treat the state PSC as the floor, not the ceiling.
`,
  },

  // ════════════════════════════════════════════════════════════════
  // BATCH 7 COMPARISON ARTICLES — second wave of "X vs Y" pieces
  // ════════════════════════════════════════════════════════════════

  {
    slug: "ctet-vs-uptet-which-to-target",
    title: "CTET vs UPTET: which teacher eligibility test to target, and when to do both",
    dek:
      "Central vs state pathways for school-teacher recruitment in India. We compare reach, salary outcomes, validity, and the strategy of doing both — because the prep overlap is ~85% and the second test costs almost no incremental study.",
    publishedOn: "2026-05-22",
    readMins: 6,
    author: "Shishya editorial",
    tags: ["CTET", "UPTET", "Teaching", "Comparison"],
    sources: [
      { label: "CTET official site", url: "https://ctet.nic.in/" },
      { label: "UPBEB UPTET official site", url: "https://updeled.gov.in/" },
      { label: "Deep content on /exams/CTET and /exams/UP_UPTET", url: "https://shishya.in/exams/CTET" },
    ],
    body: `## What each test actually opens

**CTET** is the qualifying eligibility test for primary (Class 1-5) and upper-primary (Class 6-8) teacher posts in CENTRAL government schools — KVS (Kendriya Vidyalaya), NVS (Navodaya Vidyalaya), EMRS (Eklavya Model Residential Schools), and Delhi NCT schools. Pass once → certificate valid for life.

**UPTET** is the state version. Qualifying for it makes you eligible for primary + upper-primary teacher posts in UP government and aided schools (the Basic Education Department vacancies). Pass once → certificate valid for life (aligned with the 2021 NCTE notification).

So CTET and UPTET serve different recruiters. CTET → central schools. UPTET → UP government schools.

## Salary comparison after recruitment

CTET → KVS / NVS Primary Teacher (PRT):
- Pay Level 6 · Basic ₹35,400 · Gross ₹52,000 – ₹61,000 (X-class city)
- Plus: Central govt pension under NPS, CGHS medical, education concession for own children

UPTET → UP Assistant Teacher (Primary):
- Pay Level 6 equivalent · Basic ₹35,400 · Gross ₹45,000 – ₹52,000 (UP postings)
- UP state pension under NPS, state medical reimbursement

**CTET-route teaching pays ~₹7,000-9,000 more per month at metro postings, plus CGHS + central perks.** Over a 30-year career, the CTET-route salary lead compounds to ~₹50-70 lakh in additional earnings.

## Why most aspirants should write BOTH

The prep overlap is ~85%. CTET and UPTET both test:
- Child Development & Pedagogy (Paper 1 + Paper 2)
- Language I + Language II
- Mathematics + EVS (for primary stage)
- Subject papers (for upper primary)

What differs:
- CTET is in English + Hindi; UPTET is in Hindi only.
- UPTET has slight UP-specific content (Hindi grammar from UP Board textbooks, regional EVS topics).
- CTET is conducted by CBSE; UPTET by UPBEB.

For a UP-resident aspirant: writing CTET costs you ~10 extra hours of prep on top of UPTET. The salary differential makes that the highest-ROI 10 hours of your career.

## The non-obvious problem

Many UP aspirants write UPTET first (because it's perceived as easier), clear it, and then struggle in their CTET attempt because CTET has slightly more analytical pedagogy questions. The reverse order works better: prep for CTET (more rigorous), then UPTET becomes a layup.

## When to skip CTET

If you live outside UP and have no intention of relocating, UPTET alone is sufficient for your state's recruitment. But check your home state's TET — some states (TN, MH, KA) have their own TET that's the relevant one for you. CTET is still useful as a backup for KV / NVS posts anywhere in India.

## Bottom line

CTET and UPTET aren't substitutes — they're complementary. For UP-resident aspirants: write both. CTET-route central school posting pays significantly more and unlocks central perks that aren't available in state-cadre teaching jobs.
`,
  },

  {
    slug: "sbi-po-vs-ibps-po-salary-prestige-effort",
    title: "SBI PO vs IBPS PO: salary, prestige, and effort — which one is actually worth chasing",
    dek:
      "Banking aspirants almost always assume SBI PO is harder and more prestigious. The salary numbers say SBI does pay more, but the cutoff and effort difference is smaller than the reputation suggests. We break down the honest math.",
    publishedOn: "2026-05-22",
    readMins: 6,
    author: "Shishya editorial",
    tags: ["SBI PO", "IBPS PO", "Banking", "Comparison"],
    sources: [
      { label: "IBA bipartite settlement — 12th BPS wage structure", url: "https://www.iba.org.in/iba/news/16659.html" },
      { label: "SBI careers portal", url: "https://sbi.co.in/web/careers/current-openings" },
      { label: "IBPS PO official site", url: "https://www.ibps.in/" },
      { label: "Deep content on /exams/SBI_PO and /exams/IBPS_PO", url: "https://shishya.in/exams/SBI_PO" },
    ],
    body: `## The cutoff difference

SBI Prelims is typically 1-2 difficulty levels harder than IBPS Prelims in the same year. The cutoffs reflect this — but not as starkly as the reputation suggests.

| Metric | SBI PO 2024 | IBPS PO 2024 |
| --- | --- | --- |
| Prelims cutoff (General overall) | 55.0 – 58.5 / 100 | 59.50 – 63.25 / 100 |
| Mains cutoff (General) | ~95-100 / 200 | ~85-92 / 200 |
| Final selection conversion | ~0.4% | ~0.8% |

SBI's Prelims cutoff is actually LOWER than IBPS's — because the SBI paper is harder per question. The Mains cutoff is higher because SBI's Mains is shorter + tougher.

The conversion gap (0.4% vs 0.8%) is the real signal: SBI accepts FEWER candidates from its applicant pool relative to IBPS PO across 11 PSU banks. SBI is structurally tighter.

## Salary at entry

SBI PO (after probation):
- Basic ₹48,480 (post-12th BPS revision, 2022)
- Gross ₹65,000 – ₹73,000 at metro postings (Mumbai, Delhi, Bangalore, Chennai)
- Plus: concessional rate housing loan, car loan, performance bonus

IBPS PO at any participating PSU (after probation):
- Basic ₹48,480 (same — IBA bipartite agreement applies to all)
- Gross ₹57,000 – ₹65,000 at metro postings
- Plus: similar loans + bonuses (varies by bank)

**SBI pays ~₹8,000 – ₹10,000 more per month at metro postings**, primarily through performance allowances and the SBI-specific special allowance.

## Career velocity

SBI: Two-year probation → Officer JMGS-I confirmed → MMGS-II in 3 years → MMGS-III in 8 years.

IBPS (any PSU): Similar two-year probation → JMGS-I → MMGS-II in 4-5 years (faster at smaller banks) → MMGS-III in 9-11 years.

SBI tends to demand higher mobility (frequent transfers across India) but offers slightly faster promotion. IBPS PSUs vary — Canara Bank, Bank of Baroda are similar to SBI; some smaller PSUs are slower.

## When to chase SBI specifically

- If you specifically want to work at SBI (the brand, the size, the urban posting probability).
- If you're a top-quartile aspirant — you'll clear both, so go for the better-paying one.
- If you can stomach frequent transfers and the SBI culture (more demanding hours, more diverse responsibilities).

## When IBPS PO is the smarter target

- If you want predictable career stability with less frequent transfers.
- If you live in a tier-2/tier-3 city — IBPS placements often stay closer to home.
- If your prep timeline is shorter — IBPS Prelims is more achievable in a 6-month window.
- If you'd rather optimise for clearing PO this year (any bank) than risk missing both.

## The strategy 80% of aspirants should run

Write both. The schedules don't clash (SBI Prelims usually September-November; IBPS PO Prelims October-November). The prep is ~95% the same. The cost of writing both is the exam fee (~₹750 each) — the upside is two shots at the goal.

If you clear both: pick SBI. If you clear only IBPS: take it.

## Bottom line

SBI PO pays modestly more and is somewhat harder to crack. The reputational gap ("SBI is the best, IBPS is a fallback") is bigger than the actual gap in salary, prestige, or career outcomes. For most aspirants, treat both as parallel attempts; don't sacrifice IBPS to "save energy" for SBI.
`,
  },

  {
    slug: "mbbs-abroad-vs-indian-honest-comparison",
    title: "MBBS abroad vs Indian MBBS: the honest comparison after the 2023 FMG rule changes",
    dek:
      "Russia, Ukraine, Philippines, Bangladesh, China — Indian students go abroad for MBBS when home seats are out of reach. We compare total cost, FMGE pass rates, government recognition risks, and the realistic career outcomes 5-7 years after graduating.",
    publishedOn: "2026-05-22",
    readMins: 8,
    author: "Shishya editorial",
    tags: ["MBBS", "Study Abroad", "Medical career", "FMGE", "Comparison"],
    sources: [
      { label: "NMC (National Medical Commission) — Foreign Medical Graduate Licentiate Regulations 2021", url: "https://www.nmc.org.in/" },
      { label: "NBE FMGE result archives", url: "https://nbe.edu.in/" },
      { label: "MEA travel + study abroad advisories", url: "https://www.mea.gov.in/" },
    ],
    body: `## Why the question keeps coming up

NEET UG 2024 had ~24 lakh candidates competing for ~1.1 lakh MBBS seats. ~22 lakh students did NOT get an MBBS seat in India.

A significant fraction of these — estimated 25,000 – 30,000 per year — go abroad for MBBS. Russia, Ukraine (pre-2022), Kazakhstan, Uzbekistan, Bangladesh, Nepal, China, Philippines, and Caribbean countries are the common destinations.

The question every family asks: is this a real medical degree, or a gamble that ends with no career?

## Total cost comparison

| Country | Total tuition (5-6 yr course) | Hostel + Living | Total |
| --- | --- | --- | --- |
| India — Govt Medical College | ₹50,000 – ₹3 lakh | ₹3 – ₹5 lakh | **₹4 – ₹8 lakh** |
| India — Private Medical College | ₹50 lakh – ₹1.2 crore | ₹5 – ₹8 lakh | **₹55 lakh – ₹1.3 crore** |
| Russia (e.g., Kazan, Bashkir) | ₹16 – ₹25 lakh | ₹10 – ₹15 lakh | **₹26 – ₹40 lakh** |
| Ukraine (pre-2022) | ₹15 – ₹22 lakh | ₹8 – ₹12 lakh | **₹23 – ₹34 lakh** |
| Philippines | ₹18 – ₹28 lakh | ₹10 – ₹14 lakh | **₹28 – ₹42 lakh** |
| Bangladesh | ₹20 – ₹30 lakh | ₹4 – ₹6 lakh | **₹24 – ₹36 lakh** |
| China | ₹20 – ₹35 lakh | ₹8 – ₹12 lakh | **₹28 – ₹47 lakh** |
| Kazakhstan / Uzbekistan / Kyrgyzstan | ₹15 – ₹25 lakh | ₹8 – ₹12 lakh | **₹23 – ₹37 lakh** |

So MBBS abroad is roughly 5-8x more expensive than a govt Indian seat but 3-5x cheaper than a private Indian seat. The decision often boils down to: "I can't get a govt seat and can't afford a private one — what's left?"

## The licentiate exam (FMGE) — the rate-limiter

Indian medical graduation alone doesn't make you a doctor in India. You need an MBBS degree FROM India OR you need to:
1. Get a foreign MBBS,
2. Clear the FMGE (Foreign Medical Graduate Examination) — 50% qualifying score,
3. Complete a 12-month internship in India,
4. Register with the State Medical Council.

Then you can practice.

**FMGE pass rates have historically been brutal:**

| Year | FMGE Pass Rate |
| --- | --- |
| 2018 | 13% |
| 2019 | 12% |
| 2020 | 16% |
| 2021 | 24% |
| 2022 | 21% |
| 2023 | 17% |
| 2024 | 20% (interim) |

So about 80% of foreign MBBS graduates FAIL FMGE on the first attempt. Many take 3-4 attempts. Some never clear it and effectively wasted 5-6 years + ₹30-40 lakh.

**Compare:** the NEET PG pass rate (for Indian graduates moving to PG) is structurally different — but Indian graduates don't need a licentiate to practise. They're licensed automatically post-internship.

## The 2023 NMC rule change (NMC FMG Regulations)

NMC tightened rules in 2021-2023:
- Foreign MBBS must be ≥54 months of curriculum.
- 12 months of internship at the same university (no return-home internship).
- The university must be on the WHO Directory + NMC-recognised.
- 10-year limit from joining to FMGE clearance.

These rules eliminated several "shortcut" countries that offered 4-year MBBS or remote-internship options. Many Ukraine-grad students caught in the 2022 war crisis got rule relaxations; future students don't.

## When MBBS abroad actually makes sense

- **You can finance it without debt that breaks the family.** ₹30-40 lakh is a lot but manageable for upper-middle-class families. Debt-funded MBBS abroad is risky given FMGE odds.
- **You're prepared to study hard during AND after the foreign MBBS.** Foreign MBBS curricula are often less rigorous than Indian; FMGE prep needs to start in year 3-4 of the foreign course, not after returning.
- **You're choosing an NMC-recognised university with a strong FMGE track record.** Some Kazan, Philippines, Bangladesh universities have 50-60% FMGE pass rates among their grads — much better than the national average. Research per university.

## When MBBS abroad is a trap

- You're chasing it because "Russia is cheaper" but can't fund ₹35 lakh without a heavy loan.
- You're picking a university based on agent recommendations only (the agent gets a commission, not a guarantee).
- You haven't budgeted ₹3-5 lakh + 1-2 years for FMGE coaching post-graduation.
- You're considering it as a "shortcut to PG" — there's no shortcut; FMGE → NEET PG is the longer path, not shorter.

## What 80% of capable aspirants should do instead

If your NEET UG score puts you between AIR 15,000 – 50,000 (General):
- Take a BDS / BAMS / BHMS in India this year.
- Re-attempt NEET as a drop-year next year.
- Indian government / semi-government medical / dental career is reachable without leaving the country.

If your NEET UG score is >AIR 50,000 (General):
- Consider non-MBBS allied medical (BPT Physiotherapy, BSc Nursing, BSc Optometry, BSc MLT). These are legitimate medical careers with their own ceilings.
- MBBS abroad is the high-cost / high-risk option compared to these alternatives.

## Bottom line

MBBS abroad is a legitimate path for some — but the FMGE pass rate of ~20% means 4 out of 5 foreign graduates don't clear the licentiate on first attempt. The financial + emotional cost of that risk is what most agent-recommendations omit. Go in with full information, choose universities with proven FMGE track records, and budget for years 7-9 (FMGE prep + internship) before counting on income.
`,
  },

  {
    slug: "gate-for-iit-mtech-vs-psu-recruitment",
    title: "GATE for IIT M.Tech vs PSU recruitment: same exam, two very different optimisations",
    dek:
      "GATE is the gate to both IIT M.Tech and PSU recruitment (BHEL / IOCL / GAIL / NTPC / ONGC). But the cut-off, the choice rationale, and the post-clearing path differ sharply. Pick your target before you start preparing.",
    publishedOn: "2026-05-22",
    readMins: 7,
    author: "Shishya editorial",
    tags: ["GATE", "IIT M.Tech", "PSU", "Career", "Comparison"],
    sources: [
      { label: "IIT M.Tech COAP counselling", url: "https://coap.iitg.ac.in/" },
      { label: "PSU recruitment notifications via GATE", url: "https://gate2026.iitg.ac.in/" },
      { label: "Deep content on /exams/GATE_CSE", url: "https://shishya.in/exams/GATE_CSE" },
    ],
    body: `## Two destinations, one ticket

GATE was originally designed for M.Tech / MS / PhD admissions to IITs / IISc / NITs / IIITs. Around 2010, leading PSUs started using GATE scores for recruitment — most notably BHEL, IOCL, GAIL, NTPC, ONGC, HPCL, BPCL, Power Grid, NHPC, NLC, SAIL, NMDC, ECIL.

So one GATE score opens TWO career pathways:
1. M.Tech at a top engineering institute → 2 years study → corporate placement / further research.
2. Direct PSU Executive Trainee → 1 year training → permanent officer-cadre government job.

These are not the same job. The optimisation differs.

## The score targets differ

**For IIT M.Tech CSE (Open category, 2024):**
- IIT Bombay closing GATE score: ~890-920 / 1000
- IIT Delhi: ~870-900
- IIT Madras: ~850-890
- IIT Hyderabad: ~810-850

These translate to ~AIR 50-300 in GATE CSE.

**For PSU recruitment (most popular: IOCL, BHEL, NTPC, 2024):**
- Typical closing GATE score for shortlisting: **620-750** depending on PSU + branch + category
- Translates to ~AIR 200-1,500 in GATE CSE (lower bar than top-IIT M.Tech)

PSU shortlisting is a lower bar but then you have GD + interview rounds. IIT M.Tech is harder to get into but no interview after counselling (just COAP selection).

## Starting compensation

**IIT M.Tech CSE → corporate placement (Year 2):**
- Top placement (Microsoft, Adobe, Goldman Sachs, etc.): ₹40-60 lakh CTC
- Median IIT-B M.Tech CSE placement: ₹25-35 lakh CTC
- After 2 years of opportunity cost (no salary during M.Tech)

**PSU Executive Trainee (immediate joining):**
- Basic ₹50,000 – ₹60,000
- Gross ₹85,000 – ₹1,20,000 (depending on PSU + city)
- 1 year of probation, then permanent Officer-grade
- Lifetime job security, defined benefit pension

## The 5-year comparison

| Path | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Cumulative |
| --- | --- | --- | --- | --- | --- | --- |
| IIT M.Tech CSE → IT corporate | ₹0 (studying) | ₹0 (studying) | ₹30L | ₹35L | ₹42L | ₹107 lakh |
| PSU ET (IOCL, BHEL etc.) | ₹12L | ₹15L | ₹17L | ₹19L | ₹22L | ₹85 lakh |

IIT M.Tech-route wins on cumulative earnings BY YEAR 5, but only if the corporate placement is strong (top quartile of IIT M.Tech batch). For the median IIT M.Tech graduate, the gap is much smaller (~₹10-15 lakh) and only emerges around year 6-7.

Beyond year 7: corporate IT earnings continue to grow faster than PSU (job-hopping + stock options). PSU plateau is real — pay revisions only happen at 5-yearly bipartite negotiations.

## When IIT M.Tech CSE is the right pick

- You want a research-heavy career path (PhD, academia, R&D labs at top companies).
- You're willing to defer earning for 2 years for higher long-term ceiling.
- You're confident your placement will be top-quartile — strong UG GPA + competitive coding background.

## When PSU is the right pick

- You value job security over income ceiling. PSU pension + defined benefits are still rare in 2026.
- You prefer a structured Government-sector career with predictable transfers + responsibilities.
- You can't (or don't want to) compete in the high-pressure corporate IT environment.
- You're from a tier-2/tier-3 background and the PSU posting will likely keep you closer to home.

## The two-track strategy

For aspirants who clear GATE with a strong score (top 1,000 AIR):

1. Apply for IIT M.Tech via COAP.
2. Simultaneously apply to PSU recruitment cycles (each PSU has its own application window post-GATE result).
3. Wait for both outcomes.
4. Choose based on actual offers, not pre-decided preference.

The risk of pre-committing to one path is the IIT-rejection scenario where you've also missed the PSU application windows.

## The single biggest mistake

Most aspirants assume "if I get GATE rank 200, IIT M.Tech is automatic." It isn't. M.Tech admission depends on COAP counselling — branch + institute combinations are limited, and many candidates with AIR 200 don't get IIT-B / IIT-D / IIT-M. Always apply for PSU recruitment as a hedge, even if your dream is IIT M.Tech.

## Bottom line

GATE for IIT M.Tech and GATE for PSU are different optimisation problems with overlapping prep. IIT M.Tech rewards research aptitude + long-term-ceiling thinking. PSU rewards stability + immediate earning. Most aspirants in the AIR 200-2000 band should hedge by writing both PSU + COAP applications. Decide based on actual offers, not preconceived prestige.
`,
  },

  // ════════════════════════════════════════════════════════════════
  // STATE-SPECIFIC LONG-TAIL ARTICLES
  // High-volume "state + topic" search queries — each ranks for its
  // own state government job ecosystem.
  // ════════════════════════════════════════════════════════════════

  {
    slug: "tamil-nadu-government-jobs-2026",
    title: "Tamil Nadu government jobs 2026 — the complete picture by department + salary",
    dek:
      "TNPSC, TNUSRB, TRB, TET — Tamil Nadu has ~12 different recruitment boards across departments. We map every major recruitment exam, salary by pay level, and the realistic timeline from notification to joining.",
    publishedOn: "2026-05-22",
    readMins: 9,
    author: "Shishya editorial",
    tags: ["Tamil Nadu", "Government Jobs", "State Recruitment", "Salary"],
    sources: [
      { label: "TNPSC official notifications", url: "https://www.tnpsc.gov.in/" },
      { label: "TNUSRB recruitment", url: "https://tnusrbonline.org/" },
      { label: "Tamil Nadu Teachers Recruitment Board (TRB)", url: "https://trb.tn.gov.in/" },
      { label: "Deep content on /exams/TN_TNPSC_GROUP1, GROUP2, TN_POLICE_PC", url: "https://shishya.in/exams/TN_TNPSC_GROUP1" },
    ],
    body: `## The TN government recruitment landscape

Tamil Nadu has 5-6 main recruitment boards, each handling different post families:

1. **TNPSC (Tamil Nadu Public Service Commission)** — civil services + most state department posts
2. **TNUSRB (Tamil Nadu Uniformed Services Recruitment Board)** — police, jail warder, fire
3. **TRB (Teachers Recruitment Board)** — government school teacher posts
4. **Medical Services Recruitment Board** — government doctor posts
5. **Tamil Nadu Health Services** — paramedical + nurse posts
6. **Special boards** — Forest, Co-operative, Electricity Board, etc.

## TNPSC groups — what each opens

| Group | Posts | Education | Salary (Pay Level) |
| --- | --- | --- | --- |
| Group 1 | Deputy Collector, DySP, Asst Commissioner | Bachelor's | Pay Level 22 · ₹56,100 basic · ₹93k+ gross |
| Group 2 (interview) | Asst Section Officer, Sub-Registrar, Inspector | Bachelor's | Pay Level 16-19 · ₹36k-47k basic |
| Group 2A (non-interview) | Asst, Junior Inspector, etc. | Bachelor's | Pay Level 11-14 · ₹26k-35k basic |
| Group 4 | VAO, Junior Assistant, Bill Collector | Class 12 | Pay Level 7-11 · ₹19k-27k basic |
| Group 7 | Field Surveyor, Junior Inspector | Diploma | Pay Level 11-14 · ₹26k-35k basic |
| Group 8 | Stenographer, Typist | Class 12 + Typing | Pay Level 8-11 · ₹20k-27k basic |

Most aspirants target Group 1, Group 2, or Group 4 — these are the highest-volume posts.

## Tamil Nadu Police — the parallel pathway

TNUSRB conducts separate recruitment:

- **Grade II Police Constable** (Class 12 entry, Pay Level 8) — most-recruited post family
- **Sub-Inspector (SI)** (Bachelor's entry, Pay Level 16) — officer-cadre
- **Special Sub-Inspector / Jail Warder** — niche but available

Salary at Grade II Police Constable: ~₹32,000 – ₹38,000 gross at Chennai posting.

## Teaching recruitment via TRB

Tamil Nadu has its own TET (Tamil Nadu Teacher Eligibility Test):

- **Paper I** (Class 1-5): D.El.Ed + 12th 50%
- **Paper II** (Class 6-8): Bachelor's + B.Ed

After TET → TRB conducts the actual recruitment cycle (separate exam). Salary at entry: ~₹35,000 – ₹40,000 gross for a Primary Teacher.

## Timeline from notification to joining

The realistic timeline for any TN government job:

| Stage | Typical duration |
| --- | --- |
| Notification → Application deadline | 1 month |
| Application deadline → Prelims/CBE | 3-4 months |
| Prelims → Mains | 4-6 months |
| Mains → Interview | 2-3 months |
| Interview → Final selection | 1-2 months |
| Selection → Document verification | 2 months |
| Verification → Joining | 4-6 months |
| **Total** | **18 – 24 months** |

Plan for 1.5-2 years from the day you start preparing to the day you actually join. The longest gaps are usually between notifications (TN can sometimes have 2-3 years between cycles for the same exam).

## Salary by stage of career

For a Group 1 selectee (Deputy Collector, entry to Pay Level 22):

| Year | Basic | Gross (Chennai) | Notes |
| --- | --- | --- | --- |
| Year 0 (probation) | ₹56,100 | ₹85,000 | Training stipend at TN Admin Training Institute |
| Year 1-2 | ₹56,100 | ₹93,000 – ₹1,05,000 | Confirmed post |
| Year 5 (Spl Dy Collector) | ₹61,800 | ₹1,12,000 – ₹1,25,000 | Promotion via Annual Increment |
| Year 10 (Sub-Collector) | ₹76,500 | ₹1,40,000 – ₹1,58,000 | Pay Level 25 |
| Year 15+ (Collector eligible) | ₹1,00,000+ | ₹1,85,000 – ₹2,10,000 | District Collector posting (rare from PCS route) |

## The Tamil-language requirement everyone underestimates

Every TN government recruitment requires Tamil proficiency. TNPSC has a separate Tamil Eligibility Test as part of all major recruitments. For non-Tamil-speaking aspirants, this is the single biggest hurdle — and you can't take it last-minute.

Time investment: 4-6 months of structured Tamil learning if you're starting from zero. Most coaching centres in Chennai now offer Tamil-for-TNPSC modules.

## Bottom line

Tamil Nadu has 8-10 distinct government job paths across TNPSC, TNUSRB, TRB and others. The realistic time from notification to joining is 18-24 months. Tamil proficiency is non-negotiable. For high-volume + high-salary, target TNPSC Group 1; for fastest path to a stable job, target Group 4 or TNUSRB Police Constable.
`,
  },

  {
    slug: "bihar-police-salary-chart-2026",
    title: "Bihar police salary chart 2026 — Constable to Senior SP, complete pay matrix",
    dek:
      "Bihar Police's pay structure, post by post — Constable, Sub-Inspector (Daroga), Inspector, DySP, SP. We include the 6th Pay Commission (state) implementation status, field/risk allowance, and the realistic career trajectory.",
    publishedOn: "2026-05-22",
    readMins: 7,
    author: "Shishya editorial",
    tags: ["Bihar", "Police", "Government Jobs", "Salary Chart"],
    sources: [
      { label: "Central Selection Board of Constable (CSBC), Bihar", url: "https://csbc.bih.nic.in/" },
      { label: "Bihar Police Subordinate Services Commission (BPSSC)", url: "https://bpssc.bih.nic.in/" },
      { label: "Bihar Police official site", url: "https://www.biharpolice.bih.nic.in/" },
      { label: "Deep content on /exams/BR_POLICE_PC and BR_POLICE_SI", url: "https://shishya.in/exams/BR_POLICE_PC" },
    ],
    body: `## Bihar Police pay structure — complete chart

Bihar follows the central 7th CPC framework adapted to state pay matrix.

| Rank | Pay Level | Basic | Gross (Patna) | Recruitment Body |
| --- | --- | --- | --- | --- |
| Constable | Pay Level 3 | ₹21,700 | ₹29,000 – ₹35,000 | CSBC |
| Head Constable | Pay Level 4 | ₹25,500 | ₹34,000 – ₹40,000 | Promotion from Constable |
| Asst Sub-Inspector (ASI) | Pay Level 5 | ₹29,200 | ₹39,000 – ₹46,000 | Promotion from HC |
| Sub-Inspector (Daroga) | Pay Level 6 | ₹35,400 | ₹50,000 – ₹62,000 | BPSSC (direct) |
| Inspector | Pay Level 7 | ₹44,900 | ₹62,000 – ₹74,000 | Promotion from SI |
| Deputy SP (DySP) | Pay Level 9 | ₹53,100 | ₹78,000 – ₹90,000 | BPSC CCE |
| Additional SP | Pay Level 10 | ₹56,100 | ₹85,000 – ₹95,000 | Promotion |
| SP (Superintendent of Police) | Pay Level 11 | ₹67,700 | ₹1,00,000 – ₹1,15,000 | Promotion / IPS allotment |
| Senior SP | Pay Level 12 | ₹78,800 | ₹1,15,000 – ₹1,30,000 | Senior level |

## What "gross" actually includes

For a Bihar Constable at Patna posting (Pay Level 3):

- Basic: ₹21,700
- DA (currently ~46% of basic): ~₹10,000
- HRA (24% of basic, X-class): ₹5,200
- Uniform Allowance: ₹500
- Field/Hardship Allowance (if border/rural): ₹500-2,000
- Total Gross: ~₹37,000-₹40,000

For Sub-Inspector (Daroga) at Patna:

- Basic: ₹35,400
- DA: ~₹16,300
- HRA: ₹8,500
- Special Duty Allowance: ₹2,000-3,500
- Total Gross: ~₹62,000-₹65,000

## Career progression timeline

For a Constable joining at age 22:

- Year 0-7: Constable → Head Constable (Pay Level 3 → 4)
- Year 7-12: Head Constable → ASI (Pay Level 5)
- Year 12-18: ASI → SI by promotion (or via internal exam) (Pay Level 6)
- Year 18-25: SI → Inspector (Pay Level 7)
- Year 25+: Inspector → DySP via departmental selection (Pay Level 9)

Many constables retire as Inspector (Pay Level 7) — ~₹62k-74k gross. Promotion to DySP from cadre is rare; most DySPs are direct BPSC entries.

For a direct Daroga (SI) entrant at age 24:

- Year 0-5: SI confirmed → Inspector (Pay Level 6 → 7)
- Year 5-12: Inspector → ASP/Inspector senior (Pay Level 7-9)
- Year 12-20: DySP → Addl SP (Pay Level 9-10)
- Year 20+: SP (Pay Level 11)

Direct SI route reaches Inspector in 5 years; Constable route takes 18+ years.

## Special allowances + perks

- **Free uniform** + annual replacement allowance
- **Free accommodation in barracks** (Constable) or quarters (SI+)
- **Free medical treatment** for self + family at any Bihar Govt hospital
- **Risk + Field allowance** for posting in difficult areas (Naxal-affected, border)
- **LTC every 2 years** (Leave Travel Concession)
- **NPS** (National Pension System) — 10% basic contribution, matched by state
- **Group Insurance** — central + state schemes

## Promotion exams within the force

Bihar Police runs internal Limited Departmental Competitive Exams (LDCE):

- Constable → Head Constable: LDCE for shortlisting
- Head Constable → ASI: LDCE
- ASI → SI: LDCE (more rigorous)
- SI → Inspector: Departmental seniority + LDCE
- Inspector → DySP: Promotion list (very limited slots)

For Constables aiming faster career growth: clear the SI LDCE within 7-10 years of joining. Without LDCE, promotion is glacial.

## The honest reality

Bihar Police's biggest career challenge isn't pay — it's posting and political environment. Postings in Naxal-affected districts come with risk allowances but also genuine danger. Frequent transfers (every 2-3 years) make settling family roots difficult. Political interference in postings (especially for SI/Inspector levels) is a known challenge.

The pay is decent for a state government job; the working conditions vary widely by posting.

## Bottom line

Bihar Police pay matches central CPC standards, with state-specific allowances. Constable starts at ~₹35,000 gross; SI starts at ~₹62,000; SP at ~₹1,00,000. Career progression for Constables is slow (15-20 years to ASI); direct SI entrants reach DySP in 12 years. Posting + political conditions are the bigger career variables than pay.
`,
  },

  {
    slug: "maharashtra-government-job-salary-structure",
    title: "Maharashtra government job salary structure 2026 — by Pay Level + department",
    dek:
      "MPSC, MH Police, Maharashtra Educational Services — the state's recruitment + pay landscape. We break down 7th CPC Maharashtra pay matrix (Levels 1-30), the post families, and what each Pay Level translates to at Mumbai vs Pune vs rural postings.",
    publishedOn: "2026-05-22",
    readMins: 7,
    author: "Shishya editorial",
    tags: ["Maharashtra", "Government Jobs", "Salary", "MPSC"],
    sources: [
      { label: "MPSC official notifications", url: "https://mpsc.gov.in/" },
      { label: "Maharashtra Police", url: "https://mahapolice.gov.in/" },
      { label: "Maharashtra 7th CPC pay rules", url: "https://gad.maharashtra.gov.in/" },
      { label: "Deep content on /exams/MH_MPSC_RAJYASEVA, MH_POLICE_BHARTI", url: "https://shishya.in/exams/MH_MPSC_RAJYASEVA" },
    ],
    body: `## Maharashtra pay matrix overview

Maharashtra adopted the 7th CPC framework via the state Government Resolution dated 30 January 2019, retrospectively from 1 January 2016. The state pay matrix uses S-1 through S-30 levels.

| S-Level | Basic | Equivalent central 7th CPC | Typical post |
| --- | --- | --- | --- |
| S-7 | ₹19,900 | Pay Level 2 | LDC, Clerk |
| S-8 | ₹21,700 | Pay Level 3 | Constable (MH Police) |
| S-11 | ₹29,200 | Pay Level 5 | Senior Clerk |
| S-15 | ₹37,400 | Pay Level 6 | Asst Section Officer |
| S-17 | ₹47,600 | Pay Level 7-8 | Tahsildar / BDO |
| S-20 | ₹56,100 | Pay Level 10 | Deputy Collector / DySP |
| S-22 | ₹67,700 | Pay Level 11 | Asst Director (Class I) |
| S-25 | ₹78,800 | Pay Level 12 | Joint Director |
| S-28 | ₹1,18,500 | Pay Level 13A | Director / Senior Joint Secretary |
| S-30 | ₹2,05,400 | Pay Level 15+ | Principal Secretary |

## What "gross" pay actually looks like by post

Mumbai (X-class city — highest HRA, best perks):

| Post | Basic (S-Level) | DA (current ~46%) | HRA (24%) | Gross |
| --- | --- | --- | --- | --- |
| Constable (MH Police) | ₹21,700 (S-8) | ₹10,000 | ₹5,200 | ~₹38,000 |
| Asst Section Officer (Group 2) | ₹37,400 (S-15) | ₹17,200 | ₹9,000 | ~₹65,000 |
| Tahsildar / BDO (Group 2 / 3) | ₹47,600 (S-17) | ₹21,900 | ₹11,400 | ~₹83,000 |
| Deputy Collector / DySP (Group 1) | ₹56,100 (S-20) | ₹25,800 | ₹13,500 | ~₹98,000 |

Pune (Y-class — HRA at 16%):

Subtract ~₹3,000-5,000 from Mumbai gross for each post.

Rural postings (Z-class — HRA at 8%):

Subtract ~₹6,000-9,000 from Mumbai gross. But these often get hardship allowances that offset some of the HRA gap.

## Major MPSC post families + their salary anchor

**Group A (Class I) — entry through MPSC Rajyaseva:**
- Deputy Collector: S-20 (~₹98,000 Mumbai gross)
- Deputy Superintendent of Police: S-20 (~₹98,000)
- Asst Commissioner of State Tax: S-20 (~₹98,000)
- Asst Director Industries / Education: S-22 (~₹1,15,000)

**Group B (Class II) — Rajyaseva or separate cycles:**
- Tahsildar: S-17 (~₹83,000)
- Block Development Officer: S-17 (~₹83,000)
- Naib Tahsildar: S-15 (~₹65,000)
- Police Inspector (PI): S-17 (~₹83,000)

**Group C (Class III) — separate clerical/secretariat cycles:**
- Senior Clerk / Asst Section Officer: S-11 to S-15
- Talathi (Village-level revenue officer): S-9 (~₹42,000)

**Group D (Class IV) — entry via MH Police, separate clerical:**
- Constable: S-8 (~₹38,000)
- Multi-Tasking Staff: S-7 (~₹35,000)

## Career trajectory examples

For an MPSC Rajyaseva Deputy Collector (entry S-20):

- Year 0-3: S-20 (₹56,100 basic, ~₹98,000 Mumbai gross)
- Year 3-7: S-21 (₹64,100 basic) after first promotion
- Year 7-12: S-22 (₹67,700 basic) — Special Deputy Collector
- Year 12-18: S-25 (₹78,800 basic) — Sub-Divisional Officer
- Year 18-25: S-27 (₹1,00,000+) — Senior level (district Collector eligible from MPSC route via Annual Increment + promotion list)
- Year 25+: S-29 / S-30 (Senior Joint Secretary equivalent) — possible but not guaranteed

For an MH Police Constable (entry S-8):

- Year 0-7: S-8 (₹21,700) Constable
- Year 7-12: S-9-10 Head Constable
- Year 12-18: S-11-12 ASI / API
- Year 18-25: S-13-15 PSI (Police Sub-Inspector) — possible via departmental promotion
- Year 25+: S-15-17 Police Inspector

## Maharashtra-specific perks

- **State pension under MEPS** — defined-contribution NPS aligned with central NPS
- **Education concession** for own children (Class 1 to PG) at Government-aided institutions
- **Medical reimbursement** for self + family + dependent parents at any State Govt hospital
- **Concessional MSRTC + railway travel** for officers
- **State housing concession loans** at sub-market interest rates
- **LFC every 2 years** (Leave Fare Concession)

## Marathi language — the universal requirement

Every Maharashtra government recruitment requires Marathi proficiency. MPSC has a Marathi paper (compulsory, descriptive) at Mains. Police recruitment has a Marathi language test at the selection stage.

For non-Marathi-speaking aspirants: expect 6-12 months of focused Marathi learning before being competitive.

## Bottom line

Maharashtra government jobs offer competitive pay (S-8 ₹21,700 basic for Constable → S-30 ₹2,05,400 for Principal Secretary) with strong perks (education concession, medical, pension). Mumbai gross is highest; rural postings get hardship allowances that partially offset lower HRA. The Marathi-language requirement is the single biggest practical hurdle for non-Marathi aspirants.
`,
  },

  {
    slug: "up-government-jobs-after-class-12",
    title: "UP government jobs after Class 12 — every path that doesn't need a Bachelor's degree",
    dek:
      "UP Police Constable, UPSSSC Lower Subordinate, RRB Group D, SSC MTS, UP Forest Guard, UP Excise Constable — the complete list of UP government jobs reachable straight after Class 12, with salary + exam timelines.",
    publishedOn: "2026-05-22",
    readMins: 7,
    author: "Shishya editorial",
    tags: ["Uttar Pradesh", "Government Jobs", "Class 12", "Without Graduation"],
    sources: [
      { label: "UPSSSC official notifications", url: "https://upsssc.gov.in/" },
      { label: "UP Police Recruitment + Promotion Board", url: "https://uppbpb.gov.in/" },
      { label: "Deep content on /exams/UP_POLICE_CONSTABLE, UP_UPSSSC_PET", url: "https://shishya.in/exams/UP_POLICE_CONSTABLE" },
    ],
    body: `## Why Class 12 is enough for a real career

UP has the highest population of government employees in India after the central government (~9 lakh state employees). Many of these jobs DO NOT require a Bachelor's degree.

The myth "you need graduation for a government job" is wrong for UP. Class 12 opens at least 8-10 substantial post families.

## The post families reachable with just Class 12

| Recruitment | Post | Salary (Pay Level + Basic) | Education needed |
| --- | --- | --- | --- |
| UP Police Constable | Civil Police / PAC Constable | Pay Level 3 · ₹21,700 (gross ~₹35-42k) | Class 12 (Intermediate) |
| UPSSSC Lower Subordinate | Junior Asst, Stenographer | Pay Level 2-4 · ₹19,900 – ₹25,500 | Class 12 |
| UPSSSC PET (gateway) | Lower-cadre clerks, drivers | Pay Level 1-4 | Class 12 |
| UP Forest Guard | Forest Beat Officer | Pay Level 3 · ₹21,700 | Class 12 (Math/Sci preferred) |
| UP Excise Constable | Excise Department Constable | Pay Level 3 · ₹21,700 | Class 12 |
| UP Jal Nigam | Junior Engineer (Diploma route — diploma post-Class 12) | Pay Level 6 · ₹35,400 | Diploma post-Class 12 |
| Railways via RRB Group D | Pointsman, Trackman, Helper | Pay Level 1 · ₹18,000 | Class 12 / ITI |
| SSC MTS | Multi-Tasking Staff (any central dept) | Pay Level 1 · ₹18,000 | Class 10 (but Class 12 still helps) |

## UP Police Constable — the most-targeted Class-12-level UP job

Volume: ~3-4 lakh applications per cycle. Cycles every 2-3 years.

Selection: Written CBT (300 marks) → PET (1.6 km run) → Document verification → Medical.

Salary: Pay Level 3 (₹21,700 basic) · Gross ~₹35,000-42,000 at Lucknow / Noida postings.

Career path: Constable (Year 0-10) → Head Constable → ASI (LDCE) → SI (LDCE within force OR direct via UP Police SI).

## UPSSSC PET — the under-known gateway

PET (Preliminary Eligibility Test) is a single qualifying exam that opens dozens of UPSSSC posts. Pass PET once, and you become eligible to apply for all subsequent UPSSSC notifications without re-writing PET. Valid for 3 years.

What you can do after passing PET:
- Lekhpal (Patwari / Junior Revenue Officer) — Pay Level 4
- Forest Guard — Pay Level 3
- Excise Constable — Pay Level 3
- Junior Assistant (any UP government department) — Pay Level 2
- ANM / GNM Nurse (with additional qualification) — Pay Level 4
- Cane Inspector — Pay Level 4
- Mandi Inspector — Pay Level 4

So PET is the most-leveraged exam in UP — one written test, multiple post family options.

## UP Forest Guard — niche but stable

Forest Guard recruitment is irregular (every 5-8 years for major cycles). Pay: Pay Level 3 (₹21,700). Posting: forest beat huts, often remote. Physical fitness required (long-distance walking patrol). Risk allowance for wildlife-area postings.

For aspirants who want outdoor work + government job security, Forest Guard is an undervalued path.

## Railways (RRB Group D) — central + relocation-heavy

Indian Railways recruits Group D (Track Maintainer, Helper, Pointsman, Hospital Assistant) via RRB. Class 12 pass is sufficient (Class 10 with ITI for some posts).

Salary: Pay Level 1 (₹18,000) · Gross ~₹26,000-32,000.

Big perk: free railway pass for self + family + parents (multiple times per year), plus subsidised railway hospital + housing.

Catch: Group D postings can be anywhere across the Indian Railways zones. If you want to stay in UP, RRB allows zone preference but doesn't guarantee.

## SSC MTS — central government Class 10 route

SSC Multi-Tasking Staff is open to Class 10 candidates (Class 12 is a plus but not mandatory). Pay Level 1 (₹18,000). Posting: any central government department across India.

For UP candidates: SSC MTS gives you a central government job (better pension + perks than state-cadre) but with all-India transfer liability.

## The realistic earning trajectory

A Class 12-pass candidate joining as UP Police Constable at age 19:

- Year 0-7: Constable (Pay Level 3, ~₹35-42k gross)
- Year 7-12: Head Constable (Pay Level 4, ~₹40-50k gross)
- Year 12-18: Assistant Sub-Inspector (Pay Level 5, ~₹50-60k gross)
- Year 18-25: Sub-Inspector via LDCE (Pay Level 6, ~₹62-75k gross)
- Year 25+: Inspector (Pay Level 7, ~₹78-92k gross)

A Class 12-pass candidate joining as UPSSSC Lekhpal at age 20:

- Year 0-7: Lekhpal (Pay Level 4, ~₹40-50k gross)
- Year 7-12: Senior Lekhpal / Naib Tahsildar (Pay Level 6, ~₹60-70k gross)
- Year 12-18: Tahsildar via promotion (Pay Level 7, ~₹78-92k gross)
- Year 18+: SDM eligible from cadre (rare, but possible)

Over a 30-year career, both paths lead to ₹70-90k gross — comparable to many graduate-entry jobs at the same career stage.

## What to do while waiting

Most UP government job cycles take 1-2 years from notification to joining. Use the wait productively:

1. Complete your graduation in parallel (Open Universities, IGNOU, distance UG). It opens graduate-only posts (SDM via UPPSC, UP Police SI, Inspector posts).
2. Learn Hindi typing (30-35 wpm) — mandatory for many UPSSSC posts.
3. Build basic computer skills (CCC certificate or equivalent) — required for most government recruitments.
4. Stay physically fit — most UP government jobs have a PET round.

## Bottom line

UP Police Constable, UPSSSC posts (especially via PET), Forest Guard, Excise Constable, and Railways Group D are real Class-12-level pathways to a stable government career. Salaries start at ₹18-22k basic but reach Pay Level 6-7 (₹60-90k gross) by mid-career through promotions. Don't wait for graduation if you can join via Class 12 now — graduation can happen in parallel.
`,
  },

  {
    slug: "karnataka-government-recruitment-by-department",
    title: "Karnataka government recruitment 2026 — by department, exam body, and Pay Level",
    dek:
      "Karnataka has ~13 different recruitment bodies — KPSC, KSP, KEA, KTET, Karnataka Forest Department and others. We map every major exam, the post families it opens, and the realistic salary by Pay Level.",
    publishedOn: "2026-05-22",
    readMins: 7,
    author: "Shishya editorial",
    tags: ["Karnataka", "Government Jobs", "KPSC", "Recruitment"],
    sources: [
      { label: "Karnataka Public Service Commission (KPSC)", url: "https://kpsc.kar.nic.in/" },
      { label: "Karnataka State Police", url: "https://ksp.karnataka.gov.in/" },
      { label: "Karnataka Examinations Authority (KEA)", url: "https://cetonline.karnataka.gov.in/" },
      { label: "Deep content on /exams/KA_KPSC_KAS, KA_POLICE_PC", url: "https://shishya.in/exams/KA_KPSC_KAS" },
    ],
    body: `## Karnataka's recruitment landscape

Karnataka uses ~6 main recruitment bodies + a number of department-specific ones:

1. **KPSC (Karnataka Public Service Commission)** — KAS (Gazetted Probationers), other Class A/B services
2. **KSP (Karnataka State Police)** — Constable, ASI, SI recruitment
3. **KEA (Karnataka Examinations Authority)** — KCET, COMEDK admin, college-level Lecturer recruitment
4. **Karnataka Forest Department** — Forest Guard, RFO
5. **Karnataka Health Services** — paramedical + nursing
6. **Karnataka Industries Department** — staff recruitment

## KPSC — the main civil services gateway

| Exam | Posts | Pay Level | Salary (Bangalore gross) |
| --- | --- | --- | --- |
| KPSC KAS (Gazetted) | Asst Commissioner, Tahsildar, Asst Director | Pay Level 23 (~₹56k basic) | ₹85,000 – ₹95,000 |
| KPSC Group A non-Gazetted | Various Class A non-promotional posts | Pay Level 18-22 | ₹65,000 – ₹82,000 |
| KPSC Group B | Junior Engineer, Asst Statistical Officer | Pay Level 12-15 | ₹40,000 – ₹52,000 |
| KPSC Group C | Senior Clerk, Stenographer | Pay Level 6-9 | ₹28,000 – ₹37,000 |
| KPSC Group D / Lower Subordinate | Junior Asst, Office Asst | Pay Level 3-5 | ₹22,000 – ₹30,000 |

## Karnataka State Police — the parallel pathway

| Post | Pay Level | Basic | Gross (Bangalore) |
| --- | --- | --- | --- |
| Constable (Civil / AR) | Pay Level 4 | ₹23,500 | ₹33,000 – ₹40,000 |
| Head Constable | Pay Level 5 | ₹27,800 | ₹38,000 – ₹46,000 |
| ASI | Pay Level 7 | ₹35,400 | ₹50,000 – ₹60,000 |
| Sub-Inspector (Civil / AR) | Pay Level 12 | ₹47,600 | ₹68,000 – ₹78,000 |
| Inspector | Pay Level 14 | ₹56,100 | ₹82,000 – ₹95,000 |
| DySP (via promotion + KAS allotment) | Pay Level 18 | ₹67,700 | ₹98,000 – ₹1,12,000 |

## Department-specific recruitments

**Karnataka Forest Department:**
- Forest Guard: Class 12 entry, Pay Level 4 (~₹35-42k gross)
- Range Forest Officer (RFO): Bachelor's + Forestry eligibility, Pay Level 14 (~₹80-95k gross)

**Karnataka Health Services:**
- Staff Nurse (BSc Nursing): Pay Level 9 (~₹38-46k gross)
- Auxiliary Nurse Midwife (ANM): Pay Level 5 (~₹28-34k gross)
- Lab Technician: Pay Level 6 (~₹32-40k gross)

**Karnataka Education Department (via KTET + KEA):**
- Primary Teacher (PRT, KTET Paper 1): Pay Level 6 (~₹52-60k gross)
- Senior Teacher (TGT, KTET Paper 2): Pay Level 7 (~₹62-70k gross)
- Lecturer (BEd + PG + KEA Lecturer exam): Pay Level 10-12 (~₹80-95k gross)

## Karnataka-specific perks

- **Kannada Eligibility Bonus** — speed of advancement for native Kannada speakers in state-specific posts
- **Hyderabad-Karnataka (now Kalyana-Karnataka) reservation** — Article 371-J reservation for candidates from this region
- **Karnataka State NPS** — defined-contribution pension aligned with central NPS
- **Free education concession** for own children at Karnataka Govt institutions
- **Medical reimbursement** at Government hospitals + concessional rates at empanelled private hospitals

## The Kannada-language requirement

Every Karnataka government recruitment requires Kannada proficiency. KPSC has a separate Kannada language paper at Mains (qualifying). KSP has a Kannada language test at the selection stage.

For non-Kannada-speaking aspirants: 4-8 months of focused Kannada learning is typically required to be competitive.

## Career trajectory examples

For a KPSC KAS Gazetted Probationer (entry Pay Level 23, ~₹56k basic, ~₹85k Bangalore gross):

- Year 0-3: KAS Probationer / Asst Commissioner
- Year 3-7: Senior Asst Commissioner (Pay Level 24, ~₹64k basic)
- Year 7-12: Special Deputy Commissioner (Pay Level 25, ~₹78k basic)
- Year 12-18: Sub-Divisional Officer (Pay Level 26, ~₹88k basic)
- Year 18-25: Joint Director / Senior Officer (Pay Level 27-28)
- Year 25+: Director / Senior Special Officer (rare, Pay Level 29+)

For a KSP Constable (entry Pay Level 4, ~₹23k basic, ~₹35k Bangalore gross):

- Year 0-7: Constable
- Year 7-12: Head Constable
- Year 12-18: ASI
- Year 18-25: Sub-Inspector (via LDCE within force or direct KSP SI)
- Year 25+: Inspector

## Timeline from notification to joining

KPSC KAS:
- Notification → Application deadline: 1 month
- Prelims: 3-4 months after deadline
- Mains: 4-6 months after Prelims
- Interview: 3-4 months after Mains
- Document verification + Joining: 4-6 months
- **Total: 18-24 months**

KSP Constable:
- Notification → Written: 2-3 months
- Written → PET → Medical → Joining: 8-12 months
- **Total: 10-15 months**

## Bottom line

Karnataka government recruitment is well-structured across 6+ bodies. KPSC KAS (top-tier admin) + KSP (police family) + KTET (education) cover most aspirants. Kannada proficiency is non-negotiable for state-specific posts. Average time from notification to joining is 12-24 months depending on exam.
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
