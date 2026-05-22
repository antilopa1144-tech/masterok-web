import { NextRequest, NextResponse } from "next/server";
import { MIKHALYCH_CHAT_GENERATION } from "@/lib/mikhalych/params";
import {
  getMikhalychChatModel,
  getMikhalychUpstreamProvider,
  mikhalychChatCompletion,
} from "@/lib/mikhalych/deepseek-upstream";

const MODEL = getMikhalychChatModel();
const CHAT_GEN = MIKHALYCH_CHAT_GENERATION;

const RATE_LIMIT = new Map<string, number[]>();
const MAX_REQUESTS = 20;
const WINDOW_MS = 60_000;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_RESPONSE_TOKENS = CHAT_GEN.max_tokens;

function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "https://getmasterok.ru";
  }
}

const SITE_ORIGIN = toOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru");
const ALLOWED_ORIGINS = new Set([
  SITE_ORIGIN,
  "https://www.getmasterok.ru",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : SITE_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Client",
    "Access-Control-Max-Age": "86400",
  };
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeMessages(messages: unknown): Array<{ role: string; content: string }> | null {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;

  const allowedRoles = new Set(["system", "user", "assistant"]);
  const normalized = messages.map((message) => {
    if (!message || typeof message !== "object") return null;
    const item = message as Record<string, unknown>;
    if (typeof item.role !== "string" || !allowedRoles.has(item.role)) return null;
    if (typeof item.content !== "string" || item.content.trim().length === 0) return null;
    return {
      role: item.role,
      content: item.content.slice(0, MAX_MESSAGE_CHARS),
    };
  });

  if (normalized.some((message) => message === null)) return null;
  return normalized as Array<{ role: string; content: string }>;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (RATE_LIMIT.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) return true;
  timestamps.push(now);
  RATE_LIMIT.set(ip, timestamps);
  return false;
}

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/** Проверка конфигурации после деплоя (без вызова AI). */
export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  const provider = getMikhalychUpstreamProvider();
  if (!provider) {
    return NextResponse.json(
      {
        ok: false,
        error: "Set DEEPSEEK_API_KEY or OPENROUTER_API_KEY on server",
      },
      { status: 503, headers },
    );
  }
  return NextResponse.json(
    { ok: true, provider, chatModel: MODEL },
    { headers },
  );
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);

  if (!getMikhalychUpstreamProvider()) {
    return NextResponse.json(
      {
        error:
          "AI not configured on server. Set DEEPSEEK_API_KEY (recommended) or OPENROUTER_API_KEY in Timeweb env.",
      },
      { status: 500, headers },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers },
    );
  }

  let body: {
    model?: string;
    messages?: unknown;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stream?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers },
    );
  }

  const messages = normalizeMessages(body.messages);
  if (!messages) {
    return NextResponse.json(
      { error: "Invalid messages" },
      { status: 400, headers },
    );
  }

  const upstreamRequest: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature: clampNumber(body.temperature, CHAT_GEN.temperature, 0, 1.2),
    max_tokens: clampNumber(body.max_tokens, MAX_RESPONSE_TOKENS, 64, MAX_RESPONSE_TOKENS),
    top_p: clampNumber(body.top_p, CHAT_GEN.top_p, 0.1, 1),
    frequency_penalty: clampNumber(body.frequency_penalty, CHAT_GEN.frequency_penalty, -1, 1),
    presence_penalty: clampNumber(body.presence_penalty, CHAT_GEN.presence_penalty, -1, 1),
    stream: body.stream === true,
  };

  try {
    const client = (req.headers.get("x-client") ?? "web").slice(0, 40);
    const upstream = await mikhalychChatCompletion(upstreamRequest, {
      clientLabel: client,
      siteOrigin: SITE_ORIGIN,
    });

    if (body.stream) {
      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        return new Response(text || JSON.stringify({ error: "upstream error" }), {
          status: upstream.status || 502,
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        });
      }
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...headers,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("[mikhalych] upstream error", {
        status: upstream.status,
        model: MODEL,
        body: data,
      });
      return NextResponse.json(data, {
        status: upstream.status,
        headers,
      });
    }
    return NextResponse.json(data, { headers });
  } catch (err) {
    console.error("[mikhalych] proxy request failed", err);
    return NextResponse.json(
      { error: "Proxy request failed" },
      { status: 502, headers },
    );
  }
}
