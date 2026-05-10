// Shared helpers for the exam-browsing UX. Used on / (home page) and on
// /dashboard's "Other exams" section. Both surfaces render the same
// search bar + curated sections + state grid via <ExamPicker>; this
// module owns the data shaping so the two pages stay in sync.

import type { ExamCard, CuratedSection, StateInfo } from "@/components/ExamPicker";
import { INDIAN_STATES } from "@/lib/states";

export type SectionTitleKey =
  | "land.section.popular"
  | "land.section.govt"
  | "land.section.engineering"
  | "land.section.medical"
  | "land.section.banking"
  | "land.section.state"
  | "land.section.teaching"
  | "land.section.olympiad"
  | "land.section.civil_services"
  | "land.section.defence"
  | "land.section.mba_law";

export interface SectionDef {
  id: string;
  titleKey: SectionTitleKey;
  filter: (e: ExamCard) => boolean;
  seeAllTag: string;
  /** Top N to show in the section (sorted by candidatesPerYear DESC). */
  topN: number;
}

export const SECTION_DEFS: SectionDef[] = [
  { id: "popular",        titleKey: "land.section.popular",        filter: (e) => e.tags.includes("popular"),                                              seeAllTag: "popular",        topN: 9 },
  { id: "govt",           titleKey: "land.section.govt",           filter: (e) => e.tags.includes("govt") && !e.tags.includes("state"),                    seeAllTag: "govt",           topN: 6 },
  { id: "state",          titleKey: "land.section.state",          filter: (e) => e.tags.includes("state"),                                                seeAllTag: "state",          topN: 6 },
  { id: "engineering",    titleKey: "land.section.engineering",    filter: (e) => e.tags.includes("engineering"),                                          seeAllTag: "engineering",    topN: 6 },
  { id: "medical",        titleKey: "land.section.medical",        filter: (e) => e.tags.includes("medical"),                                              seeAllTag: "medical",        topN: 3 },
  { id: "banking",        titleKey: "land.section.banking",        filter: (e) => e.tags.includes("banking"),                                              seeAllTag: "banking",        topN: 4 },
  { id: "teaching",       titleKey: "land.section.teaching",       filter: (e) => e.tags.includes("teaching"),                                             seeAllTag: "teaching",       topN: 6 },
  { id: "olympiad",       titleKey: "land.section.olympiad",       filter: (e) => e.tags.includes("olympiad"),                                             seeAllTag: "olympiad",       topN: 6 },
  { id: "civil_services", titleKey: "land.section.civil_services", filter: (e) => e.tags.includes("civil_services"),                                       seeAllTag: "civil_services", topN: 6 },
  { id: "defence",        titleKey: "land.section.defence",        filter: (e) => e.tags.includes("defence"),                                              seeAllTag: "defence",        topN: 3 },
  { id: "mba_law",        titleKey: "land.section.mba_law",        filter: (e) => e.tags.includes("mba") || e.tags.includes("law"),                        seeAllTag: "mba",            topN: 4 },
];

/**
 * Build the curated-sections payload for a given pool of exams + a t()
 * function that resolves the section title keys. Sections with zero
 * matching exams are omitted so the UI doesn't render an empty header.
 */
export function buildCuratedSections(
  exams: ExamCard[],
  t: (key: SectionTitleKey) => string
): CuratedSection[] {
  const sortByVolume = (a: ExamCard, b: ExamCard) =>
    (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0);
  const out: CuratedSection[] = [];
  for (const def of SECTION_DEFS) {
    const all = exams.filter(def.filter).sort(sortByVolume);
    if (all.length === 0) continue;
    out.push({
      id: def.id,
      title: t(def.titleKey),
      exams: all.slice(0, def.topN),
      seeAllTag: def.seeAllTag,
      totalCount: all.length,
    });
  }
  return out;
}

/**
 * Build the per-state info needed by the StatePicker. Only counts state
 * exams in the supplied pool — when called from /dashboard with the
 * `otherExams` pool, "Tamil Nadu" might show 2 exams instead of 3 if the
 * user is already enrolled in TNPSC Group I.
 */
export function buildStateInfo(exams: ExamCard[]): StateInfo[] {
  const byState = new Map<string, number>();
  for (const e of exams) {
    if (e.category !== "STATE_LEVEL" || !e.state) continue;
    byState.set(e.state, (byState.get(e.state) ?? 0) + 1);
  }
  return INDIAN_STATES.map((s) => ({
    code: s.code,
    name: s.name,
    type: s.type,
    native: s.native,
    examCount: byState.get(s.code) ?? 0,
  })).sort((a, b) => {
    if ((a.examCount > 0) !== (b.examCount > 0)) return b.examCount - a.examCount;
    return a.name.localeCompare(b.name);
  });
}
