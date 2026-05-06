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
    throw new Error(msg);
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
