// Section social cards (26 Sep 2026, group D) — /schooling, /colleges and
// /careers had no card of their own and shared the root "One free place to
// study" image. One Satori layout for all three: Latin text only (Satori
// cannot shape Devanagari / Telugu), no numbers (a card is cached by every
// platform that fetched it), every text container display:flex (a mixed
// text + element child list throws on the Node runtime and ships a 0-byte
// PNG — see src/app/opengraph-image.tsx).

import { ImageResponse } from "next/og";

export const SECTION_CARD_SIZE = { width: 1200, height: 630 };

export function sectionCard(opts: { section: string; headline: string; subline: string }): ImageResponse {
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
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "36px" }}>
          <div
            style={{
              width: "84px",
              height: "84px",
              background: "#f97316",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "56px",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ display: "flex", fontSize: "56px", fontWeight: 800, color: "#1c1917" }}>Shishya</div>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 600, color: "#c2410c" }}>{`· ${opts.section}`}</div>
        </div>
        <div style={{ display: "flex", fontSize: "58px", fontWeight: 700, color: "#1c1917", lineHeight: 1.12, maxWidth: "1000px" }}>
          {opts.headline}
        </div>
        <div style={{ display: "flex", marginTop: "28px", fontSize: "28px", color: "#57534e", fontWeight: 500, maxWidth: "1000px" }}>
          {opts.subline}
        </div>
      </div>
    ),
    { ...SECTION_CARD_SIZE },
  );
}
