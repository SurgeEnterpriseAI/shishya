// Sitting / stage markers (30 Sep 2026, official-watch review),
// src/lib/sitting-markers.ts. The labels below are the live tracker's own
// shapes (read-only look at NDA, CDS, RRB NTPC, SSC CGL/CHSL, JEE Main, IBPS /
// SBI PO rows on 30 Sep 2026) and the bodies' printed wording. No DB.

import { describe, it, expect } from "vitest";
import { examFamilyMarkers, hasFamily, markerConflict, markerSpans, releaseVersion, sittingMarkers, sittingMarkersOf, stripMarkerSpans } from "@/lib/sitting-markers";

const m = (text: string, names: string[] = []) => [...sittingMarkers(text, names)].sort();

describe("sittingMarkers — the families that tell sittings apart", () => {
  it("the exam's own ordinal: UPSC's '(I)' / '(II)', 'Examination-II', the tracker's 'NDA 2' / 'CDS II'", () => {
    expect(m("Answer Key: National Defence Academy and Naval Academy Examination (I), 2026")).toEqual(["sitting:1"]);
    expect(m("Combined Defence Services Examination (II), 2026")).toEqual(["sitting:2"]);
    expect(m("NDA & NA (II) 2026 exam")).toEqual(["sitting:2"]);
    expect(m("CDS Examination-II 2026")).toEqual(["sitting:2"]);
    expect(m("NDA 2 2026 exam", ["NDA"])).toEqual(["sitting:2"]);
    expect(m("CDS II 2026 provisional answer key", ["CDS"])).toEqual(["sitting:2"]);
    expect(m("Answer key — NDA 1 2026", ["NDA"])).toEqual(["sitting:1"]);
    expect(m("AFCAT 01/2026 result", ["AFCAT"])).toEqual(["sitting:1"]);
  });
  it("a year, a paper, an annexure or a download counter is never the exam's ordinal", () => {
    expect(m("NDA 2026 exam", ["NDA"])).toEqual([]);
    expect(m("Answer key Paper (I) and Paper (II)")).toEqual([]);
    expect(m("Annexure (2) — Download (1)")).toEqual([]);
    expect(m("Examination 2026 — 1st shift")).toEqual([]);
  });
  it("numbered stages, lists included; roman numerals read as digits", () => {
    expect(m("Final Answer Key of Combined Graduate Level Examination 2026 (Tier-I)")).toEqual(["tier:1"]);
    expect(m("Tier 1 exam concludes")).toEqual(["tier:1"]);
    expect(m("Result of Tier-I & II")).toEqual(["tier:1", "tier:2"]);
    expect(m("CBT-I exam Phase 2 (Undergraduate posts)")).toEqual(["cbt:1", "phase:2"]);
    // The CEN is no stage number; since 30 Sep 2026 it is its own family (RRB
    // lists by CEN — tests/unit/official-listings.test.ts "cen markers").
    expect(m("Answer key — CBT 2 Undergraduate (CEN 07/2025)")).toEqual(["cbt:2", "cen:07/2025"]);
    expect(m("JEE Main 2026 Session 2 exam (Paper 1)")).toEqual(["session:2"]);
  });
  it("prelims / mains — 'JEE Main' is the exam, 'Preliminary Key' is a provisional key", () => {
    expect(m("Prelims exam (Day 1)")).toEqual(["pm:prelims"]);
    expect(m("UPSC CSE Prelims Answer Key 2026")).toEqual(["pm:prelims"]);
    expect(m("Civil Services (Preliminary) Examination, 2026")).toEqual(["pm:prelims"]);
    expect(m("Mains Exam")).toEqual(["pm:mains"]);
    expect(m("Civil Services (Main) Examination")).toEqual(["pm:mains"]);
    expect(m("JEE Main 2026 answer key")).toEqual([]);
    expect(m("Group-II Preliminary Key")).toEqual([]);
    expect(m("Preliminary Answer Key of Group-I")).toEqual([]);
  });
  it("parts of one sitting and test types are never compared", () => {
    expect(m("Prelims exam (Day 2) Shift 3 Set A")).toEqual(["pm:prelims"]);
    expect(m("SSC CHSL 2025 Typing Test")).toEqual([]);
  });
});

