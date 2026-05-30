import { Langfuse } from "langfuse";

let singleton: Langfuse | null = null;

export function isLangfuseEnabled(): boolean {
  if (process.env.LANGFUSE_ENABLED?.trim().toLowerCase() === "false") return false;
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY?.trim() && process.env.LANGFUSE_SECRET_KEY?.trim(),
  );
}

function getClient(): Langfuse | null {
  if (!isLangfuseEnabled()) return null;
  if (!singleton) {
    singleton = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    });
  }
  return singleton;
}

export interface AgentTraceSession {
  traceId: string;
  end: (output?: unknown) => Promise<void>;
  spanTool: (name: string, input: unknown, output: unknown) => void;
  spanGeneration: (meta: {
    name: string;
    model: string;
    input: unknown;
    output: unknown;
    usage?: { input?: number; output?: number; total?: number };
  }) => void;
}

export function startAgentTrace(meta: {
  sessionId: string;
  userMessage: string;
  clientLabel?: string;
}): AgentTraceSession {
  const client = getClient();
  if (!client) {
    return noopTrace();
  }

  const trace = client.trace({
    name: "mikhalych-agent",
    sessionId: meta.sessionId,
    tags: ["mikhalych", "production"],
    metadata: { client: meta.clientLabel ?? "web" },
    input: meta.userMessage,
  });

  return {
    traceId: trace.id,
    spanTool(name, input, output) {
      trace.span({ name: `tool:${name}`, input, output });
    },
    spanGeneration({ name, model, input, output, usage }) {
      trace.generation({
        name,
        model,
        input,
        output,
        usage: usage
          ? {
              input: usage.input,
              output: usage.output,
              total: usage.total,
            }
          : undefined,
      });
    },
    async end(output) {
      trace.update({ output });
      await client.flushAsync();
    },
  };
}

function noopTrace(): AgentTraceSession {
  return {
    traceId: "",
    spanTool() {},
    spanGeneration() {},
    async end() {},
  };
}
