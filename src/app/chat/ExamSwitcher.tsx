"use client";

// Client island for the exam dropdown on /chat. The chat page is a
// server component, so an inline onChange handler on a <select> would
// break SSR. This component owns the change handler.

import { useRouter } from "next/navigation";

export function ExamSwitcher({
  current,
  options,
  label,
}: {
  current: string;
  options: { code: string; shortName: string }[];
  label: string;
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
          if (code !== current) router.push(`/chat?examCode=${encodeURIComponent(code)}`);
        }}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>{o.shortName}</option>
        ))}
      </select>
    </div>
  );
}
