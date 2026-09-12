// GET /today/reminder.ics — a daily 8:30 AM IST "today's 5" calendar
// reminder the student adds themselves (linked from the results-page
// streak block, 11 Sep 2026). One recurring VEVENT with an alarm, pointing
// at https://shishya.in/today. No personal data, no auth, cacheable.
//
// The time is the STUDENT's reminder, not a promise about the morning
// email (that cron runs ~08:50 IST and skips anyone already on the site).
// RFC 5545 plumbing (escape / fold) is shared with the exam-week calendar.

import { icsEscape, icsFold } from "@/lib/exam-week-ics";

export const dynamic = "force-dynamic";

const SITE = "https://shishya.in";
const IST_OFFSET_MS = 5.5 * 3600_000;

function istDayCompact(now: Date): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, "");
}

function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// Not exported: Next.js only allows route-handler fields as exports here.
function buildDailyFiveReminderIcs(now: Date = new Date()): string {
  const day = istDayCompact(now);
  const L: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shishya//Daily 5//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape("Shishya — today's 5")}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
    // IST has no DST — a single STANDARD block is the whole timezone.
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "UID:daily-five@shishya.in",
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART;TZID=Asia/Kolkata:${day}T083000`,
    `DTEND;TZID=Asia/Kolkata:${day}T083500`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${icsEscape("Shishya — today's 5 (3 minutes)")}`,
    `DESCRIPTION:${icsEscape(`5 questions on your weakest topic. Open ${SITE}/today`)}`,
    `URL:${SITE}/today`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape("Shishya — today's 5")}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return L.map(icsFold).join("\r\n") + "\r\n";
}

export async function GET() {
  return new Response(buildDailyFiveReminderIcs(), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="shishya-daily-5.ics"',
      // Companion file, never a landing page.
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
