// Shared one-line labels for search rows (26 Sep 2026): built from data by the
// index builder and rebuilt by the wire codec, so both say the same words.
// Pure.

export const SCHOLARSHIP_LEVEL_LABEL: Readonly<Record<string, string>> = {
  CLASS_9_10: "Class 9-10",
  CLASS_11_12: "Class 11-12",
  DIPLOMA: "Diploma",
  UG: "UG",
  PG: "PG",
  PHD: "PhD",
};

export const SCHOLARSHIP_TYPE_LABEL: Readonly<Record<string, string>> = {
  CENTRAL: "Central",
  STATE: "State",
  PRIVATE: "Private",
  EXAM_SPECIFIC: "Exam-linked",
  MERIT: "Merit",
  RESEARCH: "Research fellowship",
};

/** "Central · UG, PG · girls only" — type, state, levels, and a girls-only rule, from the scholarship's own data. */
export function scholarshipSub(type: string, stateName: string | null, levels: readonly string[], gender: "F" | "M" | null): string {
  const bits = [
    SCHOLARSHIP_TYPE_LABEL[type] ?? type,
    stateName,
    levels.map((l) => SCHOLARSHIP_LEVEL_LABEL[l] ?? l).join(", "),
    gender === "F" ? "girls only" : gender === "M" ? "boys only" : null,
  ];
  return bits.filter(Boolean).join(" · ");
}
