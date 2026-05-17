"use client";

// VerificationPanel — the click-to-verify popover that opens from a
// VerificationBadge. Shows the fact's verification history and gives
// logged-in users the three community actions:
//
//   * "I checked the source — this is accurate"  → POST { actionType: VERIFY }
//   * "This looks wrong"                          → opens FlagForm
//   * "Suggest an update"                          → opens SuggestForm
//
// For unauthenticated visitors we show the badge details + a Sign in
// CTA. That way crawlers see real verification context even without
// the interactive controls.

import { useState } from "react";
import Link from "next/link";

interface FactDisplay {
  id: string;
  claimText: string;
  claimValue: string;
  sourceUrl: string;
  sourceName: string;
  status: "NONE" | "AI" | "VERIFIED" | "FULLY" | "NEEDS_REVIEW" | "DISPUTED";
  lastAiCheckDate?: string | null;
  communityVerificationsCount: number;
  trustedVerifierCount: number;
  domainExpertCount: number;
  flagCount: number;
}

interface Props {
  fact: FactDisplay;
  signedIn: boolean;
  onClose: () => void;
}

const STATUS_LABEL: Record<FactDisplay["status"], string> = {
  NONE:         "Not yet verified",
  AI:           "AI-verified",
  VERIFIED:     "Verified",
  FULLY:        "Fully verified",
  NEEDS_REVIEW: "Needs verification",
  DISPUTED:     "Flagged · review pending",
};

