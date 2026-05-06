// Tiny helpers to keep route handlers terse and consistent.

import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauth() {
  return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

export function notFound(what = "resource") {
  return NextResponse.json({ error: `${what} not found` }, { status: 404 });
}

export function serverError(err: unknown) {
  console.error("[shishya] route error:", err);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}

/** Parse JSON body and validate against a Zod schema. Returns the parsed
 *  object or throws an error with status 400. */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const e = new Error("Invalid JSON body");
    (e as any).status = 400;
    throw e;
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const e = new Error(`Invalid body: ${result.error.message}`);
    (e as any).status = 400;
    throw e;
  }
  return result.data;
}
