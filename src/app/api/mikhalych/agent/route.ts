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

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  const provider = getMikhalychUpstreamProvider();
  if (!provider) {
    return NextResponse.json(
      { ok: false, error: "Set DEEPSEEK_API_KEY or OPENROUTER_API_KEY on server" },
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
      "AI not configured on server. Set DEEPSEEK_API_KEY (recommended) or OPENROUTER_API_KEY.",
    );
  }

  if (!isMikhalychAgentEnabled()) {
    return jsonError(req, 503, "Agent mode is disabled (MIKHALYCH_AGENT_ENABLED=false)");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return jsonError(req, 429, "Too many requests");
  }

  let body: { messages?: unknown; calcContext?: string; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError(req, 400, "Invalid JSON body");
  }

  const messages = normalizeChatMessages(body.messages);
  if (!messages) {
    return jsonError(req, 400, "Invalid messages");
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
      { sessionId },
    );

    return NextResponse.json(toOpenAIChatCompletionPayload(result), { headers });
  } catch (err) {
    console.error("[mikhalych/agent] failed", err);
    const message = err instanceof Error ? err.message : "Agent request failed";
    return jsonError(req, 502, message);
  }
}
