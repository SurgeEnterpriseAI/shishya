// One compact line of cohort proof, tuned to where the aspirant is
// standing. No names, no scores, no ranking — and it renders nothing
// when the cohort is thin, so it never reads as an empty room.

import type { PeerProof } from "@/lib/peer-proof";

export function PeerProofLine({
  proof,
  examShort,
  variant = "exam",
}: {
  proof: PeerProof | null;
  examShort: string;
  /** Where it's shown — changes the sentence, not the data. */
  variant?: "exam" | "dashboard" | "results";
}) {
  if (!proof) return null;
  const others = proof.includesYou ? proof.students - 1 : proof.students;
  if (variant !== "exam" && others < 2) return null;

  const text =
    variant === "dashboard"
      ? proof.includesYou
        ? `You and ${others} other ${examShort} aspirants studied today — ${proof.sets} practice sets between you.`
        : `${proof.students} ${examShort} aspirants have already studied today (${proof.sets} practice sets). Your turn.`
      : variant === "results"
        ? proof.includesYou
          ? `You just joined ${others} other ${examShort} aspirants who practised today.`
          : `${proof.students} ${examShort} aspirants practised today.`
        : `🔥 ${proof.students} ${examShort} aspirants practised today — ${proof.sets} practice sets between them.`;

  return (
    <p className="mt-3 rounded-lg bg-saffron-50/70 px-3 py-2 text-xs font-medium text-saffron-900">
      {text}
    </p>
  );
}
