// Per-page social card (26 Sep 2026, share-images group) — one Satori layout
// for the school class / subject / chapter, career, current-affairs day and
// entrance-exams cards. Text comes from src/lib/og/page-card-text.ts (data
// only, Latin script only). Same look as the section cards
// (src/lib/og/section-card.tsx): a Latin "S" tile — the शि tile is not
// shaped by Satori — and every text container display:flex with ONE string
// child (a mixed text + element child list throws on the Node runtime and
// ships a 0-byte PNG — see src/app/opengraph-image.tsx).
//
// Written with createElement rather than JSX so the unit tests can render it
// (vitest runs with the app's `jsx: preserve`, which cannot load a .tsx file
// that contains JSX): tests/unit/page-share-cards.test.ts renders every route.

import { createElement as h, type CSSProperties, type ReactElement } from "react";
import { ImageResponse } from "next/og";
import { PAGE_CARD_FOOTER, type PageCardText } from "./page-card-text";

export const PAGE_CARD_SIZE = { width: 1200, height: 630 };

/** Headline size by length, so the longest headline (CARD_HEADLINE_MAX, a
 *  long CISCE subject name) stays within two lines. */
export function pageCardHeadlinePx(headline: string): number {
  if (headline.length <= 34) return 64;
  if (headline.length <= 56) return 54;
  return 46;
}

/** A flex box with one text child — the only text shape Satori draws safely. */
const text = (style: CSSProperties, s: string, key?: number): ReactElement => h("div", { key, style: { display: "flex", ...style } }, s);

export function pageCardElement(t: PageCardText): ReactElement {
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 96px",
        background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
        fontFamily: "sans-serif",
      },
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: "20px" } },
      text(
        {
          width: "80px",
          height: "80px",
          background: "#f97316",
          borderRadius: "18px",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "54px",
          fontWeight: 800,
        },
        "S",
      ),
      text({ fontSize: "50px", fontWeight: 800, color: "#1c1917" }, "Shishya"),
      text({ fontSize: "38px", fontWeight: 600, color: "#c2410c" }, `· ${t.section}`),
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "14px" } },
      text(
        {
          fontSize: `${pageCardHeadlinePx(t.headline)}px`,
          fontWeight: 800,
          color: "#1c1917",
          letterSpacing: "-0.02em",
          lineHeight: 1.08,
          maxWidth: "1010px",
        },
        t.headline,
      ),
      ...t.lines.map((line, i) =>
        text(
          {
            fontSize: i === 0 ? "32px" : "28px",
            fontWeight: i === 0 ? 600 : 500,
            color: i === 0 ? "#9a3412" : "#57534e",
            lineHeight: 1.25,
            maxWidth: "1010px",
          },
          line,
          i,
        ),
      ),
    ),
    text({ justifyContent: "flex-end", fontSize: "26px", fontWeight: 700, color: "#c2410c" }, PAGE_CARD_FOOTER),
  );
}

export function pageCard(t: PageCardText): ImageResponse {
  return new ImageResponse(pageCardElement(t), { ...PAGE_CARD_SIZE });
}
