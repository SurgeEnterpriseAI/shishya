// The result card's layout (14 Sep 2026) — rendered by ./route.tsx through
// next/og. Kept apart from the route so the words can be rendered and looked
// at without a signed-in session. Satori rules: every text container is
// display:flex and each line is one template string (see
// src/app/share/[id]/opengraph-image.tsx for what breaks otherwise).

import type { ResultCardCopy } from "@/lib/result-card";

export const RESULT_CARD_SIZE = { width: 1080, height: 1920 } as const;

export function ResultCardImage({ c }: { c: ResultCardCopy }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff7ed",
        padding: "110px 84px 96px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "22px", background: "#f97316", display: "flex" }} />

      <div style={{ display: "flex", alignItems: "center", gap: "26px" }}>
        <div
          style={{
            width: "104px",
            height: "104px",
            background: "#f97316",
            borderRadius: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "60px",
            fontWeight: 800,
          }}
        >
          S
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "52px", fontWeight: 800, color: "#0f172a" }}>Shishya</div>
          <div style={{ display: "flex", fontSize: "30px", color: "#475569", marginTop: "4px" }}>Free Indian exam prep</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", fontSize: "42px", color: "#c2410c", fontWeight: 700 }}>{c.kicker}</div>
        <div style={{ display: "flex", fontSize: "92px", fontWeight: 800, color: "#0f172a", marginTop: "28px", lineHeight: 1.1 }}>
          {c.headline}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "250px",
            fontWeight: 900,
            color: "#f97316",
            letterSpacing: "-8px",
            lineHeight: 1,
            marginTop: "18px",
          }}
        >
          {c.score}
        </div>
        <div style={{ display: "flex", fontSize: "46px", color: "#1e293b", fontWeight: 600, marginTop: "30px" }}>{c.detail}</div>
        {c.badge ? (
          <div style={{ display: "flex", marginTop: "44px" }}>
            <div
              style={{
                display: "flex",
                fontSize: "42px",
                fontWeight: 800,
                color: "#065f46",
                background: "#d1fae5",
                borderRadius: "999px",
                padding: "16px 40px",
              }}
            >
              {c.badge}
            </div>
          </div>
        ) : null}
        {c.rankLine ? (
          <div style={{ display: "flex", fontSize: "60px", fontWeight: 800, color: "#0f172a", marginTop: "56px", lineHeight: 1.15 }}>
            {c.rankLine}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", borderTop: "3px solid rgba(15,23,42,0.12)", paddingTop: "44px" }}>
        <div style={{ display: "flex", fontSize: "38px", color: "#334155" }}>{c.footer}</div>
        <div style={{ display: "flex", fontSize: "60px", fontWeight: 800, color: "#f97316", marginTop: "12px" }}>shishya.in</div>
      </div>
    </div>
  );
}
