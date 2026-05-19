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
