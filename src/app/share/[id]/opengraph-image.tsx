// Dynamic OG card for /share/:id.
//
// Next 15's file-based convention: a file named opengraph-image.tsx
// under a route automatically becomes that route's og:image. Returns
// an ImageResponse from next/og — Vercel runs it on the Edge so
// generation is fast (typical 100-300 ms cold start).
//
// Renders the share-friendly hero: student name + score + exam name +
// "Shishya — free Indian exam prep" footer. WhatsApp / Twitter /
// Telegram show this when someone shares a /share/:id link.
//
// Image dimensions are 1200x630 (canonical OG card size). Embedded
// Inter font so the typography is consistent across previewers.

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

export default async function Image({
  params,
}: {
  params: { id: string };
}) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: params.id },
    select: {
      scorePct: true,
      user: { select: { name: true } },
      mock: { select: { exam: { select: { shortName: true, category: true } } } },
    },
  });

  // Gracefully degrade if the attempt is missing — render a generic
  // Shishya brand card. WhatsApp will still get a preview rather than
  // a 404 / empty preview that drops the link's CTR.
  const exam = attempt?.mock?.exam?.shortName ?? "Indian exam prep";
  const score = formatDisplayScorePct(attempt?.scorePct);
  const studentName =
    attempt?.user?.name?.trim().split(/\s+/)[0] ?? "A student";
  const category = (attempt?.mock?.exam?.category ?? "OTHER") as string;
  const palette = CATEGORY_PALETTE[category] ?? CATEGORY_PALETTE.OTHER;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          background: palette.bg,
          display: "flex",
          flexDirection: "column",
          padding: 64,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Top ribbon — accent stripe */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            background: palette.accent,
          }}
        />

        {/* Top row — brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: "#f97316",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            शि
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
              Shishya
            </div>
            <div style={{ fontSize: 16, color: "#475569", marginTop: 2 }}>
              Free Indian exam prep
            </div>
          </div>
        </div>

        {/* Middle — the headline */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 28,
              color: palette.accent,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {palette.label}
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.1,
            }}
          >
            {studentName} scored
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              marginTop: 12,
            }}
          >
            <div
              style={{
                fontSize: 140,
                fontWeight: 900,
                color: "#f97316",
                letterSpacing: "-3px",
                lineHeight: 1,
              }}
            >
              {score}
            </div>
            <div
              style={{
                fontSize: 40,
                color: "#1e293b",
                fontWeight: 600,
              }}
            >
              on {exam}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(15,23,42,0.1)",
            paddingTop: 24,
          }}
        >
          <div style={{ fontSize: 22, color: "#334155" }}>
            Where do YOU stand?
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#f97316",
            }}
          >
            shishya.in →
          </div>
        </div>
      </div>
    ),
    size,
  );
}
