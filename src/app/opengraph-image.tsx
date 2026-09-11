// Dynamic OpenGraph image for Shishya — the root card.
//
// Next.js App Router auto-detects this file and serves it as the
// og:image for every page that doesn't override it (homepage, /live-test,
// /exam-calendar, …). WhatsApp, Twitter, LinkedIn, Slack, iMessage etc.
// fetch this when a link is shared.
//
// 11 Sep 2026: prod served this as 200 image/png with 0 bytes. Root
// cause: Satori throws 'Expected <div> to have explicit "display: flex"'
// for any <div> whose children are more than one node — the headline was
// `Every Indian entrance exam,{" "}<span>free.</span>` (three nodes) in a
// non-flex div. On the Edge runtime the throw happened inside the
// response stream, after the 200 headers were sent, so the body closed
// empty and nothing was logged. Now mirrors the per-exam route that works
// on prod (src/app/exams/[code]/opengraph-image.tsx): Node runtime, every
// text container is display:flex, no template-mixed children.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Shishya — free preparation for every Indian entrance exam";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px 100px",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "40px" }}>
          <div
            style={{
              width: "120px",
              height: "120px",
              background: "#f97316",
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "84px",
              fontWeight: 700,
            }}
          >
            शि
          </div>
          <div style={{ display: "flex", fontSize: "84px", fontWeight: 800, color: "#1c1917", letterSpacing: "-0.02em" }}>
            Shishya
          </div>
        </div>

        {/* Headline — two flex items, never a mixed text+element child list. */}
        <div
          style={{
            display: "flex",
            gap: "18px",
            fontSize: "56px",
            color: "#1c1917",
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: "1000px",
          }}
        >
          <div style={{ display: "flex" }}>Every Indian entrance exam,</div>
          <div style={{ display: "flex", color: "#c2410c" }}>free.</div>
        </div>

        <div style={{ display: "flex", marginTop: "32px", fontSize: "32px", color: "#57534e", fontWeight: 500 }}>
          Free mocks · previous year papers · syllabus · exam dates
        </div>
        <div style={{ display: "flex", marginTop: "20px", fontSize: "26px", color: "#78716c", fontWeight: 500 }}>
          no paywall · no ads · in your language
        </div>
      </div>
    ),
    { ...size },
  );
}
