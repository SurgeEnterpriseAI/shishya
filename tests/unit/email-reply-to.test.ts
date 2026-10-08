// Email honesty + measurement (7 Oct 2026, build B1). EMAIL_FROM's domain
// (send.surgesoftware.co.in) has no MX, so a reply to any Shishya mail
// bounces unless EMAIL_REPLY_TO names a mailbox a person reads. Pinned here:
//   • sendEmail's Reply-To default, and every closing "how to stop" line true
//     with EMAIL_REPLY_TO set AND unset (the text part carries the unsubscribe
//     URL whenever the html footer does);
//   • the live-test reminder's real way to stop (member → user-keyed
//     unsubscribe, founder wave copy instead of a per-recipient BCC; guest →
//     a one-off, founder BCC'd, no false "stop" promise);
//   • the reworked day-3 nudge (one action, "your 5 questions are ready" →
//     /today, coach as the secondary line; "pick your exam" with no exam);
//   • the transactional send log: welcome + teacher-request answer write
//     'sent:<tag>' with no opt-out gate, footer or List-Unsubscribe.
// Resend and prisma are mocked: nothing is sent, nothing is written.
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: Array<Record<string, any>> = [];
const db = {
  optOut: false,
  optOutChecks: 0,
  /** "userId|tag" of each EmailTouch insert. */
  touches: [] as string[],
  teacherRow: null as Record<string, unknown> | null,
};

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async (p: Record<string, any>) => (sent.push(p), { data: { id: "test" }, error: null }) };
  },
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join("?");
      if (sql.includes('"emailOptOut"')) {
        db.optOutChecks++;
        return [{ opt: db.optOut }];
      }
      if (sql.includes('"TeacherRequest"')) return db.teacherRow ? [db.teacherRow] : [];
      return [];
    },
    $executeRaw: async (strings: TemplateStringsArray, ...vals: unknown[]) => {
      if (strings.join("?").includes('"EmailTouch"')) db.touches.push(`${vals[1]}|${vals[2]}`);
      return 1;
    },
  },
}));

async function load() {
  vi.resetModules();
  return import("@/lib/email");
}

const UNSUB_PAGE = "https://shishya.in/unsubscribe?u=u_test";
const both = (p: Record<string, any>) => `${p.html}\n${p.text}`;

/** The seven recurring student mails, each to a known user (u_test). */
async function sendRecurring(m: Awaited<ReturnType<typeof load>>) {
  const base = { to: "student@example.org", userId: "u_test", name: "Asha K" };
  await m.sendDailyFiveEmail({ ...base, examShort: "SSC CGL" });
  await m.sendCoachDayEmail({ ...base, examShort: "SSC CGL", daysLeft: 30, tasks: ["Daily 5"], note: null });
  await m.sendEveningRescueEmail({ ...base, examShort: "SSC CGL", streakCurrent: 4 });
  await m.sendWinbackEmail({ ...base, examShort: "SSC CGL", mistakes: 3, daysGone: 9 });
  await m.sendLiveTestInviteEmail({ ...base, examShort: "SSC CGL", sundayLabel: "Sun 11 Oct" });
  await m.sendExamEveEmail({
    ...base,
    examShort: "SSC CGL",
    examCode: "SSC_CGL",
    examDate: "12 Oct",
    tier: "official",
    checklistUrl: "https://shishya.in/exams/SSC_CGL",
    checklistIsArticle: false,
    nextDates: [],
    quote: { text: "Keep going." },
  });
  await m.sendExamDayAfterEmail({
    ...base,
    examShort: "SSC CGL",
    examCode: "SSC_CGL",
    examDayLine: "12 Oct (official)",
    answerKeyLine: "Answer key: not announced yet",
    resultLine: "Result: not announced yet",
  });
}

beforeEach(() => {
  sent.length = 0;
  db.optOut = false;
  db.optOutChecks = 0;
  db.touches = [];
  db.teacherRow = null;
  vi.stubEnv("RESEND_API_KEY", "re_test_dummy");
  vi.stubEnv("FOUNDER_BCC", "");
  vi.stubEnv("EMAIL_REPLY_TO", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("sendEmail Reply-To default", () => {
  it("uses EMAIL_REPLY_TO when the payload sets none; the payload's own wins", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "Shishya <help@example.org>");
    const { sendEmail } = await load();
    await sendEmail({ to: "a@example.org", subject: "s", html: "<p>x</p>" });
    await sendEmail({ to: "a@example.org", subject: "s", html: "<p>x</p>", replyTo: "mentor@example.org" });
    expect(sent.map((p) => p.replyTo)).toEqual(["Shishya <help@example.org>", "mentor@example.org"]);
  });

  it("unset (or blank) → no Reply-To header at all", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "   ");
    const { sendEmail } = await load();
    await sendEmail({ to: "a@example.org", subject: "s", html: "<p>x</p>" });
    expect(sent[0].replyTo).toBeUndefined();
  });
});

