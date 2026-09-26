// Subject hubs (/subjects/{slug}) — 27 Sep 2026, discoverability wave 2.
//
// Pins the rules in src/lib/subject-hubs.ts over the REAL 27 Sep 2026 data
// (tests/fixtures/subject-hubs-2026-09-27.json, a SELECT-only prod read):
//   • which syllabus sections count for which hub — a section counts only
//     when its name is made of that hub's words alone; olympiads and
//     professional exams never count; teacher eligibility tests count only
//     for Child Development & Pedagogy; "Mathematics" counts for
//     Quantitative Aptitude only on government recruitment exams;
//   • every link on a hub is an exam-scoped topic page that is study-ready
//     (notes, or ≥ TOPIC_GOOGLE_MIN_QUESTIONS checked questions with its
//     sub-topics) — no per-topic cross-exam URL;
//   • every title, heading, description and lead is true for every hub it
//     renders on: each number is a computed total, each exam and section
//     named is in that hub's data;
//   • the data floor: which hubs are indexable that day, and why;
//   • JSON-LD shape, sitemap entries, robots.txt access and the page file.
// No DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { TOPIC_GOOGLE_MIN_QUESTIONS } from "@/lib/page-gates-copy";
import {
  HUB_JSONLD_ITEMS,
  HUB_MIN_EXAMS,
  HUB_MIN_SHARED_TOPICS,
  HUB_MIN_STUDY_READY,
  SITE,
  SUBJECT_HUBS,
  SUBJECT_HUB_ROOT,
  andList,
  buildSubjectHubs,
  isTeacherEligibilityTest,
  jsonLdText,
  namesWithMore,
  sectionNameKey,
  subjectHubCardLine,
  subjectHubContextMarkdown,
  subjectHubIndexDescription,
  subjectHubIndexRows,
  subjectHubIndexTitle,
  subjectHubContextPath,
  subjectHubDef,
  subjectHubDescription,
  subjectHubHeading,
  subjectHubIndexable,
  subjectHubJsonLd,
  subjectHubLead,
  subjectHubOf,
  subjectHubOffer,
  subjectHubPath,
  subjectHubRenderable,
  subjectHubRobots,
  subjectHubSitemapEntries,
  subjectHubTitle,
  topicGroupKey,
  type HubExamInfo,
  type HubSectionRow,
  type HubTopicRow,
  type SubjectHub,
  type SubjectHubSlug,
} from "@/lib/subject-hubs";

// ── The real data ────────────────────────────────────────────────────────

interface Fixture {
  exams: Record<string, [string, string, string]>;
  sections: [string, string][];
  topics: [number, number, string, string, 0 | 1, number][];
}
const FX = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/fixtures/subject-hubs-2026-09-27.json"), "utf8")) as Fixture;

const examInfo = (code: string): HubExamInfo => {
  const [shortName, name, category] = FX.exams[code];
  return { code, shortName, name, category };
};
const SECTIONS: HubSectionRow[] = FX.sections.map(([code, name], i) => ({ subjectId: `s${i}`, subjectName: name, exam: examInfo(code) }));
const TOPICS: HubTopicRow[] = FX.topics.map(([si, pi, code, name, notes, checked], i) => ({
  id: `t${i}`,
  subjectId: `s${si}`,
  parentId: pi >= 0 ? `t${pi}` : null,
  // Blank in the fixture = not study-ready; a unique stand-in keeps codes distinct.
  code: code || `blank.${i}`,
  name: name || `blank ${i}`,
  hasNotes: notes === 1,
  checkedOwn: checked,
}));
const HUBS = buildSubjectHubs(SECTIONS, TOPICS);
const hub = (slug: SubjectHubSlug): SubjectHub => HUBS.get(slug)!;
const countedFor = (slug: SubjectHubSlug) => SECTIONS.filter((s) => subjectHubOf({ name: s.subjectName }, s.exam) === slug);

const TET_CODES = [
  "AP_TET", "AS_TET", "BR_TET", "CG_TET", "CTET", "GJ_TET", "HP_TET", "HR_TET", "JH_TET", "JK_KASHMIR_TET", "KA_KARTET",
  "KL_KTET", "MH_MAHATET", "MP_TET", "OD_TET", "PB_TET", "RJ_REET", "TN_TET", "TS_TET", "UK_TET", "UP_UPTET", "WB_TET",
];

