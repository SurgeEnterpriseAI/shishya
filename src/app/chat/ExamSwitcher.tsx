"use client";

// Client island for the exam dropdown on /chat. The chat page is a
// server component, so an inline onChange handler on a <select> would
// break SSR. This component owns the change handler.
//
// 27 Sep 2026 (content first): with `generalLabel` the first option is the
// general chat ("Any study question", value "" = /chat?general=1), so the
// dropdown replaces the old "pick your exam" screen and is always optional.

import { useRouter } from "next/navigation";

export function ExamSwitcher({
  current,
  options,
  label,
  generalLabel,
}: {
  /** The exam in view; "" = the general chat. */
  current: string;
  options: { code: string; shortName: string }[];
  label: string;
  /** When set, the first option opens the general chat. */
  generalLabel?: string;
}) {
  const router = useRouter();
  return (
    <div className="text-sm">
      <label className="text-xs text-ink-500" htmlFor="examCode">{label}</label>
      <select
        id="examCode"
        name="examCode"
        defaultValue={current}
        className="ml-2 rounded-md border border-ink-300 bg-white px-2 py-1 text-sm"
        onChange={(e) => {
          const code = e.currentTarget.value;
          if (code === current) return;
          if (code === "") router.push("/chat?general=1");
          else router.push(`/chat?examCode=${encodeURIComponent(code)}`);
        }}
      >
        {generalLabel && <option value="">{generalLabel}</option>}
        {options.map((o) => (
          <option key={o.code} value={o.code}>{o.shortName}</option>
        ))}
      </select>
    </div>
  );
}
