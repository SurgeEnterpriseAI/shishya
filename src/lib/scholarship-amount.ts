// The amount line a scholarship card shows (16 Sep 2026). Pure, no JSX, so
// tests/unit/scholarship-amount.test.ts can load it (vitest cannot parse
// the .tsx component: tsconfig keeps jsx "preserve").

/** The stored amount up to its first clause break — a "." or "," followed
 *  by a space or the end. The card used to split at EVERY "." and ",", so
 *  thousands separators and decimals truncated every amount on every exam
 *  page (live on MP_RAEO and KA_KSRP: "₹12,000/year for UG…" → "₹12",
 *  "₹500–₹3,200/month…" → "₹500–₹3", "Up to ₹1.25 lakh/year…" → "Up to ₹1"). */
export function scholarshipAmountHead(amount: string): string {
  return amount.split(/[.,](?=\s|$)/)[0];
}
