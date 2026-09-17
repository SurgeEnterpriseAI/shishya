// "A friend joined your group" (16 Sep 2026) — the pure rules and copy in
// src/lib/study-group.ts: who is told, which channels a join may use (the
// 20-minute phone and 6-hour email caps), and what each message says in
// en / hi / te. The atomic claims are SQL in src/lib/study-group-db.ts.
// Run with: npx vitest run tests/unit/study-group-notify.test.ts

import { describe, expect, it } from "vitest";
import { dict, tk, type StringKey } from "@/lib/i18n";
import { LOGGED_SEND_FAMILIES, MAIL_FAMILY_ORDER, mailFamily } from "@/lib/loops-readout";
import {
  GROUP_JOIN_EMAIL_MAX_NAMES,
  STUDY_GROUP_EMAIL_GAP_MS,
  STUDY_GROUP_I18N_KEYS,
  STUDY_GROUP_PUSH_GAP_MS,
  groupJoinChannels,
  groupJoinEmail,
  groupJoinEmailSince,
  groupJoinNotice,
  groupJoinPush,
  groupWatchWelcomePush,
  ownerNoticeLocale,
  shouldTellOwner,
  studyGroupLabels,
} from "@/lib/study-group";

const t = (loc: "en" | "hi" | "te") => (k: StringKey) => tk(k, loc);
const MIN = 60_000;
const HOUR = 60 * MIN;

describe("shouldTellOwner", () => {
  const base = { ownerUserId: "owner", joinerUserId: "friend", ownerIsMember: true, joinerIsMember: true };
  it("a friend joining a group whose maker is still in it", () => {
    expect(shouldTellOwner(base)).toBe(true);
  });
  it("never for the maker's own join, a maker who left, or a joiner already gone", () => {
    expect(shouldTellOwner({ ...base, joinerUserId: "owner" })).toBe(false);
    expect(shouldTellOwner({ ...base, ownerIsMember: false })).toBe(false);
    expect(shouldTellOwner({ ...base, joinerIsMember: false })).toBe(false);
  });
});

describe("ownerNoticeLocale", () => {
  it("hi and te from the account language; everything else English", () => {
    expect(ownerNoticeLocale("HI")).toBe("hi");
    expect(ownerNoticeLocale("TE")).toBe("te");
    expect(ownerNoticeLocale("EN")).toBe("en");
    expect(ownerNoticeLocale("MR")).toBe("en");
    expect(ownerNoticeLocale(null)).toBe("en");
  });
});

