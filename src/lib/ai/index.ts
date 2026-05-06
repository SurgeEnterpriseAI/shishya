// Public surface of the AI pipeline. Route handlers and services should
// import only from this module — never reach into individual files — so
// internal restructuring stays cheap.

export { runDiagnostic } from "./diagnostic";
export { generateMock } from "./generator";
export { tutorReply, tutorStream } from "./tutor";
export { explainSolution } from "./explainer";
export { generateWeeklyCoach } from "./coach";

export type * from "./types";