describe("stop lines are true in both EMAIL_REPLY_TO states", () => {
  it("stopLine: reply only with a mailbox, 'unsubscribe below' only with the link, else nothing", async () => {
    let m = await load();
    expect(m.stopLine("these reminders", true)).toBe("To stop these reminders, unsubscribe below.");
    expect(m.stopLine("these reminders", false)).toBe("");
    vi.stubEnv("EMAIL_REPLY_TO", "help@example.org");
    m = await load();
    expect(m.stopLine("these reminders", true)).toBe("Reply to stop these reminders, or unsubscribe below.");
    expect(m.stopLine("these reminders", false)).toBe("Reply to stop these reminders.");
  });

  it("EMAIL_REPLY_TO set: every recurring mail may say 'Reply to stop', beside the unsubscribe link", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "Shishya <help@example.org>");
    await sendRecurring(await load());
    expect(sent).toHaveLength(7);
    for (const p of sent) {
      expect(p.replyTo).toBe("Shishya <help@example.org>");
      expect(p.text, p.subject).toMatch(/Reply to stop [^)]*, or unsubscribe below\.\)/);
      expect(p.html, p.subject).toContain(UNSUB_PAGE);
      expect(p.text, p.subject).toContain(`Unsubscribe: ${UNSUB_PAGE}`);
    }
  });

  it("EMAIL_REPLY_TO unset: no Reply-To, no mail says 'reply', and 'unsubscribe below' always has the link in both parts", async () => {
    await sendRecurring(await load());
    expect(sent).toHaveLength(7);
    for (const p of sent) {
      expect(p.replyTo).toBeUndefined();
      expect(both(p), p.subject).not.toMatch(/\breply\b/i);
      expect(p.text, p.subject).toMatch(/unsubscribe below/i);
      expect(p.html, p.subject).toContain(UNSUB_PAGE);
      expect(p.text, p.subject).toContain(`Unsubscribe: ${UNSUB_PAGE}`);
    }
    expect(sent[0].text).toContain("(To stop the daily reminder, unsubscribe below.)");
    expect(sent[0].html).toContain(">To stop the daily reminder, unsubscribe below.</p>");
  });

  it("no known recipient (no unsubUserId) and no mailbox: the mail promises no way to stop it has not got", async () => {
    const m = await load();
    await m.sendDailyFiveEmail({ to: "student@example.org", name: "Asha", examShort: "SSC CGL" });
    expect(both(sent[0])).not.toMatch(/unsubscribe|\breply\b/i);
    expect(sent[0].headers).toBeUndefined();
  });

  it("the founder's wave copy keeps the original text: no student unsubscribe token", async () => {
    vi.stubEnv("FOUNDER_BCC", "founder@example.org");
    const m = await load();
    await m.sendDailyFiveEmail({ to: "student@example.org", userId: "u_test", name: "Asha", examShort: "SSC CGL" });
    const [student, copy] = sent;
    expect(student.bcc).toBeUndefined();
    expect(student.text).toContain(`Unsubscribe: ${UNSUB_PAGE}`);
    expect(copy.to).toBe("founder@example.org");
    expect(both(copy)).not.toContain("u=u_test");
  });
});

