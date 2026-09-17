// The scholarship card's amount line (src/lib/scholarship-amount.ts, used by
// src/components/ScholarshipsForExamSection.tsx).
// No DB, no network. Run with: npx vitest run tests/unit/scholarship-amount.test.ts
//
// 16 Sep 2026 (raeo.9): the card split every amount at each "." and ",",
// so every exam page showed "₹12", "₹500–₹3" and "₹230–₹1" — thousands
// separators and decimals cut the number. The inputs below are the stored
// amounts from src/data/scholarships.ts that were live on MP_RAEO / KA_KSRP.

import { describe, it, expect } from "vitest";
import { scholarshipAmountHead } from "@/lib/scholarship-amount";
import { SCHOLARSHIPS } from "@/data/scholarships";

describe("scholarshipAmountHead", () => {
  it("keeps thousands separators: '₹12,000/year for UG…' (was '₹12')", () => {
    expect(scholarshipAmountHead("₹12,000/year for UG (3 years) + ₹20,000/year for PG (2 years). Total up to ₹76,000.")).toBe(
      "₹12,000/year for UG (3 years) + ₹20,000/year for PG (2 years)",
    );
    expect(scholarshipAmountHead("₹12,000/year from class 9 through class 12.")).toBe("₹12,000/year from class 9 through class 12");
  });

  it("keeps a range: '₹500–₹3,200/month…' (was '₹500–₹3')", () => {
    expect(scholarshipAmountHead("₹500–₹3,200/month, depending on course and stream.")).toBe("₹500–₹3,200/month");
  });

  it("keeps a maintenance range inside the first sentence: '…₹230–₹1,200/month…' (was '…₹230–₹1')", () => {
    expect(
      scholarshipAmountHead(
        "Tuition fees + maintenance allowance ₹230–₹1,200/month + book grant. Total ₹4,000–₹13,500/year depending on hostel/day-scholar status.",
      ),
    ).toBe("Tuition fees + maintenance allowance ₹230–₹1,200/month + book grant");
  });

  it("keeps decimals and abbreviations with no space after the dot: '₹1.25 lakh', 'B.Tech'", () => {
    expect(scholarshipAmountHead("Up to ₹1.25 lakh/year for general UG + ₹1.5 lakh/year for B.Tech + ₹3 lakh/year for medical.")).toBe(
      "Up to ₹1.25 lakh/year for general UG + ₹1.5 lakh/year for B.Tech + ₹3 lakh/year for medical",
    );
  });

  it("Indian digit grouping survives: 'Class 11: ₹1,25,000/year'", () => {
    expect(scholarshipAmountHead("Class 9: ₹75,000/year. Class 11: ₹1,25,000/year. Covers tuition, books, hostel.")).toBe("Class 9: ₹75,000/year");
    expect(scholarshipAmountHead("₹1,18,000 cumulative across milestones")).toBe("₹1,18,000 cumulative across milestones");
  });

  it("an amount with no clause break is shown whole", () => {
    expect(scholarshipAmountHead("₹10,000-₹50,000 per year")).toBe("₹10,000-₹50,000 per year");
  });

  it("no stored amount is cut inside a number", () => {
    for (const s of SCHOLARSHIPS) {
      const head = scholarshipAmountHead(s.amount);
      expect(head.length, s.id).toBeGreaterThan(0);
      // The head ends at a clause break, so the original continues with
      // "." / "," then a space (or ends) — never "," or "." then a digit.
      const rest = s.amount.slice(head.length);
      expect(/^[.,]\d/.test(rest), `${s.id}: "${head}" | "${rest.slice(0, 12)}"`).toBe(false);
    }
  });
});