// ── Section classification over every real section ───────────────────────

describe("which syllabus sections count (27 Sep 2026 sections)", () => {
  it("the fixture is the whole real section list", () => {
    expect(SECTIONS.length).toBe(738);
    expect(Object.keys(FX.exams).length).toBe(168);
  });

  it("teacher eligibility tests are exactly the 22 TET rows (REET included, DSSSB TGT not)", () => {
    const tets = Object.keys(FX.exams).filter((c) => isTeacherEligibilityTest(examInfo(c))).sort();
    expect(tets).toEqual([...TET_CODES].sort());
    expect(isTeacherEligibilityTest(examInfo("DL_DSSSB_TGT"))).toBe(false);
  });

  it("per hub: the number of exams with a counted section (a pin of the day's data)", () => {
    const exams = (slug: SubjectHubSlug) => new Set(countedFor(slug).map((s) => s.exam.code)).size;
    expect(Object.fromEntries(SUBJECT_HUBS.map((d) => [d.slug, exams(d.slug)]))).toEqual({
      reasoning: 50,
      "quantitative-aptitude": 49,
      english: 29,
      "general-awareness": 42,
      "computer-awareness": 14,
      "child-development-pedagogy": 23,
      "general-science": 11,
    });
  });

  it("olympiads and professional exams never count", () => {
    for (const s of SECTIONS) {
      if (["OLYMPIAD", "OTHER"].includes(s.exam.category)) expect(subjectHubOf({ name: s.subjectName }, s.exam), `${s.exam.code} ${s.subjectName}`).toBeNull();
    }
  });

  it("a TET's sections count only for Child Development & Pedagogy — and every TET's CDP section counts", () => {
    for (const s of SECTIONS.filter((x) => TET_CODES.includes(x.exam.code))) {
      const h = subjectHubOf({ name: s.subjectName }, s.exam);
      if (h) expect(h, `${s.exam.code} ${s.subjectName}`).toBe("child-development-pedagogy");
    }
    const cdpExams = new Set(countedFor("child-development-pedagogy").map((s) => s.exam.code));
    for (const c of TET_CODES) expect(cdpExams.has(c), c).toBe(true);
    expect(cdpExams.has("DL_DSSSB_TGT")).toBe(true); // "Section B — Teaching Methodology and Pedagogy"
  });

  it("no counted section names another language, a state, another subject or a legal / psychology paper", () => {
    const foreign =
      /hindi|bengali|tamil|telugu|kannada|marathi|punjabi|urdu|gujarati|assamese|odia|sanskrit|haryana|rajasthan|bihar|uttar|assam|uttarakhand|legal|law|psycholog|history|polity|geography|economy|environment|social|biology|physics|chemistry|typing/;
    for (const s of SECTIONS) {
      const h = subjectHubOf({ name: s.subjectName }, s.exam);
      if (!h) continue;
      // "Child Psychology and Pedagogy" (HP TET) is the CDP paper itself.
      const key = h === "child-development-pedagogy" ? sectionNameKey(s.subjectName).replace("child psychology", "child") : sectionNameKey(s.subjectName);
      expect(key, `${s.exam.code} ${s.subjectName}`).not.toMatch(foreign);
    }
  });

  it("mixed sections count for no hub", () => {
    const cases: [string, string][] = [
      ["GJ_GSSSB", "Reasoning and Quantitative Aptitude"],
      ["AP_APPSC_GROUP2", "General Studies and Mental Ability"],
      ["HP_HPSSSB", "Reasoning and Numerical Ability"],
      ["CAT", "Data Interpretation & Logical Reasoning"],
      ["MP_POLICE_PC", "General Knowledge & Reasoning"],
      ["MP_POLICE_PC", "Science & Simple Arithmetic"],
      ["RJ_POLICE_PC", "Reasoning, Logic & Computer Knowledge"],
      ["TR_TPSC", "English, Mental Ability & Numerical Ability"],
      ["KA_KPSC_GROUP_C", "General Kannada, General English and Computer Knowledge"],
      ["RJ_RSMSSB", "General Knowledge and General Science"],
      ["TN_TNPSC_GROUP2", "Aptitude and Mental Ability"],
      ["TN_POLICE_PC", "Psychology / Mental Ability"],
      ["MH_MAHCET_LAW", "Legal Aptitude and Legal Reasoning"],
      ["AS_APSC_CCE", "Assam Culture, Current Affairs and Aptitude"],
    ];
    for (const [code, name] of cases) {
      expect(SECTIONS.some((s) => s.exam.code === code && s.subjectName === name), `${code} ${name} is a real section`).toBe(true);
      expect(subjectHubOf({ name }, examInfo(code)), `${code} ${name}`).toBeNull();
    }
    // Not a hub subject at all.
    expect(subjectHubOf({ name: "Biology / Biological Studies (Domain)" }, examInfo("CUET_UG"))).toBeNull();
    expect(subjectHubOf({ name: "Haryana General Knowledge" }, examInfo("HR_POLICE_PC"))).toBeNull();
    expect(subjectHubOf({ name: "English / Hindi" }, examInfo("SSC_CGL"))).toBeNull();
  });

  it("\"Mathematics\" is quantitative aptitude only on a government recruitment exam that is not a TET", () => {
    expect(subjectHubOf({ name: "Mathematics" }, examInfo("RRB_NTPC"))).toBe("quantitative-aptitude");
    expect(subjectHubOf({ name: "Elementary Mathematics" }, examInfo("SSC_GD"))).toBe("quantitative-aptitude");
    expect(subjectHubOf({ name: "Elementary Mathematics" }, examInfo("CDS"))).toBe("quantitative-aptitude");
    for (const code of ["JEE_MAIN", "JEE_ADVANCED", "KA_KCET", "MH_MHTCET", "NDA", "IOQM"]) {
      expect(subjectHubOf({ name: "Mathematics" }, examInfo(code)), code).toBeNull();
    }
    expect(subjectHubOf({ name: "Mathematics" }, examInfo("CTET"))).toBeNull();
    expect(subjectHubOf({ name: "Mathematics and Science (Paper II)" }, examInfo("UP_UPTET"))).toBeNull();
    // An explicit aptitude name counts on an entrance exam too.
    expect(subjectHubOf({ name: "Quantitative Aptitude" }, examInfo("CAT"))).toBe("quantitative-aptitude");
  });

  it("the usual names count for their hub", () => {
    const yes: [string, string, SubjectHubSlug][] = [
      ["SSC_CGL", "General Intelligence and Reasoning", "reasoning"],
      ["IBPS_PO", "Reasoning Ability", "reasoning"],
      ["UP_POLICE_CONSTABLE", "Mental Aptitude / IQ / Reasoning", "reasoning"],
      ["DL_DSSSB_TGT", "Section A — General Intelligence and Reasoning", "reasoning"],
      ["SSC_CGL", "Quantitative Aptitude", "quantitative-aptitude"],
      ["SSC_CHSL", "Quantitative Aptitude (Basic Arithmetic Skill)", "quantitative-aptitude"],
      ["SSC_CGL", "English Comprehension", "english"],
      ["NDA", "General Ability Test — English", "english"],
      ["SSC_CGL", "General Awareness", "general-awareness"],
      ["NDA", "General Ability Test — General Knowledge", "general-awareness"],
      ["AP_LAWCET", "Current Affairs", "general-awareness"],
      ["IBPS_RRB", "Computer Knowledge", "computer-awareness"],
      ["PB_POLICE_PC", "Digital Literacy and Awareness", "computer-awareness"],
      ["PB_PSSSB", "ICT (Information & Communication Technology)", "computer-awareness"],
      ["CTET", "Child Development and Pedagogy", "child-development-pedagogy"],
      ["RRB_GROUP_D", "General Science", "general-science"],
    ];
    for (const [code, name, slug] of yes) {
      expect(SECTIONS.some((s) => s.exam.code === code && s.subjectName === name), `${code} ${name} is a real section`).toBe(true);
      expect(subjectHubOf({ name }, examInfo(code)), `${code} ${name}`).toBe(slug);
    }
  });
});