describe("groupJoinChannels — caps", () => {
  const now = new Date("2026-09-16T15:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const base = { now, capsReady: true, lastPushAt: null, lastEmailAt: null, hasWatches: true, ownerHasEmail: true };

  it("in-app always; push and email on the first join", () => {
    expect(groupJoinChannels(base)).toEqual({ inApp: true, push: true, email: true });
  });

  it("phone: at most one per 20 minutes per group", () => {
    expect(STUDY_GROUP_PUSH_GAP_MS).toBe(20 * MIN);
    expect(groupJoinChannels({ ...base, lastPushAt: ago(19 * MIN) }).push).toBe(false);
    expect(groupJoinChannels({ ...base, lastPushAt: ago(20 * MIN) }).push).toBe(true);
  });

  it("email: at most one per 6 hours per group", () => {
    expect(STUDY_GROUP_EMAIL_GAP_MS).toBe(6 * HOUR);
    expect(groupJoinChannels({ ...base, lastEmailAt: ago(6 * HOUR - MIN) }).email).toBe(false);
    expect(groupJoinChannels({ ...base, lastEmailAt: ago(6 * HOUR) }).email).toBe(true);
    // An ISO string from a raw read counts the same.
    expect(groupJoinChannels({ ...base, lastEmailAt: ago(HOUR).toISOString() }).email).toBe(false);
  });

  it("the two caps are independent", () => {
    expect(groupJoinChannels({ ...base, lastPushAt: ago(MIN) })).toEqual({ inApp: true, push: false, email: true });
    expect(groupJoinChannels({ ...base, lastEmailAt: ago(MIN) })).toEqual({ inApp: true, push: true, email: false });
  });

  it("no device turned on → no push; no email address → no email", () => {
    expect(groupJoinChannels({ ...base, hasWatches: false }).push).toBe(false);
    expect(groupJoinChannels({ ...base, ownerHasEmail: false }).email).toBe(false);
  });

  it("before scripts/create-study-group-notify.ts has run: in-app only, never uncapped", () => {
    expect(groupJoinChannels({ ...base, capsReady: false })).toEqual({ inApp: true, push: false, email: false });
  });
});

describe("in-app and phone copy", () => {
  it("names the friend when their account has a name, else 'A friend'", () => {
    expect(groupJoinNotice(t("en"), { joinerName: "Asha", group: "CGL 2026" })).toEqual({
      title: 'Asha joined your study group "CGL 2026"',
      body: "See this week's board on your dashboard.",
      link: "/dashboard#study-groups",
    });
    expect(groupJoinNotice(t("en"), { joinerName: null, group: "CGL 2026" }).title).toBe('A friend joined your study group "CGL 2026"');
  });

  it("push opens the dashboard's group card, one notification per group on the phone", () => {
    const p = groupJoinPush(t("en"), { token: "Abcdefgh23", joinerName: "Asha", group: "CGL 2026" });
    expect(p.url).toBe("/dashboard?utm_source=push&utm_medium=study-group#study-groups");
    expect(p.url.startsWith("/")).toBe(true);
    expect(p.tag).toBe("study-group-Abcdefgh23");
    expect(p.title.length).toBeLessThanOrEqual(72);
    const w = groupWatchWelcomePush(t("en"), { token: "Abcdefgh23", group: "CGL 2026" });
    expect(w.title).toBe('Notifications on for "CGL 2026"');
    expect(w.body).toContain("20 minutes");
  });

  it("hi and te fill every placeholder and keep the name and group", () => {
    for (const loc of ["hi", "te"] as const) {
      const n = groupJoinNotice(t(loc), { joinerName: "वेणु", group: "SSC दोस्त" });
      const p = groupJoinPush(t(loc), { token: "Abcdefgh23", joinerName: null, group: "SSC दोस्त" });
      const w = groupWatchWelcomePush(t(loc), { token: "Abcdefgh23", group: "SSC दोस्त" });
      for (const s of [n.title, n.body, p.title, p.body, w.title, w.body]) expect(s, `${loc}: ${s}`).not.toMatch(/\{\w+\}/);
      expect(n.title).toContain("वेणु");
      expect(n.title).toContain("SSC दोस्त");
      expect(n.title).not.toBe(groupJoinNotice(t("en"), { joinerName: "वेणु", group: "SSC दोस्त" }).title);
    }
  });
});

describe("groupJoinEmailSince — who counts as new", () => {
  const now = new Date("2026-09-20T12:00:00Z");
  it("members who joined after the previous email", () => {
    const last = new Date("2026-09-17T08:00:00Z");
    expect(groupJoinEmailSince(last, now).toISOString()).toBe(last.toISOString());
    expect(groupJoinEmailSince(last.toISOString(), now).toISOString()).toBe(last.toISOString());
  });
  it("no previous email (first one, or joins from before the schema script): only the last 6 hours, never everyone", () => {
    for (const none of [null, undefined]) {
      expect(groupJoinEmailSince(none, now).getTime()).toBe(now.getTime() - STUDY_GROUP_EMAIL_GAP_MS);
    }
    // A member from 3 days ago is not listed as new.
    expect(new Date("2026-09-17T12:00:00Z").getTime()).toBeLessThan(groupJoinEmailSince(null, now).getTime());
  });
});

describe("groupJoinEmail", () => {
  it("lists everyone new since the last email, newest first — no totals, no pressure", () => {
    const m = groupJoinEmail(t("en"), { group: "CGL 2026", joiners: ["Ravi", null, "Asha"] });
    expect(m.subject).toBe('Ravi joined your study group "CGL 2026"');
    expect(m.text).toContain('New in your study group "CGL 2026":');
    expect(m.text).toContain("• Ravi\n• A friend\n• Asha");
    expect(m.text).toContain("https://shishya.in/dashboard#study-groups");
    expect(m.text).toContain("At most one of these emails every 6 hours per group.");
    expect(m.html).toContain("<li>Ravi</li><li>A friend</li><li>Asha</li>");
    // No counts of members or joins anywhere in the mail.
    expect(m.text.replace("6 hours", "").replace("2026", "")).not.toMatch(/\d/);
  });

  it("a nameless newest joiner gets the 'A friend' subject", () => {
    expect(groupJoinEmail(t("en"), { group: "G1", joiners: [null, "Asha"] }).subject).toBe('A friend joined your study group "G1"');
  });

  it("escapes names and the group in the HTML", () => {
    const m = groupJoinEmail(t("en"), { group: `A&B "<x>"`, joiners: [`O'Neil`] });
    expect(m.html).not.toContain("<x>");
    expect(m.html).toContain("A&amp;B &quot;&lt;x&gt;&quot;");
    expect(m.html).toContain("O&#39;Neil");
  });

  it(`shows at most ${GROUP_JOIN_EMAIL_MAX_NAMES} names, then an ellipsis`, () => {
    const joiners = Array.from({ length: 30 }, (_, i) => `N${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i / 26) | 0))}`);
    const m = groupJoinEmail(t("en"), { group: "G", joiners });
    expect((m.html.match(/<li>/g) ?? []).length).toBe(GROUP_JOIN_EMAIL_MAX_NAMES + 1);
    expect(m.text.trimEnd()).toContain("\n…\n");
  });

  it("hi and te: translated, every placeholder filled, the 6-hour cap kept", () => {
    for (const loc of ["hi", "te"] as const) {
      const m = groupJoinEmail(t(loc), { group: "G1", joiners: ["Ravi", null] });
      for (const s of [m.subject, m.text, m.html]) expect(s).not.toMatch(/\{\w+\}/);
      expect(m.text).toContain("6");
      expect(m.text).toContain(tk("challenge.aFriend", loc));
      expect(m.subject).not.toBe(groupJoinEmail(t("en"), { group: "G1", joiners: ["Ravi", null] }).subject);
    }
  });
});

describe("study-group-join mail family", () => {
  it("is logged and ordered on /admin/loops", () => {
    expect(mailFamily("study-group-join")).toBe("study-group-join");
    expect(LOGGED_SEND_FAMILIES.has("study-group-join")).toBe(true);
    expect(MAIL_FAMILY_ORDER).toContain("study-group-join");
  });
});

describe("keys and labels", () => {
  const raw = (locale: string, key: StringKey) => (dict as unknown as Record<string, Record<string, string>>)[locale]?.[key];
  const NEW = STUDY_GROUP_I18N_KEYS.filter((k) => /^sg\.(watch|notify|push|mail)\./.test(k));

  it("every new key is in en, hi and te", () => {
    expect(NEW.length).toBe(11);
    for (const locale of ["en", "hi", "te"]) expect(NEW.filter((k) => !raw(locale, k)?.trim()), locale).toEqual([]);
  });

  it("the invite page tells a joiner the maker hears their first name (two-actor honesty)", () => {
    expect(raw("en", "sg.join.what")).toContain("the group's maker is told your first name");
    for (const locale of ["hi", "te"]) expect(raw(locale, "sg.join.what")).toContain("Shishya");
  });

  it("the maker's watch button labels reach the card", () => {
    const L = studyGroupLabels((k) => dict.en[k]);
    expect(L.watchButton).toBe("Tell me on this phone when a friend joins");
    expect(L.watchBusy).toBe(dict.en["challenge.watch.busy"]);
    expect(L.watchError).toBe(dict.en["challenge.watch.error"]);
  });
});
