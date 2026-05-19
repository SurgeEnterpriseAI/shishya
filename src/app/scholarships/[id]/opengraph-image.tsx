// Dynamic OpenGraph image for /scholarships/[id] — per-scholarship social card.

import { ImageResponse } from "next/og";
import { SCHOLARSHIPS } from "@/data/scholarships";

export const runtime = "nodejs";
export const alt = "Shishya — scholarship";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: { id: string } }) {
  const s = SCHOLARSHIPS.find((x) => x.id === params.id);
  const name = s?.name ?? "Shishya scholarships";
  const body = s?.awardingBody ?? "Free, sourced, no agents.";
  const amount = s?.amount ?? "";
  const typeChip = s?.type?.replace(/_/g, " ") ?? "";

  // Truncate amount because some entries are long
  const amountShort = amount.length > 90 ? amount.slice(0, 89).trim() + "…" : amount;

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
          background: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)",
          fontFamily: "sans-serif",
        }}
      >
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
          <div style={{ fontSize: "44px", fontWeight: 800, color: "#1c1917" }}>
            Shishya
          </div>
          {typeChip && (
            <div
              style={{
                marginLeft: "auto",
                padding: "8px 18px",
                background: "#fff",
                border: "2px solid #a21caf",
                borderRadius: "999px",
                color: "#86198f",
                fontSize: "22px",
                fontWeight: 600,
              }}
            >
              {typeChip}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: "60px",
              fontWeight: 800,
              color: "#1c1917",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              maxWidth: "1000px",
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: "26px", color: "#86198f", fontWeight: 600 }}>
            {body}
          </div>
          {amountShort && (
            <div
              style={{
                fontSize: "24px",
                color: "#1c1917",
                fontWeight: 500,
                lineHeight: 1.3,
                maxWidth: "1000px",
              }}
            >
              💰 {amountShort}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#86198f",
            fontSize: "22px",
            fontWeight: 600,
          }}
        >
          <div>Free to apply · No agents · No referral fees</div>
          <div>shishya.in</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