describe("live-test reminder: a real way to stop", () => {
  const reminder = { to: "student@example.org", exams: ["SSC CGL"], count: 1 };

  it("member: user-keyed unsubscribe (footer, text link, one-click headers), send log, wave copy instead of a BCC", async () => {
    vi.stubEnv("FOUNDER_BCC", "founder@example.org");
    const m = await load();
    expect(await m.sendLiveTestReminderEmail({ ...reminder, userId: "u_test" })).toBe(true);
    const [p, copy] = sent;
    expect(p.html).toContain(UNSUB_PAGE);
    expect(p.text).toContain(`Unsubscribe: ${UNSUB_PAGE}`);
    expect(p.headers["List-Unsubscribe"]).toContain("https://shishya.in/api/unsubscribe?u=u_test");
    expect(p.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(p.text).toContain("(You asked for this reminder on shishya.in. It is sent once, for today only. To stop Shishya's study emails, unsubscribe below.)");
    expect(both(p)).not.toMatch(/\breply\b/i);
    // Founder-BCC rules: never BCC'd onto list mail (the token); one wave copy per tag instead.
    expect(p.bcc).toBeUndefined();
    expect(copy.subject).toMatch(/^\[wave: live-test-reminder\] /);
    expect(both(copy)).not.toContain("u=u_test");
    expect(db.touches).toEqual(["u_test|sent:live-test-reminder"]);
    // /admin/loops now reads it as a logged (list) send, not a transactional kind.
    const { LOGGED_SEND_FAMILIES } = await import("@/lib/loops-readout");
    expect(LOGGED_SEND_FAMILIES.has("live-test-reminder")).toBe(true);
  });

  it("member who opted out of all Shishya email: not sent (the unsubscribe page promises exam reminders stop)", async () => {
    db.optOut = true;
    const m = await load();
    expect(await m.sendLiveTestReminderEmail({ ...reminder, userId: "u_test" })).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("guest (no userId): a one-off with no false 'stop' promise, founder still BCC'd, no list headers", async () => {
    vi.stubEnv("FOUNDER_BCC", "founder@example.org");
    vi.stubEnv("EMAIL_REPLY_TO", "help@example.org");
    const m = await load();
    await m.sendLiveTestReminderEmail({ ...reminder, userId: null });
    expect(sent).toHaveLength(1);
    const [p] = sent;
    expect(p.text).toContain("(You asked for this reminder on shishya.in. It is sent once, for today only.)");
    expect(both(p)).not.toMatch(/unsubscribe|reply to stop/i);
    expect(p.headers).toBeUndefined();
    expect(p.bcc).toEqual(["founder@example.org"]);
    expect(db.touches).toEqual([]);
  });
});

describe("day-3 nudge: one action, the Daily-5 way", () => {
  const user = { id: "u_test", email: "asha@example.org", name: "Asha K" };

  it("with an exam to build on: 'your 5 questions are ready' → /today first, coach second, nothing else", async () => {
    const m = await load();
    await m.sendDay3NudgeEmail({ ...user, examShort: "SSC CGL" });
    const [p] = sent;
    expect(p.subject).toBe("Asha, your 5 SSC CGL questions are ready");
    const hrefs = [...p.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    expect(hrefs[0]).toMatch(/^https:\/\/shishya\.in\/today\?utm_source=email&(amp;)?utm_medium=day3-nudge/);
    expect(hrefs[1]).toMatch(/^https:\/\/shishya\.in\/coach\?/);
    // Then only the unsubscribe footer — no /chat, /dashboard or homepage menu.
    expect(hrefs.slice(2).every((h) => h.startsWith("https://shishya.in/unsubscribe?"))).toBe(true);
    expect(p.html).toContain("Start my 5 →");
    expect(p.text).toContain("Your first 5 SSC CGL questions are ready — about 3 minutes");
    expect(p.text).toMatch(/Start my 5: https:\/\/shishya\.in\/today\?utm_source=email/);
    expect(p.text.indexOf("/today")).toBeLessThan(p.text.indexOf("/coach"));
    expect(both(p)).not.toMatch(/Three easy places|\/chat|\breply\b/);
    expect(p.tags).toEqual([{ name: "kind", value: "day3-nudge" }]);
    expect(db.touches).toEqual(["u_test|sent:day3-nudge"]);
  });

  it("no exam to build on (most of this audience): 'pick your exam', never 'ready'", async () => {
    const m = await load();
    await m.sendDay3NudgeEmail({ ...user, examShort: null });
    const [p] = sent;
    expect(p.subject).toBe("Asha, your first 5 questions take 3 minutes");
    expect(both(p)).not.toMatch(/ready/i);
    expect(p.html).toContain("Pick my exam →");
    expect(p.text).toMatch(/Pick my exam: https:\/\/shishya\.in\/today\?/);
    expect(p.text).toContain("Pick the exam you are preparing for, and Shishya builds your first 5 questions on it");
  });

  it("render: no usable name → a clean subject; the exam name is escaped in html", async () => {
    const m = await load();
    expect(m.renderDay3NudgeEmail({ firstName: "there", examShort: "SSC CGL" }).subject).toBe("Your 5 SSC CGL questions are ready");
    expect(m.renderDay3NudgeEmail({ firstName: "there", examShort: null }).subject).toBe("Your first 5 questions take 3 minutes");
    // …and the body never opens "there, …": the text greets "Hi there,", the html lead starts plainly.
    for (const examShort of ["SSC CGL", null]) {
      const anon = m.renderDay3NudgeEmail({ firstName: "there", examShort });
      expect(anon.text.startsWith("Hi there,\n")).toBe(true);
      expect(anon.html).not.toMatch(/there,/);
    }
    expect(m.renderDay3NudgeEmail({ firstName: "Ravi", examShort: null }).html).toContain("Ravi, pick the exam");
    const r = m.renderDay3NudgeEmail({ firstName: "Ravi", examShort: "A<b>" });
    expect(r.html).toContain("A&lt;b&gt;");
    expect(r.html).not.toContain("A<b>");
  });
});

describe("transactional send log (welcome, teacher-request answer)", () => {
  it("welcome with the new account's id: 'sent:welcome' row; no opt-out gate, footer or list headers; founder BCC unchanged", async () => {
    vi.stubEnv("FOUNDER_BCC", "founder@example.org");
    db.optOut = true; // transactional: an opt-out never holds it
    const m = await load();
    expect(await m.sendWelcomeEmail({ id: "u_new", email: "new@example.org", name: "Asha" })).toBe(true);
    const [p] = sent;
    expect(db.touches).toEqual(["u_new|sent:welcome"]);
    expect(db.optOutChecks).toBe(0);
    expect(p.headers).toBeUndefined();
    expect(both(p)).not.toMatch(/unsubscribe/i);
    expect(p.bcc).toEqual(["founder@example.org"]);
    expect(sent).toHaveLength(1); // no wave copy for transactional mail
  });

  it("welcome without an id (admin test send): mail goes, no row", async () => {
    const m = await load();
    await m.sendWelcomeEmail({ email: "new@example.org", name: null });
    expect(sent).toHaveLength(1);
    expect(db.touches).toEqual([]);
  });

  it("teacher-request answer: a member's leaves 'sent:teacher-request-answer'; a guest's sends with no row", async () => {
    vi.resetModules();
    const { emailTeacherRequestAnswer } = await import("@/lib/teacher-request-notify");
    db.teacherRow = { answerText: "Start with Percentages.", contactEmail: null, contactName: null, userId: "u_t", userEmail: "t@example.org", userName: "Ravi", examCode: "SSC_CGL" };
    await emailTeacherRequestAnswer("tr_1");
    db.teacherRow = { answerText: "Start with Percentages.", contactEmail: "guest@example.org", contactName: "Guest", userId: null, userEmail: null, userName: null, examCode: null };
    await emailTeacherRequestAnswer("tr_2");
    expect(sent.map((p) => p.to)).toEqual(["t@example.org", "guest@example.org"]);
    expect(db.touches).toEqual(["u_t|sent:teacher-request-answer"]);
    expect(db.optOutChecks).toBe(0);
    for (const p of sent) {
      expect(p.headers).toBeUndefined();
      expect(both(p)).not.toMatch(/unsubscribe/i);
    }
  });
});

describe("cron seams (the crons pass what the mails need)", () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, "../..", f), "utf8").replace(/\r\n/g, "\n");

  it("day-3 nudge: the exam comes from the same picker /today uses, after the dry-run return; a failed read → no-exam copy", () => {
    const src = read("src/app/api/cron/day3-nudge/route.ts");
    expect(src).toContain('import { pickDailyFive } from "@/lib/study-day-five";');
    expect(src).toContain("const pick = await pickDailyFive(u.id).catch(() => null);");
    expect(src).toContain("examShort: pick?.examShort ?? null,");
    expect(src.indexOf("if (dry) {")).toBeLessThan(src.indexOf("pickDailyFive(u.id)"));
  });

  it("live-test reminder: the cron reads the row's userId and hands it to the mail", () => {
    const src = read("src/app/api/cron/live-test-remind/route.ts");
    expect(src).toContain('SELECT id, email, "userId" FROM "LiveTestReminder"');
    expect(src).toContain("userId: r.userId,");
  });
});