describe("markerConflict — both sides name the family and share nothing", () => {
  const due = (labels: string[], names: string[] = []) => sittingMarkersOf(labels, names);
  it("(I) vs a (II) sitting; Tier-I vs Tier 2; prelims vs mains", () => {
    expect(markerConflict(due(["NDA 2 2026 exam"], ["NDA"]), sittingMarkers("Examination (I), 2026"))).toBe("sitting");
    expect(markerConflict(due(["Tier 2 exam"]), sittingMarkers("(Tier-I)"))).toBe("tier");
    expect(markerConflict(due(["Mains Exam"]), sittingMarkers("Prelims result"))).toBe("pm");
  });
  it("the same one, a list naming it, or one side silent → no conflict", () => {
    expect(markerConflict(due(["Tier 1 exam begins", "Tier 1 exam concludes"]), sittingMarkers("(Tier-I)"))).toBeNull();
    expect(markerConflict(due(["Tier 2 exam"]), sittingMarkers("Result of Tier-I & II"))).toBeNull();
    expect(markerConflict(due(["Tier 2 exam"]), sittingMarkers("Final result"))).toBeNull();
    expect(markerConflict(due(["Written exam"]), sittingMarkers("(Tier-I)"))).toBeNull();
  });
  it("families are compared one by one: a shared paper never hides another session", () => {
    const want = due(["JEE Main 2026 Session 2 exam (Paper 1)"]);
    expect(markerConflict(want, sittingMarkers("JEE Main 2026 Session 1 answer key (Paper 1)"))).toBe("session");
  });
  it("the sitting's labels are unioned (a multi-day sitting)", () => {
    expect([...due(["CBT-I exam Phase 1", "CBT-I exam Phase 2"])].sort()).toEqual(["cbt:1", "phase:1", "phase:2"]);
    expect(hasFamily(due(["NDA 2 2026 exam"], ["NDA"]), "sitting")).toBe(true);
    expect(hasFamily(due(["NDA 2026 exam"], ["NDA"]), "sitting")).toBe(false);
  });
});

// 1 Oct 2026 (the dry crawl of 30 Sep): MHT-CET's PCB second-attempt result
// was labelled PCM and grouped with the PCM / PCB first-attempt notes and the
// Nursing and DPN/PHN CET results of the same State CET Cell page. The rows
// and file names below are that page's own.
describe("group / attempt / cet — the families of a body that runs several CETs", () => {
  it("PCM / PCB subject group; never a numbered 'Group 2' / 'Group-IV' (an exam or a post), never PCMB", () => {
    expect(m("MHT-CET (PCB Group) Result Summary :MHT-CET 2026 ((PCB ) Second Attempt)")).toEqual(["attempt:2", "cet:mht", "group:pcb"]);
    expect(m("MHT-CET 2026 ((PCM ) First Attempt)) Result Summary")).toEqual(["attempt:1", "cet:mht", "group:pcm"]);
    expect(m("Press-Note-MHT-CET-PCB-Group-2nd-Attempt-2026")).toEqual(["attempt:2", "cet:mht", "group:pcb"]);
    expect(m("TSPSC Group-II Services Preliminary Key")).toEqual([]);
    expect(m("KCET PCMB rank list")).toEqual([]);
  });
  it("attempt numbers, before or after the word", () => {
    expect(m("Notification PCB 1st-Attempt Result")).toEqual(["attempt:1", "group:pcb"]);
    expect(m("Result of Attempt-II")).toEqual(["attempt:2"]);
    expect(m("Examination 2026 — 1st shift")).toEqual([]);
  });
  it("which CET: MHT-CET, Nursing, DPN/PHN, B.Ed, LL.B / Law, MBA/MMS; the AP / TS one-word CETs", () => {
    expect(m("MH – DPN/PHN CET NOTICE NO. 09: MH – DPN/PHN CET-2026 DECLARATION OF RESULT")).toEqual(["cet:dpn-phn"]);
    expect(m("MH – NURSING CET NOTICE NO. 09: MH – NURSING CET-2026 DECLARATION OF RESULT")).toEqual(["cet:nursing"]);
    expect(m("MAH-B.Ed-CET 2026 result")).toEqual(["cet:bed"]);
    expect(m("MAH-B.P.Ed-CET 2026 result")).toEqual(["cet:bped"]);
    expect(m("MAH-LL.B.(3 Yrs.)-CET 2026 result")).toEqual(["cet:law"]);
    expect(m("MAH-MBA/MMS-CET 2026 score card")).toEqual(["cet:mba"]);
    expect(m("AP EAPCET 2026 results")).toEqual(["cet:eapcet"]);
    expect(m("TS EAMCET 2025 results")).toEqual(["cet:eapcet"]);
    expect(m("TS LAWCET 2026 preliminary key")).toEqual(["cet:law"]);
  });
  it("conflicts: PCB vs PCM, first vs second attempt, Nursing CET vs MHT-CET", () => {
    const due = sittingMarkersOf(["PCB Group Second Attempt exam", "PCM Group Second Attempt exam"]);
    for (const x of examFamilyMarkers(["MHT-CET", "Maharashtra Common Entrance Test (MHT-CET)"])) due.add(x);
    expect(markerConflict(due, sittingMarkers("MHT-CET 2026 (PCB Group First Attempt)"))).toBe("attempt");
    expect(markerConflict(due, sittingMarkers("MH – NURSING CET-2026 DECLARATION OF RESULT"))).toBe("cet");
    expect(markerConflict(due, sittingMarkers("MHT-CET 2026 ((PCB ) Second Attempt)"))).toBeNull();
    expect(markerConflict(sittingMarkersOf(["PCB Group Second Attempt exam"]), sittingMarkers("Result for PCM Second Attempt"))).toBe("group");
  });
  it("examFamilyMarkers takes only the CET from an exam's names — never a stage its name carries", () => {
    expect([...examFamilyMarkers(["MHT-CET", "Maharashtra Common Entrance Test (MHT-CET)"])]).toEqual(["cet:mht"]);
    expect([...examFamilyMarkers(["SSC CHSL", "SSC Combined Higher Secondary Level (Tier 1)"])]).toEqual([]);
  });
});

