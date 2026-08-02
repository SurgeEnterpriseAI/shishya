// POST /api/educator-lead — pilot interest from /educators.
// Saves the lead (raw SQL — client predates EducatorLead) and emails
// the founder. Rate-limited via the mentor bucket (same shape of abuse).

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  organisation: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().min(10).max(40),
  email: z.string().email().max(200).optional().or(z.literal("")),
  audience: z.string().trim().max(200).optional().or(z.literal("")),
  examFocus: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit("mentor", `edu:${clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Please add your name and WhatsApp number." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const ok = await prisma
    .$executeRaw`
      INSERT INTO "EducatorLead"
        (id, name, organisation, phone, email, audience, "examFocus", message, "updatedAt")
      VALUES
        (${id}, ${body.name}, ${body.organisation || null}, ${body.phone}, ${body.email || null},
         ${body.audience || null}, ${body.examFocus || null}, ${body.message || null}, NOW())
    `
    .then(() => true)
    .catch((e) => {
      console.error("educator-lead create failed:", e);
      return false;
    });
  if (!ok) return NextResponse.json({ error: "Couldn't save that — please try again." }, { status: 500 });

  const notifyTo =
    process.env.TEACHER_REQUEST_NOTIFY_EMAIL ??
    (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean)[0] ??
    null;
  if (notifyTo) {
    const lines = [
      `Name: ${body.name}`,
      `Organisation: ${body.organisation || "—"}`,
      `WhatsApp: ${body.phone}`,
      `Email: ${body.email || "—"}`,
      `Audience: ${body.audience || "—"}`,
      `Exams: ${body.examFocus || "—"}`,
      `Message: ${body.message || "—"}`,
      ``,
      `Promise made on the page: pilot batch set up within 24 hours.`,
      `Self-serve path: https://shishya.in/institutions/new · Portal: https://shishya.in/i/dashboard`,
    ];
    void sendEmail({
      to: notifyTo,
      subject: `🤝 EDUCATOR PILOT LEAD — ${body.organisation || body.name}${body.audience ? ` (${body.audience})` : ""}`,
      text: lines.join("\n"),
      html: `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;">${lines
        .join("\n")
        .replace(/</g, "&lt;")}</pre>`,
      tag: "educator-lead",
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id });
}