// ── Topic grouping ───────────────────────────────────────────────────────

describe("topicGroupKey", () => {
  it("joins spelling variants of one topic", () => {
    expect(topicGroupKey("Coding-Decoding")).toBe(topicGroupKey("Coding and Decoding"));
    expect(topicGroupKey("Coding Decoding")).toBe(topicGroupKey("Coding-Decoding"));
    expect(topicGroupKey("Blood Relations")).toBe(topicGroupKey("Blood Relation"));
    expect(topicGroupKey("Profit & Loss")).toBe(topicGroupKey("Profit and Loss"));
    expect(topicGroupKey("Number System (Class 10)")).toBe(topicGroupKey("Number System"));
  });
  it("keeps different topics apart", () => {
    expect(topicGroupKey("Time, Speed and Distance")).not.toBe(topicGroupKey("Time and Distance"));
    expect(topicGroupKey("Synonyms")).not.toBe(topicGroupKey("Antonyms"));
    expect(topicGroupKey("Class")).toBe("class"); // a short word ending in "ss" is not trimmed
  });
});

// ── Every hub built from the real data ───────────────────────────────────

describe("the hubs built from the 27 Sep 2026 data", () => {
  const all = SUBJECT_HUBS.map((d) => hub(d.slug));

  it("every hub renders, and the data floor decides which are indexable", () => {
    for (const h of all) expect(subjectHubRenderable(h.totals), h.def.slug).toBe(true);
    const indexable = all.filter((h) => subjectHubIndexable(h.totals)).map((h) => h.def.slug);
    expect(indexable).toEqual(["reasoning", "quantitative-aptitude", "english", "general-awareness", "child-development-pedagogy"]);
    // Computer Awareness and General Science list pages for a few exams each
    // but share fewer than HUB_MIN_SHARED_TOPICS topics across exams.
    for (const slug of ["computer-awareness", "general-science"] as const) {
      const t = hub(slug).totals;
      expect(t.sharedGroups, slug).toBeLessThan(HUB_MIN_SHARED_TOPICS);
      expect(subjectHubRobots(t)).toEqual({ robots: { index: false, follow: true } });
    }
    expect(subjectHubRobots(hub("reasoning").totals)).toEqual({});
  });

  it("every link is an exam-scoped, study-ready topic page of a counted section — never a cross-exam URL", () => {
    const byId = new Map(TOPICS.map((t) => [t.id, t]));
    const kids = new Map<string, number>();
    for (const t of TOPICS) if (t.parentId) kids.set(t.parentId, (kids.get(t.parentId) ?? 0) + t.checkedOwn);
    for (const h of all) {
      const counted = new Set(countedFor(h.def.slug).map((s) => s.subjectId));
      for (const g of h.groups) {
        expect(new Set(g.links.map((l) => l.examCode)).size, `${h.def.slug} ${g.name}: one link per exam`).toBe(g.links.length);
        expect(g.links).toContain(g.best);
        for (const l of g.links) {
          expect(l.href).toBe(`/exams/${l.examCode}/topics/${l.topicCode}`);
          const t = [...byId.values()].find((x) => x.code === l.topicCode && counted.has(x.subjectId) && SECTIONS[Number(x.subjectId.slice(1))].exam.code === l.examCode);
          expect(t, `${h.def.slug} ${l.href}`).toBeTruthy();
          const pageChecked = t!.checkedOwn + (kids.get(t!.id) ?? 0);
          expect(l.checked).toBe(pageChecked);
          expect(l.hasNotes || l.checked >= TOPIC_GOOGLE_MIN_QUESTIONS, l.href).toBe(true);
          expect(topicGroupKey(l.topicName)).toBe(g.key);
        }
      }
    }
  });

  it("totals add up", () => {
    for (const h of all) {
      const t = h.totals;
      expect(t.exams).toBe(h.exams.length);
      expect(t.examsWithStudyReady).toBe(h.exams.filter((e) => e.studyReady > 0).length);
      expect(t.studyReady).toBe(h.exams.reduce((a, e) => a + e.studyReady, 0));
      expect(t.withNotes).toBe(h.exams.reduce((a, e) => a + e.withNotes, 0));
      expect(t.checked).toBe(h.exams.reduce((a, e) => a + e.checked, 0));
      expect(t.topics).toBe(h.exams.reduce((a, e) => a + e.topics, 0));
      expect(t.groups).toBe(h.groups.length);
      expect(t.sharedGroups).toBe(h.groups.filter((g) => g.links.length >= 2).length);
      // A group keeps one page per exam, so the links never exceed the pages.
      expect(h.groups.reduce((a, g) => a + g.links.length, 0)).toBeLessThanOrEqual(t.studyReady);
      // Groups: most exams first.
      for (let i = 1; i < h.groups.length; i++) expect(h.groups[i - 1].links.length).toBeGreaterThanOrEqual(h.groups[i].links.length);
    }
  });

  it("the most-shared topics are the ones a student expects", () => {
    expect(hub("reasoning").groups.slice(0, 3).map((g) => g.name)).toEqual(["Coding-Decoding", "Syllogism", "Blood Relations"]);
    expect(hub("quantitative-aptitude").groups[0].name).toBe("Percentage");
    expect(hub("english").groups[0].name).toBe("Reading Comprehension");
  });
});