// 1 Oct 2026 (review of a326ddb): sittings that differ only by the post group
// (HSSC's CET for Group C vs Group D) or the sex the event is held for (Delhi
// Police's Male vs Female PE&MT). The rows are shaped as the bodies print
// them (HSSC / PSSSB / SSC / UP Police wording, file names included).
describe("postgroup / gender — sittings that differ only by group or sex", () => {
  it("post groups A–D in the bodies' spellings: 'Group C', 'Group-D', \"Group 'C'\", 'Grp. D', ग्रुप-डी, समूह ग", () => {
    expect(m("CET Group C 2026 Result of Common Eligibility Test")).toEqual(["postgroup:c"]);
    expect(m("Result of Common Eligibility Test (CET) for Group-D posts, 2026")).toEqual(["postgroup:d"]);
    expect(m("Answer Key of CET Group 'C' (Main Written Exam) 2026")).toEqual(["pm:mains", "postgroup:c"]); // HSSC's Group C mains
    expect(m("Grp. D CET 2026 result")).toEqual(["postgroup:d"]);
    expect(m("Provisinal-Answer-Key-for-Group-D-Post-Advt-08-of-2025Set-D")).toEqual(["postgroup:d"]);
    expect(m("सीईटी ग्रुप-डी परीक्षा 2026 का परिणाम")).toEqual(["postgroup:d"]);
    expect(m("समूह 'ग' भर्ती परीक्षा की उत्तर कुंजी")).toEqual(["postgroup:c"]);
  });
  it("never a subject group, a numbered group, a discussion, a set, or an 'a' that is a word", () => {
    expect(m("TSPSC Group-II Services Preliminary Key")).toEqual([]);
    expect(m("Group 4 Services result")).toEqual([]);
    expect(m("MHT-CET 2026 (PCM Group) result")).toEqual(["cet:mht", "group:pcm"]);
    expect(m("Schedule of Group Discussion")).toEqual([]);
    expect(m("Answer key Set-D")).toEqual([]);
    expect(m("Group C or a higher post")).toEqual(["postgroup:c"]);
  });
  // 1 Oct 2026 (review of the new families): GRP is the Government Railway
  // Police in UP / Bihar police notices; only "Grp." with its dot is a group.
  it("a bare 'GRP' (Government Railway Police) is never a post group", () => {
    expect(m("GRP B Company")).toEqual([]);
    expect(m("Constable GRP a list")).toEqual([]);
    expect(m("Result of Constable GRP C Company 2026")).toEqual([]);
  });
  it("sexes: Male / Female, Men / Women, Mahila, पुरुष / महिला — never 'Ex-Service Men' or a name", () => {
    expect(m("Female PE&MT")).toEqual(["gender:female"]);
    expect(m("Male PE&MT result")).toEqual(["gender:male"]);
    expect(m("Result of Women Constable recruitment")).toEqual(["gender:female"]);
    expect(m("Mahila Supervisor exam result")).toEqual(["gender:female"]);
    expect(m("आरक्षी नागरिक पुलिस (महिला) परीक्षा परिणाम")).toEqual(["gender:female"]);
    expect(m("पुरुषों का शारीरिक दक्षता परीक्षण")).toEqual(["gender:male"]);
    expect(m("Vacancies for Ex-Service Men and Ex-Servicemen")).toEqual([]);
    expect(m("पुरुषोत्तम नगर परीक्षा केंद्र")).toEqual([]);
  });
  // 1 Oct 2026 (review of the new families): plurals are read; the Women and
  // Child Development department names no sex.
  it("plurals 'Females' / 'Males' read; the Women and Child Development department is no sex", () => {
    expect(m("List of Females qualified for PE&MT")).toEqual(["gender:female"]);
    expect(m("Males PE&MT result")).toEqual(["gender:male"]);
    expect(m("Result of PE&MT (Males & Females)")).toEqual(["gender:female", "gender:male"]);
    expect(m("Supervisor, Women and Child Development Department: result")).toEqual([]);
    expect(m("Department of Women & Child Development — Supervisor answer key")).toEqual([]);
    expect(m("महिला एवं बाल विकास विभाग पर्यवेक्षक परीक्षा परिणाम")).toEqual([]);
    // The department's name never hides a sex the row names on its own.
    expect(m("Women and Child Development Department — Female Supervisor result")).toEqual(["gender:female"]);
    expect(markerConflict(sittingMarkersOf(["WCD Supervisor (Male) exam"]), sittingMarkers("महिला एवं बाल विकास विभाग पर्यवेक्षक परीक्षा परिणाम"))).toBeNull();
  });
  it("a value named on its own outranks a list (the exam's own name); a list alone names every value", () => {
    // SSC's row: the list is the exam's name, the event is the male PE&MT.
    expect(m("Constable (Executive) Male and Female in Delhi Police Examination, 2026 - Male PE&MT result")).toEqual(["gender:male"]);
    expect(m("Result of PE&MT (Male & Female)")).toEqual(["gender:female", "gender:male"]);
    expect(m("पुरुष एवं महिला अभ्यर्थियों का परिणाम")).toEqual(["gender:female", "gender:male"]);
    expect(m("Common Eligibility Test (CET) for Group C and D posts")).toEqual(["postgroup:c", "postgroup:d"]);
    expect(m("Common Eligibility Test (CET) for Group C and Group D posts")).toEqual(["postgroup:c", "postgroup:d"]);
    expect(m("CET for Group C & D posts — Group D result")).toEqual(["postgroup:d"]);
    expect(m("Male PE&MT and Female PE&MT schedule")).toEqual(["gender:female", "gender:male"]); // two events named on their own
  });
  it("conflicts: the other group / the other sex; a combined notice or a silent row never conflicts", () => {
    const hsscD = sittingMarkersOf(["HSSC CET Group D 2026 exam"]);
    expect(markerConflict(hsscD, sittingMarkers("CET Group C 2026 Result of Common Eligibility Test 20/09/2026"))).toBe("postgroup");
    expect(markerConflict(hsscD, sittingMarkers("CET Group D 2026 Result"))).toBeNull();
    expect(markerConflict(hsscD, sittingMarkers("Common Eligibility Test (CET) for Group C and D posts: result"))).toBeNull();
    expect(markerConflict(hsscD, sittingMarkers("CET 2026 result"))).toBeNull();
    const female = sittingMarkersOf(["Female PE&MT"]);
    const maleRow = "Constable (Executive) Male and Female in Delhi Police Examination, 2026 - Male PE&MT result 15/09/2026";
    expect(markerConflict(female, sittingMarkers(maleRow))).toBe("gender");
    expect(markerConflict(sittingMarkersOf(["Male PE&MT"]), sittingMarkers(maleRow))).toBeNull();
    expect(markerConflict(female, sittingMarkers("Result of PE&MT (Male & Female)"))).toBeNull();
    expect(markerConflict(sittingMarkersOf(["आरक्षी पुरुष शारीरिक परीक्षा"]), sittingMarkers("आरक्षी (महिला) परीक्षा परिणाम"))).toBe("gender");
  });
  it("spans: the words are marker words (an outranked list too), every other word stays a claim", () => {
    const strip = (t: string) => stripMarkerSpans(t).replace(/\s+/g, " ").trim();
    expect(strip("HSSC CET Group D 2026 exam")).toBe("hssc cet 2026 exam");
    expect(strip("Female PE&MT")).toBe("pe&mt");
    expect(strip("Constable (Executive) Male and Female in Delhi Police - Male PE&MT")).toBe("constable (executive) in delhi police - pe&mt");
    for (const t of ["CET for Group C & D posts — Group D result", "Male and Female PE&MT", "Constable (Executive) Male and Female in Delhi Police - Female PE&MT"]) {
      expect(sittingMarkers(t).size).toBeGreaterThan(0);
      expect([...sittingMarkers(stripMarkerSpans(t))]).toEqual([]);
    }
  });
});

