import { NextRequest, NextResponse } from "next/server";
import {
  runMikhalychAgent,
  runMikhalychAgentAsSseStream,
  isMikhalychAgentEnabled,
  toOpenAIChatCompletionPayload,
} from "@/lib/mikhalych/agent";
import { createSseResponse } from "@/lib/mikhalych/agent/sse";
import {
  corsHeaders,
  getSiteOrigin,
  isRateLimited,
  jsonError,
  MAX_MESSAGE_CHARS,
  normalizeChatMessages,
} from "@/lib/mikhalych/api-common";
import { MIKHALYCH_CHAT_GENERATION } from "@/lib/mikhalych/params";
import {
  getMikhalychChatModel,
  getMikhalychUpstreamProvider,
  mikhalychChatCompletion,
} from "@/lib/mikhalych/deepseek-upstream";
import { reserveMikhalychAccess, type MikhalychReservation } from "@/lib/mikhalych/paid-access";
import { describePhoto, validatePhoto } from "@/lib/mikhalych/photo";
import { CommerceError } from "@/lib/commerce/types";

const MODEL = getMikhalychChatModel();
const CHAT_GEN = MIKHALYCH_CHAT_GENERATION;
const SITE_ORIGIN = getSiteOrigin();
const MAX_MESSAGES = 12;
const MAX_RESPONSE_TOKENS = CHAT_GEN.max_tokens;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeLegacyMessages(messages: unknown): Array<{ role: string; content: string }> | null {
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
        error: "Set DEEPSEEK_API_KEY on server",
      },
      { status: 503, headers },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      provider,
      chatModel: MODEL,
      agentEnabled: isMikhalychAgentEnabled(),
      agentPath: "/api/mikhalych/agent",
    },
    { headers },
  );
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);

  if (!getMikhalychUpstreamProvider()) {
    return NextResponse.json(
      {
        error:
          "AI not configured on server. Set DEEPSEEK_API_KEY in Timeweb env.",
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
    calcContext?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stream?: boolean;
    legacy?: boolean;
    photo?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers },
    );
  }

  let photo: string | null;
  let reservation: MikhalychReservation | null = null;
  try {
    photo = validatePhoto(body.photo);
    if (photo && (body.legacy === true || !isMikhalychAgentEnabled())) throw new CommerceError(503, "Анализ фото требует режим агента");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось проверить доступ" }, { status: error instanceof CommerceError ? error.status : 503, headers });
  }

  const useAgent =
    isMikhalychAgentEnabled() &&
    body.legacy !== true &&
    getMikhalychUpstreamProvider() === "deepseek";

  if (useAgent) {
    const agentMessages = normalizeChatMessages(body.messages);
    if (!agentMessages) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400, headers });
    }
    try { reservation = await reserveMikhalychAccess(req, Boolean(photo)); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось проверить доступ" }, { status: error instanceof CommerceError ? error.status : 503, headers }); }
    if (photo) {
      try {
        const question = [...agentMessages].reverse().find((m) => m.role === "user")?.content ?? "Что видно на фото?";
        const description = await describePhoto(photo, question);
        const index = agentMessages.map((m) => m.role).lastIndexOf("user");
        agentMessages[index] = { ...agentMessages[index], content: `${agentMessages[index].content}\n\nНаблюдения по приложенному фото (предположение модели, проверь по месту): ${description}` };
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось разобрать фото" }, { status: error instanceof CommerceError ? error.status : 502, headers });
      }
    }
    const calcContext =
      typeof body.calcContext === "string" ? body.calcContext.slice(0, 16_000) : undefined;
    const client = (req.headers.get("x-client") ?? "web").slice(0, 40);
    const sessionId = `web-${ip}-${Date.now()}`;

    if (body.stream === true) {
      const stream = runMikhalychAgentAsSseStream(
        {
          messages: agentMessages,
          calcContext,
          clientLabel: client,
          siteOrigin: SITE_ORIGIN,
        },
        sessionId,
        { onUsage: (input, output) => reservation?.recordUsage(input, output), finish: () => reservation?.finish() ?? Promise.resolve() },
      );
      return createSseResponse(stream, headers);
    }

    try {
      const result = await runMikhalychAgent(
        {
          messages: agentMessages,
          calcContext,
          clientLabel: client,
          siteOrigin: SITE_ORIGIN,
        },
        { sessionId, onUsage: (input, output) => reservation?.recordUsage(input, output) },
      );
      await reservation?.finish();
      return NextResponse.json(toOpenAIChatCompletionPayload(result), { headers });
    } catch (err) {
      await reservation?.finish().catch(() => {});
      console.error("[mikhalych] agent failed", err);
      const message = err instanceof Error ? err.message : "Agent request failed";
      return NextResponse.json({ error: message }, { status: 502, headers });
    }
  }

  const messages = normalizeLegacyMessages(body.messages);
  if (!messages) {
    return NextResponse.json(
      { error: "Invalid messages" },
      { status: 400, headers },
    );
  }
  try { reservation = await reserveMikhalychAccess(req, false); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось проверить доступ" }, { status: error instanceof CommerceError ? error.status : 503, headers }); }

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
      const metered = new ReadableStream<Uint8Array>({ async start(controller) {
        const reader = upstream.body!.getReader();
        try {
          for (;;) { const next = await reader.read(); if (next.done) break; controller.enqueue(next.value); }
        } finally { await reservation?.finish().catch(() => {}); controller.close(); }
      } });
      return new Response(metered, {
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
    reservation?.recordUsage(data?.usage?.prompt_tokens, data?.usage?.completion_tokens);
    await reservation?.finish();
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
    await reservation?.finish().catch(() => {});
    console.error("[mikhalych] proxy request failed", err);
    return NextResponse.json(
      { error: "Proxy request failed" },
      { status: 502, headers },
    );
  }
}
