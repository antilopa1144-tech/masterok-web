import { NextRequest, NextResponse } from "next/server";
import {
  corsHeaders,
  getSiteOrigin,
  isRateLimited,
  jsonError,
  normalizeChatMessages,
} from "@/lib/mikhalych/api-common";
import {
  isMikhalychAgentEnabled,
  runMikhalychAgent,
  runMikhalychAgentAsSseStream,
  toOpenAIChatCompletionPayload,
  MIKHALYCH_AGENT_TOOLS,
} from "@/lib/mikhalych/agent";
import { createSseResponse } from "@/lib/mikhalych/agent/sse";
import { getMikhalychUpstreamProvider } from "@/lib/mikhalych/deepseek-upstream";
import { reserveMikhalychAccess } from "@/lib/mikhalych/paid-access";
import { describePhoto, validatePhoto } from "@/lib/mikhalych/photo";
import { CommerceError } from "@/lib/commerce/types";

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  const provider = getMikhalychUpstreamProvider();
  if (!provider) {
    return NextResponse.json(
      { ok: false, error: "Set DEEPSEEK_API_KEY on server" },
      { status: 503, headers },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      mode: "agent",
      agentEnabled: isMikhalychAgentEnabled(),
      provider,
      // Список из источника истины — не расходится при добавлении инструментов.
      tools: MIKHALYCH_AGENT_TOOLS.map((t) => t.function.name),
      langfuse: process.env.LANGFUSE_PUBLIC_KEY ? "configured" : "off",
    },
    { headers },
  );
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);

  if (!getMikhalychUpstreamProvider()) {
    return jsonError(
      req,
      500,
      "AI not configured on server. Set DEEPSEEK_API_KEY.",
    );
  }

  if (!isMikhalychAgentEnabled()) {
    return jsonError(req, 503, "Agent mode is disabled (MIKHALYCH_AGENT_ENABLED=false)");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return jsonError(req, 429, "Too many requests");
  }

  let body: { messages?: unknown; calcContext?: string; stream?: boolean; photo?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(req, 400, "Invalid JSON body");
  }

  const messages = normalizeChatMessages(body.messages);
  if (!messages) {
    return jsonError(req, 400, "Invalid messages");
  }
  let reservation: Awaited<ReturnType<typeof reserveMikhalychAccess>> = null;
  try {
    const photo = validatePhoto(body.photo);
    reservation = await reserveMikhalychAccess(req, Boolean(photo));
    if (photo) {
      const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "Что видно на фото?";
      const description = await describePhoto(photo, question);
      const index = messages.map((m) => m.role).lastIndexOf("user");
      messages[index] = { ...messages[index], content: `${messages[index].content}\n\nНаблюдения по приложенному фото (предположение модели, проверь по месту): ${description}` };
    }
  } catch (error) {
    return jsonError(req, error instanceof CommerceError ? error.status : 503, error instanceof Error ? error.message : "Не удалось проверить доступ");
  }

  const calcContext =
    typeof body.calcContext === "string" ? body.calcContext.slice(0, 16_000) : undefined;
  const client = (req.headers.get("x-client") ?? "web").slice(0, 40);
  const sessionId = `agent-${ip}-${Date.now()}`;

  if (body.stream === true) {
    const stream = runMikhalychAgentAsSseStream(
      {
        messages,
        calcContext,
        clientLabel: client,
        siteOrigin: getSiteOrigin(),
      },
      sessionId,
      { onUsage: (input, output) => reservation?.recordUsage(input, output), finish: () => reservation?.finish() ?? Promise.resolve() },
    );
    return createSseResponse(stream, headers);
  }

  try {
    const result = await runMikhalychAgent(
      {
        messages,
        calcContext,
        clientLabel: client,
        siteOrigin: getSiteOrigin(),
      },
      { sessionId, onUsage: (input, output) => reservation?.recordUsage(input, output) },
    );
    await reservation?.finish();

    return NextResponse.json(toOpenAIChatCompletionPayload(result), { headers });
  } catch (err) {
    await reservation?.finish().catch(() => {});
    console.error("[mikhalych/agent] failed", err);
    const message = err instanceof Error ? err.message : "Agent request failed";
    return jsonError(req, 502, message);
  }
}