// ── Copy: true on every hub it renders on ────────────────────────────────

/** Every number written in a string, digits only ("1,234" → 1234). */
function numbersIn(s: string): number[] {
  return [...s.matchAll(/\d[\d,]*/g)].map((m) => Number(m[0].replace(/,/g, "")));
}

describe("title, heading, description and lead are true for every hub", () => {
  const all = SUBJECT_HUBS.map((d) => hub(d.slug));

  it.each(SUBJECT_HUBS.map((d) => d.slug))("%s", (slug) => {
    const h = hub(slug);
    const t = h.totals;
    const title = subjectHubTitle(h);
    const heading = subjectHubHeading(h);
    const description = subjectHubDescription(h);
    const lead = subjectHubLead(h);
    const anyQuestions = h.groups.some((g) => g.links.some((l) => l.checked > 0));

    // Title and heading: name, offer, exam count.
    expect(title.startsWith(`${h.def.name}: `)).toBe(true);
    expect(title.endsWith(" | Shishya")).toBe(true);
    expect(/Notes/.test(title)).toBe(t.withNotes > 0);
    expect(/Practice Questions/.test(title)).toBe(anyQuestions);
    expect(numbersIn(title)).toEqual([t.examsWithStudyReady]);
    expect(numbersIn(heading)).toEqual([t.examsWithStudyReady]);
    expect(heading).toContain(subjectHubOffer(h).lower);

    // Description: computed numbers only, named exams from the hub.
    expect(description.length).toBeLessThanOrEqual(300);
    expect(numbersIn(description)).toEqual([t.groups, t.studyReady, ...(t.withNotes < t.studyReady ? [TOPIC_GOOGLE_MIN_QUESTIONS] : []), t.examsWithStudyReady]);
    const readyShort = new Set(h.exams.filter((e) => e.studyReady > 0).map((e) => e.shortName));
    const named = description.split(": ").slice(-1)[0].replace(/ and more\.$|\.$/, "");
    for (const n of named.split(/, | and /)) expect(readyShort.has(n), `${slug}: "${n}"`).toBe(true);
    expect(description.endsWith(" and more.")).toBe(t.examsWithStudyReady > 3);

    // Lead: every number is a computed one.
    const allowed = new Set<number>([
      t.exams,
      t.studyReady,
      t.groups,
      TOPIC_GOOGLE_MIN_QUESTIONS,
      ...h.sectionNames.map((s) => s.exams),
      ...h.groups.map((g) => g.links.length),
      // Digits inside the names themselves ("Paper 2", "Act 2009").
      ...h.sectionNames.flatMap((s) => numbersIn(s.name)),
      ...h.groups.flatMap((g) => numbersIn(g.name)),
      ...h.exams.flatMap((e) => numbersIn(e.shortName)),
    ]);
    for (const n of numbersIn(lead)) expect(allowed.has(n), `${slug}: ${n} in lead`).toBe(true);
    expect(lead).toContain(`syllabus of ${t.exams.toLocaleString("en-IN")} exam`);
    for (const s of h.sectionNames.slice(0, 3)) expect(lead).toContain(`“${s.name}” (${s.exams} exam`);
    for (const e of h.exams.filter((x) => x.studyReady > 0).slice(0, 5)) expect(lead).toContain(e.shortName);
    const most = lead.match(/Topics with such pages for the most exams: (.*)\.$/);
    if (most) {
      for (const g of h.groups.filter((x) => x.links.length >= 2).slice(0, 3)) expect(most[1]).toContain(`${g.name} (${g.links.length} exams)`);
    } else {
      expect(t.sharedGroups).toBe(0);
    }

    // No claim the data cannot back.
    for (const s of [title, heading, description, lead]) {
      expect(s).not.toMatch(/\bbest\b|#1|\bnumber one\b|\btop-rated\b|\bverified\b|\bexpert\b|\ball (the )?exams\b|NCERT solutions|\bguarantee/i);
    }
  });

  it("the descriptions differ from hub to hub (no template near-copies)", () => {
    const d = all.map((h) => subjectHubDescription(h));
    expect(new Set(d).size).toBe(d.length);
  });
});

// ── Synthetic edge cases ─────────────────────────────────────────────────

describe("buildSubjectHubs edge cases", () => {
  const ex = (code: string, category = "GOVT_JOBS"): HubExamInfo => ({ code, shortName: code.replace("_", " "), name: `${code} exam`, category });
  const sec = (id: string, name: string, e: HubExamInfo): HubSectionRow => ({ subjectId: id, subjectName: name, exam: e });
  const top = (id: string, sid: string, code: string, name: string, hasNotes: boolean, checkedOwn: number, parentId: string | null = null): HubTopicRow => ({
    id, subjectId: sid, parentId, code, name, hasNotes, checkedOwn,
  });

  it("practice-only pages: the title and description do not promise notes", () => {
    const hubs = buildSubjectHubs(
      [sec("a", "Reasoning", ex("A_X")), sec("b", "Reasoning Ability", ex("B_X"))],
      [top("1", "a", "r.syl", "Syllogism", false, 12), top("2", "b", "r.syl", "Syllogisms", false, 15), top("3", "b", "r.bld", "Blood Relations", false, 3)],
    );
    const h = hubs.get("reasoning")!;
    expect(h.totals).toMatchObject({ exams: 2, examsWithStudyReady: 2, studyReady: 2, withNotes: 0, checked: 30, groups: 1, sharedGroups: 1 });
    expect(subjectHubTitle(h)).toBe("Reasoning: Topic-wise Practice Questions for 2 Exams | Shishya");
    expect(subjectHubDescription(h)).toContain(`with at least ${TOPIC_GOOGLE_MIN_QUESTIONS} checked practice questions`);
    expect(subjectHubDescription(h)).not.toMatch(/notes/i);
    expect(subjectHubLead(h)).not.toMatch(/study notes or/);
    expect(subjectHubIndexable(h.totals)).toBe(false);
  });

  it("sub-topic questions count for the parent page; a code repeated in one exam is one page", () => {
    const hubs = buildSubjectHubs(
      [sec("a", "Quantitative Aptitude", ex("A_X")), sec("a2", "Numerical Ability", ex("A_X"))],
      [
        top("p", "a", "q.num", "Number System", false, 0),
        top("c", "a", "q.num.hcf", "HCF and LCM", false, 10, "p"),
        top("d", "a2", "q.num", "Number System", true, 0),
      ],
    );
    const h = hubs.get("quantitative-aptitude")!;
    // p: 0 own + 10 from its child = study-ready; c: 10 = study-ready; the
    // second "q.num" in the same exam is skipped (the page resolves one row).
    expect(h.totals.studyReady).toBe(2);
    expect(h.totals.topics).toBe(3);
    const num = h.groups.find((g) => g.key === topicGroupKey("Number System"))!;
    expect(num.links).toHaveLength(1);
    expect(num.links[0]).toMatchObject({ topicCode: "q.num", checked: 10, hasNotes: false });
  });

  it("a hub with nothing study-ready is not renderable", () => {
    const hubs = buildSubjectHubs([sec("a", "General Science", ex("A_X"))], [top("1", "a", "s.x", "Physics", false, 9)]);
    expect(subjectHubRenderable(hubs.get("general-science")!.totals)).toBe(false);
    expect(subjectHubRenderable(hubs.get("english")!.totals)).toBe(false);
  });

  it("the floor is exactly the constants", () => {
    const base = { exams: 9, topics: 99, withNotes: 0, checked: 0, groups: 30 };
    const ok = { ...base, examsWithStudyReady: HUB_MIN_EXAMS, studyReady: HUB_MIN_STUDY_READY, sharedGroups: HUB_MIN_SHARED_TOPICS };
    expect(subjectHubIndexable(ok)).toBe(true);
    expect(subjectHubIndexable({ ...ok, examsWithStudyReady: HUB_MIN_EXAMS - 1 })).toBe(false);
    expect(subjectHubIndexable({ ...ok, studyReady: HUB_MIN_STUDY_READY - 1 })).toBe(false);
    expect(subjectHubIndexable({ ...ok, sharedGroups: HUB_MIN_SHARED_TOPICS - 1 })).toBe(false);
  });

  it("list helpers", () => {
    expect(andList(["A"])).toBe("A");
    expect(andList(["A", "B", "C"])).toBe("A, B and C");
    expect(namesWithMore(["A", "B", "C"], 3)).toBe("A, B and C");
    expect(namesWithMore(["A", "B", "C"], 7)).toBe("A, B, C and more");
  });
});

// ── JSON-LD, sitemap, paths ──────────────────────────────────────────────

describe("JSON-LD", () => {
  it.each(SUBJECT_HUBS.map((d) => d.slug))("%s: BreadcrumbList + CollectionPage with an ItemList of exam topic pages", (slug) => {
    const h = hub(slug);
    const [crumb, page] = subjectHubJsonLd(h) as [Record<string, any>, Record<string, any>];
    expect(crumb["@context"]).toBe("https://schema.org");
    expect(crumb["@type"]).toBe("BreadcrumbList");
    expect(crumb.itemListElement.map((i: any) => i.position)).toEqual([1, 2, 3]);
    expect(crumb.itemListElement[1].item).toBe(`${SITE}/subjects`);
    expect(crumb.itemListElement[2].item).toBe(`${SITE}/subjects/${slug}`);
    expect(page["@type"]).toBe("CollectionPage");
    expect(page.url).toBe(`${SITE}/subjects/${slug}`);
    expect(page.description).toBe(subjectHubDescription(h));
    const list = page.mainEntity;
    expect(list["@type"]).toBe("ItemList");
    expect(list.numberOfItems).toBe(h.groups.length);
    expect(list.itemListElement.length).toBe(Math.min(HUB_JSONLD_ITEMS, h.groups.length));
    list.itemListElement.forEach((it: any, i: number) => {
      expect(it.position).toBe(i + 1);
      expect(it.name).toBe(h.groups[i].name);
      expect(it.url).toBe(`${SITE}${h.groups[i].best.href}`);
      expect(it.url).toMatch(/^https:\/\/shishya\.in\/exams\/[A-Z0-9_]+\/topics\/[A-Za-z0-9._-]+$/);
    });
    const text = jsonLdText(page);
    expect(text).not.toMatch(/[<>]/);
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(page)));
  });
});

