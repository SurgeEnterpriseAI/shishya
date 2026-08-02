// POST /api/mentor-application — apply to join the Shishya mentor
// network (cleared-exam seniors guiding current aspirants).
//
// Open to guests too — many cleared candidates aren't platform users
// yet; the application IS their first touchpoint. Founder approves
// each one by hand at /admin/mentors: trust is the product.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(40),
  email: z.string().email().max(200).optional().or(z.literal("")),
  examCode: z.string().trim().min(2).max(64),
  clearedYear: z.string().trim().max(8).optional().or(z.literal("")),
  credential: z.string().trim().min(10).max(2000),
  languages: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  why: z.string().trim().max(2000).optional().or(z.literal("")),
});

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  const rl = await checkRateLimit("mentor", userId ?? `anon:${clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Please fill name, phone, the exam you cleared, and a line on your rank/post." },
      { status: 400 },
    );
  }

  // Raw SQL: the generated client predates MentorApplication (established
  // pattern). id via randomUUID; updatedAt has no DB default so set it.
  const id = crypto.randomUUID();
  const inserted = await prisma
    .$executeRaw`
      INSERT INTO "MentorApplication"
        (id, "userId", name, phone, email, "examCode", "clearedYear", credential, languages, city, why, "updatedAt")
      VALUES
        (${id}, ${userId}, ${body.name}, ${body.phone}, ${body.email || session?.user?.email || null},
         ${body.examCode.toUpperCase()}, ${body.clearedYear || null}, ${body.credential},
         ${body.languages || null}, ${body.city || null}, ${body.why || null}, NOW())
    `
    .then(() => true)
    .catch((e) => {
      console.error("mentor-application create failed:", e);
      return false;
    });
  if (!inserted) {
    return NextResponse.json({ error: "Couldn't save that — please try again." }, { status: 500 });
  }
  const created = { id };

  // Notify the founder — same inbox as teacher requests.
  const notifyTo =
    process.env.TEACHER_REQUEST_NOTIFY_EMAIL ??
    (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean)[0] ??
    null;
  if (notifyTo) {
    const lines = [
      `Name: ${body.name}`,
      `Phone: ${body.phone}`,
      `Email: ${body.email || session?.user?.email || "—"}`,
      `Exam cleared: ${body.examCode}${body.clearedYear ? ` (${body.clearedYear})` : ""}`,
      `Credential: ${body.credential}`,
      `Languages: ${body.languages || "—"}`,
      `City: ${body.city || "—"}`,
      `Why: ${body.why || "—"}`,
      ``,
      `Review: https://shishya.in/admin/mentors`,
    ];
    void sendEmail({
      to: notifyTo,
      subject: `🧑‍🏫 New mentor application — ${body.examCode} (${body.name})`,
      text: lines.join("\n"),
      html: `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;">${lines
        .join("\n")
        .replace(/</g, "&lt;")}</pre>`,
      tag: "mentor-application",
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: created.id });
}
