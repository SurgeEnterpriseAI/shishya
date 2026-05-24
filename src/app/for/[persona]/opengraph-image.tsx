// Per-persona OpenGraph image.
//
// Next.js auto-routes `/for/[persona]/opengraph-image` to this file
// with the persona slug as a param. Each persona gets its own custom
// social-share card with the persona label, pinned exam shortNames,
// and the "free · verified · in your language" tag — which improves
// LinkedIn / Twitter / WhatsApp CTR dramatically vs the generic
// site-wide card.

import { ImageResponse } from "next/og";
import { findPersona, PERSONAS } from "@/data/personas";
import { prisma } from "@/lib/db/prisma";

// Node runtime (not edge) because (a) Next.js 15 forbids edge + generateStaticParams
// together, and (b) we want Prisma access at build time to fetch real exam
// short names. Pre-rendered at build via generateStaticParams below.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pre-render at build time for all known personas. Falls back to the
// generic Shishya card if an unknown slug somehow gets requested.
export async function generateImageMetadata({
  params,
}: {
  params: { persona: string };
}) {
  const persona = findPersona(params.persona);
  if (!persona) return [];
  return [
    {
      id: persona.slug,
      contentType: "image/png",
      size,
      alt: `Shishya — ${persona.label} · curated exam prep`,
    },
  ];
}

export async function generateStaticParams() {
  return PERSONAS.map((p) => ({ persona: p.slug }));
}

export default async function Image({ params }: { params: { persona: string } }) {
  const persona = findPersona(params.persona);
  // Render a generic Shishya card if the slug is unknown — better than
  // erroring out the social preview.
  const examShortNames = persona
    ? await loadShortNames(persona.examCodes.slice(0, 5))
    : [];

  const title = persona ? persona.label.replace(/^I'm\s+/, "") : "Free Indian entrance exam prep";
  const subtitle = persona
    ? "Curated prep map — exams, articles, next steps"
    : "Pick your stage. See your curated prep.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px 90px",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
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
              fontWeight: 700,
            }}
          >
            शि
          </div>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#1c1917",
              letterSpacing: "-0.02em",
            }}
          >
            Shishya
          </div>
          {persona && (
            <div
              style={{
                marginLeft: "auto",
                background: "#fef3c7",
                color: "#92400e",
                fontSize: "20px",
                fontWeight: 600,
                padding: "8px 18px",
                borderRadius: "999px",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Persona #{persona.badge}
            </div>
          )}
        </div>

        {/* Middle: persona-specific headline */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "10px" }}>
          <div
            style={{
              fontSize: "30px",
              color: "#57534e",
              fontWeight: 600,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {persona ? "Curated for you ↓" : "Pick your stage ↓"}
          </div>
          <div
            style={{
              fontSize: "60px",
              color: "#1c1917",
              fontWeight: 800,
              lineHeight: 1.1,
              maxWidth: "1020px",
              marginTop: "10px",
              display: "flex",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: "20px",
              fontSize: "30px",
              color: "#57534e",
              fontWeight: 500,
              maxWidth: "1020px",
              display: "flex",
            }}
          >
            {subtitle}
          </div>

          {/* Pinned exam chips (when persona is recognised) */}
          {examShortNames.length > 0 && (
            <div
              style={{
                marginTop: "26px",
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              {examShortNames.map((n) => (
                <div
                  key={n}
                  style={{
                    background: "#fff",
                    border: "2px solid #fdba74",
                    color: "#1c1917",
                    fontSize: "26px",
                    fontWeight: 600,
                    padding: "10px 18px",
                    borderRadius: "12px",
                    display: "flex",
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: trust tag */}
        <div
          style={{
            fontSize: "26px",
            color: "#78716c",
            fontWeight: 500,
            display: "flex",
          }}
        >
          free · verified by students who&apos;ve been there · in your language
        </div>
      </div>
    ),
    { ...size },
  );
}

// Fetch short names for the persona's pinned exams. Keeps the OG image
// content honest (real exam names, not invented chips) and limits to 5
// to fit the card layout.
async function loadShortNames(codes: string[]): Promise<string[]> {
  if (codes.length === 0) return [];
  try {
    const rows = await prisma.exam.findMany({
      where: { code: { in: codes }, active: true },
      select: { code: true, shortName: true },
    });
    const byCode = new Map(rows.map((r) => [r.code, r.shortName]));
    return codes
      .map((c) => byCode.get(c))
      .filter((s): s is string => Boolean(s));
  } catch {
    return [];
  }
}
