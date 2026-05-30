import type { AgentRunResult } from "./types";

export type MikhalychSseEvent =
  | { type: "status"; message: string }
  | { type: "tool_start"; tool: string }
  | { type: "tool_end"; tool: string }
  | { type: "delta"; content: string }
  | { type: "done"; result: AgentRunResult };

export function encodeSseEvent(event: MikhalychSseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSseResponse(
  stream: ReadableStream<Uint8Array>,
  headers: Record<string, string>,
): Response {
  return new Response(stream, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
