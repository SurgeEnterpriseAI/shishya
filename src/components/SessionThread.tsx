"use client";

// The session conversation — shared by the mentor detail page and the
// student's report card. Plain thread + composer; each send emails the
// other side. `quickInvite` (mentor only) posts a ready-made "join me
// now" message so inviting a student is one tap.

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ThreadMsg {
  from: string;
  body: string;
  at: string; // preformatted IST label
}

export function SessionThread({
  requestId,
  messages,
  viewer,
  meetUrl,
}: {
  requestId: string;
  messages: ThreadMsg[];
  viewer: "MENTOR" | "STUDENT";
  meetUrl?: string | null;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function send(body: string) {
    setBusy(true);
    const r = await fetch(`/api/mentor-sessions/${requestId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      setText("");
      router.refresh();
    }
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-ink-800">Session messages</p>
      {messages.length === 0 ? (
        <p className="mt-1 text-xs text-ink-500">
          {viewer === "MENTOR"
            ? "No messages yet — invite the student below, or propose a time."
            : "No messages yet — your mentor may write here to fix a time. You can write first too."}
        </p>
      ) : (
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
          {messages.map((m, i) => (
            <li
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.from === viewer ? "bg-saffron-50 text-ink-800" : "bg-ink-50 text-ink-700"
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                {m.from === viewer ? "You" : m.from === "MENTOR" ? "Mentor" : "Student"} · {m.at}
              </span>
              <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) send(text.trim()); }}
          placeholder="Write a message — the other side gets an email…"
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none"
        />
        <button
          disabled={busy || !text.trim()}
          onClick={() => send(text.trim())}
          className="shrink-0 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-50"
        >
          Send
        </button>
      </div>
      {viewer === "MENTOR" && meetUrl && (
        <button
          disabled={busy}
          onClick={() =>
            send(`I'm in our session room now — join me here: ${meetUrl} . If this moment doesn't work, reply with a time that suits you.`)
          }
          className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
        >
          📣 Invite to join now (sends message + email with the room link)
        </button>
      )}
      {viewer === "STUDENT" && meetUrl && (
        <button
          disabled={busy}
          onClick={() =>
            send(`I'm in the session room now — please join me: ${meetUrl}`)
          }
          className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
        >
          🎥 I&apos;m in the room — ping my mentor (sends them an email instantly)
        </button>
      )}
    </div>
  );
}