// 1 Oct 2026 (independent review of the gate fix): the verified stage
// compares only a marker's own span as a marker; every other word of a
// tracker label is a claim the body must print.
describe("markerSpans / stripMarkerSpans — exactly what sittingMarkers reads", () => {
  const strip = (t: string, names: string[] = []) => stripMarkerSpans(t, names).replace(/\s+/g, " ").trim();
  it("strips the marker spans, keeps every other word", () => {
    expect(strip("CEN 01/2025 CBT 2 Exam")).toBe("exam");
    expect(strip("PCB Group Second Attempt exam")).toBe("group exam");
    expect(strip("SSC CGL 2025 Tier-II exam")).toBe("ssc cgl 2025 exam");
    expect(strip("Preliminary Examination")).toBe("examination");
    expect(strip("MHT-CET 2026 ((PCB ) Second Attempt)")).toBe("2026 (( ) )");
    expect(strip("NDA 2 2026 exam", ["NDA"])).toBe("2026 exam");
  });
  it("ordinal words, numbers and CET-ish words no marker read stay (they are claims)", () => {
    expect(strip("CUET UG 2026 Second Phase exam")).toBe("cuet ug 2026 second phase exam");
    expect(strip("CTET Paper 2 exam")).toBe("ctet paper 2 exam");
    expect(strip("MP TET Varg 3 2026 exam")).toBe("mp tet varg 3 2026 exam");
    expect(strip("Nursing college result")).toBe("nursing college result");
    expect(strip("Nursing CET result")).toBe("result");
    // "Paper (I)" is no sitting ordinal → kept; "Varg (2)" is → only the bracket goes.
    expect(strip("Answer key Paper (I)")).toBe("answer key paper (i)");
    expect(strip("Varg (2) result")).toBe("varg result");
    // "Preliminary Key" is a provisional key, not the prelims: kept.
    expect(strip("Preliminary Key of Group-II")).toBe("preliminary key of group-ii");
  });
  it("spans are merged, sorted and line up with the normalised text", () => {
    const { text, spans } = markerSpans("Tier-I & II  result  (CBT 2)");
    expect(text).toBe("tier-i & ii result (cbt 2)");
    expect(spans.map(([a, b]) => text.slice(a, b))).toEqual(["tier-i & ii", "cbt 2"]);
  });
  it("every text whose markers are non-empty loses them all once stripped", () => {
    for (const t of ["Answer key — CBT 2 Undergraduate (CEN 07/2025)", "Combined Defence Services Examination (II), 2026", "MH – DPN/PHN CET-2026", "Attempt-II result", "UPSC CSE Mains result"]) {
      expect(sittingMarkers(t).size).toBeGreaterThan(0);
      expect([...sittingMarkers(stripMarkerSpans(t))]).toEqual([]);
    }
  });
});

