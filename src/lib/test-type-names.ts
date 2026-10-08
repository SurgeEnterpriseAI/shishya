// The names of the test entry points, as students type them (7 Oct 2026, B6).
//
// Students asked the tutor for "topic-wise / subject-wise / chapter-wise tests";
// 4 of the 5 who asked had the tools already — SubjectTestButton (20 Jul), the
// topic page's "Test me (10 Qs)" (26 Jul), /exams/[code]/build-mock (1 Sep) —
// and 3 had used one minutes before asking. The tools are unchanged; their
// buttons and links now carry the names students use. The tutor names them the
// same way (src/lib/ai/prompts.ts syllabusBlock, TEST-TYPE REQUESTS).
// English only, like the buttons themselves. Pure.
// Tests: tests/unit/test-type-names.test.ts

/** The hub's subject button (SubjectTestButton): "Subject-wise test: English · 25 Qs →". */
export function subjectTestLabel(subjectName: string, qCount: number): string {
  return `Subject-wise test: ${subjectName} · ${qCount} Qs →`;
}

/** The topic page's 10-question button (TopicMasteryPanel), and its label once the topic is mastered. */
export const TOPIC_TEST_LABEL = "Topic-wise test (10 Qs) →";
export const TOPIC_TEST_AGAIN_LABEL = "Topic-wise test again (10 Qs) →";

/** The heading of the topic page's quick test box: "Topic-wise test: Percentage". */
export function topicTestHeading(topicName: string): string {
  return `Topic-wise test: ${topicName}`;
}

/** The link to /exams/[code]/build-mock. */
export const BUILD_YOUR_OWN_TEST_LABEL = "Build your own test (pick chapters/topics) →";