describe("context.md", () => {
  it.each(SUBJECT_HUBS.map((d) => d.slug))("%s: the page's data, as Markdown", (slug) => {
    const h = hub(slug);
    const md = subjectHubContextMarkdown(h, "2026-09-27", "Shishya (https://shishya.in) — test line.");
    expect(subjectHubContextPath(slug)).toBe(`/subjects/${slug}/context.md`);
    expect(md.startsWith(`# ${h.def.name} on Shishya — subject context`)).toBe(true);
    expect(md).toContain(subjectHubLead(h));
    // Every listed page is in the brief, and no other shishya.in topic URL.
    const listed = new Set(h.groups.flatMap((g) => g.links.map((l) => `${SITE}${l.href}`)));
    const inMd = new Set([...md.matchAll(/https:\/\/shishya\.in\/exams\/[^\s;)/]+\/topics\/[^\s;)]+/g)].map((m) => m[0]));
    expect(inMd).toEqual(listed);
    for (const e of h.exams) expect(md).toContain(`${SITE}${e.syllabusHref}`);
    expect(md).toContain(`## ${h.def.name} topics (${h.totals.groups.toLocaleString("en-IN")})`);
  });
});

describe("paths, sitemap and robots.txt", () => {
  it("hubs live under /subjects, not /exams (the /exams/[code] static-sibling list is untouched)", () => {
    expect(SUBJECT_HUB_ROOT).toBe("/subjects");
    for (const d of SUBJECT_HUBS) {
      expect(subjectHubPath(d.slug)).toBe(`/subjects/${d.slug}`);
      expect(subjectHubPath(d.slug).startsWith("/exams")).toBe(false);
      expect(subjectHubDef(d.slug)).toBe(d);
    }
    expect(subjectHubDef("current-affairs")).toBeNull();
    // Related links point at pages that exist.
    for (const d of SUBJECT_HUBS) for (const r of d.related ?? []) expect(fs.existsSync(path.join(process.cwd(), "src/app", r.href, "page.tsx")), r.href).toBe(true);
    expect(SUBJECT_HUBS.length).toBeLessThanOrEqual(8);
  });

  it("the sitemap lists the indexable hubs only, with no invented lastmod", () => {
    const entries = subjectHubSitemapEntries(HUBS);
    expect(entries.map((e) => e.url)).toEqual(
      ["reasoning", "quantitative-aptitude", "english", "general-awareness", "child-development-pedagogy"].map((s) => `${SITE}/subjects/${s}`),
    );
    for (const e of entries) expect(e.lastModified).toBeUndefined();
  });

  it("every crawler group may fetch a hub", () => {
    type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };
    const list = (x: string | string[] | undefined): string[] => ([] as string[]).concat(x ?? []);
    const patternRe = (p: string) => {
      const anchored = p.endsWith("$");
      const body = (anchored ? p.slice(0, -1) : p).split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
      return new RegExp(`^${body}${anchored ? "$" : ""}`);
    };
    const r = robots();
    const rules = (Array.isArray(r.rules) ? r.rules : [r.rules]) as Rule[];
    for (const rule of rules) {
      for (const d of list(rule.disallow)) {
        for (const h of SUBJECT_HUBS) expect(patternRe(d).test(subjectHubPath(h.slug)), `${String(rule.userAgent)} ${d}`).toBe(false);
      }
    }
  });
});

