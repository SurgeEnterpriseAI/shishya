// English labels of the home page's exam-calendar rail (16 Sep 2026).
//
// UpcomingExamsSidebar is a client island. It takes its labels as plain
// props from the page (src/lib/home-strip-copy.ts holds en / hi / te), and
// needs only an English default for a caller that passes none. That default
// lives in this file on its own so the island's bundle carries these few
// strings — not the Hindi and Telugu copy of every home-page strip.
//
// "(expected)" / "was expected — not confirmed" are the honesty labels here:
// an estimate is never shown as a bare date.

/** Plain strings for UpcomingExamsSidebar, a client island. */
export interface CalendarRailLabels {
  heading: string;
  all: string;
  sections: string;
  browseAll: string;
  tabConcluded: string;
  tabUpcoming: string;
  tabPast: string;
  emptyConcluded: string;
  emptyUpcoming: string;
  emptyPast: string;
  today: string;
  examDay: string;
  wasExpected: string;
  expected: string;
  chipChecklist: string;
  chipLive: string;
  chipReactions: string;
}

export const CALENDAR_RAIL_EN: CalendarRailLabels = {
  heading: "Exam calendar",
  all: "All",
  sections: "Exam calendar sections",
  browseAll: "Browse all exam dates →",
  tabConcluded: "Concluded",
  tabUpcoming: "Upcoming",
  tabPast: "Past",
  emptyConcluded: "No exams concluded in the last 7 days.",
  emptyUpcoming: "No upcoming dates announced.",
  emptyPast: "Older exam analyses will appear here.",
  today: "TODAY",
  examDay: "EXAM DAY",
  wasExpected: "was expected — not confirmed",
  expected: "(expected)",
  chipChecklist: "Last-minute checklist — what to carry, admit card, exam pattern, dates with their source tier.",
  chipLive: "Exam day — timings on the tracker; rate the paper on the exam page once your shift is over.",
  chipReactions: "Student verdict and answer-key status, once students have rated the paper.",
};
