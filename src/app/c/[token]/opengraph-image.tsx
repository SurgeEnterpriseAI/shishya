// Dynamic OG card for /c/:token — the WhatsApp preview of a challenge
// (14 Sep 2026). Built like src/app/share/[id]/opengraph-image.tsx: Node
// runtime, the DB read is .catch()'d, every text container is display:flex
// and each line is one template string. The challenger's name appears only
// if they typed it and it is in Latin script (the card font carries no
// Indic glyphs; the page itself shows any script) — otherwise "Your
// friend". A missing token renders the plain brand card.

import { ImageResponse } from "next/og";
import { loadChallenge } from "@/lib/challenge-db";

export const runtime = "nodejs";
export const alt = "Shishya challenge — can you beat this score?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LATIN_NAME = new RegExp("^[\\p{Script=Latin}\\s.'-]+$", "u");

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ch = await loadChallenge(token).catch(() => null);
  const name = ch?.creatorName && LATIN_NAME.test(ch.creatorName) ? ch.creatorName : null;

  const kicker = ch ? "Challenge" : "Shishya";
  const headline = ch ? `${name ?? "Your friend"} scored` : "Free Indian exam prep";
  const score = ch ? `${ch.creatorCorrect}/${ch.questionCount}` : null;
  const subline = ch
    ? ch.source === "mock"
      ? `on ${ch.questionCount} questions from a ${ch.examShort} mock`
      : `on ${ch.questionCount} ${ch.examShort} questions`
    : "Mock tests · syllabus · cutoffs · exam trackers";
  const footer = ch ? "Can you beat it? Same questions · free · no sign-in" : "Free mocks · PYQ · exam dates · in your language";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          background: "#fff7ed",
          display: "flex",
          flexDirection: "column",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "12px",
            background: "#f97316",
            display: "flex",
          }}
        />

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
            <div style={{ display: "flex", fontSize: "16px", color: "#475569", marginTop: "2px" }}>Free Indian exam prep</div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: "28px", color: "#c2410c", fontWeight: 600, marginBottom: "8px" }}>{kicker}</div>
          <div style={{ display: "flex", fontSize: "64px", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{headline}</div>
          {score ? (
            <div
              style={{
                display: "flex",
                fontSize: "140px",
                fontWeight: 900,
                color: "#f97316",
                letterSpacing: "-3px",
                lineHeight: 1,
                marginTop: "8px",
              }}
            >
              {score}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: "36px", color: "#1e293b", fontWeight: 600, marginTop: "8px" }}>{subline}</div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(15,23,42,0.1)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", fontSize: "22px", color: "#334155" }}>{footer}</div>
          <div style={{ display: "flex", fontSize: "22px", fontWeight: 700, color: "#f97316" }}>shishya.in →</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