describe("/subjects — the index of the hubs", () => {
  const rows = subjectHubIndexRows(HUBS);
  const src = fs.readFileSync(path.join(process.cwd(), "src/app/subjects/page.tsx"), "utf8");

  it("lists every renderable hub in order, and says only what their data holds", () => {
    expect(rows.map((h) => h.def.slug)).toEqual(SUBJECT_HUBS.map((d) => d.slug));
    expect(subjectHubIndexTitle(rows)).toBe(
      "Subjects Across Exams: Reasoning, Quantitative Aptitude, English, General Awareness, Computer Awareness, Child Development & Pedagogy and General Science | Shishya",
    );
    expect(subjectHubIndexDescription(rows).length).toBeLessThanOrEqual(300);
    for (const h of rows) {
      expect(numbersIn(subjectHubCardLine(h))).toEqual([h.totals.examsWithStudyReady, h.totals.studyReady, ...(h.totals.withNotes > 0 ? [h.totals.withNotes] : [])]);
    }
    expect(subjectHubIndexTitle([])).toBe("Subjects Across Exams | Shishya");
  });

  it("is a noindex, follow directory on an ISR page with no cookie / header / session read", () => {
    expect(src).toMatch(/robots: \{ index: false, follow: true \}/);
    expect(src).toMatch(/export const revalidate = \d+/);
    expect(src).not.toMatch(/\bcookies\(|\bheaders\(|\bauth\(|getServerSession|getT\(/);
  });
});

describe("the /subjects/[slug] page file", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/app/subjects/[slug]/page.tsx"), "utf8");

  it("is an ISR page with no cookie / header / session read, and 404s a hub with nothing to list", () => {
    expect(src).toMatch(/export const revalidate = \d+/);
    expect(src).not.toMatch(/\bcookies\(|\bheaders\(|\bauth\(|getServerSession|getT\(/);
    expect(src).toMatch(/notFound\(\)/);
    expect(src).toMatch(/subjectHubRobots\(/);
  });

  it("the route family is one page per hub plus its context.md — no per-topic URL under /subjects", () => {
    const dir = path.join(process.cwd(), "src/app/subjects");
    expect(fs.readdirSync(dir).sort()).toEqual(["[slug]", "page.tsx"]);
    expect(fs.readdirSync(path.join(dir, "[slug]")).sort()).toEqual(["context.md", "page.tsx"]);
    expect(fs.readdirSync(path.join(dir, "[slug]", "context.md"))).toEqual(["route.ts"]);
  });

  it("the context.md route serves indexable hubs only", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/subjects/[slug]/context.md/route.ts"), "utf8");
    expect(route).toMatch(/subjectHubIndexable\(hub\.totals\)/);
    expect(route).toMatch(/status: 404/);
    expect(src).toMatch(/subjectHubIndexable\(hub\.totals\)\s*\?\s*\{ canonical: url, types:/);
  });
});
