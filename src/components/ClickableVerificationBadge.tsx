"use client";

// ClickableVerificationBadge — wraps the visual badge in a button that
// opens VerificationPanel for the specific fact. Use this on pages that
// pass real Fact IDs; the regular <VerificationBadge /> (no factId)
// stays a Link to /verification for non-interactive contexts.

import { useState } from "react";
import { VerificationBadge, type VerificationStatus } from "./VerificationBadge";
import { VerificationPanel } from "./VerificationPanel";

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
  factId: string;
  /** Initial state shown on the badge — pulled from the server-rendered Fact. */
  status: VerificationStatus;
  source?: string;
  sourceUrl?: string;
  lastCheckedAt?: string;
  compact?: boolean;
  /** Whether the visitor is signed in — drives whether action buttons render. */
  signedIn: boolean;
}

export function ClickableVerificationBadge({
  factId,
  status,
  source,
  sourceUrl,
  lastCheckedAt,
  compact,
  signedIn,
}: Props) {
  const [open, setOpen] = useState(false);
  const [fact, setFact] = useState<FactDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (fact) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/facts/${factId}`, { cache: "no-store" });
      if (!res.ok) {
        setError(`Failed to load: HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setFact(data as FactDisplay);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex align-middle bg-transparent border-0 p-0 cursor-pointer"
        aria-label="Open verification details"
      >
        <VerificationBadge
          status={status}
          source={source}
          sourceUrl={sourceUrl}
          lastCheckedAt={lastCheckedAt}
          compact={compact}
          as="span"
        />
      </button>
      {open && (
        <>
          {loading && !fact && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
              <div className="relative rounded-lg bg-white px-6 py-5 text-sm text-ink-700 shadow-2xl">
                Loading verification details…
              </div>
            </div>
          )}
          {error && !fact && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
              <div className="relative rounded-lg bg-white px-6 py-5 text-sm text-rose-700 shadow-2xl">
                {error}
              </div>
            </div>
          )}
          {fact && (
            <VerificationPanel
              fact={fact}
              signedIn={signedIn}
              onClose={() => setOpen(false)}
            />
          )}
        </>
      )}
    </>
  );
}
