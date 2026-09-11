// Dynamic OG card for /share/:id — the preview a friend sees in WhatsApp
// when a student forwards their mock score.
//
// Next 15's file-based convention: a file named opengraph-image.tsx
// under a route automatically becomes that route's og:image.
//
// 11 Sep 2026: prod returned HTTP 500 for every /share/:id/opengraph-image
// (missing AND real attempts), so each "Share your score" forward landed
// image-less. Root cause: Satori throws 'Expected <div> to have explicit
// "display: flex"' for any <div> whose children are more than one node —
// `{studentName} scored` and `on {exam}` are two-node child lists in
// non-flex divs. Rebuilt on the per-exam route that works on prod
// (src/app/exams/[code]/opengraph-image.tsx): Node runtime, the DB read
// is .catch()'d, every text container is display:flex, and each line is
// a single template string.
//
// PRIVACY — mirrors page.tsx: first name + score + exam short name only.
// A sharer with no name on their account gets an exam card WITHOUT the
// score ("A student scored 72%" reads like synthetic social proof, and
// the friend has nobody to attach it to). A missing attempt renders the
// plain brand card — never a 500, never an empty preview.
//
// Image dimensions are 1200x630 (canonical OG card size).

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db/prisma";
import { formatDisplayScorePct } from "@/lib/scoring";

export const runtime = "nodejs";
export const alt = "Shishya mock attempt — share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Hex colours mirror the per-category theme so the OG matches the
// share page's wash. Kept inline (no Tailwind in OG render) and
// keyed by ExamCategory string. Update in tandem with
// src/lib/exam-theme.ts if a new category is added.
const CATEGORY_PALETTE: Record<string, { bg: string; accent: string; label: string }> = {
  ENGINEERING:    { bg: "#dbeafe", accent: "#2563eb", label: "Engineering" },
  MEDICAL:        { bg: "#d1fae5", accent: "#059669", label: "Medical" },
  CIVIL_SERVICES: { bg: "#ffe4e6", accent: "#be123c", label: "Civil Services" },
  BANKING:        { bg: "#e0e7ff", accent: "#4f46e5", label: "Banking" },
  GOVT_JOBS:      { bg: "#e0f2fe", accent: "#0284c7", label: "Govt Jobs" },
  TEACHING:       { bg: "#fef3c7", accent: "#d97706", label: "Teaching" },
  LAW:            { bg: "#e7e5e4", accent: "#44403c", label: "Law" },
  MBA:            { bg: "#e2e8f0", accent: "#475569", label: "MBA" },
  UNIVERSITY:     { bg: "#fae8ff", accent: "#a21caf", label: "University" },
  OLYMPIAD:       { bg: "#ede9fe", accent: "#7c3aed", label: "Olympiad" },
  STATE_LEVEL:    { bg: "#fff7ed", accent: "#c2410c", label: "State-level" },
  SCHOOL_BOARD:   { bg: "#fff7ed", accent: "#c2410c", label: "School board" },
  OTHER:          { bg: "#fff7ed", accent: "#c2410c", label: "Exam prep" },
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  // Next 15: params is a Promise (sync read → undefined → 500 in prod).
  const { id } = await params;
  const attempt = await prisma.attempt
    .findUnique({
      where: { id },
      select: {
        scorePct: true,
        user: { select: { name: true } },
        mock: { select: { exam: { select: { shortName: true, category: true } } } },
      },
    })
    .catch(() => null);

  const exam = attempt?.mock?.exam?.shortName ?? null;
  const firstName = attempt?.user?.name?.trim().split(/\s+/)[0] || null;
  const showScore = !!attempt && !!firstName && attempt.scorePct != null;
  const score = formatDisplayScorePct(attempt?.scorePct);
  const category = (attempt?.mock?.exam?.category ?? "OTHER") as string;
  const palette = CATEGORY_PALETTE[category] ?? CATEGORY_PALETTE.OTHER;

  // Three shapes, one layout:
  //   named sharer   → "Rahul scored" / 72.4% / "on SBI PO"
  //   nameless sharer→ "SBI PO mock" / "Try 5 questions free — no sign-in"
  //   missing attempt→ plain brand card
  const headline = showScore
    ? `${firstName} scored`
    : exam
      ? `${exam} mock`
      : "Free Indian exam prep";
  const subline = showScore
    ? `on ${exam}`
    : exam
      ? "Try 5 questions free — no sign-in"
      : "Mock tests · syllabus · cutoffs · exam trackers";
  const kicker = attempt ? palette.label : "Shishya";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          background: palette.bg,
          display: "flex",
          flexDirection: "column",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top ribbon — accent stripe */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "12px",
            background: palette.accent,
            display: "flex",
          }}
        />

        {/* Top row — brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "#f97316",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
              fontWeight: 700,
            }}
          >
            शि
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: "28px", fontWeight: 700, color: "#0f172a" }}>Shishya</div>
            <div style={{ display: "flex", fontSize: "16px", color: "#475569", marginTop: "2px" }}>
              Free Indian exam prep
            </div>
          </div>
        </div>

        {/* Middle — the headline */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: "28px", color: palette.accent, fontWeight: 600, marginBottom: "8px" }}>
            {kicker}
          </div>
          <div style={{ display: "flex", fontSize: "68px", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
            {headline}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "24px", marginTop: "12px" }}>
            {showScore ? (
              <div
                style={{
                  display: "flex",
                  fontSize: "140px",
                  fontWeight: 900,
                  color: "#f97316",
                  letterSpacing: "-3px",
                  lineHeight: 1,
                }}
              >
                {score}
              </div>
            ) : null}
            <div style={{ display: "flex", fontSize: "40px", color: "#1e293b", fontWeight: 600 }}>{subline}</div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(15,23,42,0.1)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", fontSize: "22px", color: "#334155" }}>
            {showScore ? "Where do YOU stand? 5 questions, no sign-in" : "Free mocks · PYQ · exam dates · in your language"}
          </div>
          <div style={{ display: "flex", fontSize: "22px", fontWeight: 700, color: "#f97316" }}>shishya.in →</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
