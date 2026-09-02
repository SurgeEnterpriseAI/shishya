// Dynamic OpenGraph image for /colleges/[slug] — per-college social card.

import { ImageResponse } from "next/og";
import { COLLEGES } from "@/lib/colleges-data";

export const runtime = "nodejs";
export const alt = "Shishya — college profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Next 15: params is a Promise (sync read → undefined → 500 in prod).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = COLLEGES.find((x) => x.slug === slug);
  const name = c?.shortName ?? c?.name ?? "Shishya";
  const fullName = c?.name ?? "Indian colleges — neutral profiles";
  const overallRank = (c as { nirfOverall?: number } | undefined)?.nirfOverall;
  const location = c?.city ? `${c.city}${c.state ? ", " + c.state : ""}` : "";

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
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
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
          {overallRank !== undefined && (
            <div
              style={{
                marginLeft: "auto",
                padding: "10px 22px",
                background: "#0c4a6e",
                borderRadius: "999px",
                color: "white",
                fontSize: "26px",
                fontWeight: 700,
              }}
            >
              NIRF #{overallRank}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: "80px",
              fontWeight: 800,
              color: "#1c1917",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: "30px",
              color: "#475569",
              fontWeight: 500,
              lineHeight: 1.2,
              maxWidth: "1000px",
            }}
          >
            {fullName}
          </div>
          {location ? (
            // Satori: "📍 " + {location} is TWO child nodes → must be one
            // string or a flex container. One string.
            <div style={{ display: "flex", fontSize: "24px", color: "#0c4a6e", fontWeight: 600 }}>
              {`📍 ${location}`}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#475569",
            fontSize: "24px",
          }}
        >
          <div>Admissions · cutoffs · fees · placements</div>
          <div style={{ color: "#0c4a6e", fontWeight: 700 }}>shishya.in</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
