// POST /api/chat-route — retired 27 Sep 2026.
//
// It was a Claude-powered intent router for a homepage chat popup
// (src/components/HomeChatRouter.tsx) that is no longer mounted anywhere.
// The route itself stayed public and paid (one model call per request, no
// sign-in), and still described Shishya as a government-exam site. The home
// search strip (src/components/search/SearchStrip.tsx → /ask) now does this
// job without a model call for most queries. Answer 410 Gone, call nothing.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GONE = { error: "gone", use: "https://shishya.in/ask?q=" } as const;

export async function POST() {
  return NextResponse.json(GONE, { status: 410 });
}

export async function GET() {
  return NextResponse.json(GONE, { status: 410 });
}
