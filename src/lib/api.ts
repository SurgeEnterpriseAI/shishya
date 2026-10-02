// Minimal client-side fetch helper used by Client Components.
// All API routes return JSON; helper unwraps and throws on non-2xx.

export async function api<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data?.error ?? res.statusText ?? `HTTP ${res.status}`;
    // 2 Oct 2026: the thrown error also carries the reply's status and its
    // stable `code` (e.g. "ai-unavailable"), so a caller can pick its own
    // fixed line by the code instead of printing whatever text came back.
    throw Object.assign(new Error(msg), {
      status: res.status,
      code: typeof data?.code === "string" ? (data.code as string) : undefined,
    });
  }
  return data as T;
}

/** GET helper. */
export const apiGet = <T,>(url: string) => api<T>(url, { method: "GET" });

/** POST helper. */
export const apiPost = <T,>(url: string, body?: unknown) =>
  api<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined });

/** PATCH helper. */
export const apiPatch = <T,>(url: string, body?: unknown) =>
  api<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });

/** DELETE helper. */
export const apiDel = <T,>(url: string) => api<T>(url, { method: "DELETE" });
