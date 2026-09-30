// "Save my path" slot (30 Sep 2026, P1 build 1, spec §2.1 / §6 — agent B).
//
// Build 1 renders nothing: the slot only fixes where the save island will
// sit on /after-10th, /after-12th and the stream pages. Build 2 (S2, after
// the 7 Oct sign-up read) fills it with the SavePathButton client island —
// 13+ only, never on a stage that may include children, nothing sent for
// them. Until then no page stores anything.

export function StageSaveSlot() {
  return null;
}
