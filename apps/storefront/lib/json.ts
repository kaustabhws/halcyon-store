import { NextResponse } from "next/server";

/**
 * Like NextResponse.json, but serializes bigints as strings. Cart and order
 * payloads carry amountMinor as bigint; the client decoders parse them back.
 */
export function jsonResponse(data: unknown, init?: ResponseInit): NextResponse {
  const body = JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  return new NextResponse(body, { ...init, headers });
}
