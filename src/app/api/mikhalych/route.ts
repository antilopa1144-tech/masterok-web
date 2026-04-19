import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";

// Модель задаётся на сервере. Меняется через MIKHALYCH_MODEL в Timeweb env без пересборки.
const MODEL = process.env.MIKHALYCH_MODEL ?? "x-ai/grok-4.1-fast";

const RATE_LIMIT = new Map<string, number[]>();
const MAX_REQUESTS = 20;
const WINDOW_MS = 60_000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Client",
  "Access-Control-Max-Age": "86400",
};

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (RATE_LIMIT.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) return true;
  timestamps.push(now);
  RATE_LIMIT.set(ip, timestamps);
  return false;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured on server" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  let body: {
    model?: string;
    messages?: unknown;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stream?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const client = req.headers.get("x-client") ?? "web";
  const referer =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";

  const upstreamRequest: Record<string, unknown> = {
    model: MODEL,
    messages: body.messages,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 2048,
    stream: body.stream ?? false,
  };
  if (body.top_p !== undefined) upstreamRequest.top_p = body.top_p;

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": referer,
        "X-Title": `Masterok - ${client}`,
      },
      body: JSON.stringify(upstreamRequest),
    });

    if (body.stream) {
      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        return new Response(text || JSON.stringify({ error: "upstream error" }), {
          status: upstream.status || 502,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
          },
        });
      }
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(data, {
        status: upstream.status,
        headers: CORS_HEADERS,
      });
    }
    return NextResponse.json(data, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Proxy request failed" },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
