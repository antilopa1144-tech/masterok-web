import { NextRequest, NextResponse } from "next/server";
import { MIKHALYCH_REVIEW_GENERATION } from "@/lib/mikhalych/params";
import { MIKHALYCH_REVIEW_SYSTEM_PROMPT } from "@/lib/mikhalych/prompts/review";
import {
  getMikhalychReviewModel,
  getMikhalychUpstreamProvider,
  mikhalychChatCompletion,
} from "@/lib/mikhalych/deepseek-upstream";

const MODEL = getMikhalychReviewModel();
const REVIEW_GEN = MIKHALYCH_REVIEW_GENERATION;

const RATE_LIMIT = new Map<string, number[]>();
const MAX_REQUESTS = 30;
const WINDOW_MS = 60_000;
const MAX_CONTEXT_CHARS = 12_000;
const MAX_REVIEW_TOKENS = REVIEW_GEN.max_tokens;

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
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Client",
    "Access-Control-Max-Age": "86400",
  };
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
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  }

  let body: { context?: string; calculatorSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const context = typeof body.context === "string" ? body.context.trim() : "";
  if (!context || context.length > MAX_CONTEXT_CHARS) {
    return NextResponse.json({ error: "Invalid context" }, { status: 400, headers });
  }

  const slug = typeof body.calculatorSlug === "string" ? body.calculatorSlug.slice(0, 80) : "calc";

  const upstreamRequest: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: "system", content: MIKHALYCH_REVIEW_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Вот расчёт — короткий комментарий прораба:\n\n${context}`,
      },
    ],
    temperature: REVIEW_GEN.temperature,
    max_tokens: MAX_REVIEW_TOKENS,
    top_p: REVIEW_GEN.top_p,
    frequency_penalty: REVIEW_GEN.frequency_penalty,
    presence_penalty: REVIEW_GEN.presence_penalty,
  };

  try {
    const client = (req.headers.get("x-client") ?? "web").slice(0, 40);
    const upstream = await mikhalychChatCompletion(upstreamRequest, {
      clientLabel: client,
      siteOrigin: SITE_ORIGIN,
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      console.error("[mikhalych/review] upstream error", { status: upstream.status, slug, body: data });
      return NextResponse.json(data, { status: upstream.status, headers });
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Empty review" }, { status: 502, headers });
    }

    return NextResponse.json({ content: content.trim() }, { headers });
  } catch (err) {
    console.error("[mikhalych/review] failed", err);
    return NextResponse.json({ error: "Proxy failed" }, { status: 502, headers });
  }
}
