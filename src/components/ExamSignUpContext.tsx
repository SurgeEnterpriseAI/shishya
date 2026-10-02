// An exam page's facts for the "Sign up with Google" placements on it
// (2 Oct 2026). A server component: it reads the cached practice map
// (src/lib/db/exam-practice.ts examSignUpFacts — the read the exam pages
// already make) and hands the exam's short name, its practice value and
// whether it is an olympiad to the client island
// (src/components/SignUpPageContext.tsx). The header, the site card, the
// timed bar and the early line then name the exam and say what is true of it.
//
// Fail closed: when the read fails, or the map does not hold the exam, it
// renders nothing — the page's placements then name no exam
// (family.examPath). The browser never looks anything up.

import { examSignUpFacts } from "@/lib/db/exam-practice";
import { SignUpPageContext } from "@/components/SignUpPageContext";

export async function ExamSignUpContext({
  code,
  exam,
  notes,
  topicQuestions,
}: {
  code: string;
  /** The exam's short name. */
  exam: string;
  /** A topic page: it has notes. A syllabus page: a topic on it has notes. */
  notes?: boolean;
  /** A topic page without notes: the topic's checked questions. */
  topicQuestions?: number;
}) {
  const facts = await examSignUpFacts(code);
  if (!facts) return null;
  return <SignUpPageContext exam={exam} code={code} practice={facts.practice} olympiad={facts.olympiad} notes={notes} topicQuestions={topicQuestions} />;
}
