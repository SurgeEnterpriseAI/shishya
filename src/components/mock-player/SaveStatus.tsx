"use client";

// Honest inline save state for the mock player. It says exactly what is
// true right now — nothing more: no spinner, no progress bar, no
// percentage, no "almost there". The counts are real (size of the dirty
// set), and "saved" is only shown after the server acknowledged the exact
// versions this device sent.
//
// 16 Sep 2026: every string here is now supplied by the caller in the
// student's language (player.save.* / player.save.unconfirmed, built in
// /mocks/[id]/page.tsx). DEFAULT_LABELS and DEFAULT_UNCONFIRMED stay only
// as the English fallback for a caller that passes nothing.

import { fillTemplate } from "@/lib/i18n";

export type SaveState = "idle" | "saving" | "saved" | "offline" | "retrying" | "error";

const DEFAULT_LABELS: Record<Exclude<SaveState, "idle">, string> = {
  saving: "saving…",
  saved: "saved",
  offline: "offline — answers kept on this device, will sync",
  retrying: "couldn't reach the server — answers kept on this device, retrying",
  error: "this attempt can no longer be saved on the server — answers kept on this device",
};

/** `{n}` = answers this device changed that the server has not confirmed. */
const DEFAULT_UNCONFIRMED = "{n} not yet confirmed";

const TONE: Record<Exclude<SaveState, "idle">, string> = {
  saving: "text-ink-500",
  saved: "text-emerald-700",
  offline: "text-amber-700",
  retrying: "text-amber-700",
  error: "text-rose-700",
};

export function SaveStatus({
  state,
  unsynced,
  message,
  labels,
  unconfirmedLabel,
  className,
}: {
  state: SaveState;
  /** Answers changed on this device that the server has not confirmed yet. */
  unsynced: number;
  /** For `error`: the server's own message, shown verbatim when given. */
  message?: string | null;
  labels?: Partial<Record<Exclude<SaveState, "idle">, string>>;
  /** Template for the tail count, `{n}` = unsynced. English when omitted. */
  unconfirmedLabel?: string;
  className?: string;
}) {
  if (state === "idle" && unsynced === 0) return null;
  const text =
    state === "idle"
      ? ""
      : state === "error" && message
        ? message
        : (labels?.[state] ?? DEFAULT_LABELS[state]);
  const tail =
    unsynced > 0 && state !== "saving"
      ? ` · ${fillTemplate(unconfirmedLabel ?? DEFAULT_UNCONFIRMED, { n: unsynced })}`
      : "";
  return (
    <p
      role="status"
      aria-live="polite"
      className={`text-[11px] ${state === "idle" ? "text-ink-500" : TONE[state]} ${className ?? ""}`}
    >
      {text}
      {tail}
    </p>
  );
}