export function VerificationPanel({ fact, signedIn, onClose }: Props) {
  const [mode, setMode] = useState<"view" | "flag" | "suggest">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [proposedSourceUrl, setProposedSourceUrl] = useState("");

  async function submit(actionType: "VERIFY" | "FLAG" | "SUGGEST_UPDATE") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/facts/${fact.id}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionType,
          notes: actionType !== "VERIFY" ? notes : undefined,
          proposedValue: actionType === "SUGGEST_UPDATE" ? proposedValue : undefined,
          proposedSourceUrl: actionType === "SUGGEST_UPDATE" && proposedSourceUrl ? proposedSourceUrl : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || j.message || `HTTP ${res.status}`);
        return;
      }
      setSuccess(
        actionType === "VERIFY"
          ? "Thank you. Your verification helps other students."
          : actionType === "FLAG"
          ? "Flag recorded. An admin will review within 24 hours."
          : "Suggestion submitted. We'll notify you when it's reviewed.",
      );
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-0 flex h-screen w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Verification details
            </p>
            <h2 className="mt-0.5 truncate text-sm font-semibold text-ink-900">
              {fact.claimText}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md p-2 text-ink-500 hover:bg-ink-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-ink-700">
          {/* Claim */}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Current claim</p>
          <p className="mt-1 break-words text-ink-900">{fact.claimValue}</p>

          {/* Source */}
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Source</p>
          <p className="mt-1">
            <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
              {fact.sourceName}
            </a>
          </p>

          {/* Status */}
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Status</p>
          <p className="mt-1 font-medium text-ink-900">{STATUS_LABEL[fact.status]}</p>

          {/* Verification counts */}
          <div className="mt-4 rounded-md border border-ink-200 bg-ink-50/30 p-3 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Verification history
            </p>
            <ul className="mt-2 space-y-1">
              {fact.lastAiCheckDate && (
                <li>AI-verified against source on <strong>{new Date(fact.lastAiCheckDate).toISOString().slice(0, 10)}</strong></li>
              )}
              {fact.communityVerificationsCount > 0 && (
                <li><strong>{fact.communityVerificationsCount}</strong> community user{fact.communityVerificationsCount === 1 ? "" : "s"} confirmed</li>
              )}
              {fact.trustedVerifierCount > 0 && (
                <li><strong>{fact.trustedVerifierCount}</strong> Trusted Verifier{fact.trustedVerifierCount === 1 ? "" : "s"} confirmed</li>
              )}
              {fact.domainExpertCount > 0 && (
                <li><strong>{fact.domainExpertCount}</strong> Domain Expert{fact.domainExpertCount === 1 ? "" : "s"} confirmed</li>
              )}
              {fact.flagCount > 0 && (
                <li className="text-rose-700"><strong>{fact.flagCount}</strong> flag{fact.flagCount === 1 ? "" : "s"} pending review</li>
              )}
            </ul>
          </div>

          {/* Action area */}
          {!signedIn ? (
            <div className="mt-6 rounded-md border border-saffron-200 bg-saffron-50/50 p-4 text-xs">
              <p className="text-ink-700">
                Sign in to help verify this fact, flag inaccuracies, or
                suggest an update. Verifications earn contribution badges.
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
              >
                Sign in →
              </Link>
            </div>
          ) : success ? (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-800">
              {success}
            </div>
          ) : mode === "view" ? (
            <div className="mt-6 space-y-2">
              <button
                disabled={busy}
                onClick={() => submit("VERIFY")}
                className="w-full rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy ? "Submitting…" : "I checked the source — this is accurate"}
              </button>
              <button
                disabled={busy}
                onClick={() => setMode("flag")}
                className="w-full rounded-md border border-rose-300 px-3 py-2 text-xs font-medium text-rose-800 hover:bg-rose-50"
              >
                This looks wrong
              </button>
              <button
                disabled={busy}
                onClick={() => setMode("suggest")}
                className="w-full rounded-md border border-ink-300 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50"
              >
                Suggest an update
              </button>
            </div>
          ) : mode === "flag" ? (
            <div className="mt-6 space-y-3">
              <p className="text-xs font-medium text-ink-900">What does the source actually say?</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Describe what's wrong. Include the URL of the contradicting source location if you have it."
                className="w-full rounded-md border border-ink-300 bg-white p-2 text-xs text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
              />
              <p className="text-[10px] text-ink-500">{notes.length}/500</p>
              <div className="flex gap-2">
                <button
                  disabled={busy || notes.trim().length < 10}
                  onClick={() => submit("FLAG")}
                  className="flex-1 rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  Submit flag
                </button>
                <button onClick={() => setMode("view")} className="rounded-md border border-ink-300 px-3 py-2 text-xs text-ink-700 hover:bg-ink-50">
                  Back
                </button>
              </div>
            </div>
          ) : (
            // mode === "suggest"
            <div className="mt-6 space-y-3">
              <p className="text-xs font-medium text-ink-900">Your proposed value</p>
              <input
                type="text"
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                maxLength={500}
                placeholder="The correct value as it should appear"
                className="w-full rounded-md border border-ink-300 bg-white p-2 text-xs text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
              />
              <p className="text-xs font-medium text-ink-900">Source URL (optional)</p>
              <input
                type="url"
                value={proposedSourceUrl}
                onChange={(e) => setProposedSourceUrl(e.target.value)}
                maxLength={500}
                placeholder="https://… (the official source for your suggested value)"
                className="w-full rounded-md border border-ink-300 bg-white p-2 text-xs text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
              />
              <p className="text-xs font-medium text-ink-900">Notes (optional)</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Anything else the admin should know"
                className="w-full rounded-md border border-ink-300 bg-white p-2 text-xs text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
              />
              <div className="flex gap-2">
                <button
                  disabled={busy || proposedValue.trim().length < 1}
                  onClick={() => submit("SUGGEST_UPDATE")}
                  className="flex-1 rounded-md bg-saffron-500 px-3 py-2 text-xs font-semibold text-white hover:bg-saffron-600 disabled:opacity-60"
                >
                  Submit suggestion
                </button>
                <button onClick={() => setMode("view")} className="rounded-md border border-ink-300 px-3 py-2 text-xs text-ink-700 hover:bg-ink-50">
                  Back
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50/50 p-2 text-xs text-rose-800">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ink-200 bg-ink-50/30 px-5 py-3 text-[11px] text-ink-500">
          Learn{" "}
          <Link href="/verification" className="text-saffron-700 underline">
            how verification works
          </Link>{" "}
          on Shishya.
        </div>
      </div>
    </div>
  );
}