describe("releaseVersion", () => {
  it("UPPRPB's spelling of final ('अन्तिम चयन परिणाम') is final (1 Oct 2026)", () => {
    expect(releaseVersion("RESULT", "उपनिरीक्षक … सीधी भर्ती – 2025 के अन्तिम चयन परिणाम की सूचना")).toBe("final");
    expect(releaseVersion("ANSWER_KEY", "अनन्तिम उत्तर कुंजी")).toBe("provisional");
  });
  it("provisional vs final key; written vs final result; neither or both → null", () => {
    expect(releaseVersion("ANSWER_KEY", "Provisional Answer Key")).toBe("provisional");
    expect(releaseVersion("ANSWER_KEY", "Tentative answer keys")).toBe("provisional");
    expect(releaseVersion("ANSWER_KEY", "Preliminary Key")).toBe("provisional");
    expect(releaseVersion("ANSWER_KEY", "Final answer key (expected)")).toBe("final");
    expect(releaseVersion("ANSWER_KEY", "Answer key")).toBeNull();
    expect(releaseVersion("RESULT", "Written result")).toBe("written");
    expect(releaseVersion("RESULT", "Final Result declared")).toBe("final");
    expect(releaseVersion("RESULT", "Final result of the written exam")).toBeNull();
  });
});
