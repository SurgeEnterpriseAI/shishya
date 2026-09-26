// Dynamic OpenGraph image for /exams/[code] — per-exam social card.
//
// 1200x630 PNG generated at the edge. Shown when an exam URL is
// shared on WhatsApp / Twitter / LinkedIn / Slack / iMessage.
//
// Cached by Next at the edge for the same TTL as the page. Fall
// back to the root opengraph-image if the exam lookup fails.

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { examKindLabel } from "@/lib/exam-kind";
import { examTitleYear } from "@/lib/exam-title-year";

export const runtime = "nodejs";
export const alt = "Shishya — exam preparation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Next 15: `params` is a Promise for metadata image routes too. Reading
// `params.code` synchronously gave undefined → every exam card 500'd in
// prod (GSC "Server error (5xx)" report, 2 Sep 2026). Satori also needs
// an explicit display:flex on any element with >1 child — every text
// container below is flex for that reason.
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code }),
    select: { code: true, shortName: true, name: true, category: true, state: true },
  }).catch(() => null);

  // Fallback to a generic Shishya card if the exam isn't found.
  // 26 Sep 2026: the fallback line is the site's one-line description (no
  // "community-driven" claim); the chip says what the exam is (entrance,
  // olympiad, government, professional — src/lib/exam-kind.ts) instead of
  // the raw enum ("GOVT JOBS" on NDA); the year is the hub title's cycle
  // year (src/lib/exam-title-year.ts) — no year when nothing names one,
  // never the calendar year.
  const shortName = exam?.shortName ?? "Shishya";
  const fullName = exam?.name ?? "One smart place to study for students in India";
  const category = exam ? examKindLabel({ code: exam.code, category: String(exam.category) }) : "";
  const year = exam ? await examTitleYear(exam.code) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px 100px",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              background: "#f97316",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "56px",
              fontWeight: 700,
            }}
          >
            शि
          </div>
          <div style={{ display: "flex", fontSize: "44px", fontWeight: 800, color: "#1c1917" }}>
            Shishya
          </div>
          {category ? (
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                padding: "8px 18px",
                background: "#fff",
                border: "2px solid #f97316",
                borderRadius: "999px",
                color: "#9a3412",
                fontSize: "22px",
                fontWeight: 600,
              }}
            >
              {category}
            </div>
          ) : null}
        </div>

        {/* Middle: exam name */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "96px",
              fontWeight: 800,
              color: "#1c1917",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {shortName}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              color: "#57534e",
              fontWeight: 500,
              lineHeight: 1.2,
              maxWidth: "1000px",
            }}
          >
            {fullName}
          </div>
        </div>

        {/* Bottom: tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            color: "#57534e",
            fontSize: "26px",
            fontWeight: 500,
          }}
        >
          <div style={{ display: "flex" }}>Free mocks · syllabus · PYQ pattern · AI tutor</div>
          {year !== null ? <div style={{ display: "flex", color: "#c2410c", fontWeight: 700 }}>{year}</div> : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
