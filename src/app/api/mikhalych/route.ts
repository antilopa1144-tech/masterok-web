import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";

const RATE_LIMIT = new Map<string, number[]>();
const MAX_REQUESTS = 20;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (RATE_LIMIT.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) return true;
  timestamps.push(now);
  RATE_LIMIT.set(ip, timestamps);
  return false;
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured on server" },
      { status: 500 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru",
        "X-Title": "Masterok - Mikhalych",
      },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 2048,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Proxy request failed" },
      { status: 502 },
    );
  }
}
