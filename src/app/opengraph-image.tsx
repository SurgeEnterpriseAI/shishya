// Dynamic OpenGraph image for Shishya.
//
// Next.js App Router auto-detects this file and serves it as the
// og:image for every page that doesn't override it. WhatsApp, Twitter,
// LinkedIn, Slack, iMessage etc. fetch this when a link is shared.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Shishya — Every stage of your education. People who've been there.";
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "40px",
          }}
        >
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
          <div
            style={{
              fontSize: "84px",
              fontWeight: 800,
              color: "#1c1917",
              letterSpacing: "-0.02em",
            }}
          >
            Shishya
          </div>
        </div>
        <div
          style={{
            fontSize: "56px",
            color: "#1c1917",
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: "1000px",
          }}
        >
          Every stage of your education.{" "}
          <span style={{ color: "#c2410c" }}>People who&apos;ve been there.</span>
        </div>
        <div
          style={{
            marginTop: "32px",
            fontSize: "32px",
            color: "#57534e",
            fontWeight: 500,
          }}
        >
          school · college · exams · scholarships · careers · study abroad
        </div>
        <div
          style={{
            marginTop: "20px",
            fontSize: "26px",
            color: "#78716c",
            fontWeight: 500,
          }}
        >
          free · verified · in your language
        </div>
      </div>
    ),
    { ...size },
  );
}
