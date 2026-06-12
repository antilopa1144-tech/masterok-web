import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT = new Map<string, number[]>();
const MAX_REQUESTS = 20;
const WINDOW_MS = 60_000;
/** Порог, после которого чистим Map от IP с истёкшим окном (иначе растёт бесконечно). */
const PRUNE_THRESHOLD = 500;

function pruneStaleRateLimitEntries(now: number): void {
  for (const [key, timestamps] of RATE_LIMIT) {
    if (timestamps.every((t) => now - t >= WINDOW_MS)) RATE_LIMIT.delete(key);
  }
}
export const MAX_AGENT_MESSAGES = 12;
export const MAX_MESSAGE_CHARS = 4_000;

export function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "https://getmasterok.ru";
  }
}

export function getSiteOrigin(): string {
  return toOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru");
}

const ALLOWED_ORIGINS = new Set([
  getSiteOrigin(),
  "https://www.getmasterok.ru",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : getSiteOrigin();

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type, X-Client",
    "Access-Control-Max-Age": "86400",
  };
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (RATE_LIMIT.size > PRUNE_THRESHOLD) pruneStaleRateLimitEntries(now);
  const timestamps = (RATE_LIMIT.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) return true;
  timestamps.push(now);
  RATE_LIMIT.set(ip, timestamps);
  return false;
}

export function normalizeChatMessages(
  messages: unknown,
): Array<{ role: "user" | "assistant"; content: string }> | null {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_AGENT_MESSAGES) {
    return null;
  }

  const normalized = messages
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const item = message as Record<string, unknown>;
      const role = item.role;
      if (role === "system") return null;
      if (role !== "user" && role !== "assistant") return null;
      if (typeof item.content !== "string" || item.content.trim().length === 0) return null;
      return {
        role: role as "user" | "assistant",
        content: item.content.slice(0, MAX_MESSAGE_CHARS),
      };
    })
    .filter((m): m is { role: "user" | "assistant"; content: string } => m !== null);

  if (normalized.length === 0) return null;
  return normalized;
}

export function jsonError(
  req: NextRequest,
  status: number,
  error: string,
): NextResponse {
  return NextResponse.json({ error }, { status, headers: corsHeaders(req) });
}
