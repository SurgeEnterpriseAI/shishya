"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RemoveStudentButton({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function remove() {
    if (!confirm("Remove this student from the batch?")) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/i/enrollments/${enrollmentId}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={removing}
      className="shrink-0 rounded-md border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
    >
      {removing ? "…" : "Remove"}
    </button>
  );
}
